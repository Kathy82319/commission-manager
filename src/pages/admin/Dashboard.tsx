import { useState } from 'react';
import { AdminLayout } from '../../layouts/AdminLayout';
import { OverviewTab } from './OverviewTab';
import { UsersTab } from './UsersTab';
import { CommissionsTab } from './CommissionsTab';

// 許願池審核的 Placeholder (Phase 3 實作)
const WishboardTabPlaceholder = () => (
  <div style={{ padding: '40px', textAlign: 'center', backgroundColor: '#FFF', borderRadius: '12px', border: '1px dashed #D1D5DB' }}>
    <h2>✨ 許願池審核 (開發中)</h2>
    <p style={{ color: '#6B7280' }}>這裡將會實作徵/接委託列表、關鍵字管理區塊，以及檢舉原因審核。</p>
  </div>
);

export function Dashboard() {
  // 控制目前顯示的選單
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'commissions' | 'wishboard'>('overview');

  // 動態渲染對應的元件
  const renderContent = () => {
    switch (activeTab) {
      case 'overview': return <OverviewTab />;
      case 'users': return <UsersTab />;
      case 'commissions': return <CommissionsTab />;
      case 'wishboard': return <WishboardTabPlaceholder />;
      default: return <OverviewTab />;
    }
  };

  return (
    <AdminLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {renderContent()}
    </AdminLayout>
  );
}