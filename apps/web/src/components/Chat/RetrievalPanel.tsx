import { type FC, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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
    name: s.documentTitle,
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
              <ResponsiveContainer width="100%" height={Math.max(chartData.length * 40, 120)}>
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ left: 0, right: 20, top: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value) => `${String(value ?? 0)}%`} />
                  <Bar dataKey="similarity" fill="var(--accent-color)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
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
