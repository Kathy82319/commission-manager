// src/pages/admin/Dashboard.tsx
import { useEffect, useState } from 'react';
import { apiClient } from '../../api/client';

export function Dashboard() {
  const [view, setView] = useState<'users' | 'commissions'>('users');
  const [stats, setStats] = useState<any>(null);
  const [dataList, setDataList] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0); // 🌟 已在分頁區讀取，解決報錯
  const [myId, setMyId] = useState('');
  
  // 紀錄正在更新的用戶 ID，用來顯示「儲存中」的反饋
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => { 
    fetchStats();
    // 取得目前管理員自己的 ID，防止誤操作停權自己
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
      alert('⚠️ 系統防護：你不能停權你自己！');
      return;
    }

    setUpdatingId(id); // 顯示儲存中狀態
    try {
      await apiClient.patch(`/api/admin/users/${id}`, payload);
      // 稍微延遲讓視覺上有「處理中」的感覺
      setTimeout(() => {
        setUpdatingId(null);
        fetchListData();
        fetchStats();
      }, 500);
    } catch (e) { 
      alert('更新失敗，請檢查網路連接');
      setUpdatingId(null);
    }
  };

  // 方案中文化對照表
  const planMap: any = { 'free': '免費版 🎨', 'trial': '試用期 ⏳', 'pro': '專業版 Pro 💎' };
  
  // 取得配額顯示文字
  const getQuotaDisplay = (user: any) => {
    if (user.custom_quota !== null) return `${user.custom_quota} (管理員自訂)`;
    if (user.plan_type === 'free') return '3 (預設)';
    if (user.plan_type === 'trial') return '20 (預設)';
    return '無限 (預設)';
  };

  if (!stats) return <div style={{ padding: '50px', textAlign: 'center', color: '#666' }}>⚙️ 正在讀取最高權限資料...</div>;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <h1 style={{ fontSize: '28px', fontWeight: '900', color: '#111827', marginBottom: '24px' }}>全站營運儀表板</h1>

      {/* 1. 營運數據卡片 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <StatCard title="總註冊用戶" value={stats.users?.reduce((a:any, b:any) => a + (b.total || 0), 0)} icon="👥" />
        <StatCard title="本月新增用戶" value={stats.new_users_this_month} icon="📈" color="#2563EB" />
        <StatCard title="專業版 (PRO)" value={stats.users?.find((u:any)=>u.plan_type==='pro')?.total || 0} icon="💎" color="#7C3AED" />
        <StatCard title="總委託件數" value={stats.commissions?.reduce((a:any, b:any) => a + (b.total || 0), 0)} icon="🎨" color="#059669" />
      </div>

      {/* 2. 控制工具列 */}
      <div style={{ backgroundColor: '#FFF', padding: '16px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', backgroundColor: '#F3F4F6', padding: '4px', borderRadius: '8px' }}>
          <TabBtn active={view === 'users'} label="用戶管理" onClick={() => {setView('users'); setPage(1);}} />
          <TabBtn active={view === 'commissions'} label="全站委託" onClick={() => {setView('commissions'); setPage(1);}} />
        </div>
        {view === 'users' && (
          <input 
            type="text" 
            placeholder="搜尋名稱、Public ID 或 LINE ID..." 
            style={{ padding: '10px 16px', border: '1px solid #E5E7EB', borderRadius: '8px', width: '320px', outline: 'none' }}
            value={search}
            onChange={(e) => {setSearch(e.target.value); setPage(1);}}
          />
        )}
      </div>

      {/* 3. 資料清單表格 */}
      <div style={{ backgroundColor: '#FFF', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
            <tr>
              <th style={thStyle}>用戶 / 項目資訊</th>
              <th style={thStyle}>{view === 'users' ? '方案與到期控制' : '金額'}</th>
              <th style={thStyle}>{view === 'users' ? '單量 / 配額' : '狀態'}</th>
              <th style={thStyle}>管理操作</th>
            </tr>
          </thead>
          <tbody>
            {dataList.map((item) => (
              <tr key={item.id} style={{ borderBottom: '1px solid #F3F4F6', backgroundColor: updatingId === item.id ? '#F0F9FF' : 'transparent' }}>
                <td style={tdStyle}>
                  <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', color: item.role === 'deleted' ? '#EF4444' : '#111827' }}>
                    {view === 'users' ? item.display_name : item.project_name}
                    {item.role === 'deleted' && ' (🚫 已停權)'}
                    {updatingId === item.id && <span style={{ fontSize: '11px', color: '#2563EB', fontWeight: 'normal' }}>💾 儲存中...</span>}
                  </div>
                  <div style={{ fontSize: '11px', color: '#9CA3AF' }}>ID: {item.public_id || item.id}</div>
                  
                  {/* 顯示停權原因或備註 */}
                  {view === 'users' && item.bio && (
                    <div style={{ fontSize: '11px', marginTop: '6px', padding: '4px 8px', backgroundColor: item.role === 'deleted' ? '#FEF2F2' : '#F9FAFB', color: item.role === 'deleted' ? '#B91C1C' : '#6B7280', borderRadius: '4px', borderLeft: item.role === 'deleted' ? '3px solid #EF4444' : '3px solid #E5E7EB' }}>
                      {item.bio}
                    </div>
                  )}
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
                          style={{ marginLeft: '5px', padding: '2px', border: '1px solid #DDD', borderRadius: '4px' }}
                        />
                      </div>
                    </div>
                  ) : (
                    <span style={{ fontWeight: 'bold', color: '#2563EB' }}>${item.total_price}</span>
                  )}
                </td>
                <td style={tdStyle}>
                  {view === 'users' ? (
                    <div>
                      <span style={{ fontSize: '16px', fontWeight: 'bold', color: item.total_commissions > 50 ? '#EF4444' : '#111827' }}>
                        {item.total_commissions} <span style={{ fontSize: '12px', fontWeight: 'normal' }}>筆</span>
                      </span>
                      <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '4px' }}>
                        上限: <span style={{ color: item.custom_quota ? '#2563EB' : '#9CA3AF' }}>{getQuotaDisplay(item)}</span>
                      </div>
                    </div>
                  ) : (
                    <span style={{ fontSize: '12px', padding: '2px 8px', backgroundColor: '#E0F2FE', color: '#0369A1', borderRadius: '12px' }}>{item.status}</span>
                  )}
                </td>
                <td style={tdStyle}>
                  {view === 'users' ? (
<td style={tdStyle}>
  <div style={{ display: 'flex', gap: '12px' }}>
    {/* 調整配額按鈕 */}
    <button 
      onClick={() => {
        const q = prompt(`調整 [${item.display_name}] 的配額\n輸入數字或留白回復預設：`, item.custom_quota || '');
        if (q !== null) handleUpdate(item.id, { custom_quota: q === '' ? null : parseInt(q) });
      }} 
      style={actionLinkStyle}
    >⚙️ 調整配額</button>
    
    {/* 🌟 優化：停權 / 解除停權切換按鈕 */}
    {item.role === 'deleted' ? (
      <button 
        onClick={() => {
          if (confirm(`確定要解除 [${item.display_name}] 的停權狀態嗎？`)) {
            // 解除停權：預設改回 client，並清除 bio 中的封鎖標記
            handleUpdate(item.id, { 
              role: 'client', 
              bio: item.bio ? item.bio.replace(/\[封鎖原因:.*?\]/, '').trim() : '' 
            });
          }
        }} 
        style={{ ...actionLinkStyle, color: '#059669' }} // 綠色表示恢復
      >✅ 解除停權</button>
    ) : (
      <button 
        onClick={() => {
          const reason = prompt('請輸入停權原因（這會紀錄在用戶資料中）：');
          if (reason) handleUpdate(item.id, { role: 'deleted', ban_reason: reason });
        }} 
        style={{ ...actionLinkStyle, color: '#EF4444' }} // 紅色表示停權
      >🚫 停權用戶</button>
    )}
  </div>
</td>
                  ) : <span style={{ color: '#D1D5DB' }}>無操作項目</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 4. 分頁與資料統計 (🌟 這裡使用了 total 變數，解決 TS 報錯) */}
      <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#6B7280', fontSize: '14px', padding: '0 8px' }}>
        <span>📊 目前搜尋結果共 <b style={{ color: '#111827' }}>{total}</b> 筆資料</span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            disabled={page === 1}
            onClick={() => setPage(p => Math.max(1, p-1))} 
            style={{ ...btnStyle, opacity: page === 1 ? 0.5 : 1, cursor: page === 1 ? 'not-allowed' : 'pointer' }}
          >上一頁</button>
          <div style={{ padding: '8px 16px', backgroundColor: '#FFF', border: '1px solid #E5E7EB', borderRadius: '8px', fontWeight: 'bold', color: '#111827' }}>第 {page} 頁</div>
          <button 
            onClick={() => setPage(p => p+1)} 
            style={btnStyle}
          >下一頁</button>
        </div>
      </div>
    </div>
  );
}

// --- 樣式定義區 (解決 actionLinkStyle 報錯) ---
const thStyle = { padding: '16px', fontSize: '13px', color: '#6B7280', fontWeight: 'bold', letterSpacing: '0.5px' };
const tdStyle = { padding: '16px', fontSize: '14px', verticalAlign: 'top' as const };
const actionLinkStyle = { background: 'none', border: 'none', color: '#2563EB', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', textDecoration: 'underline', padding: 0 };
const btnStyle = { padding: '8px 16px', border: '1px solid #E5E7EB', borderRadius: '8px', backgroundColor: '#FFF', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' };

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