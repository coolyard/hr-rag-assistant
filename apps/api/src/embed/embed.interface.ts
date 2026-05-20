export interface IEmbeddingService {
  embed(text: string): Promise<number[]>;

  embedBatch(texts: string[]): Promise<number[][]>;

  healthCheck(): Promise<{ available: boolean; model: string }>;
}
