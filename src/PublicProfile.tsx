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
  layout_type?: 'blog' | 'gallery';
  background_color?: string;
  theme_mode?: 'light' | 'dark';
}

interface ShowcaseItem {
  id: string;
  title: string;
  cover_url: string;
  price_info: string;
  tags: string[];
  description: string;
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
    case 'Facebook': return <SiFacebook size={size} color="#1877F2" />;
    case 'Twitter / X': return <SiX size={size} color="#000000" />;
    case 'Instagram': return <SiInstagram size={size} color="#E1306C" />;
    case 'Threads': return <SiThreads size={size} color="#000000" />;
    case 'Plurk': return <SiPlurk size={size} color="#FF574D" />;
    case '個人網站': default: return <Globe size={size} color="#333333" />;
  }
};

export function PublicProfile() {
  const { artistId } = useParams();
  const currentArtistId = (artistId?.startsWith('@') ? artistId.substring(1) : artistId) || '';

  const [artist, setArtist] = useState<any>(null);
  const [settings, setSettings] = useState<ProfileSettings | null>(null);
  const [showcaseItems, setShowcaseItems] = useState<ShowcaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 互動狀態
  const [activeTab, setActiveTab] = useState<string>('');
  const [activeTag, setActiveTag] = useState<string>('全部');
  const [selectedShowcase, setSelectedShowcase] = useState<ShowcaseItem | null>(null);
  const [selectedImgIndex, setSelectedImgIndex] = useState<number | null>(null);
  
  // 開場動畫狀態
  const [showSplash, setShowSplash] = useState(true);
  const [isSplashClosing, setIsSplashClosing] = useState(false);

  useEffect(() => {
    const fetchArtistData = async () => {
      if (!currentArtistId) return;
      try {
        const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
        
        // 取得繪師基本資料與設定
        const userRes = await fetch(`${API_BASE}/api/users/${currentArtistId}`);
        const userData = await userRes.json();
        
        // 取得公開的徵委託展示項目
        const showcaseRes = await fetch(`${API_BASE}/api/public/showcase/${currentArtistId}`);
        const showcaseData = await showcaseRes.json();

        if (userData.success && userData.data) {
          setArtist(userData.data);
          
          if (userData.data.profile_settings) {
            const decodedSettings = decodeHTML(userData.data.profile_settings);
            const parsedSettings = JSON.parse(decodedSettings);
            
            if ((userData.data.plan_type === 'free' || !userData.data.plan_type) && parsedSettings.portfolio) {
              parsedSettings.portfolio = parsedSettings.portfolio.slice(0, 6);
            }
            if (parsedSettings.splash_enabled === false) {
              setShowSplash(false);
            }
            setSettings(parsedSettings);
          } else {
            setShowSplash(false);
          }
        }

        if (showcaseData.success) {
          const formattedItems = showcaseData.data.map((item: any) => ({
            ...item,
            tags: typeof item.tags === 'string' ? JSON.parse(item.tags) : (item.tags || [])
          }));
          setShowcaseItems(formattedItems);
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
    if (!loading && settings?.splash_enabled !== false && showSplash) {
      const duration = settings?.splash_duration ? settings.splash_duration * 1000 : 2000;
      let removeTimer: ReturnType<typeof setTimeout>;
      const timer = setTimeout(() => {
        setIsSplashClosing(true);
        removeTimer = setTimeout(() => setShowSplash(false), 800);
      }, duration);
      return () => {
        clearTimeout(timer);
        if (removeTimer) clearTimeout(removeTimer);
      };
    }
  }, [loading, settings, showSplash]);

  // 動態提取所有存在的標籤
  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    showcaseItems.forEach(item => item.tags.forEach(t => tags.add(t)));
    return ['全部', ...Array.from(tags)];
  }, [showcaseItems]);

  // 過濾後的展示項目
  const filteredShowcaseItems = useMemo(() => {
    if (activeTag === '全部') return showcaseItems;
    return showcaseItems.filter(item => item.tags.includes(activeTag));
  }, [showcaseItems, activeTag]);

  // 舊版部落格模式的 Tab 邏輯
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
    
    // 增加這行：判斷若沒有隱藏且有項目，就加入分頁
    if (!isHidden('showcase') && showcaseItems.length > 0) tabs.push({ id: 'showcase', label: '徵委託項目' });

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
  }, [settings, showcaseItems]); // 記得在 dependency array 加入 showcaseItems

  const currentTab = activeTab || (availableTabs.length > 0 ? availableTabs[0].id : '');

  if (loading) return <div className="loading-state">載入中...</div>;
  if (!artist) return <div className="error-state">找不到該繪師的資料。</div>;

  // 定義主題與佈局
  const layoutType = settings?.layout_type || 'blog';
  const bgColor = settings?.background_color || '#F4F0EB';
  const isDarkText = settings?.theme_mode === 'light';
  const textColor = isDarkText ? '#333333' : '#FFFFFF';
  const secondaryTextColor = isDarkText ? '#555555' : '#DDDDDD';
  const cardBgColor = isDarkText ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0, 0, 0, 0.7)';

  return (
    <div 
      className={`public-profile-container layout-${layoutType}`}
      style={{
        background: `linear-gradient(135deg, ${bgColor}, rgba(0,0,0,0.15))`,
        color: textColor,
        minHeight: '100vh',
        transition: 'background 0.3s ease'
      }}
    >
      {/* 開場動畫 */}
      {showSplash && (
        <div 
          className={`splash-screen ${isSplashClosing ? 'hide' : ''}`}
          style={{
            backgroundImage: settings?.splash_image ? `url(${settings.splash_image})` : 'none',
            backgroundColor: settings?.splash_image ? '#000' : bgColor, 
            backgroundSize: 'cover', backgroundPosition: 'center', position: 'fixed',
            top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 10000,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            transition: 'opacity 0.8s, transform 0.8s'
          }}
        >
          <div style={{ backgroundColor: 'rgba(0, 0, 0, 0.45)', padding: '40px 60px', borderRadius: '16px', backdropFilter: 'blur(8px)', textAlign: 'center', color: '#FFF' }}>
            <h1>{settings?.splash_text || artist.display_name}</h1>
          </div>
        </div>
      )}

      <div className="content-wrapper" style={{ opacity: (showSplash && !isSplashClosing) ? 0 : 1, transition: 'opacity 0.5s' }}>
        
        {/* =========================================
            藝廊模式 (Gallery Layout)
            ========================================= */}
        {layoutType === 'gallery' ? (
          <div className="gallery-layout-inner">
            {/* 頂部繪師資訊區塊 */}
            <div className="gallery-header" style={{ borderBottom: `1px solid ${isDarkText ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.2)'}` }}>
              <img src={artist.avatar_url || '/default-avatar.png'} alt="Avatar" className="gallery-avatar" />
              <div className="gallery-info">
                <h1>{artist.display_name}</h1>
                <p style={{ color: secondaryTextColor }}>{artist.bio || '這名繪師還沒有寫下簡介。'}</p>
                <div className="social-links">
                  {settings?.social_links?.map((link, idx) => (
                    <a key={idx} href={link.url} target="_blank" rel="noreferrer" className="social-icon" style={{ backgroundColor: platformStyles[link.platform]?.bg }}>
                      {getSocialIcon(link.platform)}
                    </a>
                  ))}
                </div>
              </div>
            </div>

            {/* 標籤過濾區 */}
            {availableTags.length > 1 && (
              <div className="gallery-tag-filter">
                {availableTags.map(tag => (
                  <button 
                    key={tag} 
                    className={`tag-btn ${activeTag === tag ? 'active' : ''}`}
                    onClick={() => setActiveTag(tag)}
                    style={{
                      background: activeTag === tag ? textColor : 'transparent',
                      color: activeTag === tag ? bgColor : textColor,
                      border: `1px solid ${textColor}`
                    }}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            )}

            {/* 瀑布流徵委託卡片區 */}
            {settings?.hidden_sections?.includes('showcase') ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: secondaryTextColor }}>
                徵委託項目目前設定為隱藏。
              </div>
            ) : filteredShowcaseItems.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: secondaryTextColor }}>
                目前沒有符合的徵委託項目。
              </div>
            ) : (
              <div className="masonry-grid">
                {filteredShowcaseItems.map(item => (
                  <div key={item.id} className="masonry-item" onClick={() => setSelectedShowcase(item)}>
                    <img src={item.cover_url} alt={item.title} loading="lazy" />
                    
                    {/* 半透明浮動資訊框 */}
                    <div className="floating-info-box" style={{ background: cardBgColor, color: isDarkText ? '#333' : '#FFF' }}>
                      <div className="item-title">{item.title}</div>
                      <div className="item-price">{item.price_info}</div>
                      <div className="item-tags">
                        {item.tags.slice(0, 3).map(tag => (
                          <span key={tag}>#{tag}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
        /* =========================================
           傳統部落格模式 (Blog Layout)
           ========================================= */
          <>
            <div className="sidebar" style={{ background: isDarkText ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.4)' }}>
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
                <div className="about-card" style={{ color: textColor }}>
                  <h3 className="about-title" style={{ borderBottomColor: textColor }}>關於我</h3>
                  <p className="about-text">{artist.bio || '尚未填寫簡介。'}</p>
                </div>
              )}
            </div>

            <div className="main-content" style={{ background: isDarkText ? 'rgba(255,255,255,0.9)' : 'rgba(30,30,30,0.85)' }}>
              <div className="tabs-container">
                {availableTabs.map((tab: { id: string; label: string }) => (
                  <button 
                    key={tab.id} 
                    onClick={() => setActiveTab(tab.id)} 
                    className={`tab-button ${currentTab === tab.id ? 'active' : ''}`}
                    style={{ color: currentTab === tab.id ? (isDarkText ? '#000' : '#FFF') : secondaryTextColor }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="tab-content-area" style={{ color: isDarkText ? '#333' : '#EEE' }}>

                {/* 增加這段：渲染徵委託項目的瀑布流 */}
                {currentTab === 'showcase' && (
                  <div className="masonry-grid">
                    {filteredShowcaseItems.map(item => (
                      <div key={item.id} className="masonry-item" onClick={() => setSelectedShowcase(item)}>
                        <img src={item.cover_url} alt={item.title} loading="lazy" />
                        <div className="floating-info-box" style={{ background: cardBgColor, color: isDarkText ? '#333' : '#FFF' }}>
                          <div className="item-title">{item.title}</div>
                          <div className="item-price">{item.price_info}</div>
                          <div className="item-tags">
                            {item.tags.slice(0, 3).map(tag => (
                              <span key={tag}>#{tag}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {currentTab === 'portfolio' && (
                  <div className="portfolio-grid">
                    {settings?.portfolio.map((img, idx) => (
                      <div key={idx} className="portfolio-item" onClick={() => setSelectedImgIndex(idx)}>
                        <img src={img} alt="作品" loading="lazy" />
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
          </>
        )}
      </div>

      {/* =========================================
          互動彈窗區塊 (Modals)
          ========================================= */}
          
      {/* 展示項目詳情 Modal (藝廊模式用) */}
      {selectedShowcase && (
        <div className="lightbox-overlay showcase-modal" onClick={() => setSelectedShowcase(null)}>
          <button className="lightbox-close">✕</button>
          <div className="showcase-content-box" onClick={e => e.stopPropagation()} style={{ background: isDarkText ? '#FFF' : '#222', color: isDarkText ? '#333' : '#EEE' }}>
            <div className="showcase-cover">
              <img src={selectedShowcase.cover_url} alt={selectedShowcase.title} />
            </div>
            <div className="showcase-details">
              <h2>{selectedShowcase.title}</h2>
              <div className="modal-price">{selectedShowcase.price_info}</div>
              <div className="modal-tags">
                {selectedShowcase.tags.map(tag => (
                  <span key={tag} style={{ background: isDarkText ? '#F0ECE7' : '#444' }}>#{tag}</span>
                ))}
              </div>
              <div className="rich-text-content description" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(decodeHTML(selectedShowcase.description)) }} />
            </div>
          </div>
        </div>
      )}

      {/* 單張圖片放大 Modal (部落格模式用) */}
      {selectedImgIndex !== null && settings?.portfolio && (
        <div className="lightbox-overlay" onClick={() => setSelectedImgIndex(null)}>
          <button className="lightbox-close">✕</button>
          <button className="lightbox-nav prev" onClick={(e) => { e.stopPropagation(); setSelectedImgIndex((selectedImgIndex - 1 + settings.portfolio.length) % settings.portfolio.length); }}>❮</button>
          <div className="lightbox-content">
            <img src={settings.portfolio[selectedImgIndex]} alt="大圖預覽" onClick={(e) => e.stopPropagation()} />
            <div className="lightbox-counter">{selectedImgIndex + 1} / {settings.portfolio.length}</div>
          </div>
          <button className="lightbox-nav next" onClick={(e) => { e.stopPropagation(); setSelectedImgIndex((selectedImgIndex + 1) % settings.portfolio.length); }}>❯</button>
        </div>
      )}
    </div>
  );
}