export type Preferences = {
  onboardingCompleted: boolean;
  notificationsEnabled: boolean;
  aiTrainingOptOut: boolean;
  proEnabled: boolean; // web prototype toggle
  transcriptionProvider: "openai_whisper" | "web_speech";
};

const KEY = "voxnote.preferences.v1";

export function loadPreferences(): Preferences {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultPreferences;
    const parsed = JSON.parse(raw) as Partial<Preferences>;
    return {
      ...defaultPreferences,
      ...parsed,
    };
  } catch {
    return defaultPreferences;
  }
}

export function savePreferences(next: Preferences) {
  localStorage.setItem(KEY, JSON.stringify(next));
}

export const defaultPreferences: Preferences = {
  onboardingCompleted: false,
  notificationsEnabled: false,
  aiTrainingOptOut: true,
  proEnabled: false,
  transcriptionProvider: "openai_whisper",
};