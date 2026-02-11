import { aiFetch, aiKeys } from "@/services/ai/AiService";
import type {
  MomentCardQuotesJson,
  MomentCardQuotesProvider,
} from "@/services/momentCards/MomentCardQuotesProvider";

const PROMPT =
  "Extract 1–3 short quotable lines that are directly supported by the transcript. Do not fabricate. Output JSON: quotes[].";

export class OpenAiMomentCardQuotesProvider implements MomentCardQuotesProvider {
  id = "openai";
  displayName = "OpenAI";

  async extractQuotes(transcript: string): Promise<MomentCardQuotesJson> {
    const key = aiKeys.getOpenAiKey();
    if (!key) throw new Error("Missing OpenAI API key.");

    const res = await aiFetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          temperature: 0.2,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content:
                "You extract ONLY lines supported by the transcript. Never invent. Output ONLY valid JSON.",
            },
            { role: "user", content: PROMPT },
            { role: "user", content: transcript },
          ],
        }),
      },
      { purpose: "summarization" }
    );

    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
      error?: unknown;
    };

    const content = json.choices?.[0]?.message?.content;
    if (!res.ok || !content) {
      throw new Error(
        typeof json.error === "string"
          ? json.error
          : `Quote extraction failed (HTTP ${res.status}).`
      );
    }

    const parsed = JSON.parse(content) as MomentCardQuotesJson;
    return {
      quotes: (parsed.quotes ?? [])
        .map((q) => String(q).trim())
        .filter(Boolean)
        .slice(0, 3),
    };
  }
}
