// src/layouts/AdminLayout.tsx
import { Outlet, Link, useNavigate } from 'react-router-dom';

export function AdminLayout() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* 左側邊欄 */}
      <aside className="w-64 bg-gray-900 text-white flex flex-col">
        <div className="p-6 text-xl font-bold border-b border-gray-800">
          系統管理後台
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <Link to="/admin" className="block p-3 rounded hover:bg-gray-800 transition-colors">
            總覽儀表板
          </Link>
          <button 
            onClick={() => navigate('/portal')} 
            className="block w-full text-left p-3 rounded hover:bg-gray-800 text-gray-400 mt-8 transition-colors"
          >
            ← 返回一般入口
          </button>
        </nav>
      </aside>

      {/* 右側主畫面區塊 */}
      <main className="flex-1 p-8 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}