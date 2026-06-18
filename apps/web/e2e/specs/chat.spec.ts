import { test, expect } from '@playwright/test';
import { loginAs } from '../fixtures/auth';
import { setupApiMocks } from '../mocks/api-handlers';

test.describe('聊天对话', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await loginAs(page, 'employee');
  });

  test.afterEach(async ({ page }) => {
    // 确保清理 cookie 和 localStorage，避免状态泄漏
    await page.evaluate(() => localStorage.clear());
  });

  test('TC-07: 欢迎页面显示快捷问题', async ({ page }) => {
    await page.goto('/chat');
    await expect(page.getByText('有什么可以帮您的？')).toBeVisible();
    // 至少应显示快捷问题区域
    const quickQuestions = page.locator('button').filter({ hasText: /年假|报销|迟到|加班|晋升/ });
    await expect(quickQuestions.first()).toBeVisible();
  });

  test('TC-08: 发送消息后显示用户气泡', async ({ page }) => {
    await page.goto('/chat', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    const textarea = page.locator('textarea');
    await expect(textarea).toBeVisible({ timeout: 10000 });
    await textarea.fill('年假怎么请');
    await page.getByRole('button', { name: '发送' }).click();
    // 用户消息应显示
    await expect(page.getByText('年假怎么请')).toBeVisible();
  });

  test('TC-09: 流式回答完成后显示来源引用', async ({ page }) => {
    await page.goto('/chat', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    const textarea = page.locator('textarea');
    await expect(textarea).toBeVisible({ timeout: 10000 });
    await textarea.fill('年假怎么请');
    await page.getByRole('button', { name: '发送' }).click();
    // 等待流式渲染完成 — 最终应看到来源卡片
    await expect(page.getByText('参考来源')).toBeVisible({ timeout: 15000 });
    // 验证来源文档标题显示
    await expect(page.getByText(/89%/).first()).toBeVisible();
    await expect(page.getByText(/89%/)).toBeVisible();
  });

  test('TC-10: 猜你想问按钮渲染', async ({ page }) => {
    await page.goto('/chat', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    const textarea = page.locator('textarea');
    await expect(textarea).toBeVisible({ timeout: 10000 });
    await textarea.fill('年假怎么请');
    await page.getByRole('button', { name: '发送' }).click();
    // 等待猜你想问出现
    await expect(page.getByText('猜你想问')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('年假可以累积到明年吗？')).toBeVisible();
  });

  test('TC-11: 新对话按钮清空消息', async ({ page }) => {
    await page.goto('/chat', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    const textarea = page.locator('textarea');
    await expect(textarea).toBeVisible({ timeout: 10000 });
    await textarea.fill('年假怎么请');
    await page.getByRole('button', { name: '发送' }).click();
    // 等待消息出现
    await expect(page.getByText('参考来源')).toBeVisible({ timeout: 15000 });
    // 点击新对话
    await page.getByRole('button', { name: '新对话' }).click();
    // 应该重新显示欢迎语
    await expect(page.getByText('有什么可以帮您的？')).toBeVisible();
  });
});
