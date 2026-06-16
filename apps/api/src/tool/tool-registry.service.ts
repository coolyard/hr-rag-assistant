import { Injectable } from '@nestjs/common';

import type { ToolResult } from '@/rag/rag.interface';

import type { ToolDefinition } from './tool.interface';

function generateId(prefix: string): string {
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${String(ts)}-${rand}`;
}

@Injectable()
export class ToolRegistryService {
  private readonly tools: ToolDefinition[] = [
    {
      name: 'apply_leave',
      title: '申请年假',
      triggers: ['申请年假', '请假', '想休假', '年假'],
      buildArgs: (_query: string) => ({
        days: 3,
        startDate: '2026-06-20',
        endDate: '2026-06-22',
        leaveType: 'annual',
      }),
      execute: (args: Record<string, unknown>): ToolResult => ({
        id: generateId('tc'),
        result: `年假申请已提交：${String(args.days)}天（${String(args.startDate)} 至 ${String(args.endDate)}），等待直属上级审批。`,
      }),
      confirmRequired: true,
    },
    {
      name: 'query_reimbursement',
      title: '查询报销记录',
      triggers: ['报销', '报销记录'],
      buildArgs: (_query: string) => ({
        statusFilter: 'all',
      }),
      execute: (_args: Record<string, unknown>): ToolResult => ({
        id: generateId('tc'),
        result: {
          total: 2,
          records: [
            { id: 'r-1', title: '差旅报销', amount: 1200, status: '已批准', date: '2026-06-10' },
            { id: 'r-2', title: '办公用品', amount: 350, status: '待审批', date: '2026-06-14' },
          ],
        },
      }),
      confirmRequired: false,
    },
    {
      name: 'query_overtime',
      title: '查询加班/调休',
      triggers: ['加班', '调休'],
      buildArgs: (_query: string) => ({
        dateRange: 'currentMonth',
      }),
      execute: (_args: Record<string, unknown>): ToolResult => ({
        id: generateId('tc'),
        result: {
          overtimeHours: 8,
          usedCompLeave: 3,
          remainingCompLeave: 5,
        },
      }),
      confirmRequired: false,
    },
  ];

  detectTool(query: string): ToolDefinition | null {
    return this.tools.find((t) => t.triggers.some((trigger) => query.includes(trigger))) ?? null;
  }

  executeTool(name: string, args: Record<string, unknown>): ToolResult {
    const tool = this.tools.find((t) => t.name === name);
    if (!tool) {
      return { id: generateId('tc'), result: '', error: `Unknown tool: ${name}` };
    }
    return tool.execute(args);
  }
}
