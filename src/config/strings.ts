import { brand } from "@/config/brand";

export const strings = {
  appName: brand.appName,
  onboarding: {
    valueTitle: "Capture moments. Keep moving.",
    valueBody:
      "Record a thought, meeting, or brainstorm — VoxNote AI turns it into clean summaries, action items, and searchable knowledge.",
    privacyTitle: "Private by design",
    privacyBody:
      "Your audio stays on this device unless you choose cloud transcription. You can export or delete everything anytime.",
    permissionsTitle: "Permissions",
    permissionsBody:
      "Microphone is required to record. Notifications are optional for background processing updates.",
  },
  tabs: {
    record: "Record",
    notes: "Notes",
    search: "Search",
    profile: "Profile",
  },
} as const;
