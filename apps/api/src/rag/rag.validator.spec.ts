import { validateAnswer } from '@/rag/rag.validator';

describe('validateAnswer', () => {
  const chunks = [{ content: '年假可休 5 天，2024年可休' }, { content: '报销额度 80%' }];

  it('当回答中的数字都在 chunks 中存在时应通过', () => {
    const result = validateAnswer('年假可休 5 天', chunks);
    expect(result.passed).toBe(true);
    expect(result.suspiciousNumbers).toEqual([]);
  });

  it('当回答包含 chunk 中不存在的数字时应标记为可疑', () => {
    const result = validateAnswer('年假可休 10天无薪假', chunks);
    expect(result.passed).toBe(false);
    expect(result.suspiciousNumbers).toContain('10天');
  });

  it('当回答不包含任何数字时应通过', () => {
    const result = validateAnswer('你好，请问有什么可以帮助你的？', chunks);
    expect(result.passed).toBe(true);
    expect(result.suspiciousNumbers).toEqual([]);
  });

  it('当 chunks 为空时，回答中的数字应全部标记为可疑', () => {
    const result = validateAnswer('报销 1000元', []);
    expect(result.passed).toBe(false);
  });
});
