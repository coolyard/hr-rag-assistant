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
          💬 <span className={styles.navLabel}>对话</span>
        </Link>
        <Link to="/documents" className={isActive('/documents')}>
          📚 <span className={styles.navLabel}>文档</span>
        </Link>
        <Link to="/profile" className={isActive('/profile')}>
          👤 <span className={styles.navLabel}>我的</span>
        </Link>
        {user?.role === 'hr' && (
          <Link to="/evaluation" className={isActive('/evaluation')}>
            📊 <span className={styles.navLabel}>评估</span>
          </Link>
        )}
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
