import { type FC, useCallback, useEffect, useRef } from 'react';

import { ChatMessage } from '@/components/Chat/ChatMessage';
import { Navbar } from '@/components/Layout/Navbar';
import { useChat } from '@/hooks/useChat';
import styles from '@/pages/ChatPage.module.css';

const MAX_CHARS = 500;

export const ChatPage: FC = () => {
  const {
    messages,
    inputValue,
    setInputValue,
    isLoading,
    sendMessage,
    retryMessage,
    clearConversation,
    newConversation,
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
    void sendMessage(inputValue);
  }, [inputValue, isLoading, sendMessage]);

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
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id}>
            <ChatMessage message={msg} />
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

        {isLoading && <p className={styles.searchingHint}>正在检索文档...</p>}
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
          <button
            className={styles.sendButton}
            onClick={handleSend}
            disabled={isLoading || inputValue.trim().length === 0}
            type="button"
          >
            {isLoading ? '生成中...' : '发送'}
          </button>
        </div>
      </div>
    </div>
  );
};
