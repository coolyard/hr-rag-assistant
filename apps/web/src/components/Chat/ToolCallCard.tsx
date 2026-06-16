import { type FC, useCallback, useState } from 'react';

import styles from './ToolCallCard.module.css';

interface ToolCallCardProps {
  toolCall: {
    id: string;
    name: string;
    title: string;
    args: Record<string, unknown>;
    confirmRequired: boolean;
  };
  onConfirm: () => void;
  onCancel: () => void;
}

export const ToolCallCard: FC<ToolCallCardProps> = ({ toolCall, onConfirm, onCancel }) => {
  const [status, setStatus] = useState<'idle' | 'executing' | 'completed' | 'cancelled'>('idle');

  const handleConfirm = useCallback(() => {
    setStatus('executing');
    onConfirm();
    setStatus('completed');
  }, [onConfirm]);

  const handleCancel = useCallback(() => {
    setStatus('cancelled');
    onCancel();
  }, [onCancel]);

  const icon = status === 'completed' ? '✓' : status === 'cancelled' ? '✗' : '🔧';

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.icon}>{icon}</span>
        <span className={styles.title}>{toolCall.title}</span>
        {status === 'completed' && <span className={styles.badgeCompleted}>已完成</span>}
        {status === 'cancelled' && <span className={styles.badgeCancelled}>已取消</span>}
      </div>
      <div className={styles.args}>
        {Object.entries(toolCall.args).map(([key, value]) => (
          <div key={key} className={styles.argRow}>
            <span className={styles.argKey}>{key}</span>
            <span className={styles.argValue}>{String(value)}</span>
          </div>
        ))}
      </div>
      {status === 'idle' && toolCall.confirmRequired && (
        <div className={styles.actions}>
          <button className={styles.confirmButton} onClick={handleConfirm} type="button">
            确认执行
          </button>
          <button className={styles.cancelButton} onClick={handleCancel} type="button">
            取消
          </button>
        </div>
      )}
      {status === 'idle' && !toolCall.confirmRequired && (
        <div className={styles.actions}>
          <button className={styles.confirmButton} onClick={handleConfirm} type="button">
            执行
          </button>
        </div>
      )}
      {status === 'executing' && <p className={styles.statusText}>执行中...</p>}
    </div>
  );
};
