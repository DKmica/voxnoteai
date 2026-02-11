import { aiFetch, getAiAuth } from "@/services/ai/AiService";

import type {
  EmbeddingProvider,
  EmbeddingResult,
} from "@/services/embeddings/EmbeddingProvider";

export class OpenAiEmbeddingProvider implements EmbeddingProvider {
  id = "openai_embeddings";
  displayName = "OpenAI Embeddings";

  async embedText(text: string): Promise<EmbeddingResult> {
    const { apiKey, baseUrl } = getAiAuth({ purpose: "embedding" });

    const res = await aiFetch(
      `${baseUrl}/v1/embeddings`,

      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,

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
