import { aiFetch, aiKeys } from "@/services/ai/AiService";
import type {
  EmbeddingProvider,
  EmbeddingResult,
} from "@/services/embeddings/EmbeddingProvider";

export class OpenAiEmbeddingProvider implements EmbeddingProvider {
  id = "openai_embeddings";
  displayName = "OpenAI Embeddings";

  async embedText(text: string): Promise<EmbeddingResult> {
    const key = aiKeys.getOpenAiKey();
    if (!key) throw new Error("Missing OpenAI API key.");

    const res = await aiFetch(
      "https://api.openai.com/v1/embeddings",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "text-embedding-3-small",
          input: text.slice(0, 12_000),
        }),
      },
      { purpose: "embedding" }
    );

    const json = (await res.json()) as {
      data?: { embedding?: number[] }[];
      model?: string;
      error?: unknown;
    };

    const emb = json.data?.[0]?.embedding;
    if (!res.ok || !emb) {
      throw new Error(
        typeof json.error === "string"
          ? json.error
          : `Embedding failed (HTTP ${res.status}).`
      );
    }

    return {
      vector: new Float32Array(emb),
      modelName: json.model ?? "text-embedding-3-small",
    };
  }
}
