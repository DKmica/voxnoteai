export type MomentCardQuotesJson = { quotes: string[] };

export interface MomentCardQuotesProvider {
  id: string;
  displayName: string;
  extractQuotes: (transcript: string) => Promise<MomentCardQuotesJson>;
}
