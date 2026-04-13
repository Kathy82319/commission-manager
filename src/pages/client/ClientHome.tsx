import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface UserProfile {
  id: string; 
  display_name: string; 
  avatar_url: string; 
  bio: string;
  profile_settings?: string;
  role?: string;
}

export function ClientHome() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [socialLinks, setSocialLinks] = useState<{ platform: string, url: string }[]>([]);
  const [marqueeText, setMarqueeText] = useState<string>('');

  useEffect(() => {
    const fetchProfile = async () => {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
      try {
        // 🔒 安全修正：移除手動解析 URL 或 localStorage 的邏輯，直接向後端要 /me
        const res = await fetch(`${API_BASE}/api/users/me`, {
          credentials: 'include'
        });
        
        if (res.status === 401 || res.status === 403) {
          navigate('/login');
          return;
        }

        const data = await res.json();
        
        if (data.success && data.data) {
          setProfile(data.data);
          if (data.data.profile_settings) {
            try {
              const settings = JSON.parse(data.data.profile_settings);
              if (settings.socials) setSocialLinks(settings.socials);
            } catch (e) {
              console.error("解析 profile_settings 失敗", e);
            }
          }
        } else {
          setProfile({ id: 'unknown', display_name: '未知用戶', avatar_url: '', bio: '無法取得資料' });
        }
      } catch (error) {
        console.error("取得個人資料失敗", error);
      }
    };

    const fetchNotifications = async () => {
      try {
        const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
        const res = await fetch(`${API_BASE}/api/commissions`, {
          credentials: 'include' 
        });
        const data = await res.json();
        if (data.success) {
          const validOrders = data.data.filter((c: any) => c.status !== 'cancelled' && c.is_external === 0);
          let pendingMsg = '';
          let chatMsg = '';

          validOrders.forEach((order: any) => {
             const name = order.client_custom_title || order.project_name || '';
             const displayName = name ? `項目名稱：${name}   訂單編號：${order.id}` : `訂單編號：${order.id}`;
             
             if (order.pending_changes) {
               pendingMsg += `合約有異動需求，請進入${displayName}。 `;
             } else {
               const latestMsgTime = order.latest_message_at ? new Date(order.latest_message_at).getTime() : 0;
               const lastReadTime = order.last_read_at_client ? new Date(order.last_read_at_client).getTime() : 0;
               if (latestMsgTime > lastReadTime) chatMsg += `${displayName}有新訊息。 `;
             }
          });

          if (pendingMsg) setMarqueeText(pendingMsg);
          else if (chatMsg) setMarqueeText(chatMsg);
        }
      } catch(e) { console.error("讀取通知失敗", e); }
    };

    fetchProfile();
    fetchNotifications();
  }, [navigate]);

  const handleSwitchToArtist = async () => {
    if (!profile) return;

    if (profile.role === 'artist') {
      window.location.href = '/artist/queue';
    } else {
      const confirmCreate = window.confirm("確定要創建繪師管理頁嗎？\n創建後將直接開始 7 天試用期。");

      if (confirmCreate) {
        try {
          const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
          // 🔒 安全修正：改用 /me
          const res = await fetch(`${API_BASE}/api/users/me/complete-onboarding`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ display_name: profile.display_name, role: 'artist' })
          });

          const result = await res.json();
          if (result.success) {
            alert("創建成功！為您導向繪師後台。");
            window.location.href = '/artist/queue';
          } else {
            alert('創建失敗：' + result.error);
          }
        } catch (error) {
          alert('網路連線錯誤，請稍後再試。');
        }
      }
    }
  };

  return (
    <div style={{ backgroundColor: '#778ca4', minHeight: '100vh', display: 'flex', justifyContent: 'center', padding: '40px 16px', fontFamily: 'sans-serif' }}>
      
      <style>{`
        @keyframes scroll-left {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
      `}</style>

      <div style={{ width: '100%', maxWidth: '500px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '-10px' }}>
          <button 
            onClick={handleSwitchToArtist}
            style={{ 
              background: 'none', border: 'none', color: '#e8ecf3', fontSize: '13px', 
              cursor: 'pointer', textDecoration: 'underline', padding: 0, opacity: 0.9
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '1'}
            onMouseLeave={e => e.currentTarget.style.opacity = '0.9'}
          >
            切換/創建繪師管理頁
          </button>
        </div>

        {marqueeText && (
          <div style={{ 
            backgroundColor: '#778ca4', borderTop: '2px dashed #facc15', borderBottom: '2px dashed #facc15', 
            padding: '10px 0', overflow: 'hidden', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center'
          }}>
            <div style={{ display: 'inline-block', animation: 'scroll-left 15s linear infinite', color: '#facc15', fontWeight: 'bold', fontSize: '15px' }}>
              📢 {marqueeText}
            </div>
          </div>
        )}

        <div style={{ backgroundColor: '#e8ecf3', padding: '40px 24px', borderRadius: '16px', textAlign: 'center', boxShadow: '0 8px 24px rgba(100,120,140,0.08)', border: '1px solid #d0d8e4' }}>
          <div style={{ 
            width: '100px', height: '100px', backgroundColor: '#d9dfe9', borderRadius: '50%', margin: '0 auto 20px auto', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', color: '#556577',
            backgroundImage: profile?.avatar_url ? `url(${profile.avatar_url})` : 'none',
            backgroundSize: 'cover', backgroundPosition: 'center', border: '4px solid #FFFFFF',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
          }}>
            {!profile?.avatar_url && '無頭像'}
          </div>
          <h2 style={{ margin: '0 0 12px 0', color: '#475569', fontSize: '24px', fontWeight: 'bold' }}>{profile?.display_name || '載入中...'}</h2>
          <p style={{ color: '#556577', fontSize: '15px', lineHeight: '1.6', marginBottom: '24px', whiteSpace: 'pre-wrap', padding: '0 10px' }}>
            {profile?.bio || '尚未填寫自我介紹'}
          </p>
          
          {socialLinks.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
              {socialLinks.map((social, idx) => (
                <a 
                  key={idx} href={social.url} target="_blank" rel="noopener noreferrer"
                  style={{ 
                    padding: '6px 16px', backgroundColor: '#d9dfe9', color: '#4A7294', 
                    borderRadius: '20px', fontSize: '13px', fontWeight: 'bold', textDecoration: 'none',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#c5cfd9'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = '#d9dfe9'}
                >
                  {social.platform}
                </a>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'row', gap: '16px' }}>
          <button 
            onClick={() => navigate('/client/profile/edit')}
            style={{ 
              flex: 1, padding: '16px', backgroundColor: '#4A7294', color: '#FFFFFF', border: '2px solid #3b5a75', 
              borderRadius: '16px', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer', transition: 'all 0.2s',
              boxShadow: '0 4px 12px rgba(74,114,148,0.3)'
            }}
          >
            編輯個人資料
          </button>
          <button 
            onClick={() => navigate('/client/orders')}
            style={{ 
              flex: 1, padding: '16px', backgroundColor: '#4A7294', color: '#FFFFFF', border: '2px solid #3b5a75', 
              borderRadius: '16px', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer', transition: 'all 0.2s',
              boxShadow: '0 4px 12px rgba(74,114,148,0.3)'
            }}
          >
            查看委託
          </button>
        </div>

      </div>
    </div>
  );
}