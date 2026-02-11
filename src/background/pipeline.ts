import type { Note } from "@/domain/models";
import type { SummarizationProvider } from "@/services/summarization/SummarizationProvider";
import type { EmbeddingProvider } from "@/services/embeddings/EmbeddingProvider";

export async function runSummarization(params: {
  note: Note;
  summarizer: SummarizationProvider;
}): Promise<Pick<Note, "titleText" | "summaryText" | "keyPoints" | "actionItems" | "tags" | "type">> {
  if (!params.note.transcriptText) throw new Error("Transcript missing.");
  const s = await params.summarizer.summarizeTranscript(params.note.transcriptText);
  return {
    titleText: s.title,
    summaryText: s.summary,
    keyPoints: s.key_points,
    actionItems: s.action_items,
    tags: s.tags,
    type: s.type,
  };
}

export async function runEmbedding(params: {
  note: Note;
  embedder: EmbeddingProvider;
}): Promise<{ vector: Float32Array; modelName: string } | null> {
  const text = [params.note.titleText, params.note.summaryText, params.note.transcriptText]
    .filter(Boolean)
    .join("\n\n");
  if (!text.trim()) return null;
  const embedded = await params.embedder.embedText(text);
  return { vector: embedded.vector, modelName: embedded.modelName };
}
