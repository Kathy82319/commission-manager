import { useEffect, useState } from 'react';
import { apiClient } from '../../api/client';

type ViewMode = 'users' | 'commissions';

export function Dashboard() {
  const [view, setView] = useState<ViewMode>('users');
  const [stats, setStats] = useState<any>(null);
  const [dataList, setDataList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 搜尋與分頁狀態
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchListData();
  }, [view, page, search]);

  const fetchStats = async () => {
    try {
      const res = await apiClient.get('/api/admin/stats');
      setStats(res.data);
    } catch (e) { console.error(e); }
  };

  const fetchListData = async () => {
    setLoading(true);
    try {
      const endpoint = view === 'users' 
        ? `/api/admin/users?search=${search}&page=${page}` 
        : `/api/admin/commissions?page=${page}`;
      
      const res = await apiClient.get(endpoint);
      setDataList(res.data);
      if (res.pagination) setTotal(res.pagination.total);
    } catch (e) {
      alert('載入清單失敗');
    } finally {
      setLoading(false);
    }
  };

  // 處理更新 (包含停權備註與方案派發)
  const handleUserUpdate = async (userId: string, payload: any) => {
    const confirmMsg = payload.role === 'deleted' ? '確定要停權此用戶嗎？' : '確定要更新用戶資料嗎？';
    if (!confirm(confirmMsg)) return;

    try {
      await apiClient.patch(`/api/admin/users/${userId}`, payload);
      alert('更新成功');
      fetchListData();
      fetchStats();
    } catch (e) { alert('更新失敗'); }
  };

  if (!stats) return <div className="p-10">驗證權限中...</div>;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. 頂部營運看板 (營運數據統計) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="本月新增用戶" value={stats.new_users_this_month} unit="人" color="text-blue-600" />
        <StatCard title="註冊總數 (按方案)" value={stats.users?.reduce((a:any,b:any)=>a+b.total,0)} unit="人" color="text-gray-800" />
        <StatCard title="進行中委託" value={stats.commissions?.find((c:any)=>c.status==='unpaid')?.total || 0} unit="件" color="text-orange-600" />
        <StatCard title="已完成委託" value={stats.commissions?.find((c:any)=>c.status==='completed')?.total || 0} unit="件" color="text-green-600" />
      </div>

      {/* 2. 切換頁籤 */}
      <div className="flex border-b border-gray-200">
        <TabButton active={view === 'users'} onClick={() => {setView('users'); setPage(1);}} label="用戶管理" />
        <TabButton active={view === 'commissions'} onClick={() => {setView('commissions'); setPage(1);}} label="全站委託單" />
      </div>

      {/* 3. 搜尋與工具列 (僅用戶管理顯示搜尋) */}
      {view === 'users' && (
        <div className="flex gap-4">
          <input 
            type="text" 
            placeholder="搜尋名稱或 ID..." 
            className="flex-1 p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
            value={search}
            onChange={(e) => {setSearch(e.target.value); setPage(1);}}
          />
        </div>
      )}

      {/* 4. 主要資料表格 */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-gray-400">載入中...</div>
        ) : view === 'users' ? (
          <UserTable users={dataList} onUpdate={handleUserUpdate} />
        ) : (
          <OrderTable orders={dataList} />
        )}
      </div>

      {/* 5. 分頁控制 */}
      <div className="flex justify-between items-center text-sm text-gray-500">
        <span>總共 {total} 筆資料</span>
        <div className="flex gap-2">
          <button onClick={() => setPage(p => Math.max(1, p-1))} className="p-2 border rounded hover:bg-gray-50">上一頁</button>
          <span className="p-2">第 {page} 頁</span>
          <button onClick={() => setPage(p => p+1)} className="p-2 border rounded hover:bg-gray-50">下一頁</button>
        </div>
      </div>
    </div>
  );
}

// 輔助組件：數據卡片
function StatCard({ title, value, unit, color }: any) {
  return (
    <div className="bg-white p-5 rounded-xl border shadow-sm">
      <div className="text-gray-500 text-sm mb-1">{title}</div>
      <div className={`text-2xl font-bold ${color}`}>{value} <span className="text-sm font-normal text-gray-400">{unit}</span></div>
    </div>
  );
}

// 輔助組件：頁籤
function TabButton({ active, onClick, label }: any) {
  return (
    <button 
      onClick={onClick}
      className={`px-6 py-3 font-medium transition-colors ${active ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
    >
      {label}
    </button>
  );
}

// 用戶表格 (包含停權備註、方案派發功能)
function UserTable({ users, onUpdate }: any) {
  return (
    <table className="w-full text-left">
      <thead className="bg-gray-50 text-gray-600 text-sm">
        <tr>
          <th className="p-4">用戶資訊</th>
          <th className="p-4">身分/方案</th>
          <th className="p-4">專業版到期日</th>
          <th className="p-4">操作項目</th>
        </tr>
      </thead>
      <tbody>
        {users.map((u: any) => (
          <tr key={u.id} className="border-t hover:bg-gray-50">
            <td className="p-4">
              <div className="font-bold">{u.display_name}</div>
              <div className="text-xs text-gray-400">{u.public_id}</div>
            </td>
            <td className="p-4">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold text-purple-600 uppercase">{u.role}</span>
                <span className="text-xs text-gray-500">方案: {u.plan_type}</span>
              </div>
            </td>
            <td className="p-4 text-sm">
              <input 
                type="date" 
                defaultValue={u.pro_expires_at?.split('T')[0]} 
                onChange={(e) => onUpdate(u.id, { pro_expires_at: new Date(e.target.value).toISOString() })}
                className="border rounded p-1 text-xs"
              />
            </td>
            <td className="p-4 flex gap-2">
              <select 
                className="text-xs border rounded p-1"
                value={u.role}
                onChange={(e) => {
                  const reason = e.target.value === 'deleted' ? prompt('請輸入停權原因：') : null;
                  onUpdate(u.id, { role: e.target.value, ban_reason: reason });
                }}
              >
                <option value="client">委託人</option>
                <option value="artist">繪師</option>
                <option value="admin">管理員</option>
                <option value="deleted">停權</option>
              </select>
              <select 
                className="text-xs border rounded p-1"
                value={u.plan_type}
                onChange={(e) => onUpdate(u.id, { plan_type: e.target.value })}
              >
                <option value="free">免費版</option>
                <option value="trial">試用版</option>
                <option value="pro">專業版</option>
              </select>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// 訂單表格 (全站總覽)
function OrderTable({ orders }: any) {
  return (
    <table className="w-full text-left">
      <thead className="bg-gray-50 text-gray-600 text-sm">
        <tr>
          <th className="p-4">項目名稱</th>
          <th className="p-4">雙方對象</th>
          <th className="p-4">金額</th>
          <th className="p-4">狀態</th>
        </tr>
      </thead>
      <tbody>
        {orders.map((o: any) => (
          <tr key={o.id} className="border-t">
            <td className="p-4 font-medium">{o.project_name}</td>
            <td className="p-4 text-xs">
              <div>繪師: {o.artist_name}</div>
              <div>委託: {o.client_name || '尚未綁定'}</div>
            </td>
            <td className="p-4 text-sm text-blue-600 font-bold">${o.total_price}</td>
            <td className="p-4">
              <span className="px-2 py-1 bg-gray-100 rounded text-xs">{o.status}</span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}