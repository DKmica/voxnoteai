export type TranscriptionResult = {
  text: string;
  language?: string;
};

export interface TranscriptionProvider {
  id: string;
  displayName: string;
  qualityLabel: "High (cloud)" | "Basic (on-device)";
  transcribeAudioBlob: (audio: Blob) => Promise<TranscriptionResult>;
}
