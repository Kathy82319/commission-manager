// src/PublicProfile.tsx
import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import DOMPurify from 'dompurify'; 
import { SiFacebook, SiX, SiInstagram, SiThreads, SiPlurk } from '@icons-pack/react-simple-icons';
import { Globe } from 'lucide-react';
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
  'Facebook': { bg: '#dbdbdb', text: '#000' },
  'Plurk': { bg: '#dbdbdb', text: '#000' },
  'Twitter / X': { bg: '#dbdbdb', text: '#000' },
  'Threads': { bg: '#dbdbdb', text: '#000' },
  'Instagram': { bg: '#dbdbdb', text: '#000' },
  '個人網站': { bg: '#dbdbdb', text: '#000' }
};

const getSocialIcon = (platform: string) => {
  const size = 20; 
  switch (platform) {
    case 'Facebook':
      return <SiFacebook size={size} color="#1877F2" />;
    case 'Twitter / X':
      return <SiX size={size} color="#000000" />;
    case 'Instagram':
      return <SiInstagram size={size} color="#E1306C" />;
    case 'Threads':
      return <SiThreads size={size} color="#000000" />;
    case 'Plurk':
      return <SiPlurk size={size} color="#FF574D" />;
    case '個人網站':
    default:
      return <Globe size={size} color="#333333" />;
  }
};

export function PublicProfile() {
  const { artistId } = useParams();
  const currentArtistId = (artistId?.startsWith('@') ? artistId.substring(1) : artistId) || '';

  const [artist, setArtist] = useState<any>(null);
  const [settings, setSettings] = useState<ProfileSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('');
  
  // 🌟 預設為 true，但在 Fetch 結束時會立刻校正
  const [showSplash, setShowSplash] = useState(true);
  const [isSplashClosing, setIsSplashClosing] = useState(false);
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
            const decodedSettings = decodeHTML(data.data.profile_settings);
            const parsedSettings = JSON.parse(decodedSettings);
            
            if ((data.data.plan_type === 'free' || !data.data.plan_type) && parsedSettings.portfolio) {
              parsedSettings.portfolio = parsedSettings.portfolio.slice(0, 6);
            }
            
            // 🌟 關鍵修正：在停止 Loading 的同一刻，決定是否要顯示 Splash
            if (parsedSettings.splash_enabled === false) {
              setShowSplash(false);
            }
            setSettings(parsedSettings);
          } else {
            // 沒有設定檔也直接關閉 Splash
            setShowSplash(false);
          }
        }
      } catch (error) {
        console.error("讀取失敗", error);
        setShowSplash(false);
      } finally {
        setLoading(false);
      }
    };
    fetchArtistData();
  }, [currentArtistId]);

  useEffect(() => {
    // 只有在啟用且資料載入完成時才啟動計時器
    if (!loading && settings?.splash_enabled !== false && showSplash) {
      const duration = settings?.splash_duration ? settings.splash_duration * 1000 : 2000;
      let removeTimer: ReturnType<typeof setTimeout>;
      
      const timer = setTimeout(() => {
        setIsSplashClosing(true);
        removeTimer = setTimeout(() => {
          setShowSplash(false);
        }, 800);
      }, duration);

      return () => {
        clearTimeout(timer);
        if (removeTimer) clearTimeout(removeTimer);
      };
    }
  }, [loading, settings, showSplash]);

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
      {/* 開場動畫層 */}
      {showSplash && (
        <div 
          className={`splash-screen ${isSplashClosing ? 'hide' : ''}`}
          style={{
            backgroundImage: settings?.splash_image ? `url(${settings.splash_image})` : 'none',
            backgroundColor: settings?.splash_image ? '#000' : '#F4F0EB', 
            backgroundSize: 'cover', backgroundPosition: 'center', position: 'fixed',
            top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 10000,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            transition: 'opacity 0.8s cubic-bezier(0.4, 0, 0.2, 1), transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        >
          <div style={{ backgroundColor: 'rgba(0, 0, 0, 0.45)', padding: '40px 60px', borderRadius: '16px', backdropFilter: 'blur(8px)', textAlign: 'center', color: '#FFF' }}>
            <h1>{settings?.splash_text || artist.display_name}</h1>
          </div>
        </div>
      )}

      {/* 🌟 主內容層：當動畫正在顯示且尚未開始關閉時，將其隱藏 (避免閃爍) */}
      <div className="content-wrapper" style={{ opacity: (showSplash && !isSplashClosing) ? 0 : 1, transition: 'opacity 0.5s' }}>
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