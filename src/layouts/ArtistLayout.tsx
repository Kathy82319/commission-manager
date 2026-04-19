// src/pages/artist/ArtistLayout.tsx

import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';

export function ArtistLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [artist, setArtist] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // 1. 追蹤螢幕寬度與身分驗證邏輯
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const checkAuthAndFetchProfile = async () => {
      try {
        const API_BASE = (import.meta as any).env.VITE_API_BASE_URL || '';
        const res = await fetch(`${API_BASE}/api/users/me`, { credentials: 'include' });

        if (res.status === 401 || res.status === 403) {
          navigate('/login');
          return;
        }

        const data = await res.json();
        if (data.success && data.data) {
          if (data.data.role === 'pending') navigate('/onboarding');
          else if (data.data.role === 'client') navigate('/client/orders');
          else setArtist(data.data);
        } else {
          navigate('/login');
        }
      } catch (error) {
        console.error("驗證繪師身分失敗", error);
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };
    checkAuthAndFetchProfile();
  }, [navigate]);

  // 路由改變時自動關閉手機選單
  useEffect(() => {
    if (windowWidth < 1024) setIsMobileMenuOpen(false);
  }, [location.pathname, windowWidth]);

  // 2. 商業邏輯：方案計算與功能
  const handlePreviewAndCopy = () => {
    if (!artist) return;
    const publicUrl = `${window.location.origin}/${artist.public_id}`;
    navigator.clipboard.writeText(publicUrl);
    window.open(publicUrl, '_blank');
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getFullYear()}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}`;
  };

  let planDisplay = '基礎免費版';
  let expiryDateText = '';
  let planBadgeColor = '#4A4A4A';
  let planBadgeBg = '#F0ECE7';
  let daysRemaining: number | null = null;
  let showWarningBanner = false;

  if (artist) {
    const now = new Date();
    if (artist.plan_type === 'pro') {
      planDisplay = '專業版 Pro';
      planBadgeColor = '#4E7A5A';
      planBadgeBg = '#E8F3EB';
      if (artist.pro_expires_at) {
        const exp = new Date(artist.pro_expires_at);
        expiryDateText = `(截止日期: ${formatDate(artist.pro_expires_at)})`;
        daysRemaining = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (daysRemaining <= 7 && daysRemaining > 0) showWarningBanner = true;
      }
    } else if (artist.plan_type === 'trial') {
      planDisplay = '專業版試用期';
      planBadgeColor = '#A67B3E';
      planBadgeBg = '#FDF4E6';
      if (artist.trial_end_at) {
        const exp = new Date(artist.trial_end_at);
        expiryDateText = `(截止日期: ${formatDate(artist.trial_end_at)})`;
        daysRemaining = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (daysRemaining <= 7 && daysRemaining > 0) showWarningBanner = true;
      }
    }
  }

  const navItems = [
    { path: '/artist/quote/new', label: '產出委託單' },
    { path: '/artist/queue', label: '排單表' },
    { path: '/artist/notebook', label: '委託單管理' },
    { path: '/artist/records', label: '結案紀錄' },
    { path: '/artist/settings', label: '個人設定' }
  ];

  if (loading) return <div className="h-screen flex justify-center items-center text-[#A0978D]">驗證身分中...</div>;

  return (
    <div className="min-h-screen flex flex-col bg-[#FBFBF9] text-[#4A4A4A] font-sans">
      
      {/* 1. 手機版 Header */}
      <header className="lg:hidden flex items-center gap-4 px-5 py-4 bg-white border-b border-[#EAE6E1] sticky top-0 z-[100]">
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="bg-none border-none text-2xl cursor-pointer flex items-center justify-center p-0"
        >
          {isMobileMenuOpen ? '✕' : '☰'}
        </button>
        <div className="flex flex-col">
          <div className="font-bold text-base text-[#5D4A3E] leading-none">Arti繪師小幫手</div>
          <div className="text-[13px] text-[#A0978D] leading-tight mt-1">管理後台</div>
        </div>
      </header>

      <div className="flex flex-1 relative">
        {/* 2. 側邊欄 (RWD 相容) */}
        <aside 
          className="w-[260px] bg-white flex flex-col border-r border-[#EAE6E1] transition-transform duration-300 ease-in-out fixed inset-y-0 left-0 z-50 lg:sticky lg:top-0 lg:h-screen lg:z-0"
          style={{ 
            transform: windowWidth >= 1024 ? 'none' : (isMobileMenuOpen ? 'translateX(0)' : 'translateX(-100%)'),
            position: windowWidth >= 1024 ? 'sticky' : 'fixed'
          }}
        >
          <div className="p-[30px_20px] border-b border-[#F0ECE7] hidden lg:block">
            <div className="font-bold text-lg text-[#5D4A3E]">Arti繪師小幫手</div>
            <div className="text-[13px] text-[#A0978D] mb-4">繪師管理後台</div>
            {artist && (
              <div 
                className="p-2.5 rounded-xl text-xs font-bold leading-normal"
                style={{ backgroundColor: planBadgeBg, color: planBadgeColor }}
              >
                <div>{planDisplay}</div>
                {expiryDateText && <div className="text-[10px] opacity-80 font-normal">{expiryDateText}</div>}
              </div>
            )}
          </div>
          
          <nav className="flex-1 p-2.5 flex flex-col gap-2 overflow-y-auto">
            {navItems.map(item => (
              <Link key={item.path} to={item.path} 
                className={`no-underline p-[12px_16px] rounded-lg text-[15px] transition-colors
                  ${location.pathname === item.path ? 'bg-[#F4F0EB] text-[#5D4A3E] font-bold' : 'text-[#7A7269] hover:bg-[#FBFBF9]'}`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="p-5 border-t border-[#F0ECE7] flex flex-col gap-2.5">
            <button 
              onClick={() => navigate('/client/orders')} 
              className="w-full p-2.5 bg-[#F4F0EB] border border-dashed border-[#DED9D3] rounded-lg text-[#5D4A3E] cursor-pointer text-[13px] font-bold"
            >
              切換為委託方模式
            </button>
            <button 
              onClick={handlePreviewAndCopy} 
              className="w-full p-2.5 bg-white border border-[#DED9D3] rounded-lg text-[#7A7269] cursor-pointer text-[13px] font-bold"
            >
              預覽/複製個人首頁
            </button>
            
            <div className="mt-2.5 text-[12px] color-[#9CA3AF] text-center leading-relaxed">
              <Link to="/terms" className="text-inherit no-underline">服務條款</Link>
              <span className="mx-1">|</span>
              <Link to="/privacy" className="text-inherit no-underline">隱私權政策</Link>
              <div className="mt-1">客服：cath40286@gmail.com</div>
            </div>
          </div>
        </aside>

        {/* 3. 主內容區 */}
        <main className="flex-1 min-w-0 bg-[#FBFBF9]">
          <div className="p-5 md:p-10 max-w-full">
            {/* 到期警告 Banner */}
            {showWarningBanner && (
              <div className="bg-[#FFF3CD] border border-[#FFEEBA] text-[#856404] p-4 rounded-xl mb-6 flex flex-col md:flex-row md:justify-between md:items-center gap-3">
                <div className="text-sm font-bold">
                  ⚠️ 您的 {artist.plan_type === 'trial' ? '專業版試用期' : '專業版 Pro 訂閱'} 即將到期！
                  <div className="font-normal text-xs">截止日：{formatDate(artist.plan_type === 'trial' ? artist.trial_end_at : artist.pro_expires_at)} (剩餘 {daysRemaining} 天)</div>
                </div>
                <button 
                  onClick={() => navigate('/artist/settings')} 
                  className="bg-[#856404] text-white border-none py-2 px-4 rounded-md cursor-pointer text-[13px] font-bold shrink-0"
                >
                  立即查看續費方案
                </button>
              </div>
            )}
            <Outlet />
          </div>
        </main>

        {/* 4. 手機版遮罩 */}
        {isMobileMenuOpen && (
          <div 
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          />
        )}
      </div>
    </div>
  );
}