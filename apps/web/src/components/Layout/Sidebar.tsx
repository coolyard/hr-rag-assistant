import {
  type ChangeEvent,
  type FC,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import type { ConversationItem } from '@/hooks/useConversations';

import styles from './Sidebar.module.css';

interface SidebarProps {
  conversations: ConversationItem[];
  activeConvId: string | null;
  isLoading: boolean;
  onNew: () => void;
  onSelect: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  isOpen?: boolean;
}

export const Sidebar: FC<SidebarProps> = ({
  conversations,
  activeConvId,
  isLoading,
  onNew,
  onSelect,
  onRename,
  onDelete,
  isOpen,
}) => {
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  // 每次 Sidebar 重新挂载时（切回 /chat）拉取对话列表
  const [editTitle, setEditTitle] = useState('');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const editRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId && editRef.current) {
      editRef.current.focus();
      editRef.current.select();
    }
  }, [editingId]);

  const filtered = conversations.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase()),
  );

  const handleStartRename = useCallback((id: string, currentTitle: string) => {
    setEditingId(id);
    setEditTitle(currentTitle);
    setMenuOpenId(null);
  }, []);

  const handleConfirmRename = useCallback(
    (id: string) => {
      const trimmed = editTitle.trim();
      if (trimmed.length > 0) {
        onRename(id, trimmed);
      }
      setEditingId(null);
    },
    [editTitle, onRename],
  );

  const handleRenameKey = useCallback(
    (e: KeyboardEvent<HTMLInputElement>, id: string) => {
      if (e.key === 'Enter') {
        handleConfirmRename(id);
      } else if (e.key === 'Escape') {
        setEditingId(null);
      }
    },
    [handleConfirmRename],
  );

  const handleDelete = useCallback(
    (id: string) => {
      setMenuOpenId(null);
      onDelete(id);
    },
    [onDelete],
  );

  return (
    <div className={styles.sidebar} data-open={isOpen ? 'true' : undefined}>
      <div className={styles.header}>
        <button className={styles.newButton} onClick={onNew} type="button">
          + 新建对话
        </button>
        <input
          className={styles.searchInput}
          value={search}
          onChange={(e: ChangeEvent<HTMLInputElement>) => {
            setSearch(e.target.value);
          }}
          placeholder="搜索对话..."
        />
      </div>

      <div className={styles.list}>
        {isLoading && <p className={styles.emptyState}>加载中...</p>}
        {!isLoading && filtered.length === 0 && (
          <p className={styles.emptyState}>{search.length > 0 ? '无匹配结果' : '暂无对话'}</p>
        )}
        {filtered.map((conv) => (
          <div
            key={conv.id}
            className={`${styles.conversationItem} ${
              activeConvId === conv.id ? styles.conversationItemActive : ''
            }`}
            onClick={() => {
              if (editingId !== conv.id) {
                onSelect(conv.id);
              }
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && editingId !== conv.id) {
                onSelect(conv.id);
              }
            }}
            style={{ position: 'relative' }}
          >
            {editingId === conv.id ? (
              <input
                ref={editRef}
                className={styles.convTitleEdit}
                value={editTitle}
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  setEditTitle(e.target.value);
                }}
                onBlur={() => {
                  handleConfirmRename(conv.id);
                }}
                onKeyDown={(e) => {
                  handleRenameKey(e, conv.id);
                }}
                onClick={(e) => {
                  e.stopPropagation();
                }}
              />
            ) : (
              <span
                className={styles.convTitle}
                onDoubleClick={() => {
                  handleStartRename(conv.id, conv.title);
                }}
              >
                {conv.title || '新对话'}
              </span>
            )}
            <button
              className={styles.moreButton}
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpenId(menuOpenId === conv.id ? null : conv.id);
              }}
              type="button"
            >
              ⋯
            </button>
            {menuOpenId === conv.id && (
              <div className={styles.menu}>
                <button
                  className={styles.menuItem}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStartRename(conv.id, conv.title);
                  }}
                  type="button"
                >
                  重命名
                </button>
                <button
                  className={`${styles.menuItem} ${styles.menuItemDanger}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(conv.id);
                  }}
                  type="button"
                >
                  删除
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
