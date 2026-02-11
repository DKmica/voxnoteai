export type EmbeddingResult = {
  vector: Float32Array;
  modelName: string;
};

export interface EmbeddingProvider {
  id: string;
  displayName: string;
  embedText: (text: string) => Promise<EmbeddingResult>;
}
