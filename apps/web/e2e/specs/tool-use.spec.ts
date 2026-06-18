import { test, expect } from '@playwright/test';
import { loginAs } from '../fixtures/auth';
import { setupApiMocks } from '../mocks/api-handlers';

test.describe('工具调用', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await loginAs(page, 'employee');
    await page.goto('/chat');
  });

  test('TC-TOOL-01: 工具调用卡片渲染', async ({ page }) => {
    // 使用自定义输入触发 tool call（避免与 chat spec 冲突）
    await page.locator('textarea').fill('帮我申请年假');
    await page.locator('textarea').press('Enter');
    // 等待 tool call 卡片出现
    const toolCard = page.getByText('申请年假', { exact: true });
    await expect(toolCard).toBeVisible({ timeout: 10000 });
    // 验证参数显示
    await expect(page.getByText('3', { exact: true })).toBeVisible();
    // 验证确认/取消按钮
    await expect(page.getByText('确认执行')).toBeVisible();
    await expect(page.getByText('取消')).toBeVisible();
  });

  test('TC-TOOL-02: 确认工具调用', async ({ page }) => {
    await page.locator('textarea').fill('帮我申请年假');
    await page.locator('textarea').press('Enter');
    // 等待确认按钮
    await expect(page.getByText('确认执行')).toBeVisible({ timeout: 10000 });
    // 点击确认
    await page.getByText('确认执行').click();
    // 验证已完成状态
    await expect(page.getByText('已完成')).toBeVisible({ timeout: 5000 });
  });

  test('TC-TOOL-03: 取消工具调用', async ({ page }) => {
    await page.locator('textarea').fill('帮我申请年假');
    await page.locator('textarea').press('Enter');
    // 等待取消按钮
    await expect(page.getByText('取消')).toBeVisible({ timeout: 10000 });
    // 点击取消
    await page.getByText('取消').click();
    // 验证已取消状态
    await expect(page.getByText('已取消')).toBeVisible({ timeout: 3000 });
  });
});
