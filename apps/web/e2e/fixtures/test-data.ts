// ── Mock 文档类型（与 src/components/Document/DocumentCard 的 HRDocument 一致） ──
export interface MockDocument {
  id: string;
  filename: string;
  title: string;
  category: string;
  categoryName: string;
  updatedAt: string;
}

// ── 用户数据 ──
export const MOCK_EMPLOYEE = {
  username: 'employee',
  displayName: '张三',
  role: 'employee',
  id: 'user-1',
};

export const MOCK_HR = {
  username: 'hr',
  displayName: '李四',
  role: 'hr',
  id: 'user-2',
};

// ── 文档数据 ──
export const MOCK_DOCUMENTS: MockDocument[] = [
  {
    id: 'annual_leave',
    filename: '年假制度.md',
    title: '年假制度',
    category: 'annual_leave',
    categoryName: '年假',
    updatedAt: '2026-01-15T00:00:00.000Z',
  },
  {
    id: 'reimbursement',
    filename: '报销流程.md',
    title: '报销流程',
    category: 'reimbursement',
    categoryName: '报销',
    updatedAt: '2026-01-15T00:00:00.000Z',
  },
  {
    id: 'promotion',
    filename: '晋升规则.md',
    title: '晋升规则',
    category: 'promotion',
    categoryName: '晋升',
    updatedAt: '2026-01-15T00:00:00.000Z',
  },
  {
    id: 'attendance',
    filename: '考勤制度.md',
    title: '考勤制度',
    category: 'attendance',
    categoryName: '考勤',
    updatedAt: '2026-01-15T00:00:00.000Z',
  },
  {
    id: 'welfare',
    filename: '员工福利.md',
    title: '员工福利',
    category: 'welfare',
    categoryName: '福利',
    updatedAt: '2026-01-15T00:00:00.000Z',
  },
];

export const MOCK_DOCUMENT_CONTENT =
  '# 年假制度\n\n## 年假天数\n根据工龄不同，年假天数如下：\n- 1-10年：5天\n- 10-20年：10天\n- 20年以上：15天\n\n## 申请流程\n1. 在系统提交请假申请\n2. 直属上级审批\n3. HR备案';

// ── Profile 数据 ──
export const MOCK_PROFILE = {
  realName: '张三',
  department: '技术部',
  position: '前端工程师',
  level: 'P6',
  hireDate: '2023-03-15T00:00:00.000Z',
  probationEndDate: '2023-06-15T00:00:00.000Z',
  isProbation: false,
  annualLeaveTotal: 10,
  annualLeaveUsed: 3,
  annualLeaveRemaining: 7,
  sickLeaveUsed: 2,
  personalLeaveUsed: 1,
  marriageLeaveUsed: 0,
  maternityLeaveUsed: 0,
  reimbursementTotal: 3500,
  reimbursementPending: 1200,
  reimbursementApproved: 2300,
  reimbursementCount: 5,
  communicationSubsidy: 200,
  transportSubsidy: 300,
  mealSubsidy: 600,
  lateCountThisMonth: 1,
  forgotClockCountThisMonth: 0,
  overtimeBalanceHours: 8,
  trainingBudgetRemaining: 3500,
  annualExaminationStatus: 'completed',
  birthdayBenefitStatus: 'unclaimed',
  lastPromotionDate: '2025-03-15T00:00:00.000Z',
  nextEvaluationEligible: true,
  leaveRecords: [],
  monthlyMealSubsidies: [],
};

// ── SSE 流式响应 ──
export const MOCK_SSE_CHUNKS = [
  '根据',
  '《年假制度》',
  '规定',
  '，',
  '员工',
  '每年',
  '有',
  '5',
  '天',
  '年假',
  '。',
  '申请',
  '流程',
  '：',
  '在系统',
  '提交',
  '请假',
  '申请',
  '，',
  '直属上级',
  '审批',
  '，',
  'HR',
  '备案',
  '。',
];

export const MOCK_SSE_SOURCES = [
  {
    documentName: '年假制度.md',
    documentTitle: '年假制度',
    category: 'annual_leave',
    chunk: '根据工龄不同，年假天数如下：1-10年：5天',
    similarity: 0.89,
  },
  {
    documentName: '年假制度.md',
    documentTitle: '年假制度',
    category: 'annual_leave',
    chunk: '申请流程：1. 在系统提交请假申请',
    similarity: 0.75,
  },
];

export const MOCK_SSE_FOLLOWUPS = [
  '年假可以累积到明年吗？',
  '年假没用完怎么办？',
  '病假会影响年假吗？',
];

// ── 思考过程 Mock 数据 ──
export const MOCK_REASONING_CHUNKS = [
  '正在启动向量语义检索，查找与问题最相关的文档片段...\n',
  '正在进行关键词精确匹配，补充制度规则类文档...\n',
  '检索完成：向量检索返回 2 条，关键词检索返回 2 条，合并去重后得到 3 条相关文档。\n',
  '已匹配到用户个人信息：张三，技术部 前端工程师，年假剩余 7 天。\n',
  '已构建提示词（包含检索文档 + 用户个人信息 + 对话历史），正在调用 LLM 生成回答...\n',
];
