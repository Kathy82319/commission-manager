import { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';

export function ClientLayout() {
  const navigate = useNavigate();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const checkClientAuth = async () => {
      try {
        const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
        
        // 🔒 安全修正：不依賴 LocalStorage，直接向後端要 /me 驗證 Cookie
        const res = await fetch(`${API_BASE}/api/users/me`, {
          credentials: 'include'
        });

        // 只有在 Cookie 驗證成功時才放行
        if (res.status === 200) {
          setIsAuthorized(true);
        } else {
          navigate('/login');
        }
      } catch (error) {
        navigate('/login');
      }
    };

    checkClientAuth();
  }, [navigate]);

  if (!isAuthorized) {
    return <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#778ca4', color: '#FFFFFF' }}>驗證身分中...</div>;
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#778ca4', display: 'flex', flexDirection: 'column', fontFamily: 'sans-serif' }}>
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Outlet />
      </main>
    </div>
  );
}