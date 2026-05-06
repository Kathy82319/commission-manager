// src/PublicProfile.tsx
import { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import DOMPurify from 'dompurify'; 
import { SiFacebook, SiX, SiInstagram, SiThreads, SiPlurk } from '@icons-pack/react-simple-icons';
import { Globe, ChevronLeft, ChevronRight, X, User, Heart, Ban } from 'lucide-react';
import './styles/PublicProfile.css';

const decodeHTML = (html?: string) => {
  if (!html || typeof html !== 'string') return ''; 
  const txt = document.createElement("textarea");
  txt.innerHTML = html;
  return txt.value;
};

// 🌟 新增：定義動態表單欄位 Schema
export interface FormFieldSchema {
  id: string;
  type: 'text' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'date';
  label: string;
  required: boolean;
  options?: string[];
}

interface ProfileSettings {
  portfolio: string[];
  detailed_intro: string;
  custom_sections: { id: string; title: string; content: string }[];
  social_links: { platform: string; url: string }[];
  hidden_sections: string[];
  splash_enabled?: boolean;
  splash_image?: string;
  splash_duration?: number;
  splash_text?: string;
  background_color?: string;
  gradient_enabled?: boolean;
  gradient_direction?: string;
  theme_mode?: 'light' | 'dark';
  queue_settings?: {
    enabled: boolean;
    show_client_name: boolean;
    show_client_id: boolean;
    show_project_name: boolean;
  };
  tab_order?: string[]; 
  terms_of_service?: string; // 🌟 確保介面支援 TOS
  rules?: string;
}

interface ShowcaseItem {
  id: string;
  title: string;
  cover_url: string;
  price_info: string;
  tags: string[];
  description: string;
  form_schema?: string; // 🌟 新增：接收客製化表單設定
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
  
  const [showSplash, setShowSplash] = useState(false);
  const [isSplashClosing, setIsSplashClosing] = useState(false);

  const [viewerId, setViewerId] = useState<string | null>(null);
  const [relationStatus, setRelationStatus] = useState<'none' | 'favorite' | 'blacklist'>('none');
  const [isViewerLoading, setIsViewerLoading] = useState(true); 

  // ======== 登入狀態與按鈕邏輯 ========
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const role = localStorage.getItem('user_role'); 
    if (role) {
      setIsLoggedIn(true);
    } else {
      setIsLoggedIn(false);
    }
  }, []);

  const handleLogout = async () => {
    const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
    try {
      await fetch(`${API_BASE}/api/auth/logout`, { 
        method: 'POST', 
        credentials: 'include' 
      });
    } catch (e) {
      console.error("登出通訊失敗:", e);
    } finally {
      localStorage.removeItem('user_role');
      localStorage.removeItem('is_logged_in');
      localStorage.removeItem('last_active_role');
      window.location.href = '/'; 
    }
  };

  const handleDashboardClick = () => {
    const lastActiveRole = localStorage.getItem('last_active_role') || localStorage.getItem('user_role');
    if (lastActiveRole === 'artist') {
      navigate('/artist/queue');
    } else if (lastActiveRole === 'client') {
      navigate('/client/orders');
    } else {
      navigate('/portal');
    }
  };
  // ======== 登入狀態邏輯結束 ========

  // ======== 🌟 動態表單與委託狀態 ========
  const [modalMode, setModalMode] = useState<'view' | 'form1' | 'form2'>('view');
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const parsedSchema: FormFieldSchema[] = useMemo(() => {
    if (!selectedShowcase || !selectedShowcase.form_schema) return [];
    try { return JSON.parse(selectedShowcase.form_schema); } catch (e) { return []; }
  }, [selectedShowcase]);

  const tosContent = useMemo(() => {
    if (!settings) return "繪師尚未提供專屬協議說明。";
    return settings.terms_of_service || settings.rules || "繪師尚未提供專屬協議說明。";
  }, [settings]);

  const handleOpenCommission = () => {
    setModalMode('form1');
    setFormData({});
    setAgreedToTerms(false);
  };

  const handleCloseLightbox = () => {
    setSelectedShowcase(null);
    setModalMode('view');
  };

  const handleInputChange = (fieldId: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleCheckboxChange = (fieldId: string, option: string, isChecked: boolean) => {
    setFormData(prev => {
      const currentArr = (prev[fieldId] || []) as string[];
      if (isChecked) return { ...prev, [fieldId]: [...currentArr, option] };
      return { ...prev, [fieldId]: currentArr.filter(o => o !== option) };
    });
  };

  const handleNextStep = () => {
    // 檢查必填欄位
    for (const field of parsedSchema) {
      if (field.required) {
        const val = formData[field.id];
        if (val === undefined || val === null || (typeof val === 'string' && val.trim() === '') || (Array.isArray(val) && val.length === 0)) {
          alert(`請填寫必填欄位：${field.label}`);
          return;
        }
      }
    }
    setModalMode('form2');
  };

  const handleSubmitOrder = async () => {
    if (!agreedToTerms) return alert("請先同意繪師協議");
    if (!artist || !selectedShowcase) return;

    setIsSubmitting(true);
    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
      const formattedAnswers = parsedSchema.map(field => ({
        question: field.label,
        answer: formData[field.id] || (field.type === 'checkbox' ? [] : '')
      }));

      const payload = {
        showcase_id: selectedShowcase.id,
        artist_id: artist.id,
        form_answers: JSON.stringify(formattedAnswers),
        tos_snapshot: tosContent
      };

      const res = await fetch(`${API_BASE}/api/direct-inquiries`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        alert("委託申請已成功送出！請至「我的委託」查看進度，等待繪師確認。");
        handleCloseLightbox();
        navigate('/client/orders');
      } else {
        if (data.error === "UNAUTHORIZED" || res.status === 401) {
          alert("請先登入或註冊委託人帳號，才能送出委託喔！");
          navigate('/login');
        } else {
          alert(data.error || "送出失敗，請稍後再試");
        }
      }
    } catch (err) {
      alert("網路連線錯誤，送出失敗");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderDynamicField = (field: FormFieldSchema) => {
    const value = formData[field.id] || '';
    return (
      <div key={field.id} style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', fontWeight: 'bold', color: '#5D4A3E', marginBottom: '8px', fontSize: '14px' }}>
          {field.label} {field.required && <span style={{ color: '#A05C5C' }}>*</span>}
        </label>

        {field.type === 'text' && <input type="text" className="form-input" style={{ width: '100%' }} value={value} onChange={e => handleInputChange(field.id, e.target.value)} placeholder="請輸入..." />}
        {field.type === 'textarea' && <textarea className="form-input" style={{ width: '100%', minHeight: '80px', resize: 'vertical' }} value={value} onChange={e => handleInputChange(field.id, e.target.value)} placeholder="請詳細描述..." />}
        {field.type === 'date' && <input type="date" className="form-input" value={value} onChange={e => handleInputChange(field.id, e.target.value)} />}
        {field.type === 'select' && (
          <select className="form-input" style={{ width: '100%' }} value={value} onChange={e => handleInputChange(field.id, e.target.value)}>
            <option value="">請選擇...</option>
            {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        )}
        {field.type === 'radio' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {field.options?.map(opt => (
              <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: '#5D4A3E' }}>
                <input type="radio" name={field.id} value={opt} checked={value === opt} onChange={e => handleInputChange(field.id, e.target.value)} /> {opt}
              </label>
            ))}
          </div>
        )}
        {field.type === 'checkbox' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {field.options?.map(opt => {
              const isChecked = (formData[field.id] || []).includes(opt);
              return (
                <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: '#5D4A3E' }}>
                  <input type="checkbox" checked={isChecked} onChange={e => handleCheckboxChange(field.id, opt, e.target.checked)} /> {opt}
                </label>
              );
            })}
          </div>
        )}
      </div>
    );
  };
  // ======== 動態表單邏輯結束 ========

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
              if (parsedSettings.splash_enabled === true) setShowSplash(true);
              
              const safeCustomSections = (parsedSettings.custom_sections || []).map((sec: any, idx: number) => ({
                ...sec, id: sec.id || `custom_legacy_${idx}`
              }));
              parsedSettings.custom_sections = safeCustomSections;

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
              if (Array.isArray(item.tags)) safeTags = item.tags;
              else if (typeof item.tags === 'string' && item.tags.trim() !== '') {
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
      } catch (e) {
        console.error("未登入或無法讀取狀態", e);
      } finally {
        setIsViewerLoading(false);  
      }
    };
    if (artist && artist.id) {
      fetchViewerAndRelations();
    }
  }, [artist]);

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
    const tabs: any[] = [];
    const isHidden = (id: string) => settings.hidden_sections?.includes(id) || false;
    const isFreePlan = artist?.plan_type === 'free' || !artist?.plan_type;

    if (!isHidden('portfolio') && settings.portfolio?.length > 0) tabs.push({ id: 'portfolio', label: '作品展示' });
    if (!isHidden('detailed_intro') && settings.detailed_intro) tabs.push({ id: 'detailed_intro', label: '詳細介紹' });
    
    if (settings.queue_settings?.enabled) {
      tabs.push({ id: 'queue', label: '排單狀況' });
    }

    if (!isFreePlan) {
      if (!isHidden('showcase') && showcaseItems.length > 0) tabs.push({ id: 'showcase', label: '販售項目' });
      
      if (Array.isArray(settings.custom_sections)) {
        settings.custom_sections.forEach((sec) => {
          if (!isHidden(sec.id) && sec.content) {
            tabs.push({ id: sec.id, label: sec.title || '自訂分頁' });
          }
        });
      }
    }

    if (!isFreePlan && settings.tab_order && settings.tab_order.length > 0) {
      tabs.sort((a, b) => {
        let idxA = settings.tab_order!.indexOf(a.id);
        let idxB = settings.tab_order!.indexOf(b.id);
        idxA = idxA === -1 ? 999 : idxA;
        idxB = idxB === -1 ? 999 : idxB;
        return idxA - idxB;
      });
    }

    return tabs;
  }, [settings, showcaseItems, artist]);

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

  const handleToggleRelation = async (type: 'favorite' | 'blacklist') => {
    if (!viewerId) {
      alert("請先登入系統後再進行操作喔！");
      return;
    }
    if (viewerId === artist?.id) {
      alert("您無法將自己的頁面加入名單中。");
      return;
    }

    const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
    try {
      if (relationStatus === type) {
        const res = await fetch(`${API_BASE}/api/relations/${artist.id}`, {
          method: 'DELETE',
          credentials: 'include'
        });
        if (res.ok) setRelationStatus('none');
      } else {
        const res = await fetch(`${API_BASE}/api/relations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetId: artist.id, type, note: '' }),
          credentials: 'include'
        });
        if (res.ok) setRelationStatus(type);
      }
    } catch (err) {
      console.error("更新標記狀態失敗", err);
    }
  };

  if (loading) return <div className="loading-state">載入中...</div>;
  if (!artist) return <div className="error-state">找不到該繪師的資料。</div>;

  const isDarkText = settings?.theme_mode === 'light';
  const textColor = isDarkText ? '#333333' : '#FFFFFF';
  const borderColor = isDarkText ? 'rgba(0, 0, 0, 0.15)' : 'rgba(255, 255, 255, 0.2)';
  const sectionBg = isDarkText ? 'rgba(0, 0, 0, 0.03)' : 'rgba(255, 255, 255, 0.05)';
  const badgeBg = isDarkText ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.15)';

  return (
    <div className={`public-profile-container theme-${settings?.theme_mode || 'dark'}`} style={{ ...backgroundStyle, minHeight: '100vh', position: 'relative' }}>
      
      {/* ======== 右上角懸浮操作按鈕 ======== */}
      <div className="profile-top-right-actions" style={{ position: 'fixed', top: '20px', right: '24px', zIndex: 9000, display: 'flex', gap: '10px' }}>
        {isLoggedIn ? (
          <>
            <button onClick={handleDashboardClick} style={{ backgroundColor: isDarkText ? '#1a1a1a' : '#ffffff', color: isDarkText ? '#ffffff' : '#1a1a1a', padding: '8px 16px', borderRadius: '50px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
              回到管理後台
            </button>
            <button onClick={handleLogout} style={{ backgroundColor: isDarkText ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.15)', color: textColor, padding: '8px 16px', borderRadius: '50px', border: `1px solid ${borderColor}`, cursor: 'pointer', fontSize: '13px', backdropFilter: 'blur(8px)', fontWeight: 'bold' }}>
              登出
            </button>
          </>
        ) : (
          <button onClick={() => navigate('/login')} style={{ backgroundColor: isDarkText ? '#1a1a1a' : '#ffffff', color: isDarkText ? '#ffffff' : '#1a1a1a', padding: '8px 18px', borderRadius: '50px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
            登入 / 註冊
          </button>
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
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`nav-item ${currentTab === tab.id ? 'active' : ''}`} style={{ color: textColor }}>
                  {tab.label}
                </button>
              ))}
            </nav>

            {!isViewerLoading && viewerId !== artist?.id && (
              <div style={{ display: 'flex', gap: '8px', marginTop: '24px', justifyContent: 'center', flexDirection: 'column' }}>
                <button onClick={() => handleToggleRelation('favorite')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px 14px', borderRadius: '8px', border: `1px solid ${relationStatus === 'favorite' ? '#ef4444' : borderColor}`, background: relationStatus === 'favorite' ? 'rgba(239, 68, 68, 0.1)' : 'transparent', color: relationStatus === 'favorite' ? '#ef4444' : textColor, cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', transition: 'all 0.2s', backdropFilter: 'blur(4px)' }}>
                  <Heart size={16} fill={relationStatus === 'favorite' ? '#ef4444' : 'none'} />
                  {relationStatus === 'favorite' ? '已收藏' : '收藏繪師'}
                </button>
                
                <button onClick={() => handleToggleRelation('blacklist')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px 14px', borderRadius: '8px', border: `1px solid ${relationStatus === 'blacklist' ? '#71717a' : borderColor}`, background: relationStatus === 'blacklist' ? 'rgba(113, 113, 122, 0.2)' : 'transparent', color: relationStatus === 'blacklist' ? '#a1a1aa' : textColor, cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', transition: 'all 0.2s', backdropFilter: 'blur(4px)' }}>
                  <Ban size={16} />
                  {relationStatus === 'blacklist' ? '已封鎖' : '黑名單'}
                </button>
              </div>
            )}
          </div>
        </aside>

        <main className="profile-main-content" style={{ background: 'transparent' }}>
          <div className={`tab-inner-wrapper ${isWideTab ? 'layout-wide' : 'layout-narrow'}`}>
            <div className="tab-content-area">
              
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
                      <div key={item.id} className="masonry-item" onClick={() => { setSelectedShowcase(item); setModalMode('view'); }}>
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
              
              {currentTab === 'detailed_intro' && settings && (
                <div className="rich-text-content" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(decodeHTML(settings.detailed_intro)) }} />
              )}

              {Array.isArray(settings?.custom_sections) && settings.custom_sections.map((sec) => {
                return currentTab === sec.id && (
                  <div key={sec.id} className="rich-text-content" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(decodeHTML(sec.content || '')) }} />
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
                <span>|</span>
              </div>
            </footer>
          </div>
        </main>
      </div>

      {/* ======== 🌟 客製化表單與展示 Modal (Lightbox) ======== */}
      {selectedShowcase && (
        <div className="lightbox-overlay showcase-modal-overlay" onClick={handleCloseLightbox}>
          <button className="lightbox-close" onClick={handleCloseLightbox}><X size={32}/></button>
          
          <div className="showcase-content-box" onClick={e => e.stopPropagation()}>
            
            {/* 模式一：純瀏覽展示與簡介 */}
            {modalMode === 'view' && (
              <>
                <div className="showcase-cover">
                  <img src={selectedShowcase.cover_url} alt={selectedShowcase.title} />
                </div>
                <div className="showcase-details" style={{ display: 'flex', flexDirection: 'column' }}>
                  <div className="showcase-header">
                    <h2>{selectedShowcase.title}</h2>
                    {selectedShowcase.price_info && <div className="modal-price">${selectedShowcase.price_info}</div>}
                  </div>

                  {Array.isArray(selectedShowcase.tags) && selectedShowcase.tags.length > 0 && (
                    <div className="modal-tags">
                      {selectedShowcase.tags.map(tag => <span key={tag} className="tag-chip">#{tag}</span>)}
                    </div>
                  )}

                  <div className="description-scroll-area" style={{ flex: 1 }}>
                    <div className="rich-text-content description" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(decodeHTML(selectedShowcase.description)) }} />
                  </div>

                  {/* 我要委託按鈕 */}
                  <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #EAE6E1' }}>
                    <button 
                      onClick={handleOpenCommission}
                      style={{ width: '100%', padding: '14px', backgroundColor: '#4E7A5A', color: '#FFF', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                      我要委託
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* 模式二：填寫客製化動態表單 */}
            {modalMode === 'form1' && (
              <div className="showcase-details" style={{ width: '100%', maxWidth: '100%', padding: '30px', display: 'flex', flexDirection: 'column' }}>
                <h2 style={{ borderBottom: '1px solid #EAE6E1', paddingBottom: '16px', marginBottom: '20px', color: '#5D4A3E', fontSize: '20px' }}>
                  📝 填寫委託需求 - {selectedShowcase.title}
                </h2>
                <div className="custom-scrollbar" style={{ overflowY: 'auto', flex: 1, paddingRight: '10px' }}>
                  {parsedSchema.length > 0 ? (
                    parsedSchema.map(renderDynamicField)
                  ) : (
                    <div style={{ color: '#7A7269', fontSize: '15px', lineHeight: '1.6', textAlign: 'center', padding: '40px 0' }}>
                      此項目沒有特別指定的客製化問題。<br/>若無其他特殊要求，請直接點擊「下一步」確認協議。
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '12px', marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #EAE6E1' }}>
                  <button onClick={() => setModalMode('view')} style={{ flex: 1, padding: '14px', background: '#FAFAFA', border: '1px solid #DED9D3', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', color: '#5D4A3E', fontSize: '15px' }}>取消</button>
                  <button onClick={handleNextStep} style={{ flex: 2, padding: '14px', background: '#5D4A3E', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px' }}>下一步：確認協議</button>
                </div>
              </div>
            )}

            {/* 模式三：確認繪師協議 (TOS) */}
            {modalMode === 'form2' && (
              <div className="showcase-details" style={{ width: '100%', maxWidth: '100%', padding: '30px', display: 'flex', flexDirection: 'column' }}>
                <h2 style={{ borderBottom: '1px solid #EAE6E1', paddingBottom: '16px', marginBottom: '20px', color: '#5D4A3E', fontSize: '20px' }}>
                  📄 確認繪師協議 (TOS)
                </h2>
                <div className="custom-scrollbar" style={{ overflowY: 'auto', flex: 1, paddingRight: '10px' }}>
                  <div style={{ backgroundColor: '#FDFDFB', border: '1px solid #EAE6E1', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
                    <div style={{ fontSize: '14px', color: '#7A7269', lineHeight: '1.7', whiteSpace: 'pre-wrap' }} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(tosContent) }} />
                  </div>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', padding: '16px', backgroundColor: '#FBFBF9', borderRadius: '8px', border: '1px solid #DED9D3' }}>
                    <input type="checkbox" checked={agreedToTerms} onChange={e => setAgreedToTerms(e.target.checked)} style={{ width: '20px', height: '20px', marginTop: '2px', cursor: 'pointer' }} />
                    <span style={{ fontSize: '15px', color: '#5D4A3E', fontWeight: 'bold', lineHeight: '1.5' }}>
                      我已詳細閱讀並同意上述繪師協議，承諾遵守交易規範。
                    </span>
                  </label>
                </div>
                <div style={{ display: 'flex', gap: '12px', marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #EAE6E1' }}>
                  <button onClick={() => setModalMode('form1')} style={{ flex: 1, padding: '14px', background: '#FAFAFA', border: '1px solid #DED9D3', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', color: '#5D4A3E', fontSize: '15px' }}>返回修改</button>
                  <button onClick={handleSubmitOrder} disabled={!agreedToTerms || isSubmitting} style={{ flex: 2, padding: '14px', background: '#4E7A5A', color: 'white', border: 'none', borderRadius: '8px', cursor: (!agreedToTerms || isSubmitting) ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '15px', opacity: (!agreedToTerms || isSubmitting) ? 0.6 : 1 }}>
                    {isSubmitting ? '送出中...' : '正式送出委託申請'}
                  </button>
                </div>
              </div>
            )}

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