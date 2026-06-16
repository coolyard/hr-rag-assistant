import type { ToolResult } from '@/rag/rag.interface';

export interface ToolDefinition {
  name: string;
  title: string;
  triggers: string[];
  buildArgs: (query: string) => Record<string, unknown>;
  execute: (args: Record<string, unknown>) => ToolResult;
  confirmRequired: boolean;
}
