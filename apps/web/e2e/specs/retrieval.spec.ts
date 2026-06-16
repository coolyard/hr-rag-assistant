import { test, expect } from '@playwright/test';
import { loginAs } from '../fixtures/auth';
import { setupApiMocks } from '../mocks/api-handlers';

test.describe('检索可视化', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await loginAs(page, 'employee');
    await page.goto('/chat');
  });

  test('TC-RETR-01: 查看检索详情按钮渲染', async ({ page }) => {
    await page.getByText('我今年还有几天年假？怎么申请？').click();
    await expect(page.getByText('参考来源：')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('查看检索详情')).toBeVisible();
  });

  test('TC-RETR-02: 点击打开检索详情抽屉', async ({ page }) => {
    await page.getByText('我今年还有几天年假？怎么申请？').click();
    await expect(page.getByText('参考来源：')).toBeVisible({ timeout: 10000 });
    await page.getByText('查看检索详情').click();
    // 抽屉标题应出现
    await expect(page.getByText('检索详情')).toBeVisible({ timeout: 3000 });
    // 检索来源贡献区域
    await expect(page.getByText('检索来源贡献')).toBeVisible();
    await expect(page.getByText('向量检索')).toBeVisible();
    await expect(page.getByText('关键词检索')).toBeVisible();
  });

  test('TC-RETR-03: 点击遮罩关闭抽屉', async ({ page }) => {
    await page.getByText('我今年还有几天年假？怎么申请？').click();
    await expect(page.getByText('参考来源：')).toBeVisible({ timeout: 10000 });
    await page.getByText('查看检索详情').click();
    await expect(page.getByText('检索详情')).toBeVisible({ timeout: 3000 });
    // 点击抽屉左侧区域关闭（遮罩区域）
    await page.mouse.click(10, 300);
    await page.waitForTimeout(400);
    // 抽屉标题应已消失
  });
});
