/* eslint-disable @typescript-eslint/no-floating-promises, @typescript-eslint/no-confusing-void-expression, @typescript-eslint/no-meaningless-void-operator */
import '@/styles/variables.css';

import { type FC, useEffect } from 'react';
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

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  const handleNew = () => {
    createConversation()
      .then((conv) => {
        if (conv && location.pathname !== '/chat') {
          navigate('/chat');
        }
      })
      .catch(() => {});
  };

  const handleSelect = (id: string) => {
    selectConversation(id);
    if (location.pathname !== '/chat') {
      navigate('/chat');
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
        />
      )}
      <main className={styles.mainContent}>
        <Routes>
          <Route path="/" element={<Navigate to="/chat" replace />} />
          <Route path="/chat" element={<ChatPage activeConvId={activeConvId} />} />
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
