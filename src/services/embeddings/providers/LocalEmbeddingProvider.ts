import type {
  EmbeddingProvider,
  EmbeddingResult,
} from "@/services/embeddings/EmbeddingProvider";

// Deterministic, lightweight embedding for offline fallback.
// This is NOT semantic-quality, but enables ranking + tests without a key.
const DIMS = 256;

function hash32(s: string) {
  // FNV-1a-ish
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function tokenize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2)
    .slice(0, 2000);
}

function l2Normalize(v: Float32Array) {
  let sum = 0;
  for (let i = 0; i < v.length; i++) sum += v[i] * v[i];
  const norm = Math.sqrt(sum) || 1;
  for (let i = 0; i < v.length; i++) v[i] /= norm;
}

export class LocalEmbeddingProvider implements EmbeddingProvider {
  id = "local_hash";
  displayName = "Local (hash)";

  async embedText(text: string): Promise<EmbeddingResult> {
    const tokens = tokenize(text);
    const v = new Float32Array(DIMS);

    for (const tok of tokens) {
      const h = hash32(tok);
      const idx = h % DIMS;
      const sign = (h & 1) === 0 ? 1 : -1;
      v[idx] += sign * (1 + (tok.length % 3) * 0.25);
    }

    l2Normalize(v);

    return { vector: v, modelName: `local_hash_${DIMS}` };
  }
}
