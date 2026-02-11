import type { EmbeddingProvider } from "@/services/embeddings/EmbeddingProvider";
import { OpenAiEmbeddingProvider } from "@/services/embeddings/providers/OpenAiEmbeddingProvider";
import { LocalEmbeddingProvider } from "@/services/embeddings/providers/LocalEmbeddingProvider";

const providers: EmbeddingProvider[] = [
  new OpenAiEmbeddingProvider(),
  new LocalEmbeddingProvider(),
];

export function getEmbeddingProvider(): EmbeddingProvider {
  // Prefer OpenAI when key is available; otherwise local fallback.
  try {
    const key = localStorage.getItem("voxnote.openai_api_key");
    if (key && key.trim().length > 0) return providers[0];
  } catch {
    // ignore
  }
  return providers[1];
}
