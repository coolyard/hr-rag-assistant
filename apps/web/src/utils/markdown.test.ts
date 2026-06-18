import { describe, it, expect } from 'vitest';

import { renderMarkdown } from '@/utils/markdown';

describe('renderMarkdown', () => {
  it('应渲染加粗文本', () => {
    const result = renderMarkdown('这是 **粗体** 文本');
    expect(result).toContain('<strong>粗体</strong>');
  });

  it('应渲染列表', () => {
    const result = renderMarkdown('- 项目1\n- 项目2');
    expect(result).toContain('<li>项目1</li>');
    expect(result).toContain('<li>项目2</li>');
  });

  it('应渲染代码块', () => {
    const result = renderMarkdown('```\nconsole.log("hello")\n```');
    expect(result).toContain('<pre><code>');
  });

  it('应转义 XSS 向量', () => {
    const result = renderMarkdown('<script>alert("xss")</script>');
    expect(result).not.toContain('<script>');
    expect(result).toContain('&lt;script&gt;');
  });

  it('空输入应返回空字符串', () => {
    expect(renderMarkdown('')).toBe('');
  });

  it('应渲染行内代码', () => {
    const result = renderMarkdown('使用 `method()` 方法');
    expect(result).toContain('<code>method()</code>');
  });

  it('应渲染斜体', () => {
    const result = renderMarkdown('这是 *斜体* 文本');
    expect(result).toContain('<em>斜体</em>');
  });
});
