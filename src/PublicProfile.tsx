import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

// 定義與 Settings 相同的結構
interface ProfileSettings {
  portfolio: string[];
  process: string;
  payment: string;
  rules: string;
  custom_sections: { id: string; title: string; content: string }[];
}

export function PublicProfile() {
  const { id } = useParams();
  
  // 如果網址沒有帶 ID，預設拿測試帳號當作備用
  const artistId = id || 'u-artist-01';

  const [artist, setArtist] = useState<any>(null);
  const [settings, setSettings] = useState<ProfileSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchArtistData = async () => {
      try {
        const res = await fetch(`/api/users/${artistId}`);
        const data = await res.json();
        if (data.success && data.data) {
          setArtist(data.data);
          if (data.data.profile_settings) {
            try {
              setSettings(JSON.parse(data.data.profile_settings));
            } catch (e) {
              console.error("解析 profile_settings 失敗");
            }
          }
        }
      } catch (error) {
        console.error("讀取公開頁面失敗", error);
      } finally {
        setLoading(false);
      }
    };
    fetchArtistData();
  }, [artistId]);

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>載入中...</div>;
  }

  if (!artist) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#c62828' }}>找不到該繪師的資料。</div>;
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px', display: 'flex', gap: '40px', alignItems: 'flex-start' }}>
      
      {/* 左側：固定式個人簡介卡片 (Sticky Sidebar) */}
      <div style={{ width: '300px', position: 'sticky', top: '40px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ width: '100%', aspectRatio: '1', borderRadius: '12px', overflow: 'hidden', backgroundColor: '#f0f0f0', border: '1px solid #ddd' }}>
          {artist.avatar_url ? (
            <img src={artist.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aaa' }}>無頭像</div>
          )}
        </div>
        
        <div>
          <h1 style={{ margin: '0 0 10px 0', fontSize: '24px', color: '#333' }}>
            {artist.display_name || '未命名繪師'}
          </h1>
          <div style={{ display: 'flex', gap: '10px' }}>
             <button style={{ flex: 1, padding: '12px', backgroundColor: '#333', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px' }}>
               前往委託
             </button>
             {/* 未來可以加上複製連結或分享按鈕 */}
          </div>
        </div>

        <div style={{ backgroundColor: '#f9f9f9', padding: '20px', borderRadius: '12px', border: '1px solid #eee' }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', color: '#555', borderBottom: '1px solid #ddd', paddingBottom: '8px' }}>關於我</h3>
          <p style={{ margin: 0, fontSize: '14px', color: '#555', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
            {artist.bio || '這位繪師還沒有寫任何簡介。'}
          </p>
        </div>
      </div>

      {/* 右側：滾動式內容區 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '40px' }}>
        
        {/* 作品展示區 (CSS Grid 瀑布流/格狀) */}
        {settings?.portfolio && settings.portfolio.length > 0 && (
          <section>
            <h2 style={{ margin: '0 0 20px 0', fontSize: '22px', color: '#333', borderBottom: '2px solid #333', paddingBottom: '10px', display: 'inline-block' }}>
              作品展示區
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
              {settings.portfolio.map((img, idx) => (
                <div key={idx} style={{ aspectRatio: '1', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#f5f5f5', border: '1px solid #eee' }}>
                  <img src={img} alt={`作品 ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s' }} 
                       onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                       onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 委託流程說明 */}
        {settings?.process && (
          <section>
            <h2 style={{ margin: '0 0 20px 0', fontSize: '20px', color: '#333', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>委託流程說明</h2>
            <div style={{ fontSize: '15px', color: '#444', lineHeight: '1.8', whiteSpace: 'pre-wrap', backgroundColor: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #eee' }}>
              {settings.process}
            </div>
          </section>
        )}

        {/* 付款方式 */}
        {settings?.payment && (
          <section>
            <h2 style={{ margin: '0 0 20px 0', fontSize: '20px', color: '#333', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>付款方式</h2>
            <div style={{ fontSize: '15px', color: '#444', lineHeight: '1.8', whiteSpace: 'pre-wrap', backgroundColor: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #eee' }}>
              {settings.payment}
            </div>
          </section>
        )}

        {/* 委託範圍(使用規範) */}
        {settings?.rules && (
          <section>
            <h2 style={{ margin: '0 0 20px 0', fontSize: '20px', color: '#333', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>委託範圍與使用規範</h2>
            <div style={{ fontSize: '15px', color: '#444', lineHeight: '1.8', whiteSpace: 'pre-wrap', backgroundColor: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #eee' }}>
              {settings.rules}
            </div>
          </section>
        )}

        {/* 自訂區塊 */}
        {settings?.custom_sections && settings.custom_sections.length > 0 && (
          <>
            {settings.custom_sections.map((section) => (
              <section key={section.id}>
                <h2 style={{ margin: '0 0 20px 0', fontSize: '20px', color: '#333', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                  {section.title || '未命名區塊'}
                </h2>
                <div style={{ fontSize: '15px', color: '#444', lineHeight: '1.8', whiteSpace: 'pre-wrap', backgroundColor: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #eee' }}>
                  {section.content}
                </div>
              </section>
            ))}
          </>
        )}

      </div>
    </div>
  );
}