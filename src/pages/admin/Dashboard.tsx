// src/pages/admin/Dashboard.tsx
import { useEffect, useState } from 'react';
import { apiClient } from '../../api/client';

export function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 畫面載入時抓取資料
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, usersRes] = await Promise.all([
        apiClient.get('/api/admin/stats'),
        apiClient.get('/api/admin/users')
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data);
    } catch (error) {
      alert('載入失敗：您可能沒有管理員權限，或登入已過期。');
    } finally {
      setLoading(false);
    }
  };

  // 處理更改使用者角色
  const handleUpdateRole = async (userId: string, newRole: string) => {
    if (!confirm(`確定要將此用戶的權限更改為 [${newRole}] 嗎？`)) return;
    
    try {
      await apiClient.patch(`/api/admin/users/${userId}`, { role: newRole });
      alert('狀態更新成功！');
      fetchData(); // 重新拉取最新資料
    } catch (error) {
      alert('更新失敗，請稍後再試。');
    }
  };

  if (loading) return <div className="p-10 text-xl text-gray-500">正在驗證權限與載入資料...</div>;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800">全站數據概況</h1>
      
        {/* 數據卡片區塊 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
           <h3 className="text-gray-500 font-medium mb-1">註冊用戶總數</h3>
           <p className="text-4xl font-bold text-blue-600">{users.length}</p>
         </div>
         {/* 新增這張卡片，把 stats 變數用掉！ */}
         <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
           <h3 className="text-gray-500 font-medium mb-1">總委託單數</h3>
           <p className="text-4xl font-bold text-green-600">
             {stats?.commissions?.reduce((sum: number, item: any) => sum + item.total, 0) || 0}
           </p>
         </div>
      </div>

      {/* 用戶管理清單 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50">
          <h2 className="text-xl font-bold text-gray-800">用戶名單與權限管理</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="p-4 font-semibold text-gray-600">用戶名稱</th>
                <th className="p-4 font-semibold text-gray-600">當前身分</th>
                <th className="p-4 font-semibold text-gray-600">訂閱方案</th>
                <th className="p-4 font-semibold text-gray-600">註冊時間</th>
                <th className="p-4 font-semibold text-gray-600">操作 (直接變更)</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-4 font-medium text-gray-900">{user.display_name}</td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium 
                      ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 
                        user.role === 'artist' ? 'bg-blue-100 text-blue-700' : 
                        user.role === 'deleted' ? 'bg-red-100 text-red-700' : 
                        'bg-green-100 text-green-700'}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="p-4 text-gray-600">{user.plan_type}</td>
                  <td className="p-4 text-gray-500 text-sm">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="p-4">
                    <select 
                      className="border border-gray-300 rounded-lg p-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      value={user.role}
                      onChange={(e) => handleUpdateRole(user.id, e.target.value)}
                    >
                      <option value="client">委託人</option>
                      <option value="artist">繪師</option>
                      <option value="admin">管理員</option>
                      <option value="deleted">停權 (Deleted)</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}