// src/layouts/AdminLayout.tsx
import React, { useState } from 'react';
import '../styles/AdminLayout.css';

interface AdminLayoutProps {
  activeTab: string;
  onTabChange: (tab: 'overview' | 'users' | 'commissions' | 'wishboard' | 'announcements' | 'feedback' | 'guide') => void;
  pendingReportCount?: number;
  children: React.ReactNode;
}

export function AdminLayout({ activeTab, onTabChange, pendingReportCount = 0, children }: AdminLayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const menuItems = [
    { id: 'overview', label: '📊 營運數據儀表板' },
    { id: 'users', label: '👥 用戶管理' },
    { id: 'commissions', label: '🎨 全站委託總覽' },
    { id: 'wishboard', label: '✨ 許願池審核' },
    { id: 'announcements', label: '📢 公告管理' },
    { id: 'feedback', label: '💬 意見回饋' },
    { id: 'guide', label: '📖 教學管理' },
  ] as const;

  const handleTabChange = (tab: typeof activeTab) => {
    onTabChange(tab as any);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="admin-layout-wrapper">
      {/* Mobile top bar */}
      <div className="admin-mobile-bar">
        <button className="admin-menu-btn" onClick={() => setIsMobileMenuOpen(true)}>☰</button>
        <span className="admin-mobile-bar-title">Arti 營運後台</span>
      </div>

      {/* Overlay */}
      <div
        className={`admin-sidebar-overlay ${isMobileMenuOpen ? 'visible' : ''}`}
        onClick={() => setIsMobileMenuOpen(false)}
      />

      {/* Sidebar */}
      <aside className={`admin-sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
        <div className="admin-sidebar-brand">Arti 營運後台</div>
        <nav className="admin-sidebar-nav">
          {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => handleTabChange(item.id)}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '16px 24px',
                backgroundColor: activeTab === item.id ? '#374151' : 'transparent',
                border: 'none',
                color: activeTab === item.id ? '#60A5FA' : '#D1D5DB',
                fontSize: '15px',
                fontWeight: activeTab === item.id ? 'bold' : 'normal',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>{item.label}</span>
              {item.id === 'wishboard' && pendingReportCount > 0 && (
                <span style={{
                  backgroundColor: '#EF4444',
                  color: '#FFF',
                  fontSize: '12px',
                  padding: '2px 8px',
                  borderRadius: '99px',
                  fontWeight: 'bold',
                  boxShadow: '0 0 8px rgba(239, 68, 68, 0.5)',
                }}>
                  {pendingReportCount}
                </span>
              )}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main className="admin-main">
        <div className="admin-content">
          {children}
        </div>
      </main>
    </div>
  );
}
