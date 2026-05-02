// src/pages/admin/Dashboard.tsx
import { useState } from 'react';
import { AdminLayout } from '../../layouts/AdminLayout';
import { OverviewTab } from './OverviewTab';
import { UsersTab } from './UsersTab';
import { CommissionsTab } from './CommissionsTab';
import { WishboardTab } from './WishboardTab'; // 🌟 引入新的許願池審核頁面

export function Dashboard() {
  // 控制目前顯示的選單
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'commissions' | 'wishboard'>('overview');

  // 動態渲染對應的元件
  const renderContent = () => {
    switch (activeTab) {
      case 'overview': return <OverviewTab />;
      case 'users': return <UsersTab />;
      case 'commissions': return <CommissionsTab />;
      case 'wishboard': return <WishboardTab />; // 🌟 替換為真實元件
      default: return <OverviewTab />;
    }
  };

  return (
    <AdminLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {renderContent()}
    </AdminLayout>
  );
}