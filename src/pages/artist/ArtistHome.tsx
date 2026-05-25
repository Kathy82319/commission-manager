// src/pages/artist/ArtistHome.tsx
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import DOMPurify from 'dompurify';

interface ProfileSettings {
  portfolio: string[];
  process: string;
  payment: string;
  rules: string;
  custom_sections: { id: string; title: string; content: string }[];
}

export function ArtistHome() {
  const { id } = useParams();
  const artistId = id || 'u-artist-01';

  const [artist, setArtist] = useState<any>(null);
  const [settings, setSettings] = useState<ProfileSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const fetchArtistData = async () => {
      try {
        const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
        const res = await fetch(`${API_BASE}/api/users/${artistId}`);
        
        if (!res.ok) throw new Error('伺服器找不到該繪師頁面');

        const data = await res.json();
        
        if (data.success && data.data) {
          setArtist(data.data);
          if (data.data.profile_settings) {
            try {
              setSettings(JSON.parse(data.data.profile_settings));
            } catch (e) { console.error("解析 profile_settings 失敗"); }
          }
        } else {
          setErrorMsg(data.message || '找不到該繪師的資料');
        }
      } catch (error) {
        setErrorMsg('讀取頁面時發生錯誤，請稍後再試。');
      } finally {
        setLoading(false);
      }
    };
    fetchArtistData();
  }, [artistId]);

  if (loading) return <div style={{ padding: '80px', textAlign: 'center', color: '#A0978D' }}>載入繪師資料中...</div>;
  if (errorMsg || !artist) return <div style={{ padding: '80px', textAlign: 'center', color: '#c62828', fontWeight: 'bold' }}>{errorMsg}</div>;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
      
      <style>{`
        .artist-home-container { display: flex; flex-direction: column; gap: 40px; padding: 40px 0; }
        .artist-sidebar { width: 100%; display: flex; flex-direction: column; gap: 20px; }
        .artist-content { flex: 1; display: flex; flex-direction: column; gap: 40px; }
        .portfolio-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
        .rich-text-box { font-size: 15px; color: #444; line-height: 1.8; background: #FFF; padding: 24px; border-radius: 16px; border: 1px solid #EAE6E1; }

        @media (min-width: 768px) {
          .artist-home-container { flex-direction: row; align-items: flex-start; }
          .artist-sidebar { width: 300px; position: sticky; top: 40px; }
          .portfolio-grid { grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; }
        }
      `}</style>

      <div className="artist-home-container">
        
        <aside className="artist-sidebar">
          <div style={{ width: '100%', aspectRatio: '1', borderRadius: '16px', overflow: 'hidden', backgroundColor: '#FBFBF9', border: '1px solid #EAE6E1', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
            {artist.avatar_url ? (
              <img src={artist.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#A0978D' }}>無頭像</div>
            )}
          </div>
          
          <div>
            <h1 style={{ margin: '0 0 12px 0', fontSize: '26px', color: '#5D4A3E', fontWeight: 'bold' }}>
              {artist.display_name || '未命名繪師'}
            </h1>
            <div style={{ display: 'flex' }}>
               <button style={{ flex: 1, padding: '14px', backgroundColor: '#5D4A3E', color: '#FFF', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px', boxShadow: '0 4px 12px rgba(93,74,62,0.2)' }}>
                 前往委託
               </button>
            </div>
          </div>

          <div style={{ backgroundColor: '#FFFFFF', padding: '24px', borderRadius: '16px', border: '1px solid #EAE6E1' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', color: '#7A7269', borderBottom: '1px solid #F0ECE7', paddingBottom: '8px', fontWeight: 'bold' }}>關於我</h3>
            <p style={{ margin: 0, fontSize: '14px', color: '#5D4A3E', lineHeight: '1.7', whiteSpace: 'pre-wrap' }}>
              {artist.bio || '這位繪師尚未填寫簡介。'}
            </p>
          </div>
        </aside>

        <main className="artist-content">
          
          {settings?.portfolio && settings.portfolio.length > 0 && (
            <section>
              <h2 style={{ margin: '0 0 20px 0', fontSize: '20px', color: '#5D4A3E', borderBottom: '3px solid #5D4A3E', paddingBottom: '8px', display: 'inline-block' }}>
                作品展示
              </h2>
              <div className="portfolio-grid">
                {settings.portfolio.map((img, idx) => (
                  <div key={idx} style={{ aspectRatio: '1', borderRadius: '12px', overflow: 'hidden', backgroundColor: '#FBFBF9', border: '1px solid #EAE6E1', cursor: 'zoom-in' }}>
                    <img src={img} alt={`作品 ${idx + 1}`} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s ease' }} 
                         onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
                         onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {[
            { id: 'process', label: '委託流程說明', content: settings?.process },
            { id: 'payment', label: '付款方式', content: settings?.payment },
            { id: 'rules', label: '委託範圍與使用規範', content: settings?.rules }
          ].map(sec => sec.content && (
            <section key={sec.id}>
              <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#5D4A3E', fontWeight: 'bold' }}>{sec.label}</h2>
              <div className="rich-text-box" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(sec.content) }} />
            </section>
          ))}

          {settings?.custom_sections?.map((section) => section.content && (
            <section key={section.id}>
              <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#5D4A3E', fontWeight: 'bold' }}>
                {section.title || '其他資訊'}
              </h2>
              <div className="rich-text-box" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(section.content) }} />
            </section>
          ))}

        </main>
      </div>
    </div>
  );
}