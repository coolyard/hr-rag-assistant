import { test, expect } from '@playwright/test';
import { loginAs } from '../fixtures/auth';
import { setupApiMocks } from '../mocks/api-handlers';

test.describe('评估 Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await loginAs(page, 'hr');
    await page.goto('/evaluation', { waitUntil: 'networkidle' });
  });

  test('TC-EVAL-01: Dashboard 页面渲染', async ({ page }) => {
    await expect(page.getByText('评估概览')).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('暂无评估数据')).toBeVisible({ timeout: 5000 });
  });
});
