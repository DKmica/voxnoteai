import type { SummarizationProvider } from "@/services/summarization/SummarizationProvider";
import { OpenAiSummarizationProvider } from "@/services/summarization/providers/OpenAiSummarizationProvider";
import { LocalSummarizationProvider } from "@/services/summarization/providers/LocalSummarizationProvider";
import { aiKeyring } from "@/services/ai/keyring";

const providers: SummarizationProvider[] = [
  new OpenAiSummarizationProvider(),
  new LocalSummarizationProvider(),
];

export function getSummarizationProvider(): SummarizationProvider {
  // Prefer OpenAI when a key is configured for summarization; otherwise local fallback.
  try {
    const k = aiKeyring.getKeyFor({ purpose: "summarization" });
    if (k?.apiKey && k.apiKey.trim().length > 0) return providers[0];
  } catch {
    // ignore
  }
  return providers[1];
}
