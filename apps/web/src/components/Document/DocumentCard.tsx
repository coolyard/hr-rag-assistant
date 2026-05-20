import { type FC, useCallback } from 'react';

import styles from './DocumentCard.module.css';

export interface HRDocument {
  id: string;
  filename: string;
  title: string;
  category: string;
  categoryName: string;
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

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getFullYear())}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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
        <span>更新于 {formatDate(doc.updatedAt)}</span>
      </div>
    </div>
  );
};
