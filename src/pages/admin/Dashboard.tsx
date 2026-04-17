// src/pages/admin/Dashboard.tsx
import { useEffect, useState } from 'react';
import { apiClient } from '../../api/client';

export function Dashboard() {
  const [view, setView] = useState<'users' | 'commissions'>('users');
  const [stats, setStats] = useState<any>(null);
  const [dataList, setDataList] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0); // 🌟 這是報錯的變數

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
      if (res.pagination) {
        setTotal(res.pagination.total); // 🌟 設定總數
      }
    } catch (e) { console.error(e); }
  };

  const handleUpdate = async (id: string, payload: any) => {
    try {
      await apiClient.patch(`/api/admin/users/${id}`, payload);
      fetchListData();
      fetchStats();
    } catch (e) { alert('更新失敗'); }
  };

  if (!stats) return <div style={{ padding: '40px', color: '#666', textAlign: 'center' }}>正在進入系統...</div>;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#111827', marginBottom: '24px' }}>全站營運儀表板</h1>

      {/* 1. 頂部數據卡片 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <StatCard title="總註冊用戶" value={stats.users?.reduce((a:any, b:any) => a + (b.total || 0), 0) || 0} icon="👥" />
        <StatCard title="本月新增用戶" value={stats.new_users_this_month} icon="📈" color="#2563EB" />
        <StatCard title="專業版 (PRO)" value={stats.users?.find((u:any)=>u.plan_type==='pro')?.total || 0} icon="💎" color="#7C3AED" />
        <StatCard title="總委託件數" value={stats.commissions?.reduce((a:any, b:any) => a + (b.total || 0), 0) || 0} icon="🎨" color="#059669" />
      </div>

      {/* 2. 功能切換與搜尋 */}
      <div style={{ backgroundColor: '#FFF', padding: '16px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', backgroundColor: '#F3F4F6', padding: '4px', borderRadius: '8px' }}>
          <TabBtn active={view === 'users'} label="用戶管理" onClick={() => {setView('users'); setPage(1);}} />
          <TabBtn active={view === 'commissions'} label="全站委託" onClick={() => {setView('commissions'); setPage(1);}} />
        </div>
        {view === 'users' && (
          <input 
            type="text" 
            placeholder="搜尋暱稱或 ID..." 
            style={{ padding: '10px 16px', border: '1px solid #E5E7EB', borderRadius: '8px', width: '300px', outline: 'none', fontSize: '14px' }}
            value={search}
            onChange={(e) => {setSearch(e.target.value); setPage(1);}}
          />
        )}
      </div>

      {/* 3. 資料列表 */}
      <div style={{ backgroundColor: '#FFF', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
            <tr>
              <th style={thStyle}>主要資訊</th>
              <th style={thStyle}>{view === 'users' ? '方案與到期日' : '金額'}</th>
              <th style={thStyle}>{view === 'users' ? '訂單 / 配額' : '當前狀態'}</th>
              <th style={thStyle}>管理操作</th>
            </tr>
          </thead>
          <tbody>
            {dataList.map((item) => (
              <tr key={item.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                <td style={tdStyle}>
                  <div style={{ fontWeight: 'bold', color: '#111827' }}>{view === 'users' ? item.display_name : item.project_name}</div>
                  <div style={{ fontSize: '11px', color: '#9CA3AF' }}>ID: {item.public_id || item.id}</div>
                </td>
                <td style={tdStyle}>
                  {view === 'users' ? (
                    <div>
                      <span style={{ fontSize: '10px', fontWeight: 'bold', padding: '2px 6px', backgroundColor: item.plan_type === 'pro' ? '#EDE9FE' : '#F3F4F6', color: item.plan_type === 'pro' ? '#7C3AED' : '#6B7280', borderRadius: '4px' }}>
                        {item.plan_type.toUpperCase()}
                      </span>
                      <div style={{ fontSize: '11px', marginTop: '4px', color: '#6B7280' }}>
                        到期: {item.pro_expires_at ? item.pro_expires_at.split('T')[0] : '---'}
                      </div>
                    </div>
                  ) : (
                    <span style={{ fontWeight: 'bold', color: '#2563EB' }}>${item.total_price}</span>
                  )}
                </td>
                <td style={tdStyle}>
                  {view === 'users' ? (
                    <div>
                      <span style={{ fontWeight: 'bold', color: item.total_commissions > 50 ? '#EF4444' : '#374151' }}>{item.total_commissions} 筆</span>
                      <span style={{ margin: '0 4px', color: '#D1D5DB' }}>/</span>
                      <span style={{ color: '#6B7280' }}>{item.custom_quota || '預設'}</span>
                    </div>
                  ) : (
                    <span style={{ fontSize: '12px', padding: '2px 8px', backgroundColor: '#E0F2FE', color: '#0369A1', borderRadius: '12px' }}>{item.status}</span>
                  )}
                </td>
                <td style={tdStyle}>
                   {view === 'users' ? (
                     <div style={{ display: 'flex', gap: '8px' }}>
                       <button 
                         onClick={() => {
                           const q = prompt('設定自訂額度 (-1 為無限)：', item.custom_quota || '');
                           if (q !== null) handleUpdate(item.id, { custom_quota: q === '' ? null : parseInt(q) });
                         }}
                         style={actionBtnStyle}
                       >調整配額</button>
                       <button 
                         onClick={() => {
                           const reason = prompt('請輸入停權原因：');
                           if (reason) handleUpdate(item.id, { role: 'deleted', ban_reason: reason });
                         }}
                         style={{ ...actionBtnStyle, color: '#EF4444' }}
                       >停權</button>
                     </div>
                   ) : <span style={{ color: '#D1D5DB' }}>---</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 4. 分頁控制與總數顯示 (🌟 在這裡使用了 total 變數) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', padding: '0 10px' }}>
        <div style={{ color: '#6B7280', fontSize: '14px' }}>
          目前搜尋結果共 <span style={{ fontWeight: 'bold', color: '#111827' }}>{total}</span> 筆資料
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)} 
            style={{ ...pageBtnStyle, opacity: page === 1 ? 0.5 : 1 }}
          >上一頁</button>
          <div style={{ fontWeight: 'bold', color: '#2563EB' }}>第 {page} 頁</div>
          <button 
            onClick={() => setPage(p => p + 1)} 
            style={pageBtnStyle}
          >下一頁</button>
        </div>
      </div>
    </div>
  );
}

// 樣式定義
const thStyle = { padding: '16px', fontSize: '12px', color: '#6B7280', textTransform: 'uppercase' as const, letterSpacing: '0.5px' };
const tdStyle = { padding: '16px', fontSize: '14px' };
const actionBtnStyle = { background: 'none', border: 'none', color: '#2563EB', cursor: 'pointer', fontSize: '12px', textDecoration: 'underline' };
const pageBtnStyle = { padding: '8px 16px', border: '1px solid #D1D5DB', borderRadius: '6px', backgroundColor: '#FFF', cursor: 'pointer', fontSize: '13px' };

function StatCard({ title, value, icon, color = "#111827" }: any) {
  return (
    <div style={{ backgroundColor: '#FFF', padding: '24px', borderRadius: '16px', border: '1px solid #E5E7EB', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span style={{ color: '#6B7280', fontSize: '14px', fontWeight: '500' }}>{title}</span>
        <span style={{ fontSize: '20px' }}>{icon}</span>
      </div>
      <div style={{ fontSize: '32px', fontWeight: '800', color }}>{value}</div>
    </div>
  );
}

function TabBtn({ active, label, onClick }: any) {
  return (
    <button 
      onClick={onClick} 
      style={{ 
        padding: '8px 24px', 
        border: 'none', 
        borderRadius: '6px', 
        fontSize: '14px', 
        fontWeight: 'bold', 
        cursor: 'pointer', 
        backgroundColor: active ? '#FFF' : 'transparent', 
        color: active ? '#2563EB' : '#6B7280', 
        boxShadow: active ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
        transition: '0.2s'
      }}
    >
      {label}
    </button>
  );
}