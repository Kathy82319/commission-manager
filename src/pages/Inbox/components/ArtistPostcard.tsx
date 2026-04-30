// src/pages/Inbox/components/ArtistPostcard.tsx
import React, { useState } from 'react';
import { getStatusLabel, renderChips } from '../utils/formatters';

interface ArtistPostcardProps {
  item: any;
  snapshot: any;
  navigate: (path: string) => void;
  children?: React.ReactNode;
}

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
  const nextImg = (e: React.MouseEvent) => { e.stopPropagation(); setImgIndex((prev) => (prev + 1) % images.length); };
  const prevImg = (e: React.MouseEvent) => { e.stopPropagation(); setImgIndex((prev) => (prev - 1 + images.length) % images.length); };

  return (
    <>
      <div className="postcard-container relative">
        <div className={`postcard-stamp stamp-${item.inquiry_status}`}>
          {getStatusLabel(item.inquiry_status)}
        </div>

        <div className="postcard-image-section cursor-pointer group" onClick={openLightbox} title={images.length > 0 ? "點擊放大檢視" : ""}>
          {images.length > 0 ? (
            <>
              {/* 🔒 資安防護：加入 referrerPolicy 防止外部圖床追蹤 */}
              <img src={images[0]} alt="Reference" className="postcard-image transition duration-300 group-hover:scale-105" referrerPolicy="no-referrer" />
              {images.length > 1 && (
                <div className="postcard-image-count">
                  1 / {images.length} 張附圖
                </div>
              )}
              <div className="postcard-image-overlay">
                <span className="text-white text-sm bg-black bg-opacity-50 px-3 py-1 rounded-full backdrop-blur-sm">點擊放大</span>
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

        <div className="postcard-content-section flex flex-col h-full justify-between">
          <div>
            <div className="postcard-header">
              {item.artist_avatar ? (
                // 🔒 資安防護：加入 referrerPolicy
                <img src={item.artist_avatar} alt="Avatar" className="postcard-avatar cursor-pointer" onClick={handleArtistClick} title="點擊前往繪師個人頁" referrerPolicy="no-referrer" />
              ) : (
                <div className="postcard-avatar-fallback cursor-pointer" onClick={handleArtistClick} title="點擊前往繪師個人頁">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                </div>
              )}
              
              <div className="flex-1">
                <div className="flex items-center gap-2 text-xs text-[#A0978D] mb-1">
                  <span>投遞繪師</span>
                </div>
                <span className="postcard-artist-name block truncate" onClick={handleArtistClick} title="前往繪師個人頁">
                  {item.artist_name || '匿名繪師'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm mt-4 mb-4">
              <div>
                <strong className="text-[#5D4A3E] block mb-1">舒適圈 / 擅長題材：</strong>
                {renderChips(snapshot.specialties, 'good')}
              </div>
              <div>
                <strong className="text-[#5D4A3E] block mb-1">婉拒 / 雷點：</strong>
                {renderChips(snapshot.no_gos, 'bad')}
              </div>
              <div className="md:col-span-2 pt-2">
                <strong className="text-[#5D4A3E] block mb-1">付款方式與條件：</strong>
                {renderChips(snapshot.payment_methods, 'info')}
              </div>
            </div>
          </div>

          <div className="postcard-actions-wrapper">
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