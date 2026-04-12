import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface UserProfile {
  id: string; 
  display_name: string; 
  avatar_url: string; 
  bio: string;
  profile_settings?: string;
}

const TEST_CLIENT_ID = 'u-client-test';

export function ClientHome() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [socialLinks, setSocialLinks] = useState<{ platform: string, url: string }[]>([]);
  
  // 🌟 新增跑馬燈文字狀態
  const [marqueeText, setMarqueeText] = useState<string>('');

  useEffect(() => {
    const fetchProfile = async () => {
      const res = await fetch(`/api/users/${TEST_CLIENT_ID}`);
      const data = await res.json();
      if (data.success) {
        setProfile(data.data);
        if (data.data.profile_settings) {
          try {
            const settings = JSON.parse(data.data.profile_settings);
            if (settings.socials) {
              setSocialLinks(settings.socials);
            }
          } catch (e) {
            console.error("解析 profile_settings 失敗", e);
          }
        }
      } else {
        setProfile({ id: TEST_CLIENT_ID, display_name: '測試委託人', avatar_url: '', bio: '尚未填寫自我介紹' });
      }
    };

    // 🌟 撈取通知資料以產生跑馬燈
    const fetchNotifications = async () => {
      try {
        const res = await fetch('/api/commissions');
        const data = await res.json();
        if (data.success) {
          // 過濾出屬於該委託人且未作廢的內部單
          // (注意：如果您有實際的 Auth 機制，這裡應該只會回傳該使用者的單)
          const validOrders = data.data.filter((c: any) => c.status !== 'cancelled' && c.is_external === 0 && c.client_id === TEST_CLIENT_ID);
          
          let pendingMsg = '';
          let chatMsg = '';

          validOrders.forEach((order: any) => {
             const name = order.client_custom_title || order.project_name || '';
             // 若未設定項目名稱，則隱藏項目名稱的文字
             const displayName = name ? `項目名稱：${name}   訂單編號：${order.id}` : `訂單編號：${order.id}`;
             
             if (order.pending_changes) {
               pendingMsg += `合約有異動需求，請進入${displayName}。 `;
             } else {
               const latestMsgTime = order.latest_message_at ? new Date(order.latest_message_at).getTime() : 0;
               const lastReadTime = order.last_read_at_client ? new Date(order.last_read_at_client).getTime() : 0;
               if (latestMsgTime > lastReadTime) {
                 chatMsg += `${displayName}有新訊息。 `;
               }
             }
          });

          // 異動優先顯示
          if (pendingMsg) setMarqueeText(pendingMsg);
          else if (chatMsg) setMarqueeText(chatMsg);
        }
      } catch(e) { 
        console.error("讀取通知失敗", e); 
      }
    };

    fetchProfile();
    fetchNotifications();
  }, []);

  return (
    <div style={{ backgroundColor: '#778ca4', minHeight: '100vh', display: 'flex', justifyContent: 'center', padding: '40px 16px', fontFamily: 'sans-serif' }}>
      
      {/* 🌟 跑馬燈動畫定義 */}
      <style>{`
        @keyframes scroll-left {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
      `}</style>

      <div style={{ width: '100%', maxWidth: '500px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* 🌟 跑馬燈區塊 (沒訊息提醒時預設隱藏，顏色同背景底色但多黃色虛線的上下邊框) */}
        {marqueeText && (
          <div style={{ 
            backgroundColor: '#778ca4', 
            borderTop: '2px dashed #facc15', 
            borderBottom: '2px dashed #facc15', 
            padding: '10px 0', 
            overflow: 'hidden', 
            whiteSpace: 'nowrap', 
            display: 'flex', 
            alignItems: 'center'
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
                  key={idx} 
                  href={social.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
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