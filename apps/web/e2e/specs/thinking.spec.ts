import { test, expect } from '@playwright/test';
import { loginAs } from '../fixtures/auth';
import { setupApiMocks } from '../mocks/api-handlers';

test.describe('思考过程展示', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await loginAs(page, 'employee');
    await page.goto('/chat');
  });

  test('TC-REASON-01: 思考过程区域渲染', async ({ page }) => {
    await page.getByText('我今年还有几天年假？怎么申请？').click();
    await expect(page.getByText('参考来源：')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('思考过程')).toBeVisible();
  });

  test('TC-REASON-02: 思考中默认展开显示内容', async ({ page }) => {
    await page.getByText('我今年还有几天年假？怎么申请？').click();
    const thinkingText = page.getByText('正在启动向量语义检索');
    await expect(thinkingText).toBeVisible({ timeout: 8000 });
  });

  test('TC-REASON-03: 思考完成后可点击展开', async ({ page }) => {
    await page.getByText('我今年还有几天年假？怎么申请？').click();
    await expect(page.getByText('参考来源：')).toBeVisible({ timeout: 10000 });
    // 等待 auto-collapse 完成
    await page.waitForTimeout(6000);
    // 点击"思考过程"头部
    await page.getByText('思考过程').click();
    const thinkingText = page.getByText('正在启动向量语义检索');
    // 展开后文本应可见
    await expect(thinkingText).toBeVisible({ timeout: 3000 });
  });

  test('TC-REASON-04: 答案完成后思考区域存在', async ({ page }) => {
    await page.getByText('我今年还有几天年假？怎么申请？').click();
    await expect(page.getByText('参考来源：')).toBeVisible({ timeout: 10000 });
    // 思考过程区域应渲染在助手消息中
    await expect(page.getByText('思考过程')).toBeVisible();
  });

  test('TC-REASON-05: 现有功能不受影响', async ({ page }) => {
    await page.getByText('我今年还有几天年假？怎么申请？').click();
    await expect(page.getByText('参考来源：')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('年假').first()).toBeVisible();
    await expect(page.getByText('参考来源：')).toBeVisible();
    await expect(page.getByText('猜你想问：')).toBeVisible();
    await expect(page.getByText('思考过程')).toBeVisible();
  });
});
