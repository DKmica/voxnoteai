import type { TranscriptionProvider } from "@/services/transcription/TranscriptionProvider";
import { OpenAiWhisperProvider } from "@/services/transcription/providers/OpenAiWhisperProvider";
import { WebSpeechProvider } from "@/services/transcription/providers/WebSpeechProvider";

const providers: Record<string, TranscriptionProvider> = {
  openai_whisper: new OpenAiWhisperProvider(),
  web_speech: new WebSpeechProvider(),
};

export function getTranscriptionProvider(id: string): TranscriptionProvider {
  return providers[id] ?? providers.openai_whisper;
}

export function listTranscriptionProviders(): TranscriptionProvider[] {
  return Object.values(providers);
}
