// src/pages/admin/Dashboard.tsx
import { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { AdminLayout } from '../../layouts/AdminLayout';
import { OverviewTab } from './OverviewTab';
import { UsersTab } from './UsersTab';
import { CommissionsTab } from './CommissionsTab';
import { WishboardTab } from './WishboardTab';

export function Dashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'commissions' | 'wishboard'>('overview');
  
  // 🌟 將狀態移至外層統一管理
  const [stats, setStats] = useState<any>(null);

  // 每次切換 Tab 時都重新拉取一次狀態，確保紅點數字是最新的
  useEffect(() => {
    fetchStats();
  }, [activeTab]);

  const fetchStats = async () => {
    try {
      const res = await apiClient.get('/api/admin/stats');
      setStats(res.data);
    } catch (e) { 
      console.error('無法讀取後台狀態', e); 
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'overview': return <OverviewTab stats={stats} />; // 傳遞 props
      case 'users': return <UsersTab />;
      case 'commissions': return <CommissionsTab />;
      case 'wishboard': return <WishboardTab />;
      default: return <OverviewTab stats={stats} />;
    }
  };

  return (
    <AdminLayout 
      activeTab={activeTab} 
      onTabChange={setActiveTab}
      pendingReportCount={stats?.pending_reports_count || 0} // 🌟 傳遞紅點數字
    >
      {renderContent()}
    </AdminLayout>
  );
}