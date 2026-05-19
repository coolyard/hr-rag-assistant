import { type FC, useCallback } from 'react';

import styles from './DocumentCard.module.css';

export interface HRDocument {
  id: string;
  filename: string;
  title: string;
  category: string;
  categoryName: string;
  chunkCount: number;
  size: number;
  createdAt: string;
  updatedAt: string;
}

interface DocumentCardProps {
  document: HRDocument;
  onClick: (id: string) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  annual_leave: '年假',
  reimbursement: '报销',
  promotion: '晋升',
  attendance: '考勤',
  welfare: '福利',
  custom: '自定义',
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${String(bytes)} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const DocumentCard: FC<DocumentCardProps> = ({ document: doc, onClick }) => {
  const handleClick = useCallback(() => {
    onClick(doc.id);
  }, [doc.id, onClick]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter') {
        onClick(doc.id);
      }
    },
    [doc.id, onClick],
  );

  const cssVarBg = `var(--category-${doc.category === 'annual_leave' ? 'annual' : doc.category === 'reimbursement' ? 'reimburse' : doc.category === 'welfare' ? 'benefits' : doc.category}-bg)`;
  const cssVarText = `var(--category-${doc.category === 'annual_leave' ? 'annual' : doc.category === 'reimbursement' ? 'reimburse' : doc.category === 'welfare' ? 'benefits' : doc.category}-text)`;

  return (
    <div
      className={styles.card}
      style={{ background: cssVarBg, color: cssVarText }}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
    >
      <span className={styles.badge} style={{ color: cssVarText }}>
        {CATEGORY_LABELS[doc.category] || doc.categoryName}
      </span>
      <h3 className={styles.title}>{doc.title}</h3>
      <div className={styles.meta}>
        <span>{String(doc.chunkCount)} 个片段</span>
        <span>{formatFileSize(doc.size)}</span>
      </div>
    </div>
  );
};
