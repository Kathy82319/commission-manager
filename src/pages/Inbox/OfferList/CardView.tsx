// src/pages/Inbox/OfferList/CardView.tsx
import React, { useState, useRef, useEffect } from 'react';
import { getStatusLabel, getExpiryInfo } from '../utils/formatters';
import { R2_PUBLIC_URL } from '../../public/Wishboard/constants';
import { Ban } from 'lucide-react'; 

interface CardViewProps {
  inquiry: any;
  snapshot: any;
  isExpanded: boolean;
  onToggle: () => void;
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
  isExpanded,
  onToggle,
  setSelectedInquiry,
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

  const clientName = inquiry.artist_name || snapshot.client_name || '匿名委託人';
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

  const answers = snapshot.answers || []; 
  const note = unescapeHtml(snapshot.note || snapshot.message || ''); 

  const [imgIdx, setImgIdx] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const contentRef = useRef<HTMLDivElement>(null);
  const [needsExpansion, setNeedsExpansion] = useState(false);

  useEffect(() => {
    if (contentRef.current) {
      if (contentRef.current.scrollHeight > 130) {
        setNeedsExpansion(true);
      } else {
        setNeedsExpansion(false);
      }
    }
  }, [answers, note, inquiry.decline_reason]);

  const nextImg = (e: React.MouseEvent) => {
    e.stopPropagation();
    setImgIdx((prev) => (prev + 1) % validImages.length);
  };
  const prevImg = (e: React.MouseEvent) => {
    e.stopPropagation();
    setImgIdx((prev) => (prev - 1 + validImages.length) % validImages.length);
  };
  const openLightbox = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (validImages.length > 0) setLightboxOpen(true);
  };

  const expiryInfo = getExpiryInfo(inquiry.expires_at);

  return (
    <>
      <div 
        className={`offer-card-container ${isExpanded ? 'is-expanded' : ''}`} 
        onClick={onToggle}
        style={{ cursor: 'pointer', display: 'flex', position: 'relative' }} 
      >
        
        
        <div 
          className="offer-card-gallery" 
          style={{ 
            width: '220px',      
            minWidth: '220px',   
            flexShrink: 0, 
            maxHeight: (!isExpanded && needsExpansion) ? '180px' : '350px',
            overflow: 'hidden',
            position: 'relative'
          }}
        >
          <div className="card-checkbox-wrapper" onClick={e => e.stopPropagation()} style={{ position: 'absolute', top: '8px', left: '8px', zIndex: 10 }}>
            <input 
              type="checkbox" 
              className="card-checkbox" 
              checked={isSelected} 
              onChange={onSelect} 
            />
          </div>
          {validImages.length > 0 ? (
            <div className="offer-carousel-wrapper" onClick={openLightbox} style={{ height: '100%', width: '100%' }}>
              <img 
                src={validImages[imgIdx]} 
                alt={`委託人參考圖 ${imgIdx + 1}`} 
                className="offer-ref-img" 
                referrerPolicy="no-referrer"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
              />
              {validImages.length > 1 && (
                <div className="offer-img-counter" style={{ position: 'absolute', bottom: '8px', right: '8px', background: 'rgba(0,0,0,0.6)', color: 'white', fontSize: '11px', padding: '2px 6px', borderRadius: '4px' }}>
                  {imgIdx + 1} / {validImages.length}
                </div>
              )}
              {validImages.length > 1 && (
                <>
                  <button className="offer-img-nav offer-img-prev" onClick={prevImg} style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)' }}>❮</button>
                  <button className="offer-img-nav offer-img-next" onClick={nextImg} style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)' }}>❯</button>
                </>
              )}
            </div>
          ) : (
            <div className="offer-no-img" style={{ height: '100%', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F4F4F1', color: '#A0978D', fontSize: '12px' }}>
              無附上參考圖
            </div>
          )}
        </div>

        
        <div className="offer-card-content" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <div className="offer-card-header">
            <div className="offer-client-info flex flex-wrap items-center gap-2">
              <span className="client-name">{clientName}</span>
              <span className="client-id">@{clientId}</span>
              {inquiry.inquiry_status === 'pending' && inquiry.expires_at && (
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold border ${expiryInfo.className}`}>
                  ⏳ {expiryInfo.text}
                </span>
              )}
              
              {isBlacklisted && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#FEF2F2', color: '#EF4444', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', border: '1px solid #FECACA' }}>
                  <Ban size={12} /> 黑名單繪師
                </span>
              )}
            </div>
            <span className={`inbox-badge status-${inquiry.inquiry_status}`}>
              {getStatusLabel(inquiry.inquiry_status)}
            </span>
          </div>

          <div 
            className="offer-text-area" 
            ref={contentRef}
            style={{
              maxHeight: (!isExpanded && needsExpansion) ? '120px' : 'none',
              overflow: 'hidden',
              wordBreak: 'break-word',
              overflowWrap: 'anywhere',
              position: 'relative'
            }}
          >
            {answers.length > 0 ? (
              <>
                {answers.map((ans: any, idx: number) => (
                  <div key={idx} className="qa-block">
                    <div className="q-text">Q: {unescapeHtml(ans.question)}</div>
                    <div className="a-text">A: {unescapeHtml(ans.answer) || '無填寫'}</div>
                  </div>
                ))}
                {snapshot.message && (
                  <div className="qa-block note-block mt-4">
                    <div className="q-text">備註：</div>
                    <div className="a-text">{unescapeHtml(snapshot.message)}</div>
                  </div>
                )}
              </>
            ) : note ? (
              <div className="qa-block">
                <div className="q-text">委託需求內容：</div>
                <div className="a-text">{note}</div>
              </div>
            ) : (
              <div className="text-[#A0978D] text-sm italic mt-2">此委託人尚未填寫詳細需求說明。</div>
            )}

            {isDeclined && inquiry.decline_reason && (
              <div className="qa-block mt-4" style={{ background: '#FEF2F2', padding: '12px', borderRadius: '8px', borderLeft: '4px solid #EF4444' }}>
                <div className="q-text" style={{ color: '#EF4444', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '14px', lineHeight: 1 }}>⚠</span> 終止/撤回原因：
                </div>
                <div className="a-text" style={{ color: '#A05C5C', marginTop: '4px' }}>
                  {inquiry.decline_reason}
                </div>
              </div>
            )}
          </div>

          {!isExpanded && needsExpansion && (
            <div style={{
              height: '40px',
              background: 'linear-gradient(transparent, #FFFFFF 80%)',
              marginTop: '-40px',
              position: 'relative',
              zIndex: 2,
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center',
              paddingBottom: '4px',
              color: '#A67B3E',
              fontSize: '12px',
              fontWeight: 'bold'
            }}>
              ▼ 點擊展開完整內容與操作
            </div>
          )}

          {(isExpanded || !needsExpansion) && (
            <div className="offer-actions" onClick={(e) => e.stopPropagation()} style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              {(inquiry.inquiry_status === 'submitted' || inquiry.inquiry_status === 'proposed') && (
                <button className="btn-primary" onClick={() => handleEnterInquiryWorkspace(inquiry.inquiry_id)}>
                  💬 進入聊天室
                </button>
              )}
              {inquiry.inquiry_status === 'accepted' && (
                <button className="btn-success" onClick={() => handleViewCommission(inquiry.commission_id)}>
                  前往正式委託單
                </button>
              )}
              {inquiry.inquiry_status === 'pending' && (
                <button className="btn-primary" onClick={() => handleDirectInvite(inquiry)}>
                  ✉️ 邀請詳談
                </button>
              )}
              {canDecline && (
                <button className="btn-secondary-red" onClick={() => { setSelectedInquiry(inquiry); setShowDeclineModal(true); }}>
                  {inquiry.inquiry_status === 'pending' ? '禮貌婉拒' : '終止洽談'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {lightboxOpen && (
        <div className="lightbox-overlay" onClick={() => setLightboxOpen(false)}>
          <div className="lightbox-content relative" onClick={(e) => e.stopPropagation()}>
            <button className="lightbox-close" onClick={() => setLightboxOpen(false)}>✕</button>
            {validImages.length > 1 && <button className="lightbox-nav lightbox-prev" onClick={prevImg}>❮</button>}
            <img src={validImages[imgIdx]} alt="放大檢視" className="lightbox-img" referrerPolicy="no-referrer" />
            {validImages.length > 1 && <button className="lightbox-nav lightbox-next" onClick={nextImg}>❯</button>}
            {validImages.length > 1 && <div className="lightbox-counter">{imgIdx + 1} / {validImages.length}</div>}
          </div>
        </div>
      )}
    </>
  );
};