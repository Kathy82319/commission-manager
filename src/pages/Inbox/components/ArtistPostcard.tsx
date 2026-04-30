// src/pages/Inbox/components/ArtistPostcard.tsx
import React, { useState } from 'react';
import { getStatusLabel, renderChips } from '../utils/formatters';

interface ArtistPostcardProps {
  item: any;
  snapshot: any;
  navigate: (path: string) => void;
  children?: React.ReactNode;
}

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
  
  // 🌟 加入 e.stopPropagation() 防止按鈕觸發外層的放大燈箱
  const nextImg = (e: React.MouseEvent) => { 
    e.stopPropagation(); 
    setImgIndex((prev) => (prev + 1) % images.length); 
  };
  const prevImg = (e: React.MouseEvent) => { 
    e.stopPropagation(); 
    setImgIndex((prev) => (prev - 1 + images.length) % images.length); 
  };

  const artistName = item.artist_name || snapshot.artist_name || '匿名繪師';
  const artistId = item.artist_public_id || snapshot.artist_public_id || 'unknown';
  const message = unescapeHtml(snapshot.message || item.message || '');

  return (
    <>
      <div className="postcard-container">
        <div className={`postcard-stamp stamp-${item.inquiry_status}`}>
          {getStatusLabel(item.inquiry_status)}
        </div>

        {/* 🌟 左側圖片區塊 (完全套用我們剛才寫好的 CSS) */}
        <div className="postcard-image-section" onClick={openLightbox} title={images.length > 0 ? "點擊放大檢視" : ""}>
          {images.length > 0 ? (
            <>
              {/* 🔒 資安防護：加入 referrerPolicy 防止外部圖床追蹤 */}
              <img 
                src={mainImage as string} 
                alt="Reference" 
                className="postcard-image" 
                referrerPolicy="no-referrer" 
              />
              
              {/* 🌟 左右輪播按鈕 (純 CSS 控制顯示與隱藏) */}
              {images.length > 1 && (
                <>
                  <button onClick={prevImg} className="postcard-img-nav postcard-img-prev">❮</button>
                  <button onClick={nextImg} className="postcard-img-nav postcard-img-next">❯</button>
                  <div className="postcard-image-count">
                    {imgIndex + 1} / {images.length} 張附圖
                  </div>
                </>
              )}

              <div className="postcard-image-overlay">
                <span>點擊放大</span>
              </div>
            </>
          ) : (
            <div className="postcard-image-fallback">
              <span className="flex flex-col items-center gap-2">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-50"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                無附圖提案
              </span>
            </div>
          )}
        </div>

        {/* 右側內容區塊 (維持原樣) */}
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

          {/* 🌟 婉拒理由高內聚：在按鈕上方顯示，收進卡片內部 */}
          {item.inquiry_status === 'declined' && item.decline_reason && (
            <div className="mt-4 bg-[#FCE8E6] p-3 rounded-lg border border-[#F5C6C6] text-[#A05C5C] text-[13px] leading-relaxed">
              <strong className="block mb-1">終止/婉拒理由：</strong>
              {item.decline_reason}
            </div>
          )}

          <div className="postcard-actions-wrapper mt-4">
            {children}
          </div>
        </div>
      </div>

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