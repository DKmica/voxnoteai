import { voxnoteDb } from "@/data/idb/voxnoteDb";
import type { MomentCard } from "@/domain/models";

export const momentCardsRepository = {
  async listForNote(noteId: string) {
    return voxnoteDb.listMomentCardsForNote(noteId);
  },
  async create(card: MomentCard, imageBlob: Blob) {
    await voxnoteDb.putBlob(card.imageBlobId, imageBlob);
    await voxnoteDb.putMomentCard(card);
  },
  async delete(card: MomentCard) {
    await voxnoteDb.deleteMomentCard(card.id);
    await voxnoteDb.deleteBlob(card.imageBlobId);
  },
  async getImageBlob(card: MomentCard) {
    return voxnoteDb.getBlob(card.imageBlobId);
  },
};
