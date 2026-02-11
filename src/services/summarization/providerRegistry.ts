import type { SummarizationProvider } from "@/services/summarization/SummarizationProvider";
import { OpenAiSummarizationProvider } from "@/services/summarization/providers/OpenAiSummarizationProvider";
import { LocalSummarizationProvider } from "@/services/summarization/providers/LocalSummarizationProvider";

const providers: SummarizationProvider[] = [
  new OpenAiSummarizationProvider(),
  new LocalSummarizationProvider(),
];

export function getSummarizationProvider(): SummarizationProvider {
  // Prefer OpenAI when key is available; otherwise local fallback.
  try {
    const key = localStorage.getItem("voxnote.openai_api_key");
    if (key && key.trim().length > 0) return providers[0];
  } catch {
    // ignore
  }
  return providers[1];
}
