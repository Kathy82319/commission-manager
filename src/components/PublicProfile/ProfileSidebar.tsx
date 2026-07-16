import { useState, useRef, useEffect } from 'react';
import { SiFacebook, SiX, SiInstagram, SiThreads, SiPlurk } from '@icons-pack/react-simple-icons';
import { Globe, User, Heart, Ban, ChevronDown, ChevronUp } from 'lucide-react';
import './styles/ProfileSidebar.css';

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

interface ProfileSidebarProps {
  artist: any;
  settings: any;
  textColor: string;
  borderColor: string;
  availableTabs: any[];
  currentTab: string;
  onTabChange: (tabId: string) => void;
  viewerId: string | null;
  relationStatus: 'none' | 'favorite' | 'blacklist';
  isViewerLoading: boolean;
  onToggleRelation: (type: 'favorite' | 'blacklist') => void;
}

export function ProfileSidebar({
  artist, settings, textColor, borderColor, availableTabs,
  currentTab, onTabChange, viewerId, relationStatus,
  isViewerLoading, onToggleRelation
}: ProfileSidebarProps) {
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [showMoreBtn, setShowMoreBtn] = useState(false);
  const bioRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (bioRef.current) {
      const isOverflow = bioRef.current.scrollHeight > bioRef.current.clientHeight;
      setShowMoreBtn(isOverflow);
    }
  }, [artist.bio]);

  return (
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
            {settings?.social_links?.map((link: any, idx: number) => (
              <a key={idx} href={link.url} target="_blank" rel="noreferrer" className="social-icon">
                {getSocialIcon(link.platform)}
              </a>
            ))}
          </div>

          {!isViewerLoading && viewerId !== artist?.id && (
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
              <button 
                onClick={() => onToggleRelation('favorite')} 
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '6px 14px', borderRadius: '50px', border: `1px solid ${relationStatus === 'favorite' ? '#ef4444' : borderColor}`, background: relationStatus === 'favorite' ? 'rgba(239, 68, 68, 0.1)' : 'transparent', color: relationStatus === 'favorite' ? '#ef4444' : textColor, cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', transition: 'all 0.2s' }}
              >
                <Heart size={14} fill={relationStatus === 'favorite' ? '#ef4444' : 'none'} />
                {relationStatus === 'favorite' ? '已收藏' : '收藏'}
              </button>
              
              <button 
                onClick={() => onToggleRelation('blacklist')} 
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '6px 14px', borderRadius: '50px', border: `1px solid ${relationStatus === 'blacklist' ? '#71717a' : borderColor}`, background: relationStatus === 'blacklist' ? 'rgba(113, 113, 122, 0.2)' : 'transparent', color: relationStatus === 'blacklist' ? '#a1a1aa' : textColor, cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', transition: 'all 0.2s' }}
              >
                <Ban size={14} />
                {relationStatus === 'blacklist' ? '已封鎖' : '封鎖'}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="sidebar-bottom">
        <div className="bio-section">
          <p 
            ref={bioRef}
            className={`profile-bio ${!isExpanded ? 'clamped' : 'expanded'}`} 
            style={{ color: textColor }}
          >
            {artist.bio || '這名用戶還沒有寫下簡介。'}
          </p>
          
          {showMoreBtn && (
            <button
              className="bio-toggle-btn"
              onClick={() => setIsExpanded(!isExpanded)}
              style={{ color: textColor, opacity: 0.8 }}
            >
              {isExpanded ? <ChevronUp size={22} /> : <ChevronDown size={22} />}
            </button>
          )}

          {artist.favorite_count !== undefined && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '10px', fontSize: '13px', opacity: 0.75, color: textColor }}>
              <Heart size={13} fill="currentColor" />
              已有 {artist.favorite_count} 人關注此繪師
            </div>
          )}
        </div>

        <nav className="sidebar-nav">
          {availableTabs.map((tab: any) => (
            <button key={tab.id} onClick={() => onTabChange(tab.id)} className={`nav-item ${currentTab === tab.id ? 'active' : ''}`} style={{ color: textColor }}>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
    </aside>
  );
}