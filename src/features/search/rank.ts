import type { Embedding, Note } from "@/domain/models";
import { cosineSimilarity } from "@/utils/vector";

export type RankedNote = {
  note: Note;
  semantic: number;
};

export function rankNotesByEmbeddings(params: {
  queryVector: Float32Array;
  notes: Note[];
  embeddings: Embedding[];
  topK: number;
}): RankedNote[] {
  const embById = new Map(params.embeddings.map((e) => [e.noteId, e]));

  const ranked = params.notes
    .map((note) => {
      const e = embById.get(note.id);
      const semantic = e ? cosineSimilarity(params.queryVector, e.vector) : 0;
      return { note, semantic };
    })
    .sort((a, b) => b.semantic - a.semantic)
    .slice(0, params.topK);

  return ranked;
}
