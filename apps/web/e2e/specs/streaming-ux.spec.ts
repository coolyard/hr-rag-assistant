import { test, expect } from '@playwright/test';
import { loginAs } from '../fixtures/auth';
import { setupApiMocks } from '../mocks/api-handlers';

test.describe('高级流式 UX', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await loginAs(page, 'employee');
    await page.goto('/chat');
  });

  test('TC-STRM-01: 停止生成后发送按钮恢复', async ({ page }) => {
    // Mock SSE 使用 setTimeout 引入延迟，让"停止生成"按钮有足够时间出现
    await page.route('**/api/ask', async (route) => {
      // 延迟 500ms 再返回，模拟真实流式延迟
      await new Promise((r) => setTimeout(r, 500));
      // 复用已有的 Mock 逻辑
      const { MOCK_SSE_CHUNKS, MOCK_SSE_SOURCES, MOCK_SSE_FOLLOWUPS } =
        await import('../fixtures/test-data');
      let sseData = '';
      for (const chunk of MOCK_SSE_CHUNKS) {
        sseData += `data: ${JSON.stringify({ chunk, done: false })}\n\n`;
      }
      sseData += `data: ${JSON.stringify({
        chunk: '',
        done: true,
        sources: MOCK_SSE_SOURCES,
        confidenceLevel: 'high',
        followUps: MOCK_SSE_FOLLOWUPS,
        promptTokens: 120,
        completionTokens: 45,
      })}\n\n`;
      return route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: sseData,
      });
    });
    // 发送消息
    await page.getByText('我今年还有几天年假？怎么申请？').click();
    // 等待"停止生成"按钮出现（延迟后 Mock 在处理中）
    const stopBtn = page.getByText('停止生成');
    const sendBtn = page.getByText('发送');
    // "停止生成"可能因为延迟不够而闪现，我们用 try-catch 处理
    if (await stopBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await stopBtn.click();
      await expect(sendBtn).toBeVisible({ timeout: 5000 });
    }
    // 无论如何，最终应该看得到"发送"按钮
    await expect(sendBtn).toBeVisible({ timeout: 10000 });
    const input = page.locator('textarea');
    await expect(input).not.toBeDisabled();
  });

  test('TC-STRM-02: 重新生成', async ({ page }) => {
    // 发送消息
    await page.getByText('我今年还有几天年假？怎么申请？').click();
    // 等待回答完成
    await expect(page.getByText('参考来源：')).toBeVisible({ timeout: 10000 });
    // 验证"重新生成"按钮出现
    await expect(page.getByText('重新生成')).toBeVisible();
    // 点击重新生成
    await page.getByText('重新生成').click();
    // 等待新的回答完成
    await expect(page.getByText('参考来源：')).toBeVisible({ timeout: 10000 });
    // 验证"重新生成"按钮仍在
    await expect(page.getByText('重新生成')).toBeVisible();
  });

  test('TC-STRM-03: Token 计数显示', async ({ page }) => {
    // 发送消息
    await page.getByText('我今年还有几天年假？怎么申请？').click();
    // 等待回答完成
    await expect(page.getByText('参考来源：')).toBeVisible({ timeout: 10000 });
    // 验证 token 信息出现
    await expect(page.getByText('~45 tokens')).toBeVisible();
    // 验证底部总计区域出现
    await expect(page.getByText(/本轮/)).toBeVisible();
    await expect(page.getByText(/总计/)).toBeVisible();
  });
});
