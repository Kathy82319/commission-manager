import { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import DOMPurify from 'dompurify'; 
import { ChevronLeft, ChevronRight, X, Image as ImageIcon, Info } from 'lucide-react';
import { OCDetailCard } from './components/OC/OCDetailCard';
import { ProfileSidebar } from './components/PublicProfile/ProfileSidebar';
import { ShowcaseModal } from './components/PublicProfile/ShowcaseModal';
import './styles/PublicProfile.css'; 
import './components/PublicProfile/styles/ShowcaseGrid.css'; 

const decodeHTML = (html?: string) => {
  if (!html || typeof html !== 'string') return ''; 
  const txt = document.createElement("textarea");
  txt.innerHTML = html;
  return txt.value;
};

export function PublicProfile() {
  const { artistId } = useParams();
  const currentArtistId = artistId || '';

  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') || '';
  const showcaseIdParam = searchParams.get('showcaseId') || '';

  const [artist, setArtist] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [showcaseItems, setShowcaseItems] = useState<any[]>([]);
  const [publicQueue, setPublicQueue] = useState<any[]>([]); 
  const [publicReviews, setPublicReviews] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);
  
  const [selectedTags, setSelectedTags] = useState<string[]>(['全部']);
  const [selectedShowcase, setSelectedShowcase] = useState<any | null>(null);
  const [selectedImgIndex, setSelectedImgIndex] = useState<number | null>(null);
  
  const [showSplash, setShowSplash] = useState(false);
  const [isSplashClosing, setIsSplashClosing] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches
  );

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const handler = (e: MediaQueryListEvent) => setIsMobileViewport(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const [viewerId, setViewerId] = useState<string | null>(null);
  const [relationStatus, setRelationStatus] = useState<'none' | 'favorite' | 'blacklist'>('none');
  const [isViewerLoading, setIsViewerLoading] = useState(true); 

  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const [publicOCs, setPublicOCs] = useState<any[]>([]);
  const [activeOCId, setActiveOCId] = useState<string | null>(null);

  const [showRulesModal, setShowRulesModal] = useState(false);

  useEffect(() => {
    const role = localStorage.getItem('user_role'); 
    setIsLoggedIn(!!role);
  }, []);

  const handleLogout = async () => {
    const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
    try { await fetch(`${API_BASE}/api/auth/logout`, { method: 'POST', credentials: 'include' }); } catch (e) {}
    localStorage.removeItem('user_role');
    localStorage.removeItem('is_logged_in');
    localStorage.removeItem('last_active_role');
    window.location.reload();
  };

  const handleDashboardClick = () => {
    const lastActiveRole = localStorage.getItem('last_active_role') || localStorage.getItem('user_role');
    if (lastActiveRole === 'artist') navigate('/artist/queue');
    else if (lastActiveRole === 'client') navigate('/client/orders');
    else navigate('/portal');
  };

  const backgroundStyle = useMemo(() => {
    const baseColor = settings?.background_color || '#041b35';    
    const isGradient = settings?.gradient_enabled !== false;    
    if (isGradient) {
      const direction = settings?.gradient_direction || 'to top';
      return { background: `linear-gradient(${direction}, ${baseColor}, #00000015)`, backgroundAttachment: 'fixed' };
    }
    return { background: baseColor, backgroundAttachment: 'fixed' };
  }, [settings]);

  const splashBgStyle = useMemo(() => {
    const image = (isMobileViewport && settings?.splash_image_mobile)
      ? settings.splash_image_mobile
      : settings?.splash_image;
    if (image) {
      return { backgroundImage: `url(${image})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' };
    }
    return backgroundStyle;
  }, [settings?.splash_image, settings?.splash_image_mobile, isMobileViewport, backgroundStyle]);

  useEffect(() => {
    const fetchArtistData = async () => {
      if (!currentArtistId) return;
      try {
        const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
        const [userRes, showcaseRes, ocRes, reviewRes] = await Promise.all([
          fetch(`${API_BASE}/api/users/${currentArtistId}`),
          fetch(`${API_BASE}/api/public/showcase/${currentArtistId}`),
          fetch(`${API_BASE}/api/public/oc/${currentArtistId}`),
          fetch(`${API_BASE}/api/reviews/public/${currentArtistId}`) 
        ]);

        const userData = await userRes.json();
        const showcaseData = await showcaseRes.json();
        const ocData = await ocRes.json();
        const reviewData = await reviewRes.json();

        if (reviewData.success) {
          setPublicReviews(reviewData.data || []);
        }

        if (userData.success && userData.data) {
          setArtist(userData.data);
          let parsedSettings: any = null;
          
          if (userData.data.profile_settings) {
            try {
              const rawSettings = userData.data.profile_settings;
              parsedSettings = typeof rawSettings === 'string' ? JSON.parse(rawSettings) : rawSettings;
              setSettings(parsedSettings);
              if (parsedSettings.splash_enabled === true) {
                const isMobile = window.matchMedia('(max-width: 768px)').matches;
                const imageUrl = (isMobile && parsedSettings.splash_image_mobile)
                  ? parsedSettings.splash_image_mobile
                  : parsedSettings.splash_image;
                if (imageUrl) {
                  await new Promise<void>(resolve => {
                    const img = new window.Image();
                    img.onload = () => resolve();
                    img.onerror = () => resolve();
                    setTimeout(resolve, 2000);
                    img.src = imageUrl;
                  });
                }
                setShowSplash(true);
              }
            } catch (e) { setShowSplash(false); }
          } else setShowSplash(false);

          if (parsedSettings?.queue_settings?.enabled) {
            try {
              let list = parsedSettings.queue_settings.snapshot_data || [];
              const customOrder = parsedSettings.queue_settings.custom_order || [];
              
              if (customOrder.length > 0) {
                list.sort((a: any, b: any) => {
                  const idxA = customOrder.indexOf(a.id);
                  const idxB = customOrder.indexOf(b.id);
                  const timeA = new Date(a.order_date || 0).getTime();
                  const timeB = new Date(b.order_date || 0).getTime();
                  if (idxA === -1 && idxB === -1) return timeA - timeB;
                  if (idxA === -1) return 1;
                  if (idxB === -1) return -1;
                  return idxA - idxB;
                });
              } else {
                list.sort((a: any, b: any) => new Date(a.order_date || 0).getTime() - new Date(b.order_date || 0).getTime());
              }
              setPublicQueue(list);
            } catch (e) {}
          }
        }

        if (showcaseData.success) {
          const formattedItems = (showcaseData.data || []).map((item: any) => {
            let safeTags: string[] = [];
            try {
              if (Array.isArray(item.tags)) safeTags = item.tags;
              else if (typeof item.tags === 'string' && item.tags.trim() !== '') {
                const parsed = JSON.parse(item.tags);
                safeTags = Array.isArray(parsed) ? parsed : [];
              }
            } catch (e) {}
            let parsedImages: string[] = [];
if (item.cover_url) {
  try {
    if (item.cover_url.startsWith('[')) {
      const imgArr = JSON.parse(item.cover_url);
      parsedImages = Array.isArray(imgArr) ? imgArr : [item.cover_url];
    } else {
      parsedImages = [item.cover_url];
    }
  } catch (e) {
    parsedImages = [item.cover_url];
  }
}
return {
  ...item,
  tags: safeTags,
  images: parsedImages,
  cover_url: parsedImages[0] || item.cover_url || ''
};
          });
          setShowcaseItems(formattedItems);
        }

        if (ocData.success) {
          const formattedOCs = (ocData.data || []).map((oc: any) => ({
            ...oc,
            images: typeof oc.images === 'string' ? JSON.parse(oc.images || '[]') : (oc.images || []),
          }));
          setPublicOCs(formattedOCs);
          if (formattedOCs.length > 0) setActiveOCId(formattedOCs[0].id);
        }

      } catch (error) { setShowSplash(false); } finally { setLoading(false); }
    };
    fetchArtistData();
  }, [currentArtistId]);

  useEffect(() => {
    const fetchViewerAndRelations = async () => {
      setIsViewerLoading(true); 
      const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
      try {
        const res = await fetch(`${API_BASE}/api/users/me`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data) {
            setViewerId(data.data.id);
            const relRes = await fetch(`${API_BASE}/api/relations`, { credentials: 'include' });
            const relData = await relRes.json();
            if (relData.success) {
              const myRel = relData.data.find((r: any) => r.target_user_id === artist?.id);
              if (myRel) setRelationStatus(myRel.relation_type);
            }
          }
        }
      } catch (e) {} finally { setIsViewerLoading(false); }
    };
    if (artist && artist.id) fetchViewerAndRelations();
  }, [artist]);

  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    showcaseItems.forEach(item => { 
      if (Array.isArray(item.tags)) {
        item.tags.forEach((t: string) => { if (t) tags.add(t); }); 
      }
    });
    return ['全部', ...Array.from(tags)];
  }, [showcaseItems]);

  const handleTagClick = (tag: string) => {
    setSelectedTags(prev => {
      if (tag === '全部') return ['全部'];
      const filters = prev.filter(t => t !== '全部');
      if (filters.includes(tag)) return filters.filter(t => t !== tag).length === 0 ? ['全部'] : filters.filter(t => t !== tag);
      return [...filters, tag];
    });
  };

  const filteredShowcaseItems = useMemo(() => {
    if (selectedTags.includes('全部')) return showcaseItems;
    return showcaseItems.filter(item => 
      Array.isArray(item.tags) && item.tags.some((tag: string) => selectedTags.includes(tag))
    );
  }, [showcaseItems, selectedTags]);

  const availableTabs = useMemo(() => {
    const tabs: any[] = [];
    const isHidden = (id: string) => settings?.hidden_sections?.includes(id) || false;
    const isFreePlan = artist?.plan_type === 'free' || !artist?.plan_type;

    if (settings) {
      if (!isHidden('portfolio') && settings.portfolio?.length > 0) tabs.push({ id: 'portfolio', label: '作品展示' });
      if (!isHidden('detailed_intro') && settings.detailed_intro) tabs.push({ id: 'detailed_intro', label: '詳細介紹' });
      if (!isHidden('queue') && settings.queue_settings?.enabled) tabs.push({ id: 'queue', label: '排單狀況' });
    }
    if (!isHidden('showcase') && showcaseItems.length > 0) tabs.push({ id: 'showcase', label: '接委託展示區' });
    if (!isHidden('oc') && publicOCs.length > 0) tabs.push({ id: 'oc', label: '角色設定' });

    if (!isHidden('reviews') && publicReviews.length > 0) tabs.push({ id: 'reviews', label: '精選評價' });

    if (settings && !isFreePlan) {
      if (Array.isArray(settings.custom_sections)) {
        settings.custom_sections.forEach((sec: any) => {
          if (!isHidden(sec.id) && sec.content) tabs.push({ id: sec.id, label: sec.title || '自訂分頁' });
        });
      }
    }

    if (settings?.tab_order && Array.isArray(settings.tab_order)) {
      tabs.sort((a, b) => {
        const indexA = settings.tab_order.indexOf(a.id);
        const indexB = settings.tab_order.indexOf(b.id);
        
        if (indexA === -1 && indexB === -1) return 0;
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        
        return indexA - indexB;
      });
    }

    return tabs;
  }, [settings, showcaseItems, artist, publicOCs, publicReviews]);

  const currentTab = useMemo(() => {
    if (showcaseIdParam && availableTabs.some(t => t.id === 'showcase')) return 'showcase';
    return tabParam || (availableTabs.length > 0 ? availableTabs[0].id : '');
  }, [tabParam, showcaseIdParam, availableTabs]);

  const handleTabChange = (tabId: string) => {
    setSearchParams(prev => { prev.set('tab', tabId); return prev; });
  };

  useEffect(() => {
    if (showcaseIdParam && showcaseItems.length > 0) {
      setSelectedShowcase(showcaseItems.find(item => item.id === showcaseIdParam) || null);
    } else { setSelectedShowcase(null); }
  }, [showcaseIdParam, showcaseItems]);

  const isWideTab = ['portfolio', 'showcase', 'queue', 'oc'].includes(currentTab); 

  useEffect(() => {
    if (!loading && settings?.splash_enabled !== false && showSplash) {
      const duration = settings?.splash_duration ? settings.splash_duration * 1000 : 2000;
      let removeTimer: ReturnType<typeof setTimeout>;
      const timer = setTimeout(() => {
        setIsSplashClosing(true);
        removeTimer = setTimeout(() => setShowSplash(false), 800);
      }, duration);
      return () => { clearTimeout(timer); if (removeTimer) clearTimeout(removeTimer); };
    }
  }, [loading, settings, showSplash]);

  const handleToggleRelation = async (type: 'favorite' | 'blacklist') => {
    if (!viewerId) return alert("請先登入系統後再進行操作喔！");
    if (viewerId === artist?.id) return alert("您無法將自己的頁面加入名單中。");

    const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
    try {
      if (relationStatus === type) {
        const res = await fetch(`${API_BASE}/api/relations/${artist.id}`, { method: 'DELETE', credentials: 'include' });
        if (res.ok) setRelationStatus('none');
      } else {
        const res = await fetch(`${API_BASE}/api/relations`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetId: artist.id, type, note: '' }), credentials: 'include'
        });
        if (res.ok) setRelationStatus(type);
      }
    } catch (err) {}
  };

  const currentSelectedOC = useMemo(() => publicOCs.find(o => o.id === activeOCId) || publicOCs[0] || null, [publicOCs, activeOCId]);

  if (loading) return <div className="loading-state">載入中...</div>;
  if (!artist) return <div className="error-state">找不到該用戶的資料。</div>;

  const isDarkText = (settings?.theme_mode || 'light') === 'dark'; 
  const textColor = isDarkText ? '#333333' : '#FFFFFF';
  const borderColor = isDarkText ? 'rgba(0, 0, 0, 0.15)' : 'rgba(255, 255, 255, 0.2)';
  const sectionBg = isDarkText ? 'rgba(0, 0, 0, 0.03)' : 'rgba(255, 255, 255, 0.05)';
  const badgeBg = isDarkText ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.15)';

  return (
    <div className={`public-profile-container theme-${settings?.theme_mode || 'light'}`} style={{ ...backgroundStyle, minHeight: '100vh', position: 'relative' }}>
      
      
      <Helmet>
        <title>{artist?.display_name || '繪師頁面'} | Arti 繪師小幫手</title>
        <meta property="og:title" content={`${artist?.display_name || '繪師頁面'} | Arti 繪師小幫手`} />
        <meta property="description" content={artist?.bio || '歡迎來到我的頁面'} />
      </Helmet>

      <style>{`
        @media (max-width: 768px) {
          .desktop-oc-tabs-wrapper { display: none !important; }
          .mobile-oc-avatars-wrapper { display: flex !important; }
        }
      `}</style>

      <div className="profile-top-right-actions" style={{ position: 'absolute', top: '20px', right: '24px', zIndex: 9000, display: 'flex', gap: '10px' }}>
        {isLoggedIn ? (
          <>
            <button onClick={handleDashboardClick} style={{ backgroundColor: isDarkText ? '#1a1a1a' : '#ffffff', color: isDarkText ? '#ffffff' : '#1a1a1a', padding: '8px 16px', borderRadius: '50px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>回到管理後台</button>
            <button onClick={handleLogout} style={{ backgroundColor: isDarkText ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.15)', color: textColor, padding: '8px 16px', borderRadius: '50px', border: `1px solid ${borderColor}`, cursor: 'pointer', fontSize: '13px', backdropFilter: 'blur(8px)', fontWeight: 'bold' }}>登出</button>
          </>
        ) : (
          <button onClick={() => navigate('/login')} style={{ backgroundColor: isDarkText ? '#1a1a1a' : '#ffffff', color: isDarkText ? '#ffffff' : '#1a1a1a', padding: '8px 18px', borderRadius: '50px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>登入 / 註冊</button>
        )}
      </div>

      {showSplash && (
        <div className={`splash-screen ${isSplashClosing ? 'hide' : ''}`} style={splashBgStyle}>
          <div className="splash-box">
            <h1 style={{ color: textColor }}>{settings?.splash_text || artist.display_name}</h1>
          </div>
        </div>
      )}

      <div className="profile-layout-root" style={{ opacity: (showSplash && !isSplashClosing) ? 0 : 1 }}>
        <ProfileSidebar 
          artist={artist} settings={settings} textColor={textColor} borderColor={borderColor} 
          availableTabs={availableTabs} currentTab={currentTab} onTabChange={handleTabChange} 
          viewerId={viewerId} relationStatus={relationStatus} isViewerLoading={isViewerLoading} 
          onToggleRelation={handleToggleRelation} 
        />

        <main className="profile-main-content" style={{ background: 'transparent' }}>
          <div className={`tab-inner-wrapper ${isWideTab ? 'layout-wide' : 'layout-narrow'}`}>
            <div className="tab-content-area">
              
              {currentTab === 'oc' && publicOCs.length > 0 && (
                <div className="public-oc-layout fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', maxWidth: '1020px', margin: '0 auto', padding: '0' }}>
                  {publicOCs.length > 1 && (
                    <>
                      <div className="desktop-oc-tabs-wrapper" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', borderBottom: isDarkText ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px' }}>
                        {publicOCs.map(oc => (
                          <button key={oc.id} onClick={() => setActiveOCId(oc.id)} style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid', borderColor: activeOCId === oc.id ? '#8CB369' : borderColor, backgroundColor: activeOCId === oc.id ? 'rgba(140, 179, 105, 0.1)' : 'transparent', color: activeOCId === oc.id ? '#8CB369' : textColor, fontWeight: 'bold', cursor: 'pointer', fontSize: '13px', transition: 'all 0.2s' }}>
                            {oc.name || '未命名角色'}
                          </button>
                        ))}
                      </div>

                      <div className="mobile-oc-avatars-wrapper" style={{ display: 'none', gap: '16px', overflowX: 'auto', padding: '4px 4px 12px 4px', width: '100%', WebkitOverflowScrolling: 'touch' }}>
                        {publicOCs.map(oc => {
                          const isSelected = activeOCId === oc.id;
                          const coverImg = oc.images?.[0]?.previewUrl;
                          return (
                            <div key={oc.id} onClick={() => setActiveOCId(oc.id)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', cursor: 'pointer', flexShrink: 0 }}>
                              <div style={{ width: '58px', height: '58px', borderRadius: '50%', border: isSelected ? '2.5px solid #8CB369' : `1.5px solid ${borderColor}`, padding: '2px', transition: 'all 0.2s', backgroundColor: 'transparent' }}>
                                <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', backgroundColor: '#F4F0EB' }}>
                                  {coverImg ? <img src={coverImg} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#A0978D' }}><ImageIcon size={16} /></div>}
                                </div>
                              </div>
                              <span style={{ fontSize: '11px', color: textColor, fontWeight: isSelected ? 'bold' : 'normal', maxWidth: '64px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', opacity: isSelected ? 1 : 0.8 }}>
                                {oc.name || '未命名'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                  {currentSelectedOC && <div style={{ width: '100%' }}><OCDetailCard ocData={currentSelectedOC} variant="flat" /></div>}
                </div>
              )}

              
              {currentTab === 'reviews' && (
                <div className="public-reviews-layout fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', maxWidth: '800px', margin: '0 auto' }}>
                  {publicReviews.map(review => (
                    <div key={review.id} style={{ backgroundColor: sectionBg, border: `1px solid ${borderColor}`, borderRadius: '16px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '16px', color: textColor }}>
                          {review.display_client_name}
                        </div>
                        <div style={{ fontSize: '13px', opacity: 0.6, color: textColor }}>
                          {new Date(review.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      
                      <div style={{ fontSize: '13px', opacity: 0.8, color: textColor, marginBottom: '16px', paddingBottom: '12px', borderBottom: `1px dashed ${borderColor}` }}>
                        委託項目：{review.project_name || '客製化委託'}
                      </div>
                      

                      
                      <div style={{ fontSize: '15px', color: textColor, lineHeight: '1.7', whiteSpace: 'pre-wrap', backgroundColor: isDarkText ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '12px' }}>
                        {review.content || '(無文字評價)'}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {currentTab === 'queue' && settings?.queue_settings && (
                <div className="public-queue-section" style={{ background: sectionBg, padding: '20px', borderRadius: '12px', color: textColor }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${borderColor}`, paddingBottom: '10px', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <h2 style={{ margin: 0, fontSize: '18px' }}>目前排單狀況</h2>
                      {settings.queue_settings.last_snapshot_at && (
                        <span style={{ fontSize: '12px', opacity: 0.6, background: badgeBg, padding: '4px 8px', borderRadius: '12px' }}>
                          快照發佈於: {new Date(settings.queue_settings.last_snapshot_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    {settings.queue_settings.show_rules && settings.queue_settings.rules_content && (
                      <button 
                        onClick={() => setShowRulesModal(true)}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'transparent', border: `1px solid ${borderColor}`, color: textColor, padding: '6px 12px', borderRadius: '20px', cursor: 'pointer', fontSize: '13px', transition: 'all 0.2s', fontWeight: 'bold' }}
                        onMouseOver={e => e.currentTarget.style.backgroundColor = badgeBg}
                        onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <Info size={14} /> 排單規則
                      </button>
                    )}
                  </div>

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
                            <th style={{ padding: '12px 8px' }}>{settings.queue_settings.date_column_label || '預計開始日'}</th>
                            {settings.queue_settings.show_artist_note && <th style={{ padding: '12px 8px' }}>備註</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {publicQueue.map((order) => (
                            <tr key={order.id} style={{ borderBottom: `1px solid ${borderColor}` }}>
                              <td style={{ padding: '12px 8px' }}>
                                <div style={{ fontWeight: 'bold' }}>{order.contact_memo || '匿名委託'}</div>
                                {order.client_public_id && <div style={{ fontSize: '12px', opacity: 0.7 }}>{order.client_public_id}</div>}
                              </td>
                              <td style={{ padding: '12px 8px' }}>{order.project_name || '私人委託項目'}</td>
                              <td style={{ padding: '12px 8px' }}><span style={{ padding: '4px 8px', background: badgeBg, borderRadius: '4px' }}>{order.queue_status || '處理中'}</span></td>
                              <td style={{ padding: '12px 8px', opacity: 0.8 }}>{order.end_date ? order.end_date.substring(5).replace('-', '/') : '未定'}</td>
                              {settings.queue_settings.show_artist_note && <td style={{ padding: '12px 8px', opacity: 0.8 }}>{order.artist_note || '-'}</td>}
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
                      {availableTags.map(tag => (
                        <button key={tag} className={`tag-btn ${selectedTags.includes(tag) ? 'active' : ''}`} onClick={() => handleTagClick(tag)}>{tag}</button>
                      ))}
                    </div>
                  )}
                  <div className="masonry-grid">
                    {filteredShowcaseItems.map(item => (
                      <div key={item.id} className="masonry-item" onClick={() => { 
                        setSearchParams(prev => { prev.set('tab', 'showcase'); prev.set('showcaseId', item.id); return prev; });
                      }}>
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
                  {settings?.portfolio.map((img: string, idx: number) => (
                    <div key={idx} className="portfolio-item" onClick={() => setSelectedImgIndex(idx)}>
                      <img src={img} alt="作品" loading="lazy" />
                    </div>
                  ))}
                </div>
              )}
              
              {currentTab === 'detailed_intro' && settings && (
                <div className="rich-text-content" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(decodeHTML(settings.detailed_intro)) }} />
              )}

              {Array.isArray(settings?.custom_sections) && settings.custom_sections.map((sec: any) => {
                return currentTab === sec.id && (
                  <div key={sec.id} className="rich-text-content" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(decodeHTML(sec.content || '')) }} />
                );
              })}
            </div>

            <footer className="profile-internal-footer">
              <div className="footer-links" style={{ color: isDarkText ? '#888' : 'rgba(255,255,255,0.6)' }}>
                <span>|</span><Link to="/terms">服務條款</Link>
                <span>|</span><Link to="/privacy">隱私權政策</Link>
                <span>|</span><Link to="/refund-policy">退款政策</Link>
                <span>|</span>
              </div>
            </footer>
          </div>
        </main>
      </div>

      {showRulesModal && (
        <div className="lightbox-overlay" onClick={() => setShowRulesModal(false)} style={{ zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div 
            className="lightbox-content rich-text-content" 
            onClick={e => e.stopPropagation()} 
            style={{ backgroundColor: isDarkText ? '#FFF' : '#1A1A1A', color: textColor, padding: '30px', borderRadius: '12px', maxWidth: '600px', width: '90%', maxHeight: '80vh', overflowY: 'auto', position: 'relative', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
          >
            <button 
              onClick={() => setShowRulesModal(false)} 
              style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', color: textColor, cursor: 'pointer', padding: '4px', borderRadius: '50%' }}
              onMouseOver={e => e.currentTarget.style.backgroundColor = badgeBg}
              onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <X size={24} />
            </button>
            <h3 style={{ marginTop: 0, marginBottom: '20px', borderBottom: `1px solid ${borderColor}`, paddingBottom: '10px' }}>排單規則說明</h3>
            <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(decodeHTML(settings?.queue_settings?.rules_content || '')) }} />
          </div>
        </div>
      )}

      {selectedShowcase && (
        <ShowcaseModal 
          selectedShowcase={selectedShowcase} 
          artist={artist} 
          settings={settings} 
          isLoggedIn={isLoggedIn}  
          onClose={() => setSearchParams(prev => { prev.delete('showcaseId'); return prev; })}
        />
      )}

      {selectedImgIndex !== null && settings?.portfolio && (
        <div className="lightbox-overlay" onClick={() => setSelectedImgIndex(null)}>
          <button className="lightbox-close" onClick={() => setSelectedImgIndex(null)}><X size={32}/></button>
          <button className="lightbox-nav prev" onClick={(e) => { e.stopPropagation(); setSelectedImgIndex((selectedImgIndex - 1 + settings.portfolio.length) % settings.portfolio.length); }}><ChevronLeft size={48}/></button>
          <div className="lightbox-content" onClick={e => e.stopPropagation()}>
            <img src={settings.portfolio[selectedImgIndex]} alt="大圖預覽" />
          </div>
          <button className="lightbox-nav next" onClick={(e) => { e.stopPropagation(); setSelectedImgIndex((selectedImgIndex + 1) % settings.portfolio.length); }}><ChevronRight size={48}/></button>
        </div>
      )}
    </div>
  );
}