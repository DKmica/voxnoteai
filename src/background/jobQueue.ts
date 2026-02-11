import { notesRepository } from "@/data/notesRepository";
import { loadPreferences } from "@/state/preferences";
import { getTranscriptionProvider } from "@/services/transcription/providerRegistry";

export type JobType = "TRANSCRIBE_NOTE";

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
  return (typeof crypto !== "undefined" && "randomUUID" in crypto)
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
    jobs.push({ id: uuid(), type: "TRANSCRIBE_NOTE", noteId, attempt: 0, runAt: now() + 250 });
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

          // Mark note as failed after a few tries
          if (nextAttempt >= 5) {
            const note = await notesRepository.get(due.noteId);
            if (note) {
              await notesRepository.update({
                ...note,
                updatedAt: now(),
                processingStatus: "FAILED",
                errorMessage:
                  e instanceof Error ? e.message : "Processing failed.",
              });
            }
            saveJobs(jobs.filter((j) => j.id !== due.id));
          } else {
            saveJobs(
              jobs.map((j) =>
                j.id === due.id ? { ...j, attempt: nextAttempt, runAt: nextRunAt } : j
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
