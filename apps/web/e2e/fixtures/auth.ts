import type { Page } from '@playwright/test';
import { createMockJWT } from '../utils/jwt';

/**
 * 通过 localStorage 直接注入 JWT token，绕过登录页面。
 * 先导航到 /login 确保 SPA 已加载，注入 token，再返回。
 */
export async function loginAs(page: Page, role: 'employee' | 'hr'): Promise<void> {
  const token = createMockJWT(
    role === 'employee' ? 'employee' : 'hr',
    role === 'employee' ? 'user-1' : 'user-2',
    role,
  );
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await page.evaluate((t) => {
    localStorage.setItem('hr_rag_token', t);
  }, token);
}
