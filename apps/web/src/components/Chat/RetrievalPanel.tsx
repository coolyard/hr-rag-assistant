import { type FC, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

import type { Message } from '@/hooks/useChat';

import styles from './RetrievalPanel.module.css';

interface RetrievalPanelProps {
  message: Message;
  onClose: () => void;
}

export const RetrievalPanel: FC<RetrievalPanelProps> = ({ message, onClose }) => {
  const detail = message.retrievalDetail;
  const sources = message.sources ?? [];

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [handleKeyDown]);

  const chartData = sources.map((s) => ({
    name: `《${s.documentTitle}》${s.chunk.slice(0, 20)}...`,
    fullName: `《${s.documentTitle}》
${s.chunk}`,
    similarity: Number((s.similarity * 100).toFixed(0)),
  }));

  return createPortal(
    <>
      <div className={styles.overlay} onClick={onClose} />
      <div className={styles.panel}>
        <div className={styles.header}>
          <h2 className={styles.title}>检索详情</h2>
          <button className={styles.closeButton} onClick={onClose} type="button">
            ✕
          </button>
        </div>
        <div className={styles.content}>
          {chartData.length > 0 && (
            <div className={styles.section}>
              <p className={styles.sectionTitle}>文档相似度</p>
              {chartData.map((item) => (
                <div key={item.name} className={styles.chartRow}>
                  <span className={styles.chartLabel} title={item.fullName}>
                    {item.name}
                  </span>
                  <div className={styles.chartBarTrack}>
                    <div
                      className={styles.chartBar}
                      style={{ width: `${String(item.similarity)}%` }}
                    />
                  </div>
                  <span className={styles.chartValue}>{String(item.similarity)}%</span>
                </div>
              ))}
            </div>
          )}

          {detail && (
            <div className={styles.section}>
              <p className={styles.sectionTitle}>检索来源贡献</p>
              <div className={styles.sourceRow}>
                <span className={styles.sourceLabel}>向量检索</span>
                <div
                  className={`${styles.sourceBar} ${styles.sourceBarVector}`}
                  style={{
                    width: `${String(Math.min((detail.vectorCount / Math.max(detail.mergedCount, 1)) * 100, 100))}%`,
                  }}
                />
                <span className={styles.sourceCount}>{detail.vectorCount} 条</span>
              </div>
              <div className={styles.sourceRow}>
                <span className={styles.sourceLabel}>关键词检索</span>
                <div
                  className={`${styles.sourceBar} ${styles.sourceBarKeyword}`}
                  style={{
                    width: `${String(Math.min((detail.keywordCount / Math.max(detail.mergedCount, 1)) * 100, 100))}%`,
                  }}
                />
                <span className={styles.sourceCount}>{detail.keywordCount} 条</span>
              </div>
            </div>
          )}

          {message.reasoning && (
            <div className={styles.section}>
              <p className={styles.sectionTitle}>检索过程</p>
              <pre className={styles.codeBlock}>{message.reasoning}</pre>
            </div>
          )}
        </div>
      </div>
    </>,
    document.body,
  );
};
