import { type FC } from 'react';

import styles from './PageSkeleton.module.css';

export const PageSkeleton: FC = () => (
  <div className={styles.skeleton}>
    <div className={styles.navbarPlaceholder} />
    <div className={styles.contentPlaceholder}>加载中...</div>
  </div>
);
