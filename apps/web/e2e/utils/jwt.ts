/**
 * Base64url 编码（不含 Buffer，兼容浏览器环境）
 * RFC 4648 §5: 用 - 代替 +，_ 代替 /，去掉 = 填充
 */
function base64urlEncode(json: unknown): string {
  const str = JSON.stringify(json);
  // 手动将 UTF-16 字符串编码为 base64
  const bytes: number[] = [];
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code < 0x80) {
      bytes.push(code);
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    }
  }

  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  let result = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const b2 = i + 2 < bytes.length ? bytes[i + 2] : 0;
    result += chars[b0 >> 2];
    result += chars[((b0 & 3) << 4) | (b1 >> 4)];
    if (i + 1 < bytes.length) {
      result += chars[((b1 & 15) << 2) | (b2 >> 6)];
    }
    if (i + 2 < bytes.length) {
      result += chars[b2 & 63];
    }
  }
  return result;
}

/**
 * 生成模拟 JWT token，格式为 header.payload.signature。
 * 使用 base64url 编码（与前端 AuthContext 的 decodeToken 一致）。
 */
export function createMockJWT(username: string, userId: string, role: 'employee' | 'hr'): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    sub: userId,
    username,
    role,
    displayName: role === 'hr' ? '李四' : '张三',
    exp: Math.floor(Date.now() / 1000) + 86400 * 7, // 7 days
    iat: Math.floor(Date.now() / 1000),
  };

  return `${base64urlEncode(header)}.${base64urlEncode(payload)}.fakesignature`;
}

export const MOCK_TOKENS = {
  employee: createMockJWT('employee', 'user-1', 'employee'),
  hr: createMockJWT('hr', 'user-2', 'hr'),
};
