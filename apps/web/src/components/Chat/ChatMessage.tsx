import { type FC, useCallback, useEffect, useState } from 'react';

import type { SourceCitation } from '@/api/sse';
import styles from '@/components/Chat/ChatMessage.module.css';
import { ConfidenceBadge } from '@/components/Chat/ConfidenceBadge';
import { HallucinationWarning } from '@/components/Chat/HallucinationWarning';
import type { Message } from '@/hooks/useChat';
import { renderMarkdown } from '@/utils/markdown';

interface CitationCardProps {
  citation: SourceCitation;
  confidenceLevel?: 'high' | 'medium' | 'low';
}

const CitationCard: FC<CitationCardProps> = ({ citation, confidenceLevel }) => {
  const [expanded, setExpanded] = useState(false);

  const toggle = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  const similarityPct = (citation.similarity * 100).toFixed(0);

  return (
    <div
      className={styles.citationCard}
      onClick={toggle}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') toggle();
      }}
    >
      <div className={styles.citationHeader}>
        <span className={styles.citationDoc}>{citation.documentTitle}</span>
        <ConfidenceBadge level={confidenceLevel} />
        <span className={styles.citationSimilarity}>相似度 {similarityPct}%</span>
      </div>
      <div className={expanded ? styles.citationChunkExpanded : styles.citationChunk}>
        {citation.chunk}
      </div>
    </div>
  );
};

interface ThinkingSectionProps {
  reasoning: string;
  isStreaming: boolean;
}

const ThinkingSection: FC<ThinkingSectionProps> = ({ reasoning, isStreaming }) => {
  const [expanded, setExpanded] = useState(isStreaming);

  useEffect(() => {
    if (isStreaming) {
      setExpanded(true);
    }
  }, [isStreaming]);

  useEffect(() => {
    if (!isStreaming && expanded) {
      const timer = setTimeout(() => {
        setExpanded(false);
      }, 3000);
      return () => {
        clearTimeout(timer);
      };
    }
  }, [isStreaming, expanded]);

  const toggle = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  if (reasoning.length === 0) {
    return null;
  }

  const chevron = expanded ? '▾' : '▸';

  return (
    <div className={styles.thinkingSection}>
      <div
        className={styles.thinkingHeader}
        onClick={toggle}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter') toggle();
        }}
      >
        <span className={styles.thinkingChevron}>{chevron}</span>
        <span className={styles.thinkingLabel}>{isStreaming ? '思考中...' : '思考过程'}</span>
      </div>
      <div className={expanded ? styles.thinkingContentExpanded : styles.thinkingContent}>
        <p className={styles.thinkingText}>{reasoning}</p>
      </div>
    </div>
  );
};

interface ChatMessageProps {
  message: Message;
  onFollowUp?: (question: string) => void;
  onRegenerate?: (id: string) => void;
}

export const ChatMessage: FC<ChatMessageProps> = ({ message, onFollowUp, onRegenerate }) => {
  const isUser = message.role === 'user';
  const isLoading = message.status === 'sending' || message.status === 'streaming';
  const isStopped = message.status === 'stopped';
  const hasContent = message.content.length > 0;

  if (isUser) {
    return (
      <div className={styles.userRow}>
        <div className={styles.userBubble}>
          <p className={styles.messageText}>{message.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.assistantRow}>
      <div className={styles.assistantBubble}>
        {message.reasoning && (
          <ThinkingSection
            reasoning={message.reasoning}
            isStreaming={message.status === 'sending' || message.status === 'streaming'}
          />
        )}
        {isLoading && !hasContent && (
          <div className={styles.loadingDots}>
            <span className={styles.dot}>●</span>
            <span className={styles.dot}>●</span>
            <span className={styles.dot}>●</span>
          </div>
        )}
        {isStopped && !hasContent && <p className={styles.stoppedHint}>用户已停止生成</p>}
        {isStopped && hasContent && (
          <p className={styles.stoppedHint}>用户已停止生成 · 以下为已生成内容</p>
        )}
        {hasContent && (
          <div
            className={styles.messageText}
            dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }}
          />
        )}
        {isLoading && hasContent && <span className={styles.streamingCursor}>|</span>}
        {message.status === 'error' && message.error && (
          <p className={styles.errorText}>{message.error}</p>
        )}
        {message.status === 'complete' && message.hallucinationWarning && <HallucinationWarning />}
        {message.status === 'complete' && message.sources && message.sources.length > 0 && (
          <div className={styles.sourcesSection}>
            <p className={styles.sourcesLabel}>参考来源：</p>
            {message.sources.map((s, i) => (
              <CitationCard
                key={`${s.documentName}-${String(i)}`}
                citation={s}
                confidenceLevel={message.confidenceLevel}
              />
            ))}
          </div>
        )}
        {message.status === 'complete' && message.followUps && message.followUps.length > 0 && (
          <div className={styles.followUpsSection}>
            <p className={styles.followUpsLabel}>猜你想问：</p>
            {message.followUps.map((q) => (
              <button
                key={q}
                className={styles.followUpButton}
                onClick={() => {
                  onFollowUp?.(q);
                }}
                type="button"
              >
                {q}
              </button>
            ))}
          </div>
        )}
        {message.status === 'complete' &&
          message.promptTokens != null &&
          message.completionTokens != null && (
            <div className={styles.tokenInfo}>~{message.completionTokens} tokens</div>
          )}
        {message.status === 'complete' && message.role === 'assistant' && onRegenerate && (
          <button
            className={styles.regenerateButton}
            onClick={() => {
              onRegenerate(message.id);
            }}
            type="button"
          >
            重新生成
          </button>
        )}
      </div>
    </div>
  );
};
