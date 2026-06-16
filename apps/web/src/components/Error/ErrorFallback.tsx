import { type FC } from 'react';

import styles from './ErrorFallback.module.css';

interface ErrorFallbackProps {
  error: Error;
  onRetry: () => void;
}

export const ErrorFallback: FC<ErrorFallbackProps> = ({ error, onRetry }) => (
  <div className={styles.wrapper}>
    <div className={styles.icon}>⚠️</div>
    <h1 className={styles.title}>页面出错了</h1>
    <p className={styles.message}>{error.message || '发生了未知错误，请重试。'}</p>
    <button className={styles.retryButton} onClick={onRetry} type="button">
      重试
    </button>
  </div>
);
