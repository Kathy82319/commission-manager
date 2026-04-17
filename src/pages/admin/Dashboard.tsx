// src/pages/admin/Dashboard.tsx
import { useEffect, useState } from 'react';
import { apiClient } from '../../api/client';

export function Dashboard() {
  const [view, setView] = useState<'users' | 'commissions'>('users');
  const [stats, setStats] = useState<any>(null);
  const [dataList, setDataList] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => { fetchStats(); }, []);
  useEffect(() => { fetchListData(); }, [view, page, search]);

  const fetchStats = async () => {
    try {
      const res = await apiClient.get('/api/admin/stats');
      setStats(res.data);
    } catch (e) { console.error(e); }
  };

  const fetchListData = async () => {
    try {
      const endpoint = view === 'users' 
        ? `/api/admin/users?search=${search}&page=${page}` 
        : `/api/admin/commissions?page=${page}`;
      const res = await apiClient.get(endpoint);
      setDataList(res.data);
      if (res.pagination) setTotal(res.pagination.total);
    } catch (e) { console.error(e); }
  };

  const handleUpdate = async (id: string, payload: any) => {
    try {
      await apiClient.patch(`/api/admin/users/${id}`, payload);
      fetchListData();
      fetchStats();
    } catch (e) { alert('更新失敗'); }
  };

  if (!stats) return <div style={{ padding: '40px', color: '#666' }}>驗證中...</div>;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#111827', marginBottom: '24px' }}>營運數據概況</h1>

      {/* 數據卡片 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <StatCard title="總註冊用戶" value={stats.users?.reduce((a:any,b:any)=>a+b.total, 0)} icon="👥" />
        <StatCard title="本月新增用戶" value={stats.new_users_this_month} icon="📈" color="#2563EB" />
        <StatCard title="專業版 (PRO)" value={stats.users?.find((u:any)=>u.plan_type==='pro')?.total || 0} icon="💎" color="#7C3AED" />
        <StatCard title="總委託件數" value={stats.commissions?.reduce((a:any,b:any)=>a+b.total, 0)} icon="🎨" color="#059669" />
      </div>

      {/* 控制列 */}
      <div style={{ backgroundColor: '#FFF', padding: '16px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', backgroundColor: '#F3F4F6', padding: '4px', borderRadius: '8px' }}>
          <TabBtn active={view === 'users'} label="用戶管理" onClick={() => {setView('users'); setPage(1);}} />
          <TabBtn active={view === 'commissions'} label="全站委託" onClick={() => {setView('commissions'); setPage(1);}} />
        </div>
        {view === 'users' && (
          <input 
            type="text" 
            placeholder="搜尋暱稱或 ID..." 
            style={{ padding: '8px 16px', border: '1px solid #E5E7EB', borderRadius: '8px', width: '300px', outline: 'none' }}
            value={search}
            onChange={(e) => {setSearch(e.target.value); setPage(1);}}
          />
        )}
      </div>

      {/* 表格區 */}
      <div style={{ backgroundColor: '#FFF', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
            <tr>
              <th style={thStyle}>資訊</th>
              <th style={thStyle}>{view === 'users' ? '方案與到期日' : '金額'}</th>
              <th style={thStyle}>{view === 'users' ? '訂單/配額' : '狀態'}</th>
              <th style={thStyle}>操作</th>
            </tr>
          </thead>
          <tbody>
            {dataList.map((item) => (
              <tr key={item.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                <td style={tdStyle}>
                  <div style={{ fontWeight: 'bold' }}>{view === 'users' ? item.display_name : item.project_name}</div>
                  <div style={{ fontSize: '12px', color: '#9CA3AF' }}>{item.id || item.public_id}</div>
                </td>
                <td style={tdStyle}>
                  {view === 'users' ? (
                    <div>
                      <span style={{ fontSize: '11px', fontWeight: 'bold', padding: '2px 6px', backgroundColor: '#EDE9FE', color: '#7C3AED', borderRadius: '4px' }}>{item.plan_type.toUpperCase()}</span>
                      <div style={{ fontSize: '11px', marginTop: '4px' }}>到期: {item.pro_expires_at?.split('T')[0] || '無'}</div>
                    </div>
                  ) : `$${item.total_price}`}
                </td>
                <td style={tdStyle}>
                  {view === 'users' ? `${item.total_commissions} 筆 / ${item.custom_quota || '預設'}` : item.status}
                </td>
                <td style={tdStyle}>
                  {view === 'users' ? (
                    <button onClick={() => {
                      const quota = prompt('設定自訂額度 (輸入數字，-1為無限)：', item.custom_quota || '');
                      if (quota !== null) handleUpdate(item.id, { custom_quota: quota === '' ? null : parseInt(quota) });
                    }} style={{ fontSize: '12px', color: '#2563EB', cursor: 'pointer', background: 'none', border: 'none', textDecoration: 'underline' }}>
                      調整額度
                    </button>
                  ) : '---'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// 樣式常數
const thStyle = { padding: '16px', fontSize: '13px', color: '#6B7280', fontWeight: '600' };
const tdStyle = { padding: '16px', fontSize: '14px', color: '#374151' };

function StatCard({ title, value, icon, color = "#111827" }: any) {
  return (
    <div style={{ backgroundColor: '#FFF', padding: '24px', borderRadius: '16px', border: '1px solid #E5E7EB', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span style={{ color: '#6B7280', fontSize: '14px' }}>{title}</span>
        <span>{icon}</span>
      </div>
      <div style={{ fontSize: '28px', fontWeight: '800', color }}>{value}</div>
    </div>
  );
}

function TabBtn({ active, label, onClick }: any) {
  return (
    <button onClick={onClick} style={{ padding: '8px 20px', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', backgroundColor: active ? '#FFF' : 'transparent', color: active ? '#2563EB' : '#6B7280', boxShadow: active ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: '0.2s' }}>
      {label}
    </button>
  );
}