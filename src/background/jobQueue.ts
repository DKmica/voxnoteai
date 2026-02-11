import { notesRepository } from "@/data/notesRepository";
import { embeddingsRepository } from "@/data/embeddingsRepository";
import { loadPreferences } from "@/state/preferences";
import { getTranscriptionProvider } from "@/services/transcription/providerRegistry";
import { getSummarizationProvider } from "@/services/summarization/providerRegistry";
import { getEmbeddingProvider } from "@/services/embeddings/providerRegistry";

export type JobType = "TRANSCRIBE_NOTE" | "SUMMARIZE_NOTE" | "EMBED_NOTE";

export type Job = {
  id: string;
  type: JobType;
  noteId: string;
  attempt: number;
  runAt: number;
};

const JOBS_KEY = "voxnote.jobs.v1";
const LOCK_KEY = "voxnote.jobs.lock.v1";

function now() {
  return Date.now();
}

function loadJobs(): Job[] {
  try {
    const raw = localStorage.getItem(JOBS_KEY);
    return raw ? (JSON.parse(raw) as Job[]) : [];
  } catch {
    return [];
  }
}

function saveJobs(jobs: Job[]) {
  localStorage.setItem(JOBS_KEY, JSON.stringify(jobs));
}

function uuid() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Math.random().toString(16).slice(2)}-${Date.now()}`;
}

function backoffMs(attempt: number) {
  const base = 1_500;
  const max = 60_000;
  const exp = Math.min(max, base * Math.pow(2, Math.max(0, attempt - 1)));
  return exp + Math.floor(Math.random() * 350);
}

async function execute(job: Job) {
  if (job.type === "TRANSCRIBE_NOTE") {
    const note = await notesRepository.get(job.noteId);
    if (!note) return;

    await notesRepository.update({
      ...note,
      updatedAt: now(),
      processingStatus: "TRANSCRIBING",
      errorMessage: undefined,
    });

    const audio = await notesRepository.getAudioBlob(note);
    if (!audio) throw new Error("Audio blob missing.");

    const prefs = loadPreferences();

    // Soft paywall: block additional cloud transcription after free minutes are used.
    const { EntitlementsService } = await import(
      "@/services/entitlements/EntitlementsService"
    );
    const allowed = await EntitlementsService.canConsumeTranscription(note.durationMs);
    if (!allowed) {
      await notesRepository.update({
        ...note,
        updatedAt: now(),
        processingStatus: "FAILED",
        errorMessage:
          "Free transcription minutes limit reached. Upgrade to Pro to continue.",
      });
      return;
    }
    await EntitlementsService.consumeTranscription(note.durationMs);

    const provider = getTranscriptionProvider(prefs.transcriptionProvider);
    const result = await provider.transcribeAudioBlob(audio);

    await notesRepository.update({
      ...note,
      updatedAt: now(),
      processingStatus: "SUMMARIZING",
      transcriptText: result.text,
      language: result.language,
      errorMessage: undefined,
    });

    jobQueue.enqueueSummarization(note.id);

    if (prefs.notificationsEnabled && "Notification" in window) {
      try {
        // Best effort
        if (Notification.permission === "granted") {
          new Notification("VoxNote AI", {
            body: "Transcription finished.",
          });
        }
      } catch {
        // ignore
      }
    }
  }

  if (job.type === "SUMMARIZE_NOTE") {
    const note = await notesRepository.get(job.noteId);
    if (!note) return;

    await notesRepository.update({
      ...note,
      updatedAt: now(),
      processingStatus: "SUMMARIZING",
      errorMessage: undefined,
    });

    const provider = getSummarizationProvider();
    const { runSummarization } = await import("@/background/pipeline");
    const fields = await runSummarization({ note, summarizer: provider });

    await notesRepository.update({
      ...note,
      ...fields,
      updatedAt: now(),
      processingStatus: "READY",
      errorMessage: undefined,
    });

    jobQueue.enqueueEmbedding(note.id);
  }

  if (job.type === "EMBED_NOTE") {
    const note = await notesRepository.get(job.noteId);
    if (!note) return;

    const provider = getEmbeddingProvider();
    const { runEmbedding } = await import("@/background/pipeline");
    const embedded = await runEmbedding({ note, embedder: provider });
    if (!embedded) return;

    await embeddingsRepository.put({
      noteId: note.id,
      vector: embedded.vector,
      modelName: embedded.modelName,
      createdAt: now(),
    });
  }

}

function acquireLock(): boolean {
  try {
    const current = localStorage.getItem(LOCK_KEY);
    const t = current ? Number(current) : 0;
    if (t && now() - t < 10_000) return false;
    localStorage.setItem(LOCK_KEY, String(now()));
    return true;
  } catch {
    return true;
  }
}

function releaseLock() {
  try {
    localStorage.removeItem(LOCK_KEY);
  } catch {
    // ignore
  }
}

let running = false;
let interval: number | null = null;

export const jobQueue = {
  enqueueTranscription(noteId: string) {
    const jobs = loadJobs();
    // de-dupe
    if (jobs.some((j) => j.type === "TRANSCRIBE_NOTE" && j.noteId === noteId)) return;
    jobs.push({
      id: uuid(),
      type: "TRANSCRIBE_NOTE",
      noteId,
      attempt: 0,
      runAt: now() + 250,
    });
    saveJobs(jobs);
  },

  enqueueSummarization(noteId: string) {
    const jobs = loadJobs();
    if (jobs.some((j) => j.type === "SUMMARIZE_NOTE" && j.noteId === noteId)) return;
    jobs.push({
      id: uuid(),
      type: "SUMMARIZE_NOTE",
      noteId,
      attempt: 0,
      runAt: now() + 350,
    });
    saveJobs(jobs);
  },

  enqueueEmbedding(noteId: string) {
    const jobs = loadJobs();
    if (jobs.some((j) => j.type === "EMBED_NOTE" && j.noteId === noteId)) return;
    jobs.push({ id: uuid(), type: "EMBED_NOTE", noteId, attempt: 0, runAt: now() + 350 });
    saveJobs(jobs);
  },

  start() {
    if (interval) return;
    interval = window.setInterval(async () => {
      if (running) return;
      if (!acquireLock()) return;
      running = true;

      try {
        const jobs = loadJobs();
        const due = jobs
          .filter((j) => j.runAt <= now())
          .sort((a, b) => a.runAt - b.runAt)[0];
        if (!due) return;

        try {
          await execute(due);
          saveJobs(jobs.filter((j) => j.id !== due.id));
        } catch (e) {
          const nextAttempt = due.attempt + 1;
          const nextRunAt = now() + backoffMs(nextAttempt);

          // Mark note as failed after a few tries (only for processing jobs)
          if (nextAttempt >= 5 && due.type !== "EMBED_NOTE") {
            const note = await notesRepository.get(due.noteId);
            if (note) {
              await notesRepository.update({
                ...note,
                updatedAt: now(),
                processingStatus: "FAILED",
                errorMessage: e instanceof Error ? e.message : "Processing failed.",
              });
            }
            saveJobs(jobs.filter((j) => j.id !== due.id));
          } else if (nextAttempt >= 5 && due.type === "EMBED_NOTE") {
            // Embeddings are non-critical; drop after retries.
            saveJobs(jobs.filter((j) => j.id !== due.id));
          } else {
            saveJobs(
              jobs.map((j) =>
                j.id === due.id
                  ? { ...j, attempt: nextAttempt, runAt: nextRunAt }
                  : j
              )
            );
          }
        }
      } finally {
        running = false;
        releaseLock();
      }
    }, 750);
  },

  stop() {
    if (interval) window.clearInterval(interval);
    interval = null;
  },
};