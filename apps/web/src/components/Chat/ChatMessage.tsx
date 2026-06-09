import { type FC, useCallback, useState } from 'react';

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

interface ChatMessageProps {
  message: Message;
  onFollowUp?: (question: string) => void;
}

export const ChatMessage: FC<ChatMessageProps> = ({ message, onFollowUp }) => {
  const isUser = message.role === 'user';
  const isLoading = message.status === 'sending' || message.status === 'streaming';
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
        {isLoading && !hasContent && (
          <div className={styles.loadingDots}>
            <span className={styles.dot}>●</span>
            <span className={styles.dot}>●</span>
            <span className={styles.dot}>●</span>
          </div>
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
      </div>
    </div>
  );
};
