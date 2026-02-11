import type { MomentCardQuotesProvider } from "@/services/momentCards/MomentCardQuotesProvider";
import { OpenAiMomentCardQuotesProvider } from "@/services/momentCards/providers/OpenAiMomentCardQuotesProvider";
import { LocalMomentCardQuotesProvider } from "@/services/momentCards/providers/LocalMomentCardQuotesProvider";
import { aiKeyring } from "@/services/ai/keyring";

const providers: MomentCardQuotesProvider[] = [
  new OpenAiMomentCardQuotesProvider(),
  new LocalMomentCardQuotesProvider(),
];

export function getMomentCardQuotesProvider(): MomentCardQuotesProvider {
  try {
    const k = aiKeyring.getKeyFor({ purpose: "moment_cards" });
    if (k?.apiKey && k.apiKey.trim().length > 0) return providers[0];
  } catch {
    // ignore
  }
  return providers[1];
}
