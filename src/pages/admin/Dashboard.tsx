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
  const [myId, setMyId] = useState('');
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
      alert('⚠️ 系統防護：你不能停權你自己！');
      return;
    }
    setUpdatingId(id);
    try {
      await apiClient.patch(`/api/admin/users/${id}`, payload);
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

  // --- 狀態中文化對照 ---
  const statusMap: any = {
    'unpaid': '🔴 待支付',
    'in_progress': '🟡 進行中',
    'awaiting_review': '🔵 待驗收',
    'completed': '🟢 已完成',
    'cancelled': '⚪ 已取消'
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '---';
    const d = new Date(dateStr);
    return `${d.getFullYear()}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  if (!stats) return <div style={{ padding: '50px', textAlign: 'center', color: '#666' }}>⚙️ 正在讀取最高權限資料...</div>;

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
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
          <TabBtn active={view === 'commissions'} label="全站委託總覽" onClick={() => {setView('commissions'); setPage(1);}} />
        </div>
        {view === 'users' && (
          <input 
            type="text" 
            placeholder="搜尋暱稱、ID..." 
            style={{ padding: '10px 16px', border: '1px solid #E5E7EB', borderRadius: '8px', width: '320px', outline: 'none' }}
            value={search}
            onChange={(e) => {setSearch(e.target.value); setPage(1);}}
          />
        )}
      </div>

      {/* 表格區 */}
      <div style={{ backgroundColor: '#FFF', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1000px' }}>
          <thead style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
            {view === 'users' ? (
              <tr>
                <th style={thStyle}>用戶資訊</th>
                <th style={thStyle}>目前方案控制</th>
                <th style={thStyle}>效期與配額控制</th>
                <th style={thStyle}>管理操作</th>
              </tr>
            ) : (
              <tr>
                <th style={thStyle}>委託 ID / 項目名稱</th>
                <th style={thStyle}>繪師</th>
                <th style={thStyle}>金額 / 狀態</th>
                <th style={thStyle}>委託對象 / 綁定日期</th>
                <th style={thStyle}>最後更新時間</th>
              </tr>
            )}
          </thead>
          <tbody>
            {dataList.map((item) => (
              <tr key={item.id} style={{ borderBottom: '1px solid #F3F4F6', backgroundColor: updatingId === item.id ? '#F0F9FF' : 'transparent', transition: 'background-color 0.2s' }}>
                {view === 'users' ? (
                  // --- 用戶管理分頁 ---
                  <>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 'bold', color: item.role === 'deleted' ? '#EF4444' : '#111827' }}>
                        {item.display_name} {item.role === 'deleted' && '(🚫 已停權)'}
                        {updatingId === item.id && <span style={{ fontSize: '11px', color: '#2563EB', marginLeft: '8px', fontWeight: 'normal' }}>💾 儲存中...</span>}
                      </div>
                      <div style={{ fontSize: '11px', color: '#9CA3AF' }}>ID: {item.public_id}</div>
                      {item.bio && <div style={bioBadgeStyle(item.role === 'deleted')}>{item.bio}</div>}
                    </td>
                    <td style={tdStyle}>
                      <select 
                        value={item.plan_type}
                        onChange={(e) => handleUpdate(item.id, { plan_type: e.target.value })}
                        style={selectStyle}
                      >
                        <option value="free">🎨 基礎免費版</option>
                        <option value="trial">⏳ 專業版試用期</option>
                        <option value="pro">💎 專業版 Pro</option>
                      </select>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ fontSize: '11px', color: '#6B7280' }}>
                        📅 截止日: 
                        <input 
                          type="date" 
                          defaultValue={item.pro_expires_at ? item.pro_expires_at.split('T')[0] : ''}
                          onChange={(e) => handleUpdate(item.id, { pro_expires_at: new Date(e.target.value).toISOString() })}
                          style={{ marginLeft: '5px', padding: '2px', border: '1px solid #DDD', borderRadius: '4px' }}
                        />
                      </div>
                      <div style={{ fontSize: '11px', marginTop: '6px', color: '#9CA3AF' }}>
                        累積單量: <b style={{ color: item.total_commissions > 50 ? '#EF4444' : '#111827' }}>{item.total_commissions}</b> / 上限: {item.custom_quota || '系統預設'}
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={() => {
                          const q = prompt(`設定 [${item.display_name}] 的客製化配額上限：\n(目前已用: ${item.total_commissions} 筆)`, item.custom_quota || '');
                          if (q !== null) handleUpdate(item.id, { custom_quota: q === '' ? null : parseInt(q) });
                        }} style={actionLinkStyle}>調整配額</button>
                        
                        {item.role === 'deleted' ? (
                          <button onClick={() => handleUpdate(item.id, { role: 'client', bio: '' })} style={{ ...actionLinkStyle, color: '#059669' }}>解除停權</button>
                        ) : (
                          <button onClick={() => {
                            const reason = prompt('請輸入停權原因：');
                            if (reason) handleUpdate(item.id, { role: 'deleted', ban_reason: reason });
                          }} style={{ ...actionLinkStyle, color: '#EF4444' }}>停權用戶</button>
                        )}
                      </div>
                    </td>
                  </>
                ) : (
                  // --- 委託總覽分頁 ---
                  <>
                    <td style={tdStyle}>
                      <div style={{ fontSize: '11px', color: '#9CA3AF', marginBottom: '2px' }}># {item.id}</div>
                      <div style={{ fontWeight: 'bold', color: '#111827' }}>{item.project_name || '未命名項目'}</div>
                      <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>建單日期: {formatDate(item.order_date)}</div>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: '600' }}>{item.artist_name}</div>
                      <div style={{ fontSize: '11px', color: '#9CA3AF' }}>UID: {item.artist_id?.slice(0, 10)}...</div>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 'bold', color: '#2563EB', fontSize: '16px' }}>${item.total_price}</div>
                      <div style={{ fontSize: '12px', marginTop: '6px' }}>{statusMap[item.status] || item.status}</div>
                    </td>
                    <td style={tdStyle}>
                      {item.client_name ? (
                        <div>
                          <div style={{ fontWeight: '600', color: '#059669' }}>👤 {item.client_name}</div>
                          <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>🔗 綁定日: {formatDate(item.updated_at)}</div>
                        </div>
                      ) : (
                        <div style={{ color: '#9CA3AF', fontSize: '12px', fontStyle: 'italic' }}>🔘 尚未綁定委託人</div>
                      )}
                    </td>
                    <td style={tdStyle}>
                      <div style={{ fontSize: '12px', color: '#374151' }}>{formatDate(item.updated_at)}</div>
                      <div style={{ fontSize: '10px', color: '#9CA3AF', marginTop: '4px' }}>監控正常</div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 分頁 */}
      <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#6B7280', fontSize: '14px', padding: '0 8px' }}>
        <span>📊 目前結果共 <b style={{ color: '#111827' }}>{total}</b> 筆資料</span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)} style={{ ...btnStyle, opacity: page === 1 ? 0.5 : 1 }}>上一頁</button>
          <div style={{ padding: '8px 16px', backgroundColor: '#FFF', border: '1px solid #E5E7EB', borderRadius: '8px', fontWeight: 'bold', color: '#2563EB' }}>{page}</div>
          <button onClick={() => setPage(p => p + 1)} style={btnStyle}>下一頁</button>
        </div>
      </div>
    </div>
  );
}

// --- 樣式設定 ---
const thStyle = { padding: '16px', fontSize: '13px', color: '#6B7280', fontWeight: 'bold' };
const tdStyle = { padding: '16px', fontSize: '14px', verticalAlign: 'top' as const };
const actionLinkStyle = { background: 'none', border: 'none', color: '#2563EB', cursor: 'pointer', fontSize: '12px', textDecoration: 'underline', padding: 0, fontWeight: 'bold' };
const btnStyle = { padding: '8px 16px', border: '1px solid #E5E7EB', borderRadius: '8px', backgroundColor: '#FFF', cursor: 'pointer', fontWeight: 'bold' };
const selectStyle = { padding: '6px 10px', borderRadius: '8px', border: '1px solid #E5E7EB', fontSize: '13px', outline: 'none', cursor: 'pointer', backgroundColor: '#F9FAFB' };
const bioBadgeStyle = (isDeleted: boolean) => ({
  fontSize: '11px', marginTop: '8px', padding: '6px 10px', 
  backgroundColor: isDeleted ? '#FEF2F2' : '#F9FAFB', 
  color: isDeleted ? '#B91C1C' : '#6B7280', 
  borderRadius: '6px', borderLeft: `4px solid ${isDeleted ? '#EF4444' : '#E5E7EB'}`
});

function StatCard({ title, value, icon, color = "#111827" }: any) {
  return (
    <div style={{ backgroundColor: '#FFF', padding: '24px', borderRadius: '16px', border: '1px solid #E5E7EB', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#6B7280', fontSize: '14px' }}>
        <span>{title}</span><span>{icon}</span>
      </div>
      <div style={{ fontSize: '28px', fontWeight: '900', color }}>{value}</div>
    </div>
  );
}

function TabBtn({ active, label, onClick }: any) {
  return (
    <button onClick={onClick} style={{ padding: '12px 24px', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', backgroundColor: active ? '#FFF' : 'transparent', color: active ? '#2563EB' : '#6B7280', boxShadow: active ? '0 4px 6px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.2s' }}>
      {label}
    </button>
  );
}