import { Injectable, Logger } from '@nestjs/common';

import { HR_KEYWORDS } from '@/rag/keyword-search.service';

export type QueryCategory = 'exact-keyword' | 'semantic' | 'mixed';

export interface QueryClassification {
  /** 分类类别 */
  category: QueryCategory;
  /** 分类置信度 [0, 1] */
  confidence: number;
  /** 向量检索权重 [0, 1] */
  vectorWeight: number;
  /** 关键词检索权重 [0, 1] */
  keywordWeight: number;
}

/** 权重预设表 */
const WEIGHT_PRESETS: Record<
  QueryCategory,
  { vectorWeight: number; keywordWeight: number; confidence: number }
> = {
  'exact-keyword': { vectorWeight: 0.2, keywordWeight: 0.8, confidence: 0.9 },
  semantic: { vectorWeight: 0.7, keywordWeight: 0.3, confidence: 0.85 },
  mixed: { vectorWeight: 0.4, keywordWeight: 0.6, confidence: 0.8 },
};

@Injectable()
export class QueryClassifier {
  private readonly logger = new Logger(QueryClassifier.name);

  /**
   * 对用户查询进行分类，返回类别 + 建议权重
   *
   * 分类规则：
   * - exact-keyword: 包含 ≥2 个 HR_KEYWORDS 且无口语化标记
   * - semantic: 无关键词匹配，或有口语化标记且关键词密度 < 0.08
   * - mixed: 其余情况（默认）
   *
   * @param query 用户查询文本
   * @returns 分类结果（含权重建议）
   */
  classify(query: string): QueryClassification {
    const keywordMatches = HR_KEYWORDS.filter((kw) => kw.length >= 2 && query.includes(kw));
    const hasColloquialMarkers = /感觉|我想|想问问|怎么|怎么样|如何|是不是|能不能|可不可以/.test(
      query,
    );
    const keywordDensity = keywordMatches.length / Math.max(query.length, 1);

    let category: QueryCategory;

    if (keywordDensity > 0.15 && keywordMatches.length >= 1 && !hasColloquialMarkers) {
      category = 'exact-keyword';
    } else if (keywordMatches.length === 0 || (hasColloquialMarkers && keywordDensity < 0.08)) {
      category = 'semantic';
    } else {
      category = 'mixed';
    }

    const preset = WEIGHT_PRESETS[category];
    this.logger.log(
      `Query classified as "${category}" (keywords: ${String(keywordMatches.length)}, density: ${keywordDensity.toFixed(3)}, colloquial: ${String(hasColloquialMarkers)}) → v:${String(preset.vectorWeight)} k:${String(preset.keywordWeight)}`,
    );

    return {
      category,
      confidence: preset.confidence,
      vectorWeight: preset.vectorWeight,
      keywordWeight: preset.keywordWeight,
    };
  }
}
