import { KeywordSearchService } from '@/rag/keyword-search.service';
import type { SearchResult } from '@/vector/vector.interface';

describe('KeywordSearchService', () => {
  let service: KeywordSearchService;

  function createMockChunk(
    id: string,
    content: string,
    heading: string,
    categoryName: string,
  ): SearchResult {
    return {
      chunkId: id,
      content,
      documentName: 'test.md',
      documentTitle: '测试文档',
      category: 'test',
      categoryName,
      heading,
      similarity: 0,
      metadata: {
        chunkId: id,
        documentName: 'test.md',
        documentTitle: '测试文档',
        category: 'test',
        categoryName,
        heading,
        content,
        charCount: content.length,
      },
    };
  }

  beforeEach(() => {
    service = new KeywordSearchService();
  });

  it('应匹配查询中的 HR 关键词并返回排序结果', () => {
    const chunks = [
      createMockChunk('1', '年假有 5 天', '## 年假规则', '年假'),
      createMockChunk('2', '报销流程说明', '## 报销', '报销'),
    ];
    const results = service.search('年假怎么请', chunks, 2);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].chunkId).toBe('1');
  });

  it('标题匹配应获得加分', () => {
    const chunks = [
      createMockChunk('1', '年假有 5 天', '## 年假规则', '年假'),
      createMockChunk('2', '这里也提到年假', '## 考勤管理', '考勤'),
    ];
    const results = service.search('年假', chunks, 2);
    expect(results[0].chunkId).toBe('1');
  });

  it('无匹配关键词时应返回 normalizedScore 为 0 的结果', () => {
    const chunks = [createMockChunk('1', '没有任何匹配内容', '## 无关', '其他')];
    const results = service.search('人工智能', chunks, 1);
    expect(results).toHaveLength(1);
    expect(results[0].normalizedScore).toBe(0);
  });

  it('应返回 topK 个结果', () => {
    const chunks = Array.from({ length: 5 }, (_, i) =>
      createMockChunk(String(i), `年假内容 ${String(i)}`, '## 年假', '年假'),
    );
    const results = service.search('年假', chunks, 3);
    expect(results).toHaveLength(3);
  });
});
