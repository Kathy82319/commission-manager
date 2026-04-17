// src/pages/admin/Dashboard.tsx
import { useEffect, useState } from 'react';
import { apiClient } from '../../api/client';

type ViewMode = 'users' | 'commissions';

export function Dashboard() {
  const [view, setView] = useState<ViewMode>('users');
  const [stats, setStats] = useState<any>(null);
  const [dataList, setDataList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
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
    setLoading(true);
    try {
      const endpoint = view === 'users' 
        ? `/api/admin/users?search=${search}&page=${page}` 
        : `/api/admin/commissions?page=${page}`;
      const res = await apiClient.get(endpoint);
      setDataList(res.data);
      if (res.pagination) setTotal(res.pagination.total);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleUpdate = async (id: string, payload: any) => {
    try {
      await apiClient.patch(`/api/admin/users/${id}`, payload);
      fetchListData();
      fetchStats();
    } catch (e) { alert('更新失敗'); }
  };

  if (!stats) return <div className="p-10 text-center text-gray-500">正在進入最高權限管理系統...</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fadeIn">
      {/* 營運概況卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatBox title="總註冊用戶" value={stats.users?.reduce((a:any,b:any)=>a+b.total, 0)} icon="👥" />
        <StatBox title="本月新增用戶" value={stats.new_users_this_month} icon="📈" color="text-blue-600" />
        <StatBox title="專業版 (PRO)" value={stats.users?.find((u:any)=>u.plan_type==='pro')?.total || 0} icon="💎" color="text-purple-600" />
        <StatBox title="總委託件數" value={stats.commissions?.reduce((a:any,b:any)=>a+b.total, 0)} icon="🎨" color="text-green-600" />
      </div>

      {/* 控制列 */}
      <div className="bg-white p-4 rounded-xl shadow-sm border flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex bg-gray-100 p-1 rounded-lg">
          <TabBtn active={view === 'users'} onClick={() => {setView('users'); setPage(1);}} label="用戶管理" />
          <TabBtn active={view === 'commissions'} onClick={() => {setView('commissions'); setPage(1);}} label="全站委託" />
        </div>
        {view === 'users' && (
          <div className="relative w-full md:w-96">
            <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
            <input 
              type="text" 
              placeholder="搜尋暱稱或 Public ID..." 
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={search}
              onChange={(e) => {setSearch(e.target.value); setPage(1);}}
            />
          </div>
        )}
      </div>

      {/* 資料列表 */}
      <div className="bg-white rounded-xl shadow-lg border overflow-hidden">
        {loading ? (
          <div className="p-20 text-center text-gray-400">讀取中...</div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b">
              {view === 'users' ? (
                <tr>
                  <th className="p-4 text-sm font-semibold text-gray-600">用戶資訊</th>
                  <th className="p-4 text-sm font-semibold text-gray-600">身分與方案</th>
                  <th className="p-4 text-sm font-semibold text-gray-600">訂單 / 配額</th>
                  <th className="p-4 text-sm font-semibold text-gray-600">操作</th>
                </tr>
              ) : (
                <tr>
                  <th className="p-4 text-sm font-semibold text-gray-600">項目名稱</th>
                  <th className="p-4 text-sm font-semibold text-gray-600">相關對象</th>
                  <th className="p-4 text-sm font-semibold text-gray-600">金額</th>
                  <th className="p-4 text-sm font-semibold text-gray-600">狀態</th>
                </tr>
              )}
            </thead>
            <tbody className="divide-y">
              {dataList.map((item) => (
                view === 'users' ? (
                  <UserRow key={item.id} user={item} onUpdate={handleUpdate} />
                ) : (
                  <OrderRow key={item.id} order={item} />
                )
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 分頁 */}
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border">
        <span className="text-sm text-gray-500">共 {total} 筆</span>
        <div className="flex gap-2">
          <button onClick={()=>setPage(p=>Math.max(1, p-1))} className="px-4 py-2 border rounded hover:bg-gray-50 transition">上一頁</button>
          <span className="px-4 py-2 bg-gray-50 rounded font-bold">{page}</span>
          <button onClick={()=>setPage(p=>p+1)} className="px-4 py-2 border rounded hover:bg-gray-50 transition">下一頁</button>
        </div>
      </div>
    </div>
  );
}

// 子組件：用戶資料列
function UserRow({ user, onUpdate }: any) {
  return (
    <tr className="hover:bg-blue-50/30 transition">
      <td className="p-4">
        <div className="font-bold text-gray-800">{user.display_name}</div>
        <div className="text-xs text-gray-400">ID: {user.public_id}</div>
      </td>
      <td className="p-4">
        <div className="flex flex-col gap-1">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded w-fit ${user.role === 'admin' ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-600'}`}>
            {user.role.toUpperCase()}
          </span>
          <div className="text-xs text-gray-500">
            方案: {user.plan_type}
            <input 
              type="date" 
              className="ml-2 border rounded text-[10px]" 
              defaultValue={user.pro_expires_at?.split('T')[0]} 
              onChange={(e)=>onUpdate(user.id, { pro_expires_at: new Date(e.target.value).toISOString() })}
            />
          </div>
        </div>
      </td>
      <td className="p-4">
        <div className="text-sm">
          <span className={`font-bold ${user.total_commissions > 50 ? 'text-red-500' : 'text-gray-700'}`}>
            {user.total_commissions} 筆
          </span>
          <span className="mx-1 text-gray-300">/</span>
          <input 
            type="number" 
            placeholder="預設"
            className="w-12 border rounded p-0.5 text-xs text-center"
            defaultValue={user.custom_quota ?? ''}
            onBlur={(e)=>onUpdate(user.id, { custom_quota: e.target.value === '' ? null : e.target.value })}
          />
        </div>
      </td>
      <td className="p-4 space-x-2">
        <select 
          className="text-xs border rounded p-1" 
          value={user.role} 
          onChange={(e)=>{
            const reason = e.target.value === 'deleted' ? prompt('請輸入停權原因：') : null;
            onUpdate(user.id, { role: e.target.value, ban_reason: reason });
          }}
        >
          <option value="client">委託人</option>
          <option value="artist">繪師</option>
          <option value="admin">管理員</option>
          <option value="deleted">停權</option>
        </select>
        <select 
          className="text-xs border rounded p-1 bg-blue-50" 
          value={user.plan_type} 
          onChange={(e)=>onUpdate(user.id, { plan_type: e.target.value })}
        >
          <option value="free">FREE</option>
          <option value="trial">TRIAL</option>
          <option value="pro">PRO</option>
        </select>
      </td>
    </tr>
  );
}

// 子組件：委託單資料列
function OrderRow({ order }: any) {
  return (
    <tr className="hover:bg-gray-50">
      <td className="p-4">
        <div className="font-bold text-gray-800">{order.project_name || '未命名項目'}</div>
        <div className="text-[10px] text-gray-400">{new Date(order.order_date).toLocaleString()}</div>
      </td>
      <td className="p-4 text-xs">
        <div className="text-gray-600">繪師: {order.artist_name}</div>
        <div className="text-gray-400">委託: {order.client_name || '未綁定'}</div>
      </td>
      <td className="p-4 font-mono font-bold text-blue-600">${order.total_price}</td>
      <td className="p-4">
        <span className="px-2 py-1 rounded-full text-[10px] bg-blue-100 text-blue-700 font-bold uppercase">{order.status}</span>
      </td>
    </tr>
  );
}

// 輔助組件：卡片
function StatBox({ title, value, icon, color = "text-gray-700" }: any) {
  return (
    <div className="bg-white p-6 rounded-2xl border shadow-sm hover:shadow-md transition">
      <div className="flex justify-between items-start mb-2">
        <span className="text-gray-400 text-sm font-medium">{title}</span>
        <span className="text-xl">{icon}</span>
      </div>
      <div className={`text-3xl font-black ${color}`}>{value}</div>
    </div>
  );
}

// 輔助組件：頁籤按鈕
function TabBtn({ active, onClick, label }: any) {
  return (
    <button 
      onClick={onClick}
      className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${active ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
    >
      {label}
    </button>
  );
}