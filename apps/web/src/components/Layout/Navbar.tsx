import { type FC } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import styles from '@/components/Layout/Navbar.module.css';
import { ThemeToggle } from '@/components/Theme/ThemeToggle';
import { useAuth } from '@/hooks/useAuth';

export const Navbar: FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    void navigate('/login', { replace: true });
  };

  const isActive = (path: string): string => {
    return location.pathname === path ? styles.navLinkActive : styles.navLink;
  };

  return (
    <nav className={styles.navbar}>
      <span className={styles.brand}>HR 智能助手</span>
      <div className={styles.navLinks}>
        <Link to="/chat" className={isActive('/chat')}>
          💬 对话
        </Link>
        <Link to="/documents" className={isActive('/documents')}>
          📚 文档
        </Link>
        <Link to="/profile" className={isActive('/profile')}>
          👤 我的
        </Link>
      </div>
      <div className={styles.right}>
        <ThemeToggle />
        {user && (
          <div className={styles.userInfo}>
            <span className={styles.userName}>{user.displayName}</span>
            <span className={styles.userRole}>{user.role === 'hr' ? 'HR专员' : '员工'}</span>
            <button className={styles.logoutButton} onClick={handleLogout} type="button">
              退出登录
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};
