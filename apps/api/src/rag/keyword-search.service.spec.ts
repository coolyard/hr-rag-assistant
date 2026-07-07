import { Test, type TestingModule } from '@nestjs/testing';

import { KeywordSearchService } from '@/rag/keyword-search.service';
import type { SearchResult } from '@/vector/vector.interface';

function createMockChunk(
  id: string,
  content: string,
  heading: string,
  documentTitle: string,
  categoryName: string,
): SearchResult {
  return {
    chunkId: id,
    content,
    documentName: 'test.md',
    documentTitle,
    category: 'test',
    categoryName,
    heading,
    similarity: 0,
    metadata: {
      chunkId: id,
      documentName: 'test.md',
      documentTitle,
      category: 'test',
      categoryName,
      heading,
      content,
      charCount: content.length,
    },
  };
}

const mockChunks: SearchResult[] = [
  createMockChunk(
    '1',
    '员工每年享有 5 天带薪年假。申请年假需要提前 3 个工作日向直属主管提交申请。',
    '## 年假申请流程',
    '年假制度',
    '休假管理',
  ),
  createMockChunk(
    '2',
    '年假可以连续使用也可以分段使用。未使用的年假可顺延至次年 3 月 31 日。',
    '## 年假使用规则',
    '年假制度',
    '休假管理',
  ),
  createMockChunk(
    '3',
    '病假需提供医院出具的诊断证明。病假期间工资按照基本工资的 80% 发放。',
    '## 病假管理规定',
    '请假制度',
    '考勤管理',
  ),
  createMockChunk(
    '4',
    '员工参加基本医疗保险后，可凭医保卡在定点医院就医。门诊报销比例为 70%。',
    '## 医疗保险报销流程',
    '医疗保险说明',
    '福利待遇',
  ),
  createMockChunk(
    '5',
    '工作日加班按照 1.5 倍工资计算，休息日加班按照 2 倍工资计算。',
    '## 加班与调休制度',
    '考勤管理制度',
    '考勤管理',
  ),
  createMockChunk(
    '6',
    '公司食堂位于 B1 层，供应早餐（7:00-9:00）和午餐（11:30-13:00）。',
    '## 公司食堂管理办法',
    '后勤管理制度',
    '后勤服务',
  ),
];

describe('KeywordSearchService with BM25', () => {
  let service: KeywordSearchService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [KeywordSearchService],
    }).compile();
    service = module.get<KeywordSearchService>(KeywordSearchService);
    service.buildIndex(mockChunks);
  });

  it('BM25 应正确计算相关性分数并返回排序结果', () => {
    const results = service.search('年假申请', 3);
    expect(results.length).toBeGreaterThan(0);
    // "年假制度" 应该在 Top-1（标题/内容最匹配年假）
    expect(results[0].documentTitle).toBe('年假制度');
    // 分数应已归一化到 [0,1]
    expect(results[0].normalizedScore).toBeGreaterThanOrEqual(0);
    expect(results[0].normalizedScore).toBeLessThanOrEqual(1);
  });

  it('标题匹配应有更高分数（boost=3）', () => {
    // "医疗保险" 出现在 chunk #4 的标题中
    const results = service.search('医疗保险报销', 3);
    expect(results.length).toBeGreaterThan(0);
    const topDoc = results[0];
    expect(topDoc.heading).toContain('医疗保险');
  });

  it('同义词扩展应召回相关文档（"医保" → "医疗保险"）', () => {
    const results = service.search('医保报销', 3);
    // 应该召回"医疗保险"相关文档（同义词扩展了"医疗保险"）
    const hasMedical = results.some((r) => r.documentTitle.includes('医疗保险'));
    expect(hasMedical).toBe(true);
  });

  it('前缀匹配应召回相关文档（"年" → "年假"）', () => {
    const results = service.search('年', 3);
    expect(results.length).toBeGreaterThan(0);
  });

  it('无匹配时应返回空数组', () => {
    const results = service.search('火星移民政策', 3);
    expect(results).toHaveLength(0);
  });

  it('索引未构建时应返回空数组', () => {
    const freshService = new KeywordSearchService();
    const results = freshService.search('年假', 3);
    expect(results).toHaveLength(0);
  });

  it('不同文档长度应公平排序（短文档不被长文档压制）', () => {
    const results = service.search('加班', 5);
    // "加班与调休制度"（chunk #5）应该排在 "年假"（chunk #1/2）之前（更相关）
    const overtimeIdx = results.findIndex((r) => r.documentTitle === '考勤管理制度');
    const annualIdx = results.findIndex((r) => r.documentTitle === '年假制度');
    if (overtimeIdx >= 0 && annualIdx >= 0) {
      expect(overtimeIdx).toBeLessThan(annualIdx);
    }
  });
});

describe('QueryClassifier', () => {
  it('"年假申请" 应分类为 exact-keyword', async () => {
    const { QueryClassifier } = await import('@/rag/query-classifier');
    const classifier = new QueryClassifier();
    const result = classifier.classify('年假申请');
    expect(result.category).toBe('exact-keyword');
    expect(result.keywordWeight).toBe(0.8);
  });

  it('"我想休息一段时间" 应分类为 semantic', async () => {
    const { QueryClassifier } = await import('@/rag/query-classifier');
    const classifier = new QueryClassifier();
    const result = classifier.classify('我想休息一段时间');
    expect(result.category).toBe('semantic');
    expect(result.vectorWeight).toBe(0.7);
  });

  it('"请假要扣钱吗" 应分类为 exact-keyword', async () => {
    const { QueryClassifier } = await import('@/rag/query-classifier');
    const classifier = new QueryClassifier();
    const result = classifier.classify('请假要扣钱吗');
    expect(result.category).toBe('exact-keyword');
    expect(result.keywordWeight).toBe(0.8);
  });

  it('空字符串不应崩溃', async () => {
    const { QueryClassifier } = await import('@/rag/query-classifier');
    const classifier = new QueryClassifier();
    const result = classifier.classify('');
    expect(result.category).toBeDefined();
  });
});
