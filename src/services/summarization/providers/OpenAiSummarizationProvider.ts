import { aiFetch, getAiAuth } from "@/services/ai/AiService";

import type {
  SummarizationJson,
  SummarizationProvider,
} from "@/services/summarization/SummarizationProvider";

const PROMPT =
  "Given this transcript, produce JSON with fields: title, summary, key_points[], action_items[{text, checked:false}], tags[], type(one of: IDEA,TASK,MEETING,JOURNAL). Preserve meaning. Do not invent details not present. If uncertain, leave fields conservative.";

function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return JSON.parse(text.slice(start, end + 1));
  }
  return JSON.parse(text);
}

export class OpenAiSummarizationProvider implements SummarizationProvider {
  id = "openai_chat";
  displayName = "OpenAI Chat Completions";

  async summarizeTranscript(transcript: string): Promise<SummarizationJson> {
    const { apiKey, baseUrl } = getAiAuth({ purpose: "summarization" });

    const res = await aiFetch(
      `${baseUrl}/v1/chat/completions`,

      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,

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
                "You are a careful assistant that only uses the provided transcript. Never fabricate. Output ONLY valid JSON.",
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
          : `Summarization failed (HTTP ${res.status}).`
      );
    }

    const parsed = extractJson(content) as SummarizationJson;
    return parsed;
  }
}
