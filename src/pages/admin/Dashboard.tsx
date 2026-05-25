// src/pages/admin/Dashboard.tsx
import { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { AdminLayout } from '../../layouts/AdminLayout';
import { OverviewTab } from './OverviewTab';
import { UsersTab } from './UsersTab';
import { CommissionsTab } from './CommissionsTab';
import { WishboardTab } from './WishboardTab';
import { AnnouncementsTab } from './AnnouncementsTab';
import { FeedbackTab } from './FeedbackTab';
import { GuideTab } from './GuideTab';

export function Dashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'commissions' | 'wishboard' | 'announcements' | 'feedback' | 'guide'>('overview');
  const [stats, setStats] = useState<any>(null);
  const [authState, setAuthState] = useState<'loading' | 'ok' | 'denied'>('loading');

  useEffect(() => {
    apiClient.get('/api/admin/stats')
      .then(res => {
        setStats((res as any).data);
        setAuthState('ok');
      })
      .catch(() => setAuthState('denied'));
  }, []);

  useEffect(() => {
    if (authState !== 'ok') return;
    apiClient.get('/api/admin/stats')
      .then(res => setStats((res as any).data))
      .catch(() => {/* silent after initial auth */});
  }, [activeTab, authState]);

  if (authState === 'loading') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#F3F4F6', fontSize: '16px', color: '#6B7280' }}>
        驗證中…
      </div>
    );
  }

  if (authState === 'denied') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#F3F4F6', gap: '12px' }}>
        <div style={{ fontSize: '48px' }}>🚫</div>
        <div style={{ fontSize: '20px', fontWeight: 700, color: '#111827' }}>權限不足</div>
        <div style={{ fontSize: '14px', color: '#6B7280' }}>此頁面僅限管理員存取。</div>
      </div>
    );
  }

  const renderContent = (): React.ReactNode => {
    switch (activeTab) {
      case 'overview': return <OverviewTab stats={stats} />; 
      case 'users': return <UsersTab />;
      case 'commissions': return <CommissionsTab />;
      case 'wishboard': return <WishboardTab />;
      case 'announcements': return <AnnouncementsTab />;
      case 'feedback': return <FeedbackTab />;
      case 'guide': return <GuideTab />;
      default: return <OverviewTab stats={stats} />;
    }
  };

  return (
    <AdminLayout 
      activeTab={activeTab} 
      onTabChange={setActiveTab}
      pendingReportCount={stats?.pending_reports_count || 0}
    >
      {renderContent()}
    </AdminLayout>
  );
}