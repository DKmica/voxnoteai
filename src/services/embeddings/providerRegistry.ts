import type { EmbeddingProvider } from "@/services/embeddings/EmbeddingProvider";
import { OpenAiEmbeddingProvider } from "@/services/embeddings/providers/OpenAiEmbeddingProvider";
import { LocalEmbeddingProvider } from "@/services/embeddings/providers/LocalEmbeddingProvider";
import { aiKeyring } from "@/services/ai/keyring";

const providers: EmbeddingProvider[] = [
  new OpenAiEmbeddingProvider(),
  new LocalEmbeddingProvider(),
];

export function getEmbeddingProvider(): EmbeddingProvider {
  // Prefer OpenAI when a key is configured for embeddings; otherwise local fallback.
  try {
    const k = aiKeyring.getKeyFor({ purpose: "embedding" });
    if (k?.apiKey && k.apiKey.trim().length > 0) return providers[0];
  } catch {
    // ignore
  }
  return providers[1];
}
