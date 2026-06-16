import { type FC, useCallback, useEffect, useRef } from 'react';

import { ChatMessage } from '@/components/Chat/ChatMessage';
import { Navbar } from '@/components/Layout/Navbar';
import { useChat } from '@/hooks/useChat';
import styles from '@/pages/ChatPage.module.css';

const MAX_CHARS = 500;

const QUICK_QUESTIONS = [
  '我今年还有几天年假？怎么申请？',
  '报销流程怎么走？多久能到账',
  '迟到几次开始扣钱？弹性打卡怎么算？',
  '加班调休怎么算？有加班费吗？',
  '我什么时候可以申请晋升？薪资能涨多少？',
];

interface ChatPageProps {
  activeConvId: string | null;
  onConversationUpdated?: () => void;
}

export const ChatPage: FC<ChatPageProps> = ({ activeConvId, onConversationUpdated }) => {
  const {
    messages,
    inputValue,
    setInputValue,
    isLoading,
    statusText,
    sendMessage,
    stopGeneration,
    retryMessage,
    regenerate,
    clearConversation,
    confirmToolCall,
    newConversation,
    loadConversation,
  } = useChat();

  const listRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSend = useCallback(() => {
    if (inputValue.trim().length === 0 || isLoading) {
      return;
    }
    void sendMessage(inputValue).then(() => {
      onConversationUpdated?.();
    });
  }, [inputValue, isLoading, sendMessage, onConversationUpdated]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      if (value.length <= MAX_CHARS) {
        setInputValue(value);
      }
    },
    [setInputValue],
  );

  const convRef = useRef(activeConvId);

  useEffect(() => {
    if (activeConvId && activeConvId !== convRef.current) {
      convRef.current = activeConvId;
      void loadConversation(activeConvId);
    }
    if (activeConvId === null && convRef.current !== null) {
      convRef.current = null;
      clearConversation();
    }
  }, [activeConvId, loadConversation, clearConversation]);

  const handleToolConfirm = useCallback(
    (toolCallId: string, toolName: string, args: Record<string, unknown>) => {
      void confirmToolCall(toolCallId, toolName, args);
    },
    [confirmToolCall],
  );

  const handleToolCancel = useCallback(() => {
    // 用户取消工具调用，不做任何操作
  }, []);

  const handleRetry = useCallback(
    (messageId: string) => {
      retryMessage(messageId);
    },
    [retryMessage],
  );

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${String(Math.min(textareaRef.current.scrollHeight, 120))}px`;
    }
  }, [inputValue]);

  const hasMessages = messages.length > 0;
  const charCount = inputValue.length;

  return (
    <div className={styles.page}>
      <Navbar />

      {hasMessages && (
        <div className={styles.toolbar}>
          <button className={styles.toolbarButton} onClick={newConversation} type="button">
            新对话
          </button>
          <button className={styles.toolbarButton} onClick={clearConversation} type="button">
            清除
          </button>
        </div>
      )}

      <div className={styles.messageList} ref={listRef}>
        {!hasMessages && (
          <div className={styles.welcome}>
            <p className={styles.welcomeTitle}>有什么可以帮您的？</p>
            <p className={styles.welcomeHint}>
              您可以询问关于年假、报销、晋升、考勤、福利等 HR 相关问题
            </p>
            <div className={styles.quickQuestions}>
              {QUICK_QUESTIONS.map((q) => (
                <button
                  key={q}
                  className={styles.quickQuestion}
                  onClick={() => {
                    void sendMessage(q).then(() => {
                      onConversationUpdated?.();
                    });
                  }}
                  disabled={isLoading}
                  type="button"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id}>
            <ChatMessage
              message={msg}
              onFollowUp={(q) => {
                void sendMessage(q).then(() => {
                  onConversationUpdated?.();
                });
              }}
              onRegenerate={(id) => {
                regenerate(id);
              }}
              onToolConfirm={handleToolConfirm}
              onToolCancel={handleToolCancel}
            />
            {msg.status === 'error' && msg.role === 'assistant' && (
              <div className={styles.retryRow}>
                <button
                  className={styles.retryButton}
                  onClick={() => {
                    const userMsg = messages.find((m) => m.role === 'user' && m.id < msg.id);
                    if (userMsg) {
                      handleRetry(userMsg.id);
                    }
                  }}
                  type="button"
                >
                  点击重试
                </button>
              </div>
            )}
          </div>
        ))}

        {isLoading && statusText && (
          <div className={styles.statusHint}>
            <span className={styles.spinner} />
            <span>{statusText}</span>
          </div>
        )}

        {(() => {
          const totalPrompt = messages.reduce((sum, m) => sum + (m.promptTokens ?? 0), 0);
          const totalCompletion = messages.reduce((sum, m) => sum + (m.completionTokens ?? 0), 0);
          if (totalCompletion > 0) {
            return (
              <div className={styles.tokenTotal}>
                本轮 · Prompt ~{totalPrompt} | Completion ~{totalCompletion} | 总计 ~
                {totalPrompt + totalCompletion} tokens
              </div>
            );
          }
          return null;
        })()}
      </div>

      <div className={styles.inputArea}>
        <textarea
          ref={textareaRef}
          className={styles.input}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="输入您的问题，Enter 发送，Shift+Enter 换行"
          rows={1}
          maxLength={MAX_CHARS}
          disabled={isLoading}
        />
        <div className={styles.inputFooter}>
          <span className={styles.charCount}>
            {String(charCount)}/{String(MAX_CHARS)}
          </span>
          {isLoading ? (
            <button className={styles.stopButton} onClick={stopGeneration} type="button">
              停止生成
            </button>
          ) : (
            <button
              className={styles.sendButton}
              onClick={handleSend}
              disabled={inputValue.trim().length === 0}
              type="button"
            >
              发送
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
