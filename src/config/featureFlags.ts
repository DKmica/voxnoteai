export type FeatureFlags = {
  globalChat: boolean;
  momentCards: boolean;
  cloudSync: boolean;
  speakerDiarization: boolean;
};

export const defaultFeatureFlags: FeatureFlags = {
  globalChat: true,
  momentCards: true,
  cloudSync: false,
  speakerDiarization: false,
};
