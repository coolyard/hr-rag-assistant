import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { useChat } from '@/hooks/useChat';

// Mock the SSE module to prevent actual network calls
vi.mock('@/api/sse', () => ({
  streamAsk: vi.fn(),
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn().mockReturnValue(null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('useChat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('初始状态 messages 应为空', () => {
    const { result } = renderHook(() => useChat());
    expect(result.current.messages).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it('clearConversation 应清空所有消息', () => {
    const { result } = renderHook(() => useChat());
    act(() => {
      result.current.clearConversation();
    });
    expect(result.current.messages).toEqual([]);
    expect(result.current.conversationId).toBeNull();
  });

  it('setInputValue 应更新输入值', () => {
    const { result } = renderHook(() => useChat());
    act(() => {
      result.current.setInputValue('年假怎么请');
    });
    expect(result.current.inputValue).toBe('年假怎么请');
  });

  it('newConversation 应重置状态', () => {
    const { result } = renderHook(() => useChat());
    act(() => {
      result.current.setInputValue('test');
      result.current.newConversation();
    });
    expect(result.current.messages).toEqual([]);
    expect(result.current.conversationId).toBeNull();
  });
});
