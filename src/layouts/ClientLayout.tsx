// src/layouts/ClientLayout.tsx
import { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';

export function ClientLayout() {
  const navigate = useNavigate();

  useEffect(() => {
    // 🌟 簡單檢查：如果完全沒 ID，就不能待在 Client 區
    const localId = localStorage.getItem('user_id');
    const uParam = new URLSearchParams(window.location.search).get('u');
    
    if (!localId && !uParam) {
      navigate('/login');
    }
  }, [navigate]);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#778ca4', display: 'flex', flexDirection: 'column', fontFamily: 'sans-serif' }}>
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Outlet />
      </main>
    </div>
  );
}