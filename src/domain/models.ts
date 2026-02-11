export type NoteType = "IDEA" | "TASK" | "MEETING" | "JOURNAL";

export type ProcessingStatus =
  | "RECORDED"
  | "TRANSCRIBING"
  | "SUMMARIZING"
  | "READY"
  | "FAILED";

export type ActionItem = { text: string; checked: boolean };

export type Note = {
  id: string;
  createdAt: number;
  updatedAt: number;

  audioBlobId: string;
  durationMs: number;
  language?: string;

  transcriptText?: string;
  summaryText?: string;
  titleText?: string;

  keyPoints: string[];
  actionItems: ActionItem[];
  tags: string[];
  type?: NoteType;

  isFavorite: boolean;
  processingStatus: ProcessingStatus;
  errorMessage?: string;
};

export type Embedding = {
  noteId: string;
  vector: Float32Array;
  modelName: string;
  createdAt: number;
};

export type MomentCardTheme = "MINIMAL" | "BOLD" | "CALM";

export type MomentCard = {
  id: string;
  noteId: string;
  quoteText: string;
  theme: MomentCardTheme;
  createdAt: number;
  imageBlobId: string;
};

export type UserEntitlements = {
  id: "me";
  isPro: boolean;
  minutesUsedThisMonth: number;
  momentCardsUsedThisMonth: number;
  resetAt: number; // unix ms
};
