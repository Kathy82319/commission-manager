import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import './styles/PublicProfile.css';

interface ProfileSettings {
  portfolio: string[];
  detailed_intro: string;
  process: string;
  payment: string;
  rules: string;
  custom_sections: { id: string; title: string; content: string }[];
  social_links: { platform: string; url: string }[];
  hidden_sections: string[];
  // 🌟 新增：開場名片的設定欄位
  splash_enabled?: boolean;
  splash_image?: string;
  splash_duration?: number;
  splash_text?: string;
}

const platformStyles: Record<string, { bg: string; text: string }> = {
  'Facebook': { bg: '#1877F2', text: '#fff' },
  'Plurk': { bg: '#FF574D', text: '#fff' },
  'Twitter / X': { bg: '#000000', text: '#fff' },
  'Threads': { bg: '#000000', text: '#fff' },
  'Instagram': { bg: '#E1306C', text: '#fff' },
  '個人網站': { bg: '#4CAF50', text: '#fff' }
};

const getSocialIcon = (platform: string) => {
  const props = { width: "18", height: "18", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round" as const, strokeLinejoin: "round" as const, viewBox: "0 0 24 24" };
  switch (platform) {
    case 'Facebook':
      return <svg {...props} fill="currentColor" stroke="none"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /></svg>;
    case 'Twitter / X':
      return <svg {...props}><line x1="4" y1="4" x2="20" y2="20" /><line x1="20" y1="4" x2="4" y2="20" /></svg>;
    case 'Instagram':
      return <svg {...props}><rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></svg>;
    case 'Threads':
      return <svg {...props}><circle cx="12" cy="12" r="4" /><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94" /></svg>;
    case 'Plurk':
      return <svg {...props}><path d="M9 4h3a4 4 0 0 1 4 4v0a4 4 0 0 1-4 4H9V4z" /><line x1="9" y1="12" x2="9" y2="20" /></svg>;
    case '個人網站':
    default:
      return <svg {...props}><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>;
  }
};

export function PublicProfile() {
  
  // 🌟 關鍵修改：同時接收 artistId (給 /@Artist_XXX 網址用) 或 id (給其他舊版網址用)
  const { artistId, id } = useParams();


  // 🌟 關鍵修正：處理帶有 @ 的網址
  let rawId = artistId || id || 'u-artist-01';
  // 如果網址抓到的字串開頭有 '@'，我們就把它切掉 (變成純 ID)
  if (rawId.startsWith('@')) {
    rawId = rawId.substring(1); 
  }
  const currentArtistId = rawId;

  const [artist, setArtist] = useState<any>(null);
  const [settings, setSettings] = useState<ProfileSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('');
  const [showSplash, setShowSplash] = useState(true);

  // 🌟 新增：Lightbox 燈箱狀態
  const [selectedImgIndex, setSelectedImgIndex] = useState<number | null>(null);

  useEffect(() => {
    const fetchArtistData = async () => {
      try {
        // 使用抓取到的 currentArtistId 去要資料
        const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
const res = await fetch(`${API_BASE}/api/users/${currentArtistId}`);
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
  }, [currentArtistId]);

  // 🌟 修改：根據繪師設定來決定動畫的顯示與時長
  useEffect(() => {
    if (!loading) {
      // 若繪師明確關閉了開場動畫，直接隱藏並返回
      if (settings && settings.splash_enabled === false) {
        setShowSplash(false);
        return;
      }
      
      // 若有設定則取設定值(秒轉毫秒)，否則預設 1.5 秒
      const duration = settings?.splash_duration ? settings.splash_duration * 1000 : 1500;
      
      const timer = setTimeout(() => {
        setShowSplash(false);
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [loading, settings]);

  // 🌟 新增：Lightbox 切換函數邏輯
  const handlePrevImg = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedImgIndex !== null && settings?.portfolio) {
      setSelectedImgIndex((selectedImgIndex - 1 + settings.portfolio.length) % settings.portfolio.length);
    }
  };

  const handleNextImg = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedImgIndex !== null && settings?.portfolio) {
      setSelectedImgIndex((selectedImgIndex + 1) % settings.portfolio.length);
    }
  };

const availableTabs = [];
  if (settings) {
    const isHidden = (id: string) => settings.hidden_sections?.includes(id) || false;
    
    // 🌟 新增防呆：去除富文本的空段落標籤，判斷是否真的有打字或插入圖片
    const hasContent = (html: string) => {
      if (!html) return false;
      const stripped = html.replace(/<[^>]*>?/gm, '').trim();
      return stripped.length > 0 || html.includes('<img'); 
    };

    if (!isHidden('portfolio') && settings.portfolio?.length > 0) availableTabs.push({ id: 'portfolio', label: '作品展示' });
    
    // 只有當「未隱藏」且「真的有內容」時，才會產生分頁標籤
    if (!isHidden('detailed_intro') && hasContent(settings.detailed_intro)) availableTabs.push({ id: 'detailed_intro', label: '詳細介紹' });
    if (!isHidden('process') && hasContent(settings.process)) availableTabs.push({ id: 'process', label: '委託流程' });
    if (!isHidden('payment') && hasContent(settings.payment)) availableTabs.push({ id: 'payment', label: '付款方式' });
    if (!isHidden('rules') && hasContent(settings.rules)) availableTabs.push({ id: 'rules', label: '委託規範' });
    
    if (settings.custom_sections) {
      settings.custom_sections.forEach(sec => {
        if (!isHidden(sec.id) && hasContent(sec.content)) availableTabs.push({ id: sec.id, label: sec.title || '未命名區塊' });
      });
    }
  }

  const currentTab = activeTab || (availableTabs.length > 0 ? availableTabs[0].id : '');

  if (loading) return <div className="loading-state">載入中...</div>;
  if (!artist) return <div className="error-state">找不到該繪師的資料。</div>;

  return (
    <div className="public-profile-container">
      
      {/* 修正後的開場名片區塊 */}
      <div 
        className={`splash-screen ${!showSplash ? 'hide' : ''}`}
        style={{
          // 背景邏輯：只有當繪師有上傳圖片時才顯示背景圖
          backgroundImage: settings?.splash_image ? `url(${settings.splash_image})` : 'none',
          // 若無圖片，背景色改為與網頁主色調一致
          backgroundColor: settings?.splash_image ? '#000' : '#F4F0EB', 
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          position: 'fixed',
          top: 0, left: 0, width: '100vw', height: '100vh',
          zIndex: 10000,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.8s ease-in-out'
        }}
      >
        {/* 🌟 關鍵修正：只有在「有圖片」或「有填寫文字內容」時，才顯示中間的裝飾框 */}
        {(settings?.splash_image || settings?.splash_text) ? (
          <div style={{
            backgroundColor: 'rgba(0, 0, 0, 0.45)', 
            padding: '40px 60px',
            borderRadius: '16px',
            backdropFilter: 'blur(8px)', 
            WebkitBackdropFilter: 'blur(8px)',
            textAlign: 'center',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
            maxWidth: '80%'
          }}>
            <h1 style={{ color: '#FFF', fontSize: '36px', margin: 0, letterSpacing: '2px', fontWeight: 'bold' }}>
              {settings?.splash_text || artist.display_name}
            </h1>
            {settings?.splash_text && (
              <div style={{ width: '40px', height: '2px', background: '#A67B3E', margin: '20px auto' }} />
            )}
            <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '15px', margin: 0 }}>
              {settings?.splash_text ? artist.display_name : ''}
            </p>
          </div>
        ) : (
          // 🌟 若完全沒設定內容，中央僅顯示乾淨的文字，不加黑色裝飾框
          <div style={{ color: '#5D4A3E', fontSize: '20px', fontWeight: 'bold', letterSpacing: '4px' }}>
          </div>
        )}
      </div>

      <div className="content-wrapper">
        <div className="sidebar">
          <div className="avatar-container">
            {artist.avatar_url ? (
              <img src={artist.avatar_url} alt="Avatar" className="avatar-image" />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aaa', fontSize: '18px' }}>無頭像</div>
            )}
          </div>
          
          <div>
            <h1 className="artist-name">{artist.display_name || '未命名繪師'}</h1>
            
            <div className="social-links">
              {settings?.social_links && settings.social_links.length > 0 && (
                settings.social_links.map((link, idx) => {
                  const style = platformStyles[link.platform] || { bg: '#eee', text: '#333' };
                  const safeUrl = (url: string) => {
                    const lowerUrl = (url || '').toLowerCase().trim();
                    if (lowerUrl.startsWith('javascript:') || lowerUrl.startsWith('data:') || lowerUrl.startsWith('vbscript:')) return '#'; 
                    return url;
                  };
                  return (
                    <a 
                      key={idx} 
                      href={safeUrl(link.url)} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      title={link.platform}
                      className="social-icon"
                      style={{ backgroundColor: style.bg, color: style.text }}
                    >
                      {getSocialIcon(link.platform)}
                    </a>
                  );
                })
              )}
            </div>
          </div>

          {!settings?.hidden_sections?.includes('profile_basic') && (
            <div className="about-card">
              <h3 className="about-title">關於我</h3>
              <p className="about-text">{artist.bio || '這位繪師還沒有寫任何簡介。'}</p>
            </div>
          )}
        </div>

        <div className="main-content">
          {availableTabs.length > 0 ? (
            <>
              <div className="tabs-container">
                {availableTabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`tab-button ${currentTab === tab.id ? 'active' : ''}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div style={{ minHeight: '500px' }}>
                {currentTab === 'portfolio' && settings?.portfolio && (
                  <div className="portfolio-grid">
                    {settings.portfolio.map((img, idx) => (
                      <div 
                        key={idx} 
                        className="portfolio-item"
                        onClick={() => setSelectedImgIndex(idx)} 
                        style={{ cursor: 'zoom-in' }}
                      >
                        <img src={img} alt={`作品 ${idx + 1}`} />
                      </div>
                    ))}
                  </div>
                )}

                {currentTab === 'detailed_intro' && settings?.detailed_intro && (
                  <div className="rich-text-content" dangerouslySetInnerHTML={{ __html: settings.detailed_intro }} />
                )}
                {currentTab === 'process' && settings?.process && (
                  <div className="rich-text-content" dangerouslySetInnerHTML={{ __html: settings.process }} />
                )}
                {currentTab === 'payment' && settings?.payment && (
                  <div className="rich-text-content" dangerouslySetInnerHTML={{ __html: settings.payment }} />
                )}
                {currentTab === 'rules' && settings?.rules && (
                  <div className="rich-text-content" dangerouslySetInnerHTML={{ __html: settings.rules }} />
                )}
                {settings?.custom_sections?.map(sec => 
                  currentTab === sec.id && (
                    <div key={sec.id} className="rich-text-content" dangerouslySetInnerHTML={{ __html: sec.content }} />
                  )
                )}
              </div>
            </>
          ) : (
            <div className="empty-state">這位繪師的版塊皆為隱藏或尚未設定資訊。</div>
          )}
        </div>
      </div>

      {/* 🌟 燈箱元件 Lightbox */}
      {selectedImgIndex !== null && settings?.portfolio && (
        <div className="lightbox-overlay" onClick={() => setSelectedImgIndex(null)}>
          <button className="lightbox-close" onClick={() => setSelectedImgIndex(null)}>✕</button>
          
          <button className="lightbox-nav prev" onClick={handlePrevImg}>❮</button>
          
          <div className="lightbox-content">
            <img 
              src={settings.portfolio[selectedImgIndex]} 
              alt="放大預覽" 
              onClick={(e) => e.stopPropagation()} 
            />
            <div className="lightbox-counter">
              {selectedImgIndex + 1} / {settings.portfolio.length}
            </div>
          </div>
          
          <button className="lightbox-nav next" onClick={handleNextImg}>❯</button>
        </div>
      )}
    </div>
  );
}