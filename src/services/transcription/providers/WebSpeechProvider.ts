import type {
  TranscriptionProvider,
  TranscriptionResult,
} from "@/services/transcription/TranscriptionProvider";

/**
 * Basic fallback provider.
 * Note: The Web Speech API does not reliably support file-based transcription.
 * We expose a stub for parity with the Android plan.
 */
export class WebSpeechProvider implements TranscriptionProvider {
  id = "web_speech";
  displayName = "On-device Speech (Web Speech API)";
  qualityLabel = "Basic (on-device)" as const;

  async transcribeAudioBlob(_audio: Blob): Promise<TranscriptionResult> {
    throw new Error(
      "On-device fallback is not available for file-based transcription in this web prototype. Use OpenAI Whisper, or transcribe live in a future phase."
    );
  }
}
