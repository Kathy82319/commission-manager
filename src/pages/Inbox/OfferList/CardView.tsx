// src/pages/Inbox/OfferList/CardView.tsx
import React, { useState } from 'react';
import { getStatusLabel, renderChips } from '../utils/formatters';
import { R2_PUBLIC_URL } from '../../public/Wishboard/constants';
import { Ban } from 'lucide-react'; 

interface CardViewProps {
  inquiry: any;
  snapshot: any;
  setSelectedInquiry: (inquiry: any) => void;
  setShowDeclineModal: (show: boolean) => void;
  handleDirectInvite: (inquiry: any) => void;
  isSelected: boolean; 
  onSelect: () => void; 
  handleEnterInquiryWorkspace: (id: string) => void;
  handleViewCommission: (id: string) => void;
  blacklistedIds?: string[]; 
}

const unescapeHtml = (str: string) => {
  if (!str) return '';
  return str.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#039;/g, "'");
};

export const CardView: React.FC<CardViewProps> = ({
  inquiry,
  snapshot,
  setShowDeclineModal,
  handleDirectInvite,
  isSelected,
  onSelect,
  handleEnterInquiryWorkspace,
  handleViewCommission,
  blacklistedIds = [] 
}) => {
  const canDecline = !['accepted', 'declined', 'closed'].includes(inquiry.inquiry_status);
  const isDeclined = inquiry.inquiry_status === 'declined';

  const clientName = inquiry.artist_name || snapshot.client_name || '匿名繪師';
  const clientId = inquiry.artist_public_id || snapshot.client_public_id || 'unknown';
  const isBlacklisted = blacklistedIds.includes(inquiry.artist_id);

  let images: string[] = [];
  try {
    const rawImageStr = snapshot.images || '[]';
    if (Array.isArray(rawImageStr)) {
      images = rawImageStr;
    } else {
      const parsed = JSON.parse(unescapeHtml(rawImageStr));
      images = Array.isArray(parsed) ? parsed : [parsed];
    }
  } catch {
    images = snapshot.images ? [unescapeHtml(snapshot.images)] : [];
  }

  const getFullUrl = (url: string) => {
    if (!url) return '';
    return url.startsWith('http') ? url : `${R2_PUBLIC_URL}/${url}`;
  };
  const validImages = images.filter(Boolean).map(getFullUrl).slice(0, 5);
  const note = unescapeHtml(snapshot.note || snapshot.message || ''); 

  const [imgIdx, setImgIdx] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const nextImg = (e: React.MouseEvent) => { e.stopPropagation(); setImgIdx((prev) => (prev + 1) % validImages.length); };
  const prevImg = (e: React.MouseEvent) => { e.stopPropagation(); setImgIdx((prev) => (prev - 1 + validImages.length) % validImages.length); };
  const openLightbox = (e: React.MouseEvent) => { e.stopPropagation(); if (validImages.length > 0) setLightboxOpen(true); };

  return (
    <>
      <div 
        style={{ 
          display: 'flex', flexDirection: 'column', height: '100%', 
          background: isDeclined ? '#F9F9F9' : '#FFFFFF', 
          border: `1px solid ${isBlacklisted ? '#EF4444' : (isSelected ? '#4A7294' : '#EAE6E1')}`, 
          borderRadius: '12px', overflow: 'hidden', 
          boxShadow: isSelected ? '0 0 0 2px #4A7294' : '0 4px 12px rgba(0,0,0,0.03)',
          filter: isDeclined ? 'grayscale(50%)' : 'none',
          opacity: isDeclined ? 0.7 : 1,
          transition: 'all 0.2s', position: 'relative'
        }} 
      >
        {/* 勾選框 */}
        <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', top: '12px', left: '12px', zIndex: 10 }}>
          <input type="checkbox" checked={isSelected} onChange={onSelect} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
        </div>

        {/* 狀態標籤 */}
        <div style={{ position: 'absolute', top: '12px', right: '12px', zIndex: 10 }}>
          <span className={`status-${inquiry.inquiry_status}`} style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(4px)', border: '1px solid rgba(0,0,0,0.1)', color: '#5D4A3E' }}>
            {getStatusLabel(inquiry.inquiry_status)}
          </span>
        </div>

        {/* 頂部圖片區 */}
        <div style={{ height: '180px', width: '100%', backgroundColor: '#F4F4F1', position: 'relative' }} onClick={openLightbox}>
          {validImages.length > 0 ? (
            <>
              <img src={validImages[imgIdx]} alt="預覽圖" style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }} referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
              {validImages.length > 1 && (
                <>
                  <button onClick={prevImg} style={{ position: 'absolute', left: '4px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer' }}>❮</button>
                  <button onClick={nextImg} style={{ position: 'absolute', right: '4px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer' }}>❯</button>
                  <div style={{ position: 'absolute', bottom: '8px', right: '8px', background: 'rgba(0,0,0,0.6)', color: 'white', fontSize: '10px', padding: '2px 6px', borderRadius: '4px' }}>
                    {imgIdx + 1} / {validImages.length}
                  </div>
                </>
              )}
            </>
          ) : (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#A0978D', fontSize: '13px' }}>
              無附上參考圖
            </div>
          )}
        </div>

        {/* 下半部資訊區 */}
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 'bold', color: '#5D4A3E', fontSize: '16px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={clientName}>{clientName}</div>
              <div style={{ color: '#A0978D', fontSize: '12px', fontFamily: 'monospace' }}>@{clientId}</div>
            </div>
            {/* 🌟 修正：把 title 移到外層的 span 上 */}
            {isBlacklisted && (
              <span title="黑名單繪師" style={{ display: 'flex', alignItems: 'center' }}>
                <Ban size={16} color="#EF4444" />
              </span>
            )}
          </div>

          <div style={{ fontSize: '12px', marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {snapshot.specialties && (
              <div><strong style={{ color: '#4A7294' }}>擅長：</strong> {renderChips(snapshot.specialties, 'good')}</div>
            )}
            {note && (
              <div style={{ color: '#7A7269', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', backgroundColor: '#FBFBF9', padding: '8px', borderRadius: '6px', border: '1px solid #EAE6E1' }}>
                {note}
              </div>
            )}
          </div>

          {/* 底部操作按鈕 */}
          <div style={{ marginTop: 'auto', display: 'flex', gap: '8px', paddingTop: '12px', borderTop: '1px solid #F0ECE7' }}>
            {canDecline && (
              <button 
                onClick={() => setShowDeclineModal(true)}
                style={{ flex: 1, padding: '8px', backgroundColor: '#FFFFFF', color: '#EF4444', border: '1px solid #FECACA', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                {inquiry.inquiry_status === 'pending' ? '婉拒' : '終止'}
              </button>
            )}
            {inquiry.inquiry_status === 'pending' && (
              <button 
                onClick={() => handleDirectInvite(inquiry)}
                style={{ flex: 2, padding: '8px', backgroundColor: '#4A7294', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                邀請詳談
              </button>
            )}
            {(inquiry.inquiry_status === 'submitted' || inquiry.inquiry_status === 'proposed') && (
              <button 
                onClick={() => handleEnterInquiryWorkspace(inquiry.inquiry_id)}
                style={{ flex: 1, padding: '8px', backgroundColor: '#5D4A3E', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                進入聊天室
              </button>
            )}
            {inquiry.inquiry_status === 'accepted' && (
              <button 
                onClick={() => handleViewCommission(inquiry.commission_id)}
                style={{ flex: 1, padding: '8px', backgroundColor: '#4E7A5A', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                前往委託單
              </button>
            )}
          </div>
        </div>
      </div>

      {lightboxOpen && (
        <div className="lightbox-overlay" onClick={() => setLightboxOpen(false)} style={{ zIndex: 99999 }}>
          <div className="lightbox-content relative" onClick={(e) => e.stopPropagation()}>
            <button className="lightbox-close" onClick={() => setLightboxOpen(false)}>✕</button>
            {validImages.length > 1 && <button className="lightbox-nav lightbox-prev" onClick={prevImg}>❮</button>}
            <img src={validImages[imgIdx]} alt="放大檢視" className="lightbox-img" referrerPolicy="no-referrer" />
            {validImages.length > 1 && <button className="lightbox-nav lightbox-next" onClick={nextImg}>❯</button>}
          </div>
        </div>
      )}
    </>
  );
};