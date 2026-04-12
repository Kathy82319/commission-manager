import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface UserProfile {
  id: string; 
  display_name: string; 
  avatar_url: string; 
  bio: string;
  profile_settings?: string;
  role?: string; // 🌟 新增 role 以判斷身分
}

export function ClientHome() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [socialLinks, setSocialLinks] = useState<{ platform: string, url: string }[]>([]);
  const [marqueeText, setMarqueeText] = useState<string>('');

  // 1. 取得真實 Cookie 中的 user_id (取代原本寫死的 TEST_CLIENT_ID)
  const getCookie = (name: string) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift();
    return null;
  };

  useEffect(() => {
    const userId = getCookie('user_id');

    const fetchProfile = async () => {
      if (!userId) return; // 如果沒登入就不抓
      const res = await fetch(`/api/users/${userId}`);
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
      } else if (data.id) {
        // 兼容 API 回傳格式
        setProfile(data);
      } else {
        setProfile({ id: userId, display_name: '測試委託人', avatar_url: '', bio: '尚未填寫自我介紹' });
      }
    };

    const fetchNotifications = async () => {
      try {
        const res = await fetch('/api/commissions');
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
  }, []);

  // 🌟 新增：處理切換或創建繪師帳號
  const handleSwitchToArtist = async () => {
    if (!profile) return;

    if (profile.role === 'artist') {
      // 已經是繪師，直接切換
      window.location.href = '/artist/queue';
    } else {
      // 不是繪師，跳出確認視窗
      const confirmCreate = window.confirm(
        "您目前沒有繪師帳號。\n\n確定要創建繪師管理頁嗎？\n創建後將直接開始 7 天試用期。"
      );

      if (confirmCreate) {
        try {
          // 呼叫 API 將身分升級為 artist
          const res = await fetch(`/api/users/${profile.id}/complete-onboarding`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              display_name: profile.display_name, 
              role: 'artist' 
            })
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
        
        {/* 🌟 新增：切換/創建 繪師管理頁 按鈕 (靠右對齊) */}
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

        {/* 跑馬燈區塊 */}
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

        {/* 上板塊：個人檔案與社群 */}
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
          
          {/* 社群 Icon 區塊 */}
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

        {/* 下板塊：操作按鈕 */}
        <div style={{ display: 'flex', flexDirection: 'row', gap: '16px' }}>
          <button 
            onClick={() => navigate('/client/profile/edit')}
            style={{ 
              flex: 1, padding: '16px', backgroundColor: '#4A7294', color: '#FFFFFF', border: '2px solid #3b5a75', 
              borderRadius: '16px', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer', transition: 'all 0.2s',
              boxShadow: '0 4px 12px rgba(74,114,148,0.3)'
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
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
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
          >
            查看委託
          </button>
        </div>

      </div>
    </div>
  );
}