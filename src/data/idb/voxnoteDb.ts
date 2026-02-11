import type { Embedding, MomentCard, Note, UserEntitlements } from "@/domain/models";

const DB_NAME = "voxnote.db";
const DB_VERSION = 1;

type StoreNames = "notes" | "blobs" | "embeddings" | "momentCards" | "entitlements";

type BlobRow = { id: string; blob: Blob; createdAt: number };

type VoxnoteDb = IDBDatabase;

function openDb(): Promise<VoxnoteDb> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("notes")) {
        db.createObjectStore("notes", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("blobs")) {
        db.createObjectStore("blobs", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("embeddings")) {
        db.createObjectStore("embeddings", { keyPath: "noteId" });
      }
      if (!db.objectStoreNames.contains("momentCards")) {
        db.createObjectStore("momentCards", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("entitlements")) {
        db.createObjectStore("entitlements", { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStore<T>(
  storeName: StoreNames,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const req = fn(store);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStoreVoid(
  storeName: StoreNames,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<unknown>
): Promise<void> {
  const db = await openDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const req = fn(store);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export const voxnoteDb = {
  async putNote(note: Note) {
    await withStoreVoid("notes", "readwrite", (s) => s.put(note));
  },
  async getNote(id: string): Promise<Note | undefined> {
    return (await withStore("notes", "readonly", (s) => s.get(id))) ?? undefined;
  },
  async listNotes(): Promise<Note[]> {
    return (await withStore("notes", "readonly", (s) => s.getAll())) as Note[];
  },
  async deleteNote(id: string) {
    await withStoreVoid("notes", "readwrite", (s) => s.delete(id));
  },

  async putBlob(id: string, blob: Blob) {
    const row: BlobRow = { id, blob, createdAt: Date.now() };
    await withStoreVoid("blobs", "readwrite", (s) => s.put(row));
  },
  async getBlob(id: string): Promise<Blob | undefined> {
    const row = (await withStore("blobs", "readonly", (s) => s.get(id))) as
      | BlobRow
      | undefined;
    return row?.blob;
  },
  async deleteBlob(id: string) {
    await withStoreVoid("blobs", "readwrite", (s) => s.delete(id));
  },

  async putEmbedding(e: Omit<Embedding, "vector"> & { vector: Float32Array }) {
    // Store Float32Array as Array<number> for IDB compatibility across browsers.
    const row = { ...e, vector: Array.from(e.vector) };
    await withStoreVoid("embeddings", "readwrite", (s) => s.put(row));
  },
  async getEmbedding(noteId: string): Promise<Embedding | undefined> {
    const row = (await withStore("embeddings", "readonly", (s) => s.get(noteId))) as
      | (Omit<Embedding, "vector"> & { vector: number[] })
      | undefined;
    if (!row) return undefined;
    return { ...row, vector: new Float32Array(row.vector) };
  },
  async listEmbeddings(): Promise<Embedding[]> {
    const rows = (await withStore(
      "embeddings",
      "readonly",
      (s) => s.getAll()
    )) as (Omit<Embedding, "vector"> & { vector: number[] })[];
    return rows.map((r) => ({ ...r, vector: new Float32Array(r.vector) }));
  },

  async putMomentCard(c: MomentCard) {
    await withStoreVoid("momentCards", "readwrite", (s) => s.put(c));
  },
  async listMomentCardsForNote(noteId: string): Promise<MomentCard[]> {
    const all = (await withStore(
      "momentCards",
      "readonly",
      (s) => s.getAll()
    )) as MomentCard[];
    return all
      .filter((c) => c.noteId === noteId)
      .sort((a, b) => b.createdAt - a.createdAt);
  },
  async deleteMomentCard(id: string) {
    await withStoreVoid("momentCards", "readwrite", (s) => s.delete(id));
  },

  async getEntitlements(): Promise<UserEntitlements | undefined> {
    return (await withStore(
      "entitlements",
      "readonly",
      (s) => s.get("me")
    )) as UserEntitlements | undefined;
  },
  async putEntitlements(e: UserEntitlements) {
    await withStoreVoid("entitlements", "readwrite", (s) => s.put(e));
  },
  async clearAll() {
    const db = await openDb();
    await Promise.all(
      (Array.from(db.objectStoreNames) as StoreNames[]).map(
        (name) =>
          new Promise<void>((resolve, reject) => {
            const tx = db.transaction(name, "readwrite");
            const req = tx.objectStore(name).clear();
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
          })
      )
    );
  },
};