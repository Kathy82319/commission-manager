// src/PublicProfile.tsx
import { useState, useEffect, useMemo } from 'react'; // 🌟 修正 1：補上 useMemo
import { useParams } from 'react-router-dom';
import DOMPurify from 'dompurify'; 
import './styles/PublicProfile.css';

const decodeHTML = (html?: string) => {
  if (!html) return '';
  const txt = document.createElement("textarea");
  txt.innerHTML = html;
  return txt.value;
};

interface ProfileSettings {
  portfolio: string[];
  detailed_intro: string;
  process: string;
  payment: string;
  rules: string;
  custom_sections: { id: string; title: string; content: string }[];
  social_links: { platform: string; url: string }[];
  hidden_sections: string[];
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
    default:
      return <svg {...props}><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>;
  }
};

export function PublicProfile() {
  const { artistId } = useParams();
  const currentArtistId = (artistId?.startsWith('@') ? artistId.substring(1) : artistId) || '';

  const [artist, setArtist] = useState<any>(null);
  const [settings, setSettings] = useState<ProfileSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('');
  const [showSplash, setShowSplash] = useState(true);
  const [selectedImgIndex, setSelectedImgIndex] = useState<number | null>(null);

  useEffect(() => {
    const fetchArtistData = async () => {
      if (!currentArtistId) return;
      try {
        const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
        const res = await fetch(`${API_BASE}/api/users/${currentArtistId}`);
        const data = await res.json();
        if (data.success && data.data) {
          setArtist(data.data);
          if (data.data.profile_settings) {
            try {
              const decodedSettings = decodeHTML(data.data.profile_settings);
              const parsedSettings = JSON.parse(decodedSettings);
              if ((data.data.plan_type === 'free' || !data.data.plan_type) && parsedSettings.portfolio) {
                parsedSettings.portfolio = parsedSettings.portfolio.slice(0, 6);
              }
              setSettings(parsedSettings);
            } catch (e) {
              console.error("解析失敗");
            }
          }
        }
      } catch (error) {
        console.error("讀取失敗", error);
      } finally {
        setLoading(false);
      }
    };
    fetchArtistData();
  }, [currentArtistId]);

  useEffect(() => {
    if (!loading && artist) {
      if (settings?.splash_enabled === false) {
        setShowSplash(false);
        return;
      }
      const duration = settings?.splash_duration ? settings.splash_duration * 1000 : 2000;
      const timer = setTimeout(() => setShowSplash(false), duration);
      return () => clearTimeout(timer);
    }
  }, [loading, settings, artist]);

  // 🌟 修正 2：為 tab 加上明確型別 (tab: { id: string; label: string })
  const availableTabs = useMemo(() => {
    if (!settings) return [];
    const tabs = [];
    const isHidden = (id: string) => settings.hidden_sections?.includes(id) || false;
    const hasContent = (html: string) => {
      if (!html) return false;
      const stripped = html.replace(/<[^>]*>?/gm, '').trim();
      return stripped.length > 0 || html.includes('<img'); 
    };

    if (!isHidden('portfolio') && settings.portfolio?.length > 0) tabs.push({ id: 'portfolio', label: '作品展示' });
    if (!isHidden('detailed_intro') && hasContent(settings.detailed_intro)) tabs.push({ id: 'detailed_intro', label: '詳細介紹' });
    if (!isHidden('process') && hasContent(settings.process)) tabs.push({ id: 'process', label: '委託流程' });
    if (!isHidden('payment') && hasContent(settings.payment)) tabs.push({ id: 'payment', label: '付款方式' });
    if (!isHidden('rules') && hasContent(settings.rules)) tabs.push({ id: 'rules', label: '委託規範' });
    
    if (settings.custom_sections) {
      settings.custom_sections.forEach(sec => {
        if (!isHidden(sec.id) && hasContent(sec.content)) tabs.push({ id: sec.id, label: sec.title || '未命名區塊' });
      });
    }
    return tabs;
  }, [settings]);

  const currentTab = activeTab || (availableTabs.length > 0 ? availableTabs[0].id : '');

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

  if (loading) return <div className="loading-state">載入中...</div>;
  if (!artist) return <div className="error-state">找不到該繪師的資料。</div>;

  return (
    <div className="public-profile-container">
      {showSplash && (
        <div 
          className="splash-screen"
          style={{
            backgroundImage: settings?.splash_image ? `url(${settings.splash_image})` : 'none',
            backgroundColor: settings?.splash_image ? '#000' : '#F4F0EB', 
            backgroundSize: 'cover', backgroundPosition: 'center', position: 'fixed',
            top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 10000,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
          }}
        >
          <div style={{ backgroundColor: 'rgba(0, 0, 0, 0.45)', padding: '40px 60px', borderRadius: '16px', backdropFilter: 'blur(8px)', textAlign: 'center', color: '#FFF' }}>
            <h1>{settings?.splash_text || artist.display_name}</h1>
          </div>
        </div>
      )}

      <div className="content-wrapper">
        <div className="sidebar">
          <div className="avatar-container">
            <img src={artist.avatar_url || '/default-avatar.png'} alt="Avatar" className="avatar-image" />
          </div>
          <h1 className="artist-name">{artist.display_name}</h1>
          <div className="social-links">
            {settings?.social_links?.map((link, idx) => (
              <a key={idx} href={link.url} target="_blank" rel="noreferrer" className="social-icon" style={{ backgroundColor: platformStyles[link.platform]?.bg }}>
                {getSocialIcon(link.platform)}
              </a>
            ))}
          </div>
          {!settings?.hidden_sections?.includes('profile_basic') && (
            <div className="about-card">
              <h3 className="about-title">關於我</h3>
              <p className="about-text">{artist.bio || '尚未填寫簡介。'}</p>
            </div>
          )}
        </div>

        <div className="main-content">
          <div className="tabs-container">
            {availableTabs.map((tab: { id: string; label: string }) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`tab-button ${currentTab === tab.id ? 'active' : ''}`}>
                {tab.label}
              </button>
            ))}
          </div>

          <div className="tab-content-area">
            {currentTab === 'portfolio' && (
              <div className="portfolio-grid">
                {settings?.portfolio.map((img, idx) => (
                  <div key={idx} className="portfolio-item" onClick={() => setSelectedImgIndex(idx)}>
                    <img src={img} alt="作品" />
                  </div>
                ))}
              </div>
            )}
            
            {/* 🌟 核心防護：渲染內容前，DOMPurify 依然保護著您 */}
            {['detailed_intro', 'process', 'payment', 'rules'].includes(currentTab) && settings && (
              <div className="rich-text-content" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(decodeHTML(settings[currentTab as keyof ProfileSettings] as any)) }} />
            )}

            {settings?.custom_sections?.map(sec => 
              currentTab === sec.id && (
                <div key={sec.id} className="rich-text-content" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(decodeHTML(sec.content)) }} />
              )
            )}
          </div>
        </div>
      </div>

      {/* 🌟 修正 3：確保 selectedImgIndex 被讀取使用 */}
      {selectedImgIndex !== null && settings?.portfolio && (
        <div className="lightbox-overlay" onClick={() => setSelectedImgIndex(null)}>
          <button className="lightbox-close">✕</button>
          <button className="lightbox-nav prev" onClick={handlePrevImg}>❮</button>
          <div className="lightbox-content">
            <img src={settings.portfolio[selectedImgIndex]} alt="大圖預覽" onClick={(e) => e.stopPropagation()} />
            <div className="lightbox-counter">{selectedImgIndex + 1} / {settings.portfolio.length}</div>
          </div>
          <button className="lightbox-nav next" onClick={handleNextImg}>❯</button>
        </div>
      )}
    </div>
  );
}