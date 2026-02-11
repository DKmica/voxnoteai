import type {
  MomentCardQuotesJson,
  MomentCardQuotesProvider,
} from "@/services/momentCards/MomentCardQuotesProvider";

function splitSentences(t: string) {
  return t
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export class LocalMomentCardQuotesProvider implements MomentCardQuotesProvider {
  id = "local";
  displayName = "Local (heuristic)";

  async extractQuotes(transcript: string): Promise<MomentCardQuotesJson> {
    const s = splitSentences(transcript);
    const candidates = s
      .filter((x) => x.length >= 18 && x.length <= 120)
      .slice(0, 6);

    const quotes = (candidates.length ? candidates : s.slice(0, 3))
      .map((q) => q.replace(/^[-•\s]+/, ""))
      .slice(0, 3);

    return { quotes };
  }
}
