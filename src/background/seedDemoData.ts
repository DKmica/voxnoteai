import { notesRepository } from "@/data/notesRepository";
import { embeddingsRepository } from "@/data/embeddingsRepository";
import type { Note } from "@/domain/models";
import { uuid } from "@/utils/ids";
import { LocalEmbeddingProvider } from "@/services/embeddings/providers/LocalEmbeddingProvider";

function emptyAudioBlob() {
  return new Blob([], { type: "audio/webm" });
}

function nowMinus(hours: number) {
  return Date.now() - hours * 60 * 60 * 1000;
}

function makeDemoNote(p: {
  createdAt: number;
  durationMs: number;
  title: string;
  transcript: string;
  summary: string;
  keyPoints: string[];
  actionItems: { text: string; checked: boolean }[];
  tags: string[];
  type: Note["type"];
}): Note {
  const id = uuid();
  const audioBlobId = uuid();
  return {
    id,
    createdAt: p.createdAt,
    updatedAt: p.createdAt,
    audioBlobId,
    durationMs: p.durationMs,
    language: "en",
    transcriptText: p.transcript,
    summaryText: p.summary,
    titleText: p.title,
    keyPoints: p.keyPoints,
    actionItems: p.actionItems,
    tags: p.tags,
    type: p.type,
    isFavorite: false,
    processingStatus: "READY",
  };
}

export async function seedDemoDataIfEmpty() {
  const existing = await notesRepository.list();
  if (existing.length > 0) return;

  const demo = [
    makeDemoNote({
      createdAt: nowMinus(2),
      durationMs: 86_000,
      title: "Product bet: Moments that share themselves",
      transcript:
        "Idea for VoxNote AI: users record a voice note, then we automatically pull out a single quotable line. " +
        "The key is to keep it truthful—only supported by the transcript. " +
        "We should offer 3 card styles: Minimal, Bold, Calm. Export as PNG with a watermark for free tier.",
      summary:
        "Propose a viral ‘Moment Card’ feature that extracts a quotable insight from the transcript and renders it in 3 shareable templates.",
      keyPoints: [
        "Moment Cards must be grounded: no hallucinations.",
        "Offer 3 themes and export as PNG.",
        "Free tier gets watermark + limited cards/month.",
      ],
      actionItems: [
        { text: "Design 3 templates with strong contrast and rounded frames.", checked: false },
        { text: "Add monthly limits + watermark toggle.", checked: false },
      ],
      tags: ["product", "growth", "moment-cards"],
      type: "IDEA",
    }),

    makeDemoNote({
      createdAt: nowMinus(26),
      durationMs: 142_000,
      title: "Team sync: shipping plan",
      transcript:
        "Meeting notes: Phase 1 is navigation + onboarding. Phase 2 is recording and local storage. " +
        "Phase 3 is transcription providers with OpenAI Whisper as default. " +
        "We also need WorkManager-style background processing, but for the web prototype we simulate it with a job queue.",
      summary:
        "Outline a phased plan for shipping VoxNote AI, starting with onboarding/navigation and building toward transcription + background processing.",
      keyPoints: [
        "Build in phases so each phase runs end-to-end.",
        "Transcription providers should be swappable without UI changes.",
        "Background processing should persist and retry.",
      ],
      actionItems: [
        { text: "Implement summarization + embedding jobs after transcription.", checked: false },
      ],
      tags: ["meeting", "plan"],
      type: "MEETING",
    }),

    makeDemoNote({
      createdAt: nowMinus(54),
      durationMs: 61_000,
      title: "Personal: keep notes actionable",
      transcript:
        "Journal: I keep recording thoughts but I never act on them. " +
        "I want the app to pull out action items and let me check them off. " +
        "If I'm unsure, I'd rather see fewer tasks than made-up ones.",
      summary:
        "Preference: keep action items conservative and easy to check off; avoid inventing tasks.",
      keyPoints: [
        "Action items should be grounded and minimal.",
        "Checkbox UX matters.",
      ],
      actionItems: [
        { text: "Review my open action items every morning.", checked: false },
      ],
      tags: ["journal", "habits"],
      type: "JOURNAL",
    }),
  ];

  const embedder = new LocalEmbeddingProvider();

  for (const n of demo) {
    await notesRepository.create(n, emptyAudioBlob());

    const text = [n.titleText, n.summaryText, n.transcriptText]
      .filter(Boolean)
      .join("\n\n");
    const emb = await embedder.embedText(text);

    await embeddingsRepository.put({
      noteId: n.id,
      vector: emb.vector,
      modelName: emb.modelName,
      createdAt: Date.now(),
    });
  }
}
