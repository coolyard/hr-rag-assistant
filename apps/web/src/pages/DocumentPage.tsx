import { type FC, useCallback, useEffect, useMemo, useState } from 'react';

import { client } from '@/api/client';
import type { HRDocument } from '@/components/Document/DocumentCard';
import { DocumentCard } from '@/components/Document/DocumentCard';
import { DocumentUploader } from '@/components/Document/DocumentUploader';
import { DocumentViewer } from '@/components/Document/DocumentViewer';
import { Navbar } from '@/components/Layout/Navbar';
import { useAuth } from '@/hooks/useAuth';
import styles from '@/pages/DocumentPage.module.css';

const CATEGORY_FILTERS = [
  { id: '', name: '全部' },
  { id: 'annual_leave', name: '年假' },
  { id: 'reimbursement', name: '报销' },
  { id: 'promotion', name: '晋升' },
  { id: 'attendance', name: '考勤' },
  { id: 'welfare', name: '福利' },
];

export const DocumentPage: FC = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<HRDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('');
  const [selectedDoc, setSelectedDoc] = useState<HRDocument | null>(null);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);

    try {
      const response = await client.get<{ documents: HRDocument[] }>('/documents');
      setDocuments(response.data.documents);
    } catch {
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchDocuments();
  }, [fetchDocuments]);

  const filteredDocuments = useMemo(() => {
    let result = documents;

    if (activeCategory) {
      result = result.filter((d) => d.category === activeCategory);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      result = result.filter((d) => d.title.toLowerCase().includes(query));
    }

    return result;
  }, [documents, activeCategory, searchQuery]);

  const handleCardClick = useCallback(
    (id: string) => {
      const doc = documents.find((d) => d.id === id);
      if (doc) {
        setSelectedDoc(doc);
      }
    },
    [documents],
  );

  const handleCloseViewer = useCallback(() => {
    setSelectedDoc(null);
  }, []);

  const handleUploadSuccess = useCallback(() => {
    void fetchDocuments();
  }, [fetchDocuments]);

  return (
    <div className={styles.page}>
      <Navbar />

      <div className={styles.header}>
        <div className={styles.stats}>
          <span className={styles.statItem}>📚 {String(documents.length)} 个文档</span>
        </div>
        {user?.role === 'hr' && <DocumentUploader onSuccess={handleUploadSuccess} />}
      </div>

      <div className={styles.toolbar}>
        <input
          className={styles.searchInput}
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
          }}
          placeholder="搜索文档标题..."
        />
        <div className={styles.categoryFilters}>
          {CATEGORY_FILTERS.map((cat) => (
            <button
              key={cat.id}
              className={activeCategory === cat.id ? styles.filterActive : styles.filterButton}
              onClick={() => {
                setActiveCategory(cat.id);
              }}
              type="button"
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.content}>
        {loading && <p className={styles.empty}>加载中...</p>}

        {!loading && filteredDocuments.length === 0 && documents.length === 0 && (
          <p className={styles.empty}>暂无文档</p>
        )}

        {!loading && filteredDocuments.length === 0 && documents.length > 0 && (
          <p className={styles.empty}>未找到匹配的文档</p>
        )}

        {filteredDocuments.length > 0 && (
          <div className={styles.grid}>
            {filteredDocuments.map((doc) => (
              <DocumentCard key={doc.id} document={doc} onClick={handleCardClick} />
            ))}
          </div>
        )}
      </div>

      <DocumentViewer document={selectedDoc} onClose={handleCloseViewer} />
    </div>
  );
};
