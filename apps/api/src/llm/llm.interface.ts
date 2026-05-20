export interface ILLMService {
  generate(prompt: string): AsyncIterable<string>;

  healthCheck(): Promise<{ available: boolean; model: string }>;
}
