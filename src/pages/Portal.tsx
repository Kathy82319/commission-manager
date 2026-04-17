// src/pages/Portal.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

// 定義使用者型別，包含 role
interface UserProfile {
  display_name: string;
  avatar_url: string;
  role?: string; // 加上選用的 role 屬性
}

export function Portal() {
  const navigate = useNavigate();
  const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
  
  // 在這裡修正型別定義
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/users/me`, { credentials: 'include' });
        const data = await res.json();
        if (data.success) {
          setUser(data.data);
        } else {
          navigate('/login'); // 沒登入就踢回登入頁
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchUser();
  }, [navigate, API_BASE]);

  if (!user) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#FFF' }}>載入中...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '20px' }}>
      
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <img 
          src={user.avatar_url || 'https://via.placeholder.com/100'} 
          alt="avatar" 
          style={{ width: '80px', height: '80px', borderRadius: '50%', border: '3px solid #FFF', marginBottom: '16px', objectFit: 'cover' }} 
        />
        <h1 style={{ color: '#FFF', margin: '0 0 8px 0', fontSize: '28px' }}>歡迎回來，{user.display_name}</h1>
        <p style={{ color: 'rgba(255,255,255,0.7)', margin: 0 }}>請問您今天想進入哪個模式？</p>
      </div>

      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', flexDirection: 'column', alignItems: 'center', maxWidth: '800px', width: '100%' }}>
        
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', justifyContent: 'center', width: '100%' }}>
          {/* 委託人選項 */}
          <div 
            onClick={() => navigate('/client/orders')}
            style={{ ...cardStyle, backgroundColor: '#FAFAFA' }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-5px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>🎨</div>
            <h2 style={{ color: '#5D4A3E', margin: '0 0 8px 0' }}>我是委託人</h2>
            <p style={{ color: '#A0978D', fontSize: '14px', lineHeight: '1.5', margin: 0 }}>查看我發包的委託單進度、審閱繪師交付的稿件，或下載已完成的原檔。</p>
          </div>

          {/* 繪師選項 */}
          <div 
            onClick={() => navigate('/artist/notebook')}
            style={{ ...cardStyle, backgroundColor: '#5D4A3E' }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-5px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>🖋️</div>
            <h2 style={{ color: '#FFF', margin: '0 0 8px 0' }}>我是創作者</h2>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', lineHeight: '1.5', margin: 0 }}>進入創作者筆記本，管理我的排單、交付稿件給委託人，並處理財務紀錄。</p>
          </div>
        </div>
        
{user?.role === 'admin' && (
  <div style={{ 
    width: '100%', 
    display: 'flex', 
    justifyContent: 'center', 
    marginTop: '30px',
    paddingTop: '20px',
    borderTop: '1px solid rgba(255,255,255,0.1)' 
  }}>
    <button
      onClick={() => navigate('/admin')}
      style={{
        width: '100%',
        maxWidth: '400px', // 限制最大寬度，避免在大螢幕太長
        padding: '16px 32px',
        borderRadius: '12px',
        backgroundColor: '#111827',
        color: '#FFF',
        border: 'none',
        cursor: 'pointer',
        fontWeight: 'bold',
        fontSize: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
        boxShadow: '0 10px 15px rgba(0,0,0,0.2)',
        transition: 'all 0.2s ease'
      }}
      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#1F2937'}
      onMouseLeave={e => e.currentTarget.style.backgroundColor = '#111827'}
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
  flex: '1 1 300px',
  maxWidth: '300px',
  padding: '40px 30px',
  borderRadius: '20px',
  cursor: 'pointer',
  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
  textAlign: 'center' as const,
  border: '1px solid rgba(255,255,255,0.1)'
};