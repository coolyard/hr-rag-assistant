import { type FC, useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';

import { useAuth } from '@/hooks/useAuth';
import styles from '@/pages/LoginPage.module.css';
import { getStoredCredentials } from '@/utils/storage';

export const LoginPage: FC = () => {
  const { isAuthenticated, isLoading, login } = useAuth();
  const navigate = useNavigate();
  const usernameRef = useRef<HTMLInputElement>(null);

  const stored = getStoredCredentials();
  const [username, setUsername] = useState(stored?.username ?? '');
  const [password, setPassword] = useState(stored?.password ?? '');
  const [remember, setRemember] = useState(stored !== null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    usernameRef.current?.focus();
  }, []);

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      void navigate('/chat', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  const handleSubmit = useCallback(async () => {
    if (!username.trim() || !password.trim()) {
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      await login(username, password, remember);
    } catch (err) {
      const axiosError = err as { response?: { data?: { message?: string } }; message?: string };
      if (axiosError.response?.data?.message) {
        setError(axiosError.response.data.message);
      } else if (axiosError.message === 'Network Error') {
        setError('网络异常，请稍后重试');
      } else {
        setError('登录失败，请稍后重试');
      }
    } finally {
      setSubmitting(false);
    }
  }, [username, password, remember, login]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !submitting) {
        void handleSubmit();
      }
    },
    [handleSubmit, submitting],
  );

  if (isAuthenticated) {
    return <Navigate to="/chat" replace />;
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>HR 智能助手</h1>
        <p className={styles.subtitle}>请登录以继续</p>
        <div className={styles.field}>
          <input
            ref={usernameRef}
            className={styles.input}
            type="text"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
            }}
            onKeyDown={handleKeyDown}
            placeholder="请输入账号"
            disabled={submitting}
            autoComplete="username"
          />
        </div>
        <div className={styles.field}>
          <input
            className={styles.input}
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
            }}
            onKeyDown={handleKeyDown}
            placeholder="请输入密码"
            disabled={submitting}
            autoComplete="current-password"
          />
        </div>
        <label className={styles.rememberLabel}>
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => {
              setRemember(e.target.checked);
            }}
            className={styles.rememberCheckbox}
          />
          记住用户名和密码
        </label>
        {error && <p className={styles.error}>{error}</p>}
        <button
          className={styles.submitButton}
          onClick={() => {
            void handleSubmit();
          }}
          disabled={submitting || !username.trim() || !password.trim()}
          type="button"
        >
          {submitting ? '登录中...' : '登录'}
        </button>
      </div>
    </div>
  );
};
