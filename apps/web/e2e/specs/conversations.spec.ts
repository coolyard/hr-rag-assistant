import { test, expect } from '@playwright/test';
import { loginAs } from '../fixtures/auth';
import { setupApiMocks } from '../mocks/api-handlers';

test.describe('对话列表', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await loginAs(page, 'employee');
    await page.goto('/chat');
  });

  test('TC-CONV-01: 新建对话并显示在列表', async ({ page }) => {
    await expect(page.getByText('新建对话')).toBeVisible({ timeout: 5000 });
    await page.getByText('新建对话').click();
    await expect(page.getByText('新对话')).toBeVisible({ timeout: 5000 });
  });

  test('TC-CONV-02: 点击对话项可切换', async ({ page }) => {
    await expect(page.getByText('新建对话')).toBeVisible({ timeout: 5000 });
    await page.getByText('年假咨询').click();
    await expect(page.getByText('有什么可以帮您的？')).toBeVisible({ timeout: 5000 });
  });

  test('TC-CONV-03: 更多菜单显示删除选项', async ({ page }) => {
    await expect(page.getByText('新建对话')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('年假咨询')).toBeVisible({ timeout: 5000 });
    // 使用 data-testid 定位更多按钮
    const moreBtn = page.locator('[data-testid="more-btn"]').first();
    await moreBtn.click({ force: true });
    await expect(page.getByText('删除')).toBeVisible({ timeout: 3000 });
  });
});
