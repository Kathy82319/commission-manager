// src/pages/Portal.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface UserProfile {
  display_name: string;
  avatar_url: string;
  role?: string;
}

export function Portal() {
  const navigate = useNavigate();
  const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/users/me`, { credentials: 'include' });
        const data = await res.json();
        if (data.success) {
          setUser(data.data);
        } else {
          navigate('/login'); 
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchUser();
  }, [navigate, API_BASE]);

  if (!user) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#FFF' }}>載入中...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '40px 20px' }}>
      
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <img 
          src={user.avatar_url || 'https://via.placeholder.com/100'} 
          alt="avatar" 
          style={{ width: '80px', height: '80px', borderRadius: '50%', border: '3px solid #FFF', marginBottom: '16px', objectFit: 'cover' }} 
        />
        <h1 style={{ color: '#FFF', margin: '0 0 8px 0', fontSize: '28px' }}>歡迎回來，{user.display_name}</h1>
        <p style={{ color: 'rgba(255,255,255,0.7)', margin: 0 }}>請問您今天想進入哪個模式？</p>
      </div>

      <div style={{ display: 'flex', gap: '20px', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: '800px' }}>
        
        {/* 卡片容器：手機版縱向，電腦版橫向 */}
        <div style={{ 
          display: 'flex', 
          gap: '20px', 
          flexDirection: 'column', 
          width: '100%',
          alignItems: 'center'
        }} className="md:flex-row md:justify-center">
          
          {/* 委託人選項 */}
          <div 
            onClick={() => navigate('/client/orders')}
            style={{ ...cardStyle, backgroundColor: '#FAFAFA', width: '100%' }}
          >
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🎨</div>
            <h2 style={{ color: '#5D4A3E', margin: '0 0 8px 0', fontSize: '20px' }}>我是委託人</h2>
            <p style={{ color: '#A0978D', fontSize: '14px', lineHeight: '1.5', margin: 0 }}>查看委託進度、審閱稿件或下載原檔。</p>
          </div>

          {/* 繪師選項 */}
          <div 
            onClick={() => navigate('/artist/notebook')}
            style={{ ...cardStyle, backgroundColor: '#5D4A3E', width: '100%' }}
          >
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🖋️</div>
            <h2 style={{ color: '#FFF', margin: '0 0 8px 0', fontSize: '20px' }}>我是創作者</h2>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', lineHeight: '1.5', margin: 0 }}>管理排單、交付稿件並處理財務紀錄。</p>
          </div>
        </div>
        
        {user?.role === 'admin' && (
          <div style={{ 
            width: '100%', 
            display: 'flex', 
            justifyContent: 'center', 
            marginTop: '20px',
            paddingTop: '20px',
            borderTop: '1px solid rgba(255,255,255,0.1)' 
          }}>
            <button
              onClick={() => navigate('/admin')}
              style={{
                width: '100%',
                maxWidth: '400px', 
                padding: '14px',
                borderRadius: '12px',
                backgroundColor: '#111827',
                color: '#FFF',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '15px',
                boxShadow: '0 10px 15px rgba(0,0,0,0.2)'
              }}
            >
              ⚙️ 進入系統管理後台
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const cardStyle = {
  flex: '1',
  maxWidth: '320px',
  padding: '30px 24px',
  borderRadius: '20px',
  cursor: 'pointer',
  transition: 'transform 0.2s ease',
  boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
  textAlign: 'center' as const,
  border: '1px solid rgba(255,255,255,0.1)'
};