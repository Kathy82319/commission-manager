import { useEffect, useState } from 'react';
import { apiClient } from '../../api/client';

export function Dashboard() {
  const [view, setView] = useState<'users' | 'commissions'>('users');
  const [stats, setStats] = useState<any>(null);
  const [dataList, setDataList] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [myId, setMyId] = useState('');
  
  // 🌟 新增：紀錄正在更新的 ID，用來顯示「儲存中」
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => { 
    fetchStats();
    apiClient.get('/api/users/me').then(res => setMyId(res.data.id));
  }, []);

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
    if (id === myId && payload.role === 'deleted') {
      alert('⚠️ 危險操作：你不能停權你自己！');
      return;
    }

    setUpdatingId(id); // 開始轉圈圈
    try {
      await apiClient.patch(`/api/admin/users/${id}`, payload);
      // 模擬一點延遲讓你有感覺「正在儲存」
      setTimeout(() => {
        setUpdatingId(null);
        fetchListData();
        fetchStats();
      }, 500);
    } catch (e) { 
      alert('更新失敗'); 
      setUpdatingId(null);
    }
  };

  const planMap: any = { 'free': '免費版 🎨', 'trial': '試用期 ⏳', 'pro': '專業版 💎' };
  
  // 🌟 優化：明確顯示目前的預設數量
  const getQuotaText = (user: any) => {
    if (user.custom_quota) return `${user.custom_quota} (自訂)`;
    if (user.plan_type === 'free') return '3 (預設)';
    if (user.plan_type === 'trial') return '20 (預設)';
    return '無限 (預設)';
  };

  if (!stats) return <div style={{ padding: '50px', textAlign: 'center', color: '#666' }}>⚙️ 正在讀取最高權限資料...</div>;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: '28px', fontWeight: '900', color: '#111827', marginBottom: '24px' }}>全站營運儀表板</h1>

      {/* 數據卡片 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <StatCard title="總註冊用戶" value={stats.users?.reduce((a:any, b:any) => a + (b.total || 0), 0)} icon="👥" />
        <StatCard title="本月新增用戶" value={stats.new_users_this_month} icon="📈" color="#2563EB" />
        <StatCard title="專業版 (PRO)" value={stats.users?.find((u:any)=>u.plan_type==='pro')?.total || 0} icon="💎" color="#7C3AED" />
        <StatCard title="總委託件數" value={stats.commissions?.reduce((a:any, b:any) => a + (b.total || 0), 0)} icon="🎨" color="#059669" />
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
            placeholder="搜尋名稱或 ID..." 
            style={{ padding: '10px 16px', border: '1px solid #E5E7EB', borderRadius: '8px', width: '300px', outline: 'none', transition: 'all 0.2s' }}
            value={search}
            onChange={(e) => {setSearch(e.target.value); setPage(1);}}
          />
        )}
      </div>

      {/* 表格 */}
      <div style={{ backgroundColor: '#FFF', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
            <tr>
              <th style={thStyle}>用戶資訊</th>
              <th style={thStyle}>{view === 'users' ? '方案與效期控制' : '金額'}</th>
              <th style={thStyle}>{view === 'users' ? '目前單量 / 上限' : '狀態'}</th>
              <th style={thStyle}>管理</th>
            </tr>
          </thead>
          <tbody>
            {dataList.map((item) => (
              <tr key={item.id} style={{ borderBottom: '1px solid #F3F4F6', backgroundColor: updatingId === item.id ? '#F0F9FF' : 'transparent' }}>
                <td style={tdStyle}>
                  <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {item.display_name} 
                    {updatingId === item.id && <span style={{ fontSize: '12px', color: '#2563EB', fontWeight: 'normal' }}>💾 儲存中...</span>}
                  </div>
                  <div style={{ fontSize: '11px', color: '#9CA3AF' }}>{item.public_id || item.id}</div>
                </td>
                <td style={tdStyle}>
                  {view === 'users' ? (
                    <div>
                      <div style={{ fontSize: '13px', color: '#111827', fontWeight: 'bold' }}>{planMap[item.plan_type] || item.plan_type}</div>
                      <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '6px' }}>
                        📅 到期日: 
                        <input 
                          type="date" 
                          defaultValue={item.pro_expires_at ? item.pro_expires_at.split('T')[0] : ''}
                          onChange={(e) => handleUpdate(item.id, { pro_expires_at: new Date(e.target.value).toISOString() })}
                          style={{ marginLeft: '5px', padding: '2px', border: '1px solid #DDD', borderRadius: '4px', cursor: 'pointer' }}
                        />
                      </div>
                    </div>
                  ) : `$${item.total_price}`}
                </td>
                <td style={tdStyle}>
                  {view === 'users' ? (
                    <div>
                      <span style={{ fontSize: '16px', fontWeight: 'bold', color: item.total_commissions > 50 ? '#EF4444' : '#111827' }}>
                        {item.total_commissions} <span style={{ fontSize: '12px', fontWeight: 'normal' }}>筆</span>
                      </span>
                      <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '4px' }}>
                        上限: <span style={{ color: item.custom_quota ? '#2563EB' : '#9CA3AF' }}>{getQuotaText(item)}</span>
                      </div>
                    </div>
                  ) : item.status}
                </td>
                <td style={tdStyle}>
                  {view === 'users' ? (
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button onClick={() => {
                        const q = prompt(`調整 [${item.display_name}] 的配額\n目前已用：${item.total_commissions}\n輸入數字 (輸入 -1 為無限，留白則回復預設)：`, item.custom_quota || '');
                        if (q !== null) handleUpdate(item.id, { custom_quota: q === '' ? null : parseInt(q) });
                      }} style={actionLinkStyle}>⚙️ 調整配額</button>
                      
                      <button onClick={() => {
                        const reason = prompt('請輸入停權原因（這會紀錄在用戶資料中）：');
                        if (reason) handleUpdate(item.id, { role: 'deleted', ban_reason: reason });
                      }} style={{ ...actionLinkStyle, color: '#EF4444' }}>🚫 停權</button>
                    </div>
                  ) : '---'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 分頁 */}
      <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#6B7280', fontSize: '14px', padding: '0 8px' }}>
        <span>📊 搜尋結果共 <b>{total}</b> 筆資料</span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => setPage(p => Math.max(1, p-1))} style={btnStyle}>上一頁</button>
          <div style={{ padding: '8px 16px', backgroundColor: '#FFF', border: '1px solid #E5E7EB', borderRadius: '8px', fontWeight: 'bold', color: '#111827' }}>第 {page} 頁</div>
          <button onClick={() => setPage(p => p+1)} style={btnStyle}>下一頁</button>
        </div>
      </div>
    </div>
  );
}

// 樣式不變，略過以節省空間
const thStyle = { padding: '16px', fontSize: '13px', color: '#6B7280', fontWeight: 'bold' };
const tdStyle = { padding: '16px', fontSize: '14px', verticalAlign: 'top' as const };
const actionLinkStyle = { background: 'none', border: 'none', color: '#2563EB', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', padding: 0 };
const btnStyle = { padding: '8px 16px', border: '1px solid #E5E7EB', borderRadius: '8px', backgroundColor: '#FFF', cursor: 'pointer', fontWeight: 'bold' };

function StatCard({ title, value, icon, color = "#111827" }: any) {
  return (
    <div style={{ backgroundColor: '#FFF', padding: '24px', borderRadius: '16px', border: '1px solid #E5E7EB', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#6B7280', fontSize: '14px', fontWeight: '500' }}>
        <span>{title}</span><span>{icon}</span>
      </div>
      <div style={{ fontSize: '28px', fontWeight: '900', color }}>{value}</div>
    </div>
  );
}

function TabBtn({ active, label, onClick }: any) {
  return (
    <button onClick={onClick} style={{ padding: '10px 24px', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', backgroundColor: active ? '#FFF' : 'transparent', color: active ? '#2563EB' : '#6B7280', boxShadow: active ? '0 2px 4px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.2s' }}>
      {label}
    </button>
  );
}