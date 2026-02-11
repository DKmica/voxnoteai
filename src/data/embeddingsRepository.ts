import { voxnoteDb } from "@/data/idb/voxnoteDb";
import type { Embedding } from "@/domain/models";

export const embeddingsRepository = {
  async get(noteId: string): Promise<Embedding | undefined> {
    return voxnoteDb.getEmbedding(noteId);
  },
  async put(e: Embedding) {
    await voxnoteDb.putEmbedding(e);
  },
};
