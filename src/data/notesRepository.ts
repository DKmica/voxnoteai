import { voxnoteDb } from "@/data/idb/voxnoteDb";
import type { Note } from "@/domain/models";

export const notesRepository = {
  async list() {
    const notes = await voxnoteDb.listNotes();
    return notes.sort((a, b) => b.createdAt - a.createdAt);
  },
  async get(id: string) {
    return voxnoteDb.getNote(id);
  },
  async create(note: Note, audioBlob: Blob) {
    await voxnoteDb.putBlob(note.audioBlobId, audioBlob);
    await voxnoteDb.putNote(note);
  },
  async update(note: Note) {
    await voxnoteDb.putNote(note);
  },
  async delete(note: Note) {
    await voxnoteDb.deleteNote(note.id);
    await voxnoteDb.deleteBlob(note.audioBlobId);
  },
  async getAudioBlob(note: Note) {
    return voxnoteDb.getBlob(note.audioBlobId);
  },
};
