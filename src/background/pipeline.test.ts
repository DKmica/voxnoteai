import { describe, expect, it, beforeEach } from "vitest";
import type { Note } from "@/domain/models";
import { runSummarization, runEmbedding } from "@/background/pipeline";
import { LocalSummarizationProvider } from "@/services/summarization/providers/LocalSummarizationProvider";
import { LocalEmbeddingProvider } from "@/services/embeddings/providers/LocalEmbeddingProvider";

beforeEach(() => {
  localStorage.clear();
});

describe("note processing pipeline", () => {
  it("summarizes transcript into structured fields", async () => {
    const note: Note = {
      id: "n1",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      audioBlobId: "b1",
      durationMs: 12_000,
      transcriptText:
        "Meeting agenda. Next step: send the recap. We should track action items.",
      keyPoints: [],
      actionItems: [],
      tags: [],
      isFavorite: false,
      processingStatus: "SUMMARIZING",
    };

    const fields = await runSummarization({
      note,
      summarizer: new LocalSummarizationProvider(),
    });

    expect(fields.titleText?.length).toBeGreaterThan(0);
    expect(fields.summaryText?.length).toBeGreaterThan(0);
    expect(Array.isArray(fields.keyPoints)).toBe(true);
    expect(Array.isArray(fields.actionItems)).toBe(true);
  });

  it("creates an embedding vector for retrieval", async () => {
    const note: Note = {
      id: "n2",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      audioBlobId: "b2",
      durationMs: 9_000,
      transcriptText: "I want to design a shareable Moment Card feature.",
      titleText: "Moment Cards",
      summaryText: "Shareable quote cards from voice notes.",
      keyPoints: [],
      actionItems: [],
      tags: [],
      isFavorite: false,
      processingStatus: "READY",
    };

    const embedded = await runEmbedding({
      note,
      embedder: new LocalEmbeddingProvider(),
    });

    expect(embedded).not.toBeNull();
    expect(embedded!.vector.length).toBe(256);
  });
});
