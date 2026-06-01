import { Injectable } from '@nestjs/common';

import type { RAGSearchResult } from '@/rag/rag.interface';
import type { SearchResult } from '@/vector/vector.interface';

export const HR_KEYWORDS = [
  '年假',
  '年休假',
  '带薪休假',
  '请假',
  '休假',
  '报销',
  '发票',
  '差旅',
  '交通费',
  '住宿费',
  '通讯补贴',
  '补贴',
  '交通补贴',
  '餐补',
  '食补',
  '饭贴',
  '午餐补贴',
  '餐饮补贴',
  '晋升',
  '升职',
  '考核',
  '绩效',
  '评估',
  '调薪',
  '考勤',
  '打卡',
  '迟到',
  '早退',
  '旷工',
  '加班',
  '弹性工作',
  '福利',
  '社保',
  '公积金',
  '医疗保险',
  '体检',
  '节日',
  '工资',
  '薪资',
  '薪酬',
  '离职',
  '入职',
  '转正',
  '劳动合同',
];

const TITLE_MATCH_BONUS = 3;
const CATEGORY_MATCH_BONUS = 2;

@Injectable()
export class KeywordSearchService {
  search(query: string, chunks: SearchResult[], topK: number): RAGSearchResult[] {
    const matchedKeywords = HR_KEYWORDS.filter((kw) => query.includes(kw));

    const scored = chunks.map((chunk) => {
      let score = 0;

      if (matchedKeywords.some((kw) => chunk.heading.includes(kw))) {
        score += TITLE_MATCH_BONUS;
      }

      for (const kw of matchedKeywords) {
        const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escaped, 'g');
        const matches = chunk.content.match(regex);
        if (matches) {
          score += matches.length;
        }
      }

      if (matchedKeywords.some((kw) => chunk.categoryName.includes(kw))) {
        score += CATEGORY_MATCH_BONUS;
      }

      return { ...chunk, score, source: 'keyword' as const };
    });

    const maxScore = Math.max(...scored.map((s) => s.score), 1);

    return scored
      .map((s) => ({
        ...s,
        normalizedScore: s.score / maxScore,
        source: 'keyword' as const,
      }))
      .sort((a, b) => b.normalizedScore - a.normalizedScore)
      .slice(0, topK);
  }
}
