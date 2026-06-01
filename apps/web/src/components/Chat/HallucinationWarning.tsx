import React from 'react';

import styles from './HallucinationWarning.module.css';

export const HallucinationWarning: React.FC = () => (
  <div className={styles.warning}>⚠️ 回答包含未在文档中验证的数据，请核实</div>
);
