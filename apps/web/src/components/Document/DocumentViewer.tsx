import { type FC, useCallback, useEffect, useState } from 'react';

import { client } from '@/api/client';
import type { HRDocument } from '@/components/Document/DocumentCard';
import { renderMarkdown } from '@/utils/markdown';

import styles from './DocumentViewer.module.css';

interface DocumentViewerProps {
  document: HRDocument | null;
  onClose: () => void;
}

export const DocumentViewer: FC<DocumentViewerProps> = ({ document: doc, onClose }) => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!doc) {
      return;
    }

    let cancelled = false;

    const fetchContent = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await client.get<{ content: string }>(`/documents/${doc.id}`);
        if (!cancelled) {
          setContent(response.data.content);
        }
      } catch {
        if (!cancelled) {
          setError('加载文档失败');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void fetchContent();

    return () => {
      cancelled = true;
    };
  }, [doc]);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose],
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (doc) {
      document.addEventListener('keydown', handler);
    }

    return () => {
      document.removeEventListener('keydown', handler);
    };
  }, [doc, onClose]);

  if (!doc) {
    return null;
  }

  return (
    <div
      className={styles.overlay}
      onClick={handleOverlayClick}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      tabIndex={-1}
    >
      <div className={styles.drawer}>
        <div className={styles.header}>
          <h2 className={styles.title}>{doc.title}</h2>
          <button className={styles.closeButton} onClick={onClose} type="button">
            ✕
          </button>
        </div>
        <div className={styles.body}>
          {loading && <p className={styles.loading}>加载中...</p>}
          {error && <p className={styles.error}>{error}</p>}
          {!loading && !error && content && (
            <div
              className={styles.markdown}
              dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
            />
          )}
        </div>
      </div>
    </div>
  );
};
