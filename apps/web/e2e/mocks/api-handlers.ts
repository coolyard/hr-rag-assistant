import type { Page, Route } from '@playwright/test';
import {
  MOCK_DOCUMENTS,
  MOCK_DOCUMENT_CONTENT,
  MOCK_PROFILE,
  MOCK_REASONING_CHUNKS,
  MOCK_TOOL_CALL,
  MOCK_SSE_CHUNKS,
  MOCK_SSE_SOURCES,
  MOCK_SSE_FOLLOWUPS,
  MOCK_RETRIEVAL_DETAIL,
} from '../fixtures/test-data';
import { MOCK_TOKENS } from '../utils/jwt';

/**
 * 构建完整的 SSE 流响应字符串。
 * route.fulfill() 不支持 ReadableStream，所以一次性构建所有 data: 消息。
 */
/**
 * 构建 Tool Call SSE 响应（当问题包含"申请年假"时触发）
 */
function buildToolCallSSEResponse(): string {
  let sseData = '';
  // 先发送 reasoning
  for (const reasoning of MOCK_REASONING_CHUNKS) {
    sseData += `data: ${JSON.stringify({ chunk: '', done: false, reasoning })}\n\n`;
  }
  // 发送 tool call start
  sseData += `data: ${JSON.stringify({ chunk: '', done: false, toolCallStart: MOCK_TOOL_CALL })}\n\n`;
  return sseData;
}

function buildSSEResponse(): string {
  let sseData = '';
  // 先发送 reasoning 片段（思考过程）
  for (const reasoning of MOCK_REASONING_CHUNKS) {
    sseData += `data: ${JSON.stringify({ chunk: '', done: false, reasoning })}\n\n`;
  }
  // 再发送内容 chunk（回答正文）
  for (const chunk of MOCK_SSE_CHUNKS) {
    sseData += `data: ${JSON.stringify({ chunk, done: false })}\n\n`;
  }
  sseData += `data: ${JSON.stringify({
    chunk: '',
    done: true,
    sources: MOCK_SSE_SOURCES,
    confidenceLevel: 'high',
    followUps: MOCK_SSE_FOLLOWUPS,
    promptTokens: 120,
    completionTokens: 45,
    retrievalDetail: MOCK_RETRIEVAL_DETAIL,
  })}\n\n`;
  return sseData;
}

/**
 * 判断请求 URL 的路径名。
 */
function getPathname(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

/**
 * 注册所有 API 路由的 Mock 拦截器。
 * 测试文件在 beforeEach 中调用此函数即可。
 */
export async function setupApiMocks(page: Page): Promise<void> {
  // ── 登录 ──
  await page.route('**/api/auth/login', async (route: Route) => {
    const postData = route.request().postDataJSON();
    if (postData?.username === 'employee' && postData?.password === '123456') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: MOCK_TOKENS.employee,
          user: {
            id: 'user-1',
            username: 'employee',
            role: 'employee' as const,
            displayName: '张三',
          },
        }),
      });
    }
    if (postData?.username === 'hr' && postData?.password === '123456') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: MOCK_TOKENS.hr,
          user: { id: 'user-2', username: 'hr', role: 'hr' as const, displayName: '李四' },
        }),
      });
    }
    return route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ message: '账号或密码错误' }),
    });
  });

  // ── 问答 SSE 流（条件：tool call 检测）──
  let askHandled = false;
  await page.route('**/api/ask', async (route: Route) => {
    if (askHandled) {
      // 第二次请求（确认后继续生成）使用正常流
      return route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        headers: {
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
          'X-Accel-Buffering': 'no',
        },
        body: buildSSEResponse(),
      });
    }
    const postData = route.request().postDataJSON();
    if (postData?.question?.includes('申请年假') || postData?.question?.includes('请假')) {
      askHandled = true;
      return route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        headers: {
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
          'X-Accel-Buffering': 'no',
        },
        body: buildToolCallSSEResponse(),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      headers: {
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
      body: buildSSEResponse(),
    });
  });

  // ── 工具执行 ──
  await page.route('**/api/ask/tool/execute', async (route: Route) => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'tc-1',
        result: '年假申请已提交：3天（2026-06-20 至 2026-06-22），等待直属上级审批。',
      }),
    });
  });

  // ── 文档 API (列表 + 详情合并到一个 handler，按路径区分) ──
  // 使用 function pattern 精确匹配所有 /api/documents 开头的请求
  await page.route(
    (url: URL) => url.pathname.startsWith('/api/documents'),
    async (route: Route) => {
      const pathname = getPathname(route.request().url());
      // 列表: /api/documents (无更多路径)
      // 详情: /api/documents/{id}
      if (pathname === '/api/documents' || pathname === '/api/documents/') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ documents: MOCK_DOCUMENTS, total: MOCK_DOCUMENTS.length }),
        });
      }
      // 详情: /api/documents/{id}
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ content: MOCK_DOCUMENT_CONTENT }),
      });
    },
  );

  // ── 用户 Profile ──
  await page.route('**/api/me', async (route: Route) => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'user-1',
        username: 'employee',
        role: 'employee',
        displayName: '张三',
        profile: MOCK_PROFILE,
      }),
    });
  });

  // ── 对话 CRUD ──
  await page.route('**/api/conversations', async (route: Route) => {
    if (route.request().method() === 'POST') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'conv-test-1',
          title: '新对话',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          userId: 'user-1',
          messages: [],
        }),
      });
    }
    // GET - list
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'conv-1',
          title: '年假咨询',
          updatedAt: new Date().toISOString(),
          messages: [{ content: '我今年还有几天年假？' }],
        },
        {
          id: 'conv-2',
          title: '报销流程',
          updatedAt: new Date().toISOString(),
          messages: [{ content: '报销怎么走？' }],
        },
      ]),
    });
  });

  await page.route('**/api/conversations/*/messages', async (route: Route) => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  // ── 评估 API ──
  await page.route('**/api/eval/runs', async (route: Route) => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  // ── 健康检查 ──
  await page.route('**/api/health', async (route: Route) => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'ok', timestamp: Date.now() }),
    });
  });
}
