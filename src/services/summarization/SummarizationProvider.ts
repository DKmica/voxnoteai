import type { NoteType } from "@/domain/models";

export type SummarizationJson = {
  title: string;
  summary: string;
  key_points: string[];
  action_items: { text: string; checked: false }[];
  tags: string[];
  type: NoteType;
};

export interface SummarizationProvider {
  id: string;
  displayName: string;
  summarizeTranscript: (transcript: string) => Promise<SummarizationJson>;
}
