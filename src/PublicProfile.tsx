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
  const { id } = useParams();
  const artistId = id || 'u-artist-01';

  const [artist, setArtist] = useState<any>(null);
  const [settings, setSettings] = useState<ProfileSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('');
  const [showSplash, setShowSplash] = useState(true);

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

  // 控制滿版過場動畫的顯示時間
  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => {
        setShowSplash(false);
      }, 1500); // 停留 1.5 秒後淡出
      return () => clearTimeout(timer);
    }
  }, [loading]);

  const availableTabs = [];
  if (settings) {
    const isHidden = (id: string) => settings.hidden_sections?.includes(id);
    if (!isHidden('portfolio') && settings.portfolio?.length > 0) availableTabs.push({ id: 'portfolio', label: '作品展示' });
    if (!isHidden('detailed_intro') && settings.detailed_intro) availableTabs.push({ id: 'detailed_intro', label: '詳細介紹' });
    if (!isHidden('process') && settings.process) availableTabs.push({ id: 'process', label: '委託流程' });
    if (!isHidden('payment') && settings.payment) availableTabs.push({ id: 'payment', label: '付款方式' });
    if (!isHidden('rules') && settings.rules) availableTabs.push({ id: 'rules', label: '委託規範' });
    
    if (settings.custom_sections) {
      settings.custom_sections.forEach(sec => {
        if (!isHidden(sec.id)) availableTabs.push({ id: sec.id, label: sec.title || '未命名區塊' });
      });
    }
  }

  const currentTab = activeTab || (availableTabs.length > 0 ? availableTabs[0].id : '');

  if (loading) return <div className="loading-state">載入中...</div>;
  if (!artist) return <div className="error-state">找不到該繪師的資料。</div>;

  return (
    <div className="public-profile-container">
      
      {/* 滿版過場動畫區塊 */}
      <div className={`splash-screen ${!showSplash ? 'hide' : ''}`}>
        {artist.avatar_url && <img src={artist.avatar_url} alt="Avatar" className="splash-avatar" />}
        <h1 className="splash-name">{artist.display_name || '未命名繪師'}</h1>
        {artist.bio && <p className="splash-bio">{artist.bio}</p>}
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
            
            {/* 修復了這裡的標籤閉合與結構問題 */}
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
                      <div key={idx} className="portfolio-item">
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
    </div>
  );
}