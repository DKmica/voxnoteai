import { describe, expect, it, beforeEach } from "vitest";
import { EntitlementsService } from "@/services/entitlements/EntitlementsService";
import { voxnoteDb } from "@/data/idb/voxnoteDb";

beforeEach(async () => {
  localStorage.clear();
  await voxnoteDb.clearAll();
});

describe("EntitlementsService", () => {
  it("consumes transcription minutes and enforces free limit", async () => {
    // Free limit in brand config is 15 minutes.
    const fourteenMin = 14 * 60_000;
    const twoMin = 2 * 60_000;

    expect(await EntitlementsService.canConsumeTranscription(fourteenMin)).toBe(true);
    await EntitlementsService.consumeTranscription(fourteenMin);

    expect(await EntitlementsService.canConsumeTranscription(twoMin)).toBe(false);
  });

  it("allows unlimited consumption when pro is enabled (prototype toggle)", async () => {
    localStorage.setItem(
      "voxnote.preferences.v1",
      JSON.stringify({
        onboardingCompleted: true,
        notificationsEnabled: false,
        aiTrainingOptOut: true,
        proEnabled: true,
        transcriptionProvider: "openai_whisper",
      })
    );

    const huge = 120 * 60_000;
    expect(await EntitlementsService.canConsumeTranscription(huge)).toBe(true);
    await EntitlementsService.consumeTranscription(huge);
    expect(await EntitlementsService.canConsumeTranscription(huge)).toBe(true);
  });
});
