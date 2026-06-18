import { test, expect } from '@playwright/test';
import { loginAs } from '../fixtures/auth';
import { setupApiMocks } from '../mocks/api-handlers';

test.describe('生产级模式', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await loginAs(page, 'employee');
  });

  test('TC-PROD-02: 页面懒加载正常工作', async ({ page }) => {
    await page.goto('/chat');
    await expect(page.getByText('有什么可以帮您的？')).toBeVisible({ timeout: 10000 });

    // 跳转到文档页面
    await page.getByText('文档').click();
    await expect(page.getByText(/个文档/)).toBeVisible({ timeout: 10000 });

    // 跳转到个人中心
    await page.getByText('我的').click();
    await expect(page.getByText('请假日历与餐补统计')).toBeVisible({ timeout: 10000 });
  });

  test('TC-PROD-03: 复制消息按钮', async ({ page }) => {
    await page.goto('/chat');
    await page.getByText('我今年还有几天年假？怎么申请？').click();
    await expect(page.getByText('参考来源：')).toBeVisible({ timeout: 10000 });
    // 点击复制按钮
    await page.getByText('复制').click();
    // 验证 toast 出现
    await expect(page.getByText('已复制')).toBeVisible({ timeout: 3000 });
  });

  test('TC-PROD-04: 重新生成按钮', async ({ page }) => {
    await page.goto('/chat');
    await page.getByText('我今年还有几天年假？怎么申请？').click();
    await expect(page.getByText('参考来源：')).toBeVisible({ timeout: 10000 });
    // 验证重新生成按钮存在（已有功能回归）
    await expect(page.getByText('重新生成')).toBeVisible();
  });
});
