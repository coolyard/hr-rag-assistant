import { Injectable, Logger } from '@nestjs/common';

import { LLMService } from '@/llm/llm.service';

const JUDGE_PROMPT = `你是一个 HR 知识评估专家。请对以下 AI 回答进行质量评分。

## 用户问题
{{question}}

## AI 回答
{{answer}}

## 评分标准
- accuracy（准确性 0-1）：回答的事实是否准确，有无虚构或错误
- completeness（完整性 0-1）：是否覆盖了问题的所有关键方面
- relevance（相关性 0-1）：回答是否直接针对问题，有无跑题

## 输出格式
请严格输出 JSON，不要包含其他文字：
{"accuracy": 0.85, "completeness": 0.72, "relevance": 0.91}`;

export interface JudgeScores {
  accuracy: number;
  completeness: number;
  relevance: number;
}

@Injectable()
export class EvalJudgeService {
  private readonly logger = new Logger(EvalJudgeService.name);

  constructor(private readonly llmService: LLMService) {}

  async score(question: string, answer: string): Promise<JudgeScores> {
    const prompt = JUDGE_PROMPT.replace('{{question}}', question).replace('{{answer}}', answer);

    try {
      let fullResponse = '';
      for await (const token of this.llmService.generate(prompt)) {
        fullResponse += token;
      }

      const jsonMatch = /{[^}]+}/.exec(fullResponse);
      if (!jsonMatch) {
        this.logger.warn(`Judge did not return valid JSON: ${fullResponse.slice(0, 100)}`);
        return { accuracy: 0, completeness: 0, relevance: 0 };
      }

      const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
      return {
        accuracy: this.clamp(Number(parsed.accuracy ?? 0)),
        completeness: this.clamp(Number(parsed.completeness ?? 0)),
        relevance: this.clamp(Number(parsed.relevance ?? 0)),
      };
    } catch (error) {
      this.logger.error(`Judge scoring failed: ${String(error)}`);
      return { accuracy: 0, completeness: 0, relevance: 0 };
    }
  }

  private clamp(value: number): number {
    return Math.max(0, Math.min(1, Number.isNaN(value) ? 0 : value));
  }
}
