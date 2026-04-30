// src/PublicProfile.tsx
import { useState, useEffect, useMemo } from 'react';
import { useParams, useOutletContext, Link } from 'react-router-dom';
import DOMPurify from 'dompurify'; 
import { SiFacebook, SiX, SiInstagram, SiThreads, SiPlurk } from '@icons-pack/react-simple-icons';
import { Globe, ChevronLeft, ChevronRight, X, User } from 'lucide-react';
import './styles/PublicProfile.css';

interface LayoutContext {
  setTheme: (theme: { primaryColor: string; textColor: 'white' | 'black' }) => void;
}

const decodeHTML = (html?: string) => {
  if (!html || typeof html !== 'string') return ''; 
  const txt = document.createElement("textarea");
  txt.innerHTML = html;
  return txt.value;
};

interface ProfileSettings {
  portfolio: string[];
  detailed_intro: string;
  process: string;
  payment: string;
  rules?: string; 
  custom_sections: { id?: string; title: string; content: string }[];
  social_links: { platform: string; url: string }[];
  hidden_sections: string[];
  splash_enabled?: boolean;
  splash_image?: string;
  splash_duration?: number;
  splash_text?: string;
  background_color?: string;
  gradient_enabled?: boolean;
  gradient_type?: string; 
  gradient_direction?: string;
  secondary_color?: string; 
  theme_mode?: 'light' | 'dark';
  queue_settings?: {
    enabled: boolean;
    show_client_name: boolean;
    show_client_id: boolean;
    show_project_name: boolean;
  };
}

interface ShowcaseItem {
  id: string;
  title: string;
  cover_url: string;
  price_info: string;
  tags: string[];
  description: string;
}

const getSocialIcon = (platform: string) => {
  const size = 18; 
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
  const { setTheme } = useOutletContext<LayoutContext>();
  const currentArtistId = artistId || '';

  const [artist, setArtist] = useState<any>(null);
  const [settings, setSettings] = useState<ProfileSettings | null>(null);
  const [showcaseItems, setShowcaseItems] = useState<ShowcaseItem[]>([]);
  const [publicQueue, setPublicQueue] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>(['全部']);
  const [selectedShowcase, setSelectedShowcase] = useState<ShowcaseItem | null>(null);
  const [selectedImgIndex, setSelectedImgIndex] = useState<number | null>(null);
  
  const [showSplash, setShowSplash] = useState(true);
  const [isSplashClosing, setIsSplashClosing] = useState(false);

  const backgroundStyle = useMemo(() => {
    const baseColor = settings?.background_color || '#f4f0eb67';
    if (settings?.gradient_enabled) {
      const direction = settings.gradient_direction || 'to bottom right';
      return { background: `linear-gradient(${direction}, ${baseColor}, #00000015)` };
    }
    return { background: baseColor };
  }, [settings]);

  const splashBgStyle = useMemo(() => {
    if (settings?.splash_image) {
      return { 
        backgroundImage: `url(${settings.splash_image})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      };
    }
    return backgroundStyle;
  }, [settings?.splash_image, backgroundStyle]);

  useEffect(() => {
    if (settings) {
      setTheme({
        primaryColor: settings.background_color || '#F4F0EB',
        textColor: settings.theme_mode === 'light' ? 'black' : 'white'
      });
    }
  }, [settings, setTheme]);

  useEffect(() => {
    const fetchArtistData = async () => {
      if (!currentArtistId) return;
      try {
        const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
        const userRes = await fetch(`${API_BASE}/api/users/${currentArtistId}`);
        const userData = await userRes.json();
        const showcaseRes = await fetch(`${API_BASE}/api/public/showcase/${currentArtistId}`);
        const showcaseData = await showcaseRes.json();

        if (userData.success && userData.data) {
          setArtist(userData.data);
          let parsedSettings: any = null;
          
          if (userData.data.profile_settings) {
            try {
              const rawSettings = userData.data.profile_settings;
              parsedSettings = typeof rawSettings === 'string' ? JSON.parse(rawSettings) : rawSettings;
              if (parsedSettings.splash_enabled === false) setShowSplash(false);
              setSettings(parsedSettings);
            } catch (e) {
              console.error("JSON 解析失敗:", e);
              setShowSplash(false);
            }
          } else {
            setShowSplash(false);
          }

          if (parsedSettings?.queue_settings?.enabled) {
            try {
              const queueRes = await fetch(`${API_BASE}/api/public/queue/${currentArtistId}`);
              const queueData = await queueRes.json();
              if (queueData.success) {
                setPublicQueue(queueData.data);
              }
            } catch (e) {
              console.error('無法讀取排單表資料');
            }
          }
        }

        if (showcaseData.success) {
          const formattedItems = (showcaseData.data || []).map((item: any) => {
            let safeTags: string[] = [];
            try {
              if (Array.isArray(item.tags)) {
                safeTags = item.tags;
              } else if (typeof item.tags === 'string' && item.tags.trim() !== '') {
                const parsed = JSON.parse(item.tags);
                safeTags = Array.isArray(parsed) ? parsed : [];
              }
            } catch (e) { safeTags = []; }
            return { ...item, tags: safeTags };
          });
          setShowcaseItems(formattedItems);
        }
      } catch (error) {
        console.error("載入 API 發生錯誤:", error);
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

  
  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    showcaseItems.forEach(item => {
      if (Array.isArray(item.tags)) {
        item.tags.forEach(t => { if (t) tags.add(t); });
      }
    });
    return ['全部', ...Array.from(tags)];
  }, [showcaseItems]);

  const handleTagClick = (tag: string) => {
    setSelectedTags(prev => {
      if (tag === '全部') return ['全部'];
      const filters = prev.filter(t => t !== '全部');
      if (filters.includes(tag)) {
        const next = filters.filter(t => t !== tag);
        return next.length === 0 ? ['全部'] : next;
      }
      return [...filters, tag];
    });
  };

  const filteredShowcaseItems = useMemo(() => {
    if (selectedTags.includes('全部')) return showcaseItems;
    return showcaseItems.filter(item => 
      Array.isArray(item.tags) && item.tags.some(tag => selectedTags.includes(tag))
    );
  }, [showcaseItems, selectedTags]);

  const availableTabs = useMemo(() => {
    if (!settings) return [];
    const tabs = [];
    const isHidden = (id: string) => settings.hidden_sections?.includes(id) || false;
    
    if (!isHidden('portfolio') && settings.portfolio?.length > 0) tabs.push({ id: 'portfolio', label: '作品展示' });
    if (!isHidden('showcase') && showcaseItems.length > 0) tabs.push({ id: 'showcase', label: '徵稿/販售項目' });
    if (!isHidden('detailed_intro') && settings.detailed_intro) tabs.push({ id: 'detailed_intro', label: '詳細介紹' });
    if (!isHidden('process') && settings.process) tabs.push({ id: 'process', label: '委託流程' });
    if (!isHidden('payment') && settings.payment) tabs.push({ id: 'payment', label: '付款方式' });
    
    if (settings.queue_settings?.enabled) {
      tabs.push({ id: 'queue', label: '排單狀況' });
    }

    if (Array.isArray(settings.custom_sections)) {
      settings.custom_sections.forEach((sec, index) => {
        const generatedId = `custom_${index}`; 
        if (!isHidden(generatedId) && sec.content) {
          tabs.push({ id: generatedId, label: sec.title || `區塊 ${index + 1}` });
        }
      });
    }
    return tabs;
  }, [settings, showcaseItems]);

  const currentTab = activeTab || (availableTabs.length > 0 ? availableTabs[0].id : '');
  const isWideTab = ['portfolio', 'showcase', 'queue'].includes(currentTab); 

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

  // 🌟 動態色彩計算區塊：根據深淺色文字設定對應的透明度框線、底色
  const isDarkText = settings?.theme_mode === 'light';
  const textColor = isDarkText ? '#333333' : '#FFFFFF';
  const borderColor = isDarkText ? 'rgba(0, 0, 0, 0.15)' : 'rgba(255, 255, 255, 0.2)';
  const sectionBg = isDarkText ? 'rgba(0, 0, 0, 0.03)' : 'rgba(255, 255, 255, 0.05)';
  const badgeBg = isDarkText ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.15)';

  return (
    <div className={`public-profile-container theme-${settings?.theme_mode || 'dark'}`} style={{ ...backgroundStyle, minHeight: '100vh' }}>
      {showSplash && (
        <div className={`splash-screen ${isSplashClosing ? 'hide' : ''}`} style={splashBgStyle}>
          <div className="splash-box">
            <h1 style={{ color: textColor }}>{settings?.splash_text || artist.display_name}</h1>
          </div>
        </div>
      )}

      <div className="profile-layout-root" style={{ opacity: (showSplash && !isSplashClosing) ? 0 : 1 }}>
        <aside className="profile-sidebar" style={{ color: textColor, background: 'transparent' }}>
          <div className="sidebar-top">
            <div className="avatar-section">
              {artist.avatar_url ? (
                <img src={artist.avatar_url} alt="Avatar" className="profile-avatar" />
              ) : (
                <div className="profile-avatar default-avatar-placeholder" style={{ backgroundColor: '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8' }}>
                  <User size={48} strokeWidth={1.5} />
                </div>
              )}
            </div>
            
            <div className="name-social-section">
              <h1 className="profile-name">{artist.display_name}</h1>
              <div className="social-links">
                {settings?.social_links?.map((link, idx) => (
                  <a key={idx} href={link.url} target="_blank" rel="noreferrer" className="social-icon">
                    {getSocialIcon(link.platform)}
                  </a>
                ))}
              </div>
            </div>
          </div>

          <div className="sidebar-bottom">
            <div className="bio-section">
              <p className="profile-bio" style={{ color: textColor }}>
                {artist.bio || '這名繪師還沒有寫下簡介。'}
              </p>
            </div>

            <nav className="sidebar-nav">
              {availableTabs.map((tab: any) => (
                <button 
                  key={tab.id} 
                  onClick={() => setActiveTab(tab.id)} 
                  className={`nav-item ${currentTab === tab.id ? 'active' : ''}`}
                  style={{ color: textColor }}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        <main className="profile-main-content" style={{ background: 'transparent' }}>
          <div className={`tab-inner-wrapper ${isWideTab ? 'layout-wide' : 'layout-narrow'}`}>
            <div className="tab-content-area">
              
              {/* 🌟 套用 textColor 確保表格文字強制隨主題變色，並使用動態背景 */}
              {currentTab === 'queue' && settings?.queue_settings && (
                <div className="public-queue-section" style={{ background: sectionBg, padding: '20px', borderRadius: '12px', color: textColor }}>
                  <h2 style={{ marginTop: 0, marginBottom: '20px', fontSize: '18px', borderBottom: `1px solid ${borderColor}`, paddingBottom: '10px' }}>目前排單狀況</h2>
                  {publicQueue.length === 0 ? (
                    <p style={{ color: textColor, opacity: 0.7, textAlign: 'center', padding: '40px 0' }}>目前尚無公開的排單資訊。</p>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px', color: textColor }}>
                        <thead>
                          <tr style={{ borderBottom: `2px solid ${borderColor}` }}>
                            <th style={{ padding: '12px 8px' }}>委託人</th>
                            <th style={{ padding: '12px 8px' }}>項目名稱</th>
                            <th style={{ padding: '12px 8px' }}>當前進度</th>
                            <th style={{ padding: '12px 8px' }}>預計完工</th>
                          </tr>
                        </thead>
                        <tbody>
                          {publicQueue.map((order) => (
                            <tr key={order.id} style={{ borderBottom: `1px solid ${borderColor}` }}>
                              <td style={{ padding: '12px 8px' }}>
                                <div style={{ fontWeight: 'bold' }}>
                                  {settings.queue_settings!.show_client_name && order.contact_memo ? order.contact_memo : '匿名委託'}
                                </div>
                                {settings.queue_settings!.show_client_id && order.client_public_id && (
                                  <div style={{ fontSize: '12px', opacity: 0.7 }}>{order.client_public_id}</div>
                                )}
                              </td>
                              <td style={{ padding: '12px 8px' }}>
                                {settings.queue_settings!.show_project_name && order.project_name ? order.project_name : '私人委託項目'}
                              </td>
                              <td style={{ padding: '12px 8px' }}>
                                <span style={{ padding: '4px 8px', background: badgeBg, borderRadius: '4px' }}>{order.queue_status || '處理中'}</span>
                              </td>
                              <td style={{ padding: '12px 8px', opacity: 0.8 }}>
                                {order.end_date ? order.end_date.substring(5).replace('-', '/') : '未定'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {currentTab === 'showcase' && (
                <div className="showcase-section">
                  {availableTags.length > 1 && (
                    <div className="tag-filter-bar">
                      {availableTags.map(tag => {
                        const isSelected = selectedTags.includes(tag);
                        return (
                          <button key={tag} className={`tag-btn ${isSelected ? 'active' : ''}`} onClick={() => handleTagClick(tag)}>
                            {tag}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  <div className="masonry-grid">
                    {filteredShowcaseItems.map(item => (
                      <div key={item.id} className="masonry-item" onClick={() => setSelectedShowcase(item)}>
                        <img src={item.cover_url} alt={item.title} loading="lazy" />
                        <div className="floating-info-box">
                          <div className="item-title">{item.title}</div>
                          <div className="item-price">${item.price_info}</div>
                        </div>
                      </div>
                    ))}
                  </div>
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
              
              {['detailed_intro', 'process', 'payment'].includes(currentTab) && settings && (
                <div className="rich-text-content" 
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(decodeHTML(settings[currentTab as keyof ProfileSettings] as any)) }} />
              )}

              {Array.isArray(settings?.custom_sections) && settings.custom_sections.map((sec, index) => {
                const generatedId = `custom_${index}`;
                return currentTab === generatedId && (
                  <div key={generatedId} className="rich-text-content" 
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(decodeHTML(sec.content || '')) }} />
                );
              })}
            </div>

            <footer className="profile-internal-footer">
              <div className="footer-links" style={{ color: isDarkText ? '#888' : 'rgba(255,255,255,0.6)' }}>
                <span>|</span>
                <Link to="/terms">服務條款</Link>
                <span>|</span>
                <Link to="/privacy">隱私權政策</Link>
                <span>|</span>
                <Link to="/refund-policy">退款政策</Link>
              </div>
            </footer>
          </div>
        </main>
      </div>

      {selectedShowcase && (
        <div className="lightbox-overlay showcase-modal-overlay" onClick={() => setSelectedShowcase(null)}>
          <button className="lightbox-close" onClick={() => setSelectedShowcase(null)}><X size={32}/></button>
          <div className="showcase-content-box" onClick={e => e.stopPropagation()}>
            <div className="showcase-cover">
              <img src={selectedShowcase.cover_url} alt={selectedShowcase.title} />
            </div>
            <div className="showcase-details">
              
              <div className="showcase-header">
                <h2>{selectedShowcase.title}</h2>
                {selectedShowcase.price_info && (
                 <div className="modal-price">${selectedShowcase.price_info}</div>
                )}
              </div>

              {Array.isArray(selectedShowcase.tags) && selectedShowcase.tags.length > 0 && (
                <div className="modal-tags">
                  {selectedShowcase.tags.map(tag => (
                    <span key={tag} className="tag-chip">#{tag}</span>
                  ))}
                </div>
              )}

              <div className="description-scroll-area">
                <div 
                  className="rich-text-content description" 
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(decodeHTML(selectedShowcase.description)) }} 
                />
              </div>

            </div>
          </div>
        </div>
      )}

      {selectedImgIndex !== null && settings?.portfolio && (
        <div className="lightbox-overlay" onClick={() => setSelectedImgIndex(null)}>
          <button className="lightbox-close" onClick={() => setSelectedImgIndex(null)}><X size={32}/></button>
          <button className="lightbox-nav prev" onClick={handlePrevImg}><ChevronLeft size={48}/></button>
          <div className="lightbox-content" onClick={e => e.stopPropagation()}>
            <img src={settings.portfolio[selectedImgIndex]} alt="大圖預覽" />
          </div>
          <button className="lightbox-nav next" onClick={handleNextImg}><ChevronRight size={48}/></button>
        </div>
      )}
    </div>
  );
}