import type {
  SummarizationJson,
  SummarizationProvider,
} from "@/services/summarization/SummarizationProvider";

function splitSentences(t: string) {
  return t
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function guessType(transcript: string): SummarizationJson["type"] {
  const t = transcript.toLowerCase();
  if (t.includes("meeting") || t.includes("agenda")) return "MEETING";
  if (t.includes("todo") || t.includes("task") || t.includes("next step")) return "TASK";
  if (t.includes("i feel") || t.includes("today") || t.includes("journal")) return "JOURNAL";
  return "IDEA";
}

export class LocalSummarizationProvider implements SummarizationProvider {
  id = "local";
  displayName = "Local (heuristic)";

  async summarizeTranscript(transcript: string): Promise<SummarizationJson> {
    const sentences = splitSentences(transcript);
    const summary = sentences.slice(0, 2).join(" ").slice(0, 320);
    const title = (sentences[0] ?? transcript)
      .split(" ")
      .slice(0, 7)
      .join(" ")
      .replace(/[\s,.!?]+$/, "")
      .slice(0, 60) || "Untitled";

    const key_points = sentences.slice(0, 5).map((s) => s.slice(0, 160));

    const action_items = sentences
      .filter((s) => /\b(todo|action|next step|we should|i should)\b/i.test(s))
      .slice(0, 5)
      .map((s) => ({ text: s.slice(0, 120), checked: false as const }));

    const tags: string[] = [];
    const type = guessType(transcript);

    return {
      title,
      summary: summary || "",
      key_points,
      action_items,
      tags,
      type,
    };
  }
}
