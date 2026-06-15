import { test, expect } from '@playwright/test';
import { loginAs } from '../fixtures/auth';
import { setupApiMocks } from '../mocks/api-handlers';

test.describe('个人中心', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await loginAs(page, 'employee');
    await page.goto('/profile');
  });

  test('TC-17: 显示个人信息', async ({ page }) => {
    await expect(page.getByRole('heading', { name: '张三' })).toBeVisible();
    await expect(page.getByText('技术部').first()).toBeVisible();
    await expect(page.getByText(/入职/)).toBeVisible();
  });

  test('TC-18: 统计卡片展示', async ({ page }) => {
    await expect(page.getByText('年假统计')).toBeVisible();
    await expect(page.getByText('报销统计')).toBeVisible();
    await expect(page.getByText('考勤统计')).toBeVisible();
    await expect(page.getByText('福利与培训')).toBeVisible();
  });

  test('TC-19: 请假日历存在', async ({ page }) => {
    await expect(page.getByText('请假日历与餐补统计')).toBeVisible();
  });
});
