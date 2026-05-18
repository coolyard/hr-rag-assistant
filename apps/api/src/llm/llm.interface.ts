export interface ILLMService {
  generate(
    systemPrompt: string,
    history: string,
    retrievedChunks: string,
    userQuestion: string,
  ): AsyncIterable<string>;

  healthCheck(): Promise<{ available: boolean; model: string }>;
}
