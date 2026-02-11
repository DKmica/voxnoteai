import type { MomentCardQuotesProvider } from "@/services/momentCards/MomentCardQuotesProvider";
import { OpenAiMomentCardQuotesProvider } from "@/services/momentCards/providers/OpenAiMomentCardQuotesProvider";
import { LocalMomentCardQuotesProvider } from "@/services/momentCards/providers/LocalMomentCardQuotesProvider";

const providers: MomentCardQuotesProvider[] = [
  new OpenAiMomentCardQuotesProvider(),
  new LocalMomentCardQuotesProvider(),
];

export function getMomentCardQuotesProvider(): MomentCardQuotesProvider {
  try {
    const key = localStorage.getItem("voxnote.openai_api_key");
    if (key && key.trim().length > 0) return providers[0];
  } catch {
    // ignore
  }
  return providers[1];
}
