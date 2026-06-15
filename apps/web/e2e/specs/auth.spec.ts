import { test, expect } from '@playwright/test';
import { setupApiMocks } from '../mocks/api-handlers';

test.describe('登录认证', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
  });

  test('TC-01: 登录页渲染演示账号提示', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('h1')).toContainText('HR 智能助手');
    await expect(page.getByText('hr / 123456')).toBeVisible();
    await expect(page.getByText('employee / 123456')).toBeVisible();
  });

  test('TC-02: 员工账号登录成功', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('请输入账号').fill('employee');
    await page.getByPlaceholder('请输入密码').fill('123456');
    await page.getByRole('button', { name: '登录' }).click();
    await expect(page).toHaveURL(/\/chat/);
    await expect(page.getByText('有什么可以帮您的？')).toBeVisible();
  });

  test('TC-03: HR 账号登录成功', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('请输入账号').fill('hr');
    await page.getByPlaceholder('请输入密码').fill('123456');
    await page.getByRole('button', { name: '登录' }).click();
    await expect(page).toHaveURL(/\/chat/);
  });

  test('TC-04: 错误密码后页面重定向到登录页', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('请输入账号').fill('employee');
    await page.getByPlaceholder('请输入密码').fill('wrongpassword');
    await page.getByRole('button', { name: '登录' }).click();
    // Axios 401拦截器会触发 window.location.href='/login' 导致页面重载
    await expect(page).toHaveURL(/\/login/);
  });

  test('TC-05: 未认证访问 /chat 重定向到 /login', async ({ page }) => {
    await page.goto('/chat');
    await expect(page).toHaveURL(/\/login/);
  });

  test('TC-06: 登出后清除 token 并跳转登录页', async ({ page }) => {
    // 先登录
    await page.goto('/login');
    await page.getByPlaceholder('请输入账号').fill('employee');
    await page.getByPlaceholder('请输入密码').fill('123456');
    await page.getByRole('button', { name: '登录' }).click();
    await expect(page).toHaveURL(/\/chat/);
    await page.waitForLoadState('networkidle');

    // 登出
    // 通过 locator 在 navbar 范围内查找退出按钮
    await page.locator('nav >> text=退出登录').click();
    await expect(page).toHaveURL(/\/login/);

    // 验证 token 已清除
    const token = await page.evaluate(() => localStorage.getItem('hr_rag_token'));
    expect(token).toBeNull();
  });
});
