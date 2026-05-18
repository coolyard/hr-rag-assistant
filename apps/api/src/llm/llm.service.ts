import { Injectable, Inject, Logger } from '@nestjs/common';
import axios from 'axios';

import { LLM_CONFIG, type LLMConfig } from '@/llm/llm.config';
import type { ILLMService } from '@/llm/llm.interface';

@Injectable()
export class LLMService implements ILLMService {
  private readonly logger = new Logger(LLMService.name);

  constructor(@Inject(LLM_CONFIG) private readonly config: LLMConfig) {}

  async *generate(
    systemPrompt: string,
    history: string,
    retrievedChunks: string,
    userQuestion: string,
  ): AsyncIterable<string> {
    const prompt = [
      systemPrompt,
      '',
      '## 检索到的文档片段',
      retrievedChunks,
      '',
      '## 对话历史',
      history,
      '',
      '## 当前问题',
      userQuestion,
      '',
      '请基于以上文档片段回答问题。如果文档片段为空或无关，请直接返回拒绝话术。',
    ].join('\n');

    const url = `${this.config.ollamaBaseUrl}/api/generate`;
    const body = JSON.stringify({
      model: this.config.model,
      prompt,
      stream: true,
      options: {
        temperature: this.config.temperature,
        top_p: this.config.topP,
        top_k: this.config.topK,
        num_predict: this.config.maxTokens,
      },
    });

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        signal: AbortSignal.timeout(this.config.timeout),
      });

      if (!response.ok || !response.body) {
        throw new Error(`Ollama responded with status ${String(response.status)}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      for (;;) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.length === 0) {
            continue;
          }
          const parsed = JSON.parse(trimmed) as { response?: string; done?: boolean };
          if (parsed.response) {
            yield parsed.response;
          }
          if (parsed.done) {
            return;
          }
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`LLM generate failed: ${message}`);
      throw error;
    }
  }

  async healthCheck(): Promise<{ available: boolean; model: string }> {
    try {
      const url = `${this.config.ollamaBaseUrl}/api/tags`;
      await axios.get(url, { timeout: 5000 });
      return { available: true, model: this.config.model };
    } catch {
      return { available: false, model: this.config.model };
    }
  }
}
