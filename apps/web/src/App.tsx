import '@/styles/variables.css';

import { type FC, useCallback, useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';

import styles from '@/App.module.css';
import { Sidebar } from '@/components/Layout/Sidebar';
import { useAuth } from '@/hooks/useAuth';
import { useConversations } from '@/hooks/useConversations';
import { ChatPage } from '@/pages/ChatPage';
import { DocumentPage } from '@/pages/DocumentPage';
import { LoginPage } from '@/pages/LoginPage';
import { ProfilePage } from '@/pages/ProfilePage';

const ProtectedRoute: FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const AuthenticatedLayout: FC = () => {
  const {
    conversations,
    activeConvId,
    isLoading: convsLoading,
    fetchList,
    createConversation,
    renameConversation,
    deleteConversation,
    selectConversation,
  } = useConversations();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  // 列表加载完毕后，自动选中第一条对话
  useEffect(() => {
    if (!convsLoading && conversations.length > 0 && !activeConvId) {
      selectConversation(conversations[0].id);
    }
  }, [convsLoading, conversations, activeConvId, selectConversation]);

  const handleNew = async () => {
    try {
      const conv = await createConversation();
      if (conv && location.pathname !== '/chat') {
        void navigate('/chat');
      }
    } catch {
      // ignore
    }
  };

  const handleSelect = (id: string) => {
    selectConversation(id);
    closeSidebar();
    if (location.pathname !== '/chat') {
      void navigate('/chat');
    }
  };

  const sidebarVisible = location.pathname !== '/login';

  return (
    <div className={styles.appLayout}>
      {sidebarVisible && (
        <Sidebar
          conversations={conversations}
          activeConvId={activeConvId}
          isLoading={convsLoading}
          onNew={() => {
            void handleNew();
          }}
          onSelect={handleSelect}
          onRename={(id, title) => {
            renameConversation(id, title).catch(() => {});
          }}
          onDelete={(id) => {
            deleteConversation(id).catch(() => {});
          }}
          isOpen={sidebarOpen}
        />
      )}
      <div
        className={`${styles.backdrop} ${sidebarOpen ? styles.backdropVisible : ''}`}
        onClick={closeSidebar}
      ></div>
      <main className={styles.mainContent}>
        <button
          className={styles.hamburger}
          onClick={toggleSidebar}
          type="button"
          aria-label="切换侧边栏"
        >
          ☰
        </button>
        <Routes>
          <Route path="/" element={<Navigate to="/chat" replace />} />
          <Route
            path="/chat"
            element={
              <ChatPage
                activeConvId={activeConvId}
                onConversationUpdated={() => {
                  void fetchList();
                }}
              />
            }
          />
          <Route path="/documents" element={<DocumentPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Routes>
      </main>
    </div>
  );
};

export const App: FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="*"
        element={
          <ProtectedRoute>
            <AuthenticatedLayout />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};
