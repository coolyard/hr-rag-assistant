import React from 'react';

import styles from './ConfidenceBadge.module.css';

interface ConfidenceBadgeProps {
  level?: 'high' | 'medium' | 'low';
}

const config: Record<string, { text: string; className: string }> = {
  high: { text: '高置信度', className: styles.high },
  medium: { text: '中置信度', className: styles.medium },
  low: { text: '低置信度', className: styles.low },
};

export const ConfidenceBadge: React.FC<ConfidenceBadgeProps> = ({ level }) => {
  if (!level) return null;
  const c = config[level];
  return <span className={`${styles.badge} ${c.className}`}>{c.text}</span>;
};
