// src/pages/Inbox/components/ArtistPostcard.tsx
import React, { useState } from 'react';
import { getStatusLabel, renderChips } from '../utils/formatters';

interface ArtistPostcardProps {
  item: any;
  snapshot: any;
  navigate: (path: string) => void;
  children?: React.ReactNode;
}

// 🛡️ 資安輔助：還原字串編碼，後續由 React {} 負責防 XSS 渲染
const unescapeHtml = (str: string) => {
  if (!str) return '';
  return str.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#039;/g, "'");
};

export const ArtistPostcard: React.FC<ArtistPostcardProps> = ({ item, snapshot, navigate, children }) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [imgIndex, setImgIndex] = useState(0);

  const handleArtistClick = (e: React.MouseEvent) => {
    e.stopPropagation(); 
    const targetId = item.artist_public_id || item.artist_id;
    if (targetId) navigate(`/${targetId}`);
  };

  const images: string[] = Array.isArray(snapshot.images) ? snapshot.images : [];
  const mainImage = images.length > 0 ? images[imgIndex] : null;

  const openLightbox = () => { if (images.length > 0) setLightboxOpen(true); };
  
  // 🌟 圖片切換邏輯 (加入 e.stopPropagation() 防止觸發燈箱)
  const nextImg = (e: React.MouseEvent) => { 
    e.stopPropagation(); 
    setImgIndex((prev) => (prev + 1) % images.length); 
  };
  const prevImg = (e: React.MouseEvent) => { 
    e.stopPropagation(); 
    setImgIndex((prev) => (prev - 1 + images.length) % images.length); 
  };

  // 🌟 名稱、ID 與留言防呆抓取
  const artistName = item.artist_name || snapshot.artist_name || '匿名繪師';
  const artistId = item.artist_public_id || snapshot.artist_public_id || 'unknown';
  const message = unescapeHtml(snapshot.message || item.message || '');

  return (
    <>
      {/* 🌟 加入 items-stretch 與 min-h 確保左右等高，防止破版 */}
      <div className="postcard-container relative flex flex-col md:flex-row items-stretch min-h-[280px]">
        
        <div className={`postcard-stamp stamp-${item.inquiry_status}`}>
          {getStatusLabel(item.inquiry_status)}
        </div>

        {/* 🌟 圖片區塊：強制佔比 40%，且設置 relative 與 overflow-hidden */}
        <div className="postcard-image-section group relative overflow-hidden flex-shrink-0 w-full md:w-2/5 cursor-pointer">
          {images.length > 0 ? (
            <>
              {/* 🔒 資安防護：加入 referrerPolicy。並透過 absolute inset-0 object-cover 強制圖片填滿且不撐破容器 */}
              <img 
                src={mainImage as string} 
                alt="Reference" 
                onClick={openLightbox}
                className="postcard-image w-full h-full object-cover absolute inset-0 transition duration-300 group-hover:scale-105" 
                referrerPolicy="no-referrer" 
              />
              
              {/* 🌟 縮圖左右切換按鈕 (Hover 時才顯示) */}
              {images.length > 1 && (
                <>
                  <button 
                    onClick={prevImg} 
                    className="absolute left-3 top-1/2 -translate-y-1/2 bg-black bg-opacity-40 text-white w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-200 hover:bg-opacity-70 z-20"
                  >
                    ❮
                  </button>
                  <button 
                    onClick={nextImg} 
                    className="absolute right-3 top-1/2 -translate-y-1/2 bg-black bg-opacity-40 text-white w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-200 hover:bg-opacity-70 z-20"
                  >
                    ❯
                  </button>
                  
                  {/* 圖片數量標籤 */}
                  <div className="postcard-image-count z-10 relative pointer-events-none">
                    {imgIndex + 1} / {images.length} 張附圖
                  </div>
                </>
              )}

              {/* 點擊放大的遮罩 */}
              <div className="postcard-image-overlay z-10 pointer-events-none" onClick={openLightbox}>
                <span className="text-white text-sm bg-black bg-opacity-50 px-3 py-1 rounded-full backdrop-blur-sm">點擊放大</span>
              </div>
            </>
          ) : (
            <div className="postcard-image-fallback w-full h-full flex items-center justify-center absolute inset-0 bg-[#FBFBF9]">
              <span className="flex flex-col items-center gap-2 opacity-50">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                無附圖提案
              </span>
            </div>
          )}
        </div>

        {/* 右側內容區塊 */}
        <div className="postcard-content-section flex flex-col justify-between flex-1 min-w-0 bg-white">
          <div>
            <div className="postcard-header flex items-center gap-4">
              {item.artist_avatar ? (
                <img src={item.artist_avatar} alt="Avatar" className="postcard-avatar cursor-pointer w-[56px] h-[56px] rounded-full object-cover flex-shrink-0" onClick={handleArtistClick} title="點擊前往繪師個人頁" referrerPolicy="no-referrer" />
              ) : (
                <div className="postcard-avatar-fallback cursor-pointer w-[56px] h-[56px] rounded-full flex items-center justify-center flex-shrink-0" onClick={handleArtistClick} title="點擊前往繪師個人頁">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-50"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-xs text-[#A0978D] mb-1">
                  <span>投遞繪師</span>
                </div>
                <div className="flex items-baseline flex-wrap gap-x-2 gap-y-1">
                  <span className="postcard-artist-name block truncate font-bold text-xl text-[#5D4A3E] cursor-pointer hover:underline" onClick={handleArtistClick} title="前往繪師個人頁">
                    {artistName}
                  </span>
                  <span className="text-[#A0978D] text-sm font-mono">
                    @{artistId}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm mt-4 mb-4">
              <div>
                <strong className="text-[#5D4A3E] block mb-2">舒適圈 / 擅長題材：</strong>
                {renderChips(snapshot.specialties, 'good')}
              </div>
              <div>
                <strong className="text-[#5D4A3E] block mb-2">婉拒 / 雷點：</strong>
                {renderChips(snapshot.no_gos, 'bad')}
              </div>
              
              <div className="md:col-span-2 pt-3 border-t border-dashed border-[#EAE6E1] mt-2">
                <strong className="text-[#5D4A3E] block mb-2">留言訊息：</strong>
                <div className="bg-[#FBFBF9] border border-[#EAE6E1] p-3 rounded-lg text-[#7A7269] whitespace-pre-wrap leading-relaxed text-[13px] max-h-[120px] overflow-y-auto">
                  {message || <span className="italic opacity-50">此繪師未填寫留言。</span>}
                </div>
              </div>
            </div>
          </div>

          <div className="postcard-actions-wrapper mt-4">
            {children}
          </div>
        </div>
      </div>

      {/* 燈箱 Modal */}
      {lightboxOpen && (
        <div className="lightbox-overlay" onClick={() => setLightboxOpen(false)}>
          <div className="lightbox-content relative" onClick={(e) => e.stopPropagation()}>
            <button className="lightbox-close" onClick={() => setLightboxOpen(false)}>✕</button>
            {images.length > 1 && <button className="lightbox-nav lightbox-prev" onClick={prevImg}>❮</button>}
            <img src={mainImage as string} alt="Enlarged" className="lightbox-img" referrerPolicy="no-referrer" />
            {images.length > 1 && <button className="lightbox-nav lightbox-next" onClick={nextImg}>❯</button>}
            {images.length > 1 && <div className="lightbox-counter">{imgIndex + 1} / {images.length}</div>}
          </div>
        </div>
      )}
    </>
  );
};