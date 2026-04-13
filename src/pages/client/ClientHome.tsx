// src/pages/client/ClientHome.tsx
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
        const res = await fetch(`${API_BASE}/api/users/me`, { credentials: 'include' });
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
            } catch (e) {}
          }
        }
      } catch (error) {
        console.error("取得個人資料失敗", error);
      }
    };

    const fetchNotifications = async () => {
      try {
        const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
        const res = await fetch(`${API_BASE}/api/commissions`, { credentials: 'include' });
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
      } catch(e) {}
    };

    fetchProfile();
    fetchNotifications();
  }, [navigate]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 16px', flex: 1 }}>
      
      <style>{`
        @keyframes scroll-left {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
      `}</style>

      <div style={{ width: '100%', maxWidth: '500px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {marqueeText && (
          <div style={{ 
            backgroundColor: 'rgba(255,255,255,0.1)', borderTop: '1px solid rgba(250, 204, 21, 0.5)', borderBottom: '1px solid rgba(250, 204, 21, 0.5)', 
            padding: '10px 0', overflow: 'hidden', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', borderRadius: '8px'
          }}>
            <div style={{ display: 'inline-block', animation: 'scroll-left 15s linear infinite', color: '#facc15', fontWeight: 'bold', fontSize: '14px' }}>
              📢 {marqueeText}
            </div>
          </div>
        )}

        <div style={{ backgroundColor: '#e8ecf3', padding: '40px 24px', borderRadius: '16px', textAlign: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
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

        <button 
          onClick={() => navigate('/client/profile/edit')}
          style={{ 
            width: '100%', padding: '16px', backgroundColor: '#4A7294', color: '#FFFFFF', border: 'none', 
            borderRadius: '16px', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer', transition: 'all 0.2s',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
          編輯個人資料
        </button>

      </div>
    </div>
  );
}