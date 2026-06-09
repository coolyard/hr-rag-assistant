import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { ChatMessage } from '@/components/Chat/ChatMessage';

describe('ChatMessage', () => {
  it('用户消息应显示内容', () => {
    render(
      <ChatMessage
        message={{
          id: '1',
          role: 'user',
          content: '年假怎么请',
          timestamp: Date.now(),
          status: 'complete',
        }}
      />,
    );
    expect(screen.getByText('年假怎么请')).toBeInTheDocument();
  });

  it('助理加载中应显示脉冲动画', () => {
    render(
      <ChatMessage
        message={{
          id: '2',
          role: 'assistant',
          content: '',
          timestamp: Date.now(),
          status: 'sending',
        }}
      />,
    );
    expect(screen.getAllByText('●')).toHaveLength(3);
  });

  it('助理流式中应显示打字光标', () => {
    render(
      <ChatMessage
        message={{
          id: '3',
          role: 'assistant',
          content: '正在回答...',
          timestamp: Date.now(),
          status: 'streaming',
        }}
      />,
    );
    expect(screen.getByText('正在回答...')).toBeInTheDocument();
  });

  it('助理完成时应显示来源引用', () => {
    render(
      <ChatMessage
        message={{
          id: '4',
          role: 'assistant',
          content: '年假有5天',
          timestamp: Date.now(),
          status: 'complete',
          sources: [
            {
              documentName: '年假制度.md',
              documentTitle: '年假制度',
              category: 'annual_leave',
              chunk: '年假有5天',
              similarity: 0.85,
            },
          ],
          confidenceLevel: 'high',
        }}
      />,
    );
    expect(screen.getByText('年假制度')).toBeInTheDocument();
    expect(screen.getByText(/85%/)).toBeInTheDocument();
  });

  it('error 状态应显示错误文本', () => {
    render(
      <ChatMessage
        message={{
          id: '5',
          role: 'assistant',
          content: '出错了',
          timestamp: Date.now(),
          status: 'error',
          error: '网络异常',
        }}
      />,
    );
    expect(screen.getByText('网络异常')).toBeInTheDocument();
  });

  it('有 followUps 时应显示猜测按钮', () => {
    render(
      <ChatMessage
        message={{
          id: '6',
          role: 'assistant',
          content: '年假有5天',
          timestamp: Date.now(),
          status: 'complete',
          followUps: ['病假怎么请？'],
        }}
      />,
    );
    expect(screen.getByText('病假怎么请？')).toBeInTheDocument();
  });

  it('有 hallucinationWarning 时应显示警告', () => {
    render(
      <ChatMessage
        message={{
          id: '7',
          role: 'assistant',
          content: '回答',
          timestamp: Date.now(),
          status: 'complete',
          hallucinationWarning: '回答包含未在文档中验证的数据',
        }}
      />,
    );
    expect(screen.getByText(/未在文档中验证/)).toBeInTheDocument();
  });
});
