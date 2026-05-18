import { type FC, useCallback, useState } from 'react';

import type { SourceCitation } from '@/api/sse';
import styles from '@/components/Chat/ChatMessage.module.css';
import type { Message } from '@/hooks/useChat';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderMarkdown(text: string): string {
  let html = escapeHtml(text);

  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_m, _lang, code: string) => {
    return `<pre><code>${code}</code></pre>`;
  });

  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>');

  html = html.replace(/\n\n/g, '<br/><br/>');
  html = html.replace(/\n/g, '<br/>');

  return html;
}

interface CitationCardProps {
  citation: SourceCitation;
}

const CitationCard: FC<CitationCardProps> = ({ citation }) => {
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
}

export const ChatMessage: FC<ChatMessageProps> = ({ message }) => {
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
        {message.status === 'complete' && message.sources && message.sources.length > 0 && (
          <div className={styles.sourcesSection}>
            <p className={styles.sourcesLabel}>参考来源：</p>
            {message.sources.map((s, i) => (
              <CitationCard key={`${s.documentName}-${String(i)}`} citation={s} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
