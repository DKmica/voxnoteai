import { aiFetch, aiKeys } from "@/services/ai/AiService";
import type {
  TranscriptionProvider,
  TranscriptionResult,
} from "@/services/transcription/TranscriptionProvider";

export class OpenAiWhisperProvider implements TranscriptionProvider {
  id = "openai_whisper";
  displayName = "OpenAI Whisper API";
  qualityLabel = "High (cloud)" as const;

  async transcribeAudioBlob(audio: Blob): Promise<TranscriptionResult> {
    const key = aiKeys.getOpenAiKey();
    if (!key) throw new Error("Missing OpenAI API key.");

    const form = new FormData();
    form.append("file", audio, "recording.webm");
    form.append("model", "whisper-1");

    const res = await aiFetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
        },
        body: form,
      },
      { purpose: "transcription" }
    );

    const json = (await res.json()) as { text?: string; error?: unknown };
    if (!res.ok || !json.text) {
      throw new Error(
        typeof json.error === "string"
          ? json.error
          : `Transcription failed (HTTP ${res.status}).`
      );
    }

    return { text: json.text };
  }
}
