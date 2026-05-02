import React from 'react';

interface AdminLayoutProps {
  activeTab: string;
  onTabChange: (tab: 'overview' | 'users' | 'commissions' | 'wishboard') => void;
  children: React.ReactNode;
}

export function AdminLayout({ activeTab, onTabChange, children }: AdminLayoutProps) {
  const menuItems = [
    { id: 'overview', label: '📊 營運數據儀表板' },
    { id: 'users', label: '👥 用戶管理' },
    { id: 'commissions', label: '🎨 全站委託總覽' },
    { id: 'wishboard', label: '✨ 許願池審核' },
  ] as const;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#F3F4F6', fontFamily: 'system-ui, sans-serif' }}>
      {/* 左側固定的側邊欄 */}
      <aside style={{ width: '260px', backgroundColor: '#111827', color: '#FFF', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '24px', fontSize: '20px', fontWeight: '900', borderBottom: '1px solid #374151' }}>
          Arti 營運後台
        </div>
        <nav style={{ flex: 1, padding: '16px 0' }}>
          {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
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
                transition: 'all 0.2s'
              }}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* 右側主要內容區 */}
      <main style={{ flex: 1, padding: '32px', overflowY: 'auto', height: '100vh', boxSizing: 'border-box' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {children}
        </div>
      </main>
    </div>
  );
}