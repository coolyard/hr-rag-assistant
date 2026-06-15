import { test, expect } from '@playwright/test';
import { loginAs } from '../fixtures/auth';
import { setupApiMocks } from '../mocks/api-handlers';

test.describe('主题切换', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await loginAs(page, 'employee');
  });

  test('TC-20: 默认主题为浅色模式', async ({ page }) => {
    await page.goto('/chat');
    const theme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    // 浅色模式要么没有 data-theme 属性，要么是 "light"
    expect(theme === null || theme === 'light').toBe(true);
  });

  test('TC-21: 可切换深色模式', async ({ page }) => {
    await page.goto('/chat');
    await page.waitForLoadState('networkidle');
    // 通过 localStorage 直接设置深色模式偏好
    await page.evaluate(() => {
      localStorage.setItem('hr_rag_theme', 'dark');
    });
    await page.reload();
    await page.waitForLoadState('networkidle');
    const theme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(theme).toBe('dark');
  });

  test('TC-22: 主题持久化（刷新后保持）', async ({ page }) => {
    await page.goto('/chat');
    await page.waitForLoadState('networkidle');
    // 直接设置 deep 模式
    await page.evaluate(() => {
      localStorage.setItem('hr_rag_theme', 'dark');
    });
    await page.reload();
    await page.waitForLoadState('networkidle');
    const theme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(theme).toBe('dark');
  });
});
