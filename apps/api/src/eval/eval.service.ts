import { readFileSync } from 'fs';
import { join } from 'path';

import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '@/prisma/prisma.service';
import { RAGService } from '@/rag/rag.service';

import { EvalJudgeService } from './eval-judge.service';
import type { TestQuestion } from './eval.interface';

function generateId(prefix: string): string {
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${String(ts)}-${rand}`;
}

@Injectable()
export class EvalService {
  private readonly logger = new Logger(EvalService.name);

  constructor(
    private readonly ragService: RAGService,
    private readonly judgeService: EvalJudgeService,
    private readonly prisma: PrismaService,
  ) {}

  loadQuestions(): TestQuestion[] {
    const path = join(__dirname, 'test-questions.json');
    const raw = readFileSync(path, 'utf-8');
    return JSON.parse(raw) as TestQuestion[];
  }

  async runEval(judgeModel?: string): Promise<{
    id: string;
    totalQuestions: number;
    averageAccuracy: number;
    averageCompleteness: number;
    averageRelevance: number;
    rejectionRate: number;
  }> {
    const questions = this.loadQuestions();
    const model = judgeModel ?? 'qwen2.5:7b-instruct';

    const run = await this.prisma.evalRun.create({
      data: {
        id: generateId('eval'),
        model,
        totalQuestions: questions.length,
        averageAccuracy: 0,
        averageCompleteness: 0,
        averageRelevance: 0,
        rejectionRate: 0,
        totalSources: 0,
      },
    });

    let totalSources = 0;

    for (const q of questions) {
      let answer = '';
      const sources: Array<{
        documentTitle: string;
        category: string;
        similarity: number;
      }> = [];
      let rejected = false;

      try {
        for await (const chunk of this.ragService.orchestrate(q.question)) {
          if (chunk.token) {
            answer += chunk.token;
          }
          if (chunk.done) {
            if (chunk.confidenceLevel === 'low' || chunk.error) {
              rejected = true;
              answer = chunk.error || 'RAG 拒绝回答（文档相关度不足）';
            }
            if (chunk.sources) {
              for (const s of chunk.sources) {
                sources.push({
                  documentTitle: s.documentTitle,
                  category: s.category,
                  similarity: s.similarity,
                });
              }
            }
            break;
          }
        }
      } catch (error) {
        rejected = true;
        answer = `系统错误: ${String(error)}`;
      }

      let accuracy: number | null = null;
      let completeness: number | null = null;
      let relevance: number | null = null;

      if (!rejected && answer.length > 0) {
        try {
          const scores = await this.judgeService.score(q.question, answer);
          accuracy = scores.accuracy;
          completeness = scores.completeness;
          relevance = scores.relevance;
        } catch {
          // judge failed, leave scores as null
        }
      }

      await this.prisma.evalResult.create({
        data: {
          id: generateId('er'),
          runId: run.id,
          question: q.question,
          category: q.category,
          answer,
          accuracy,
          completeness,
          relevance,
          sources: sources.length > 0 ? JSON.stringify(sources) : null,
          rejected,
        },
      });

      totalSources += sources.length;

      this.logger.log(
        `[${run.id}] ${q.question.slice(0, 30)}... → ${rejected ? 'REJECTED' : `acc=${accuracy?.toFixed(2) ?? 'N/A'}`}`,
      );
    }

    // 计算汇总
    const results = await this.prisma.evalResult.findMany({
      where: { runId: run.id },
    });
    const scored = results.filter((r) => !r.rejected && r.accuracy != null);

    const avg = (arr: number[]): number =>
      arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

    const updated = await this.prisma.evalRun.update({
      where: { id: run.id },
      data: {
        averageAccuracy: avg(scored.map((r) => r.accuracy as number)),
        averageCompleteness: avg(scored.map((r) => r.completeness as number)),
        averageRelevance: avg(scored.map((r) => r.relevance as number)),
        rejectionRate:
          results.length > 0 ? results.filter((r) => r.rejected).length / results.length : 0,
        totalSources,
      },
    });

    return {
      id: updated.id,
      totalQuestions: updated.totalQuestions,
      averageAccuracy: updated.averageAccuracy,
      averageCompleteness: updated.averageCompleteness,
      averageRelevance: updated.averageRelevance,
      rejectionRate: updated.rejectionRate,
    };
  }

  async getRuns() {
    return this.prisma.evalRun.findMany({
      orderBy: { createdAt: 'desc' },
      include: { results: true },
    });
  }
}
