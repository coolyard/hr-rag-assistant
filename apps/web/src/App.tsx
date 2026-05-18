import { FC } from 'react';

import styles from '@/App.module.css';

export const App: FC = () => {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>HR RAG Assistant</h1>
      <p className={styles.subtitle}>AI-Powered HR Knowledge Base</p>
    </div>
  );
};
