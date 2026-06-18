import { test, expect } from '@playwright/test';
import { loginAs } from '../fixtures/auth';
import { setupApiMocks } from '../mocks/api-handlers';

test.describe('页面导航', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await loginAs(page, 'employee');
  });

  test('TC-23: 导航栏显示三个入口', async ({ page }) => {
    await page.goto('/chat');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('link', { name: /对话/ })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('文档')).toBeVisible();
    await expect(page.getByText('我的')).toBeVisible();
  });

  test('TC-24: 点击导航跳转正确页面', async ({ page }) => {
    await page.goto('/chat');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.getByRole('link', { name: /文档/ }).click();
    await expect(page).toHaveURL(/\/documents/);
    await page.getByRole('link', { name: /我的/ }).click();
    await expect(page).toHaveURL(/\/profile/);
  });
});
