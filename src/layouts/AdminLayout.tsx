// src/layouts/AdminLayout.tsx
import React from 'react';

interface AdminLayoutProps {
  activeTab: string;
  onTabChange: (tab: 'overview' | 'users' | 'commissions' | 'wishboard') => void;
  pendingReportCount?: number; // 🌟 新增：接收未處理的檢舉數量
  children: React.ReactNode;
}

export function AdminLayout({ activeTab, onTabChange, pendingReportCount = 0, children }: AdminLayoutProps) {
  const menuItems = [
    { id: 'overview', label: '📊 營運數據儀表板' },
    { id: 'users', label: '👥 用戶管理' },
    { id: 'commissions', label: '🎨 全站委託總覽' },
    { id: 'wishboard', label: '✨ 許願池審核' },
  ] as const;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#F3F4F6', fontFamily: 'system-ui, sans-serif' }}>
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
                transition: 'all 0.2s',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <span>{item.label}</span>
              
              {/* 🌟 方案 A 的紅點 UI */}
              {item.id === 'wishboard' && pendingReportCount > 0 && (
                <span style={{ 
                  backgroundColor: '#EF4444', 
                  color: '#FFF', 
                  fontSize: '12px', 
                  padding: '2px 8px', 
                  borderRadius: '99px', 
                  fontWeight: 'bold',
                  boxShadow: '0 0 8px rgba(239, 68, 68, 0.5)'
                }}>
                  {pendingReportCount}
                </span>
              )}
            </button>
          ))}
        </nav>
      </aside>

      <main style={{ flex: 1, padding: '32px', overflowY: 'auto', height: '100vh', boxSizing: 'border-box' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {children}
        </div>
      </main>
    </div>
  );
}