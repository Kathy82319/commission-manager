// src/pages/Inbox/OfferList/CardView.tsx
import React, { useState } from 'react';
import { getStatusLabel } from '../utils/formatters';
import { R2_PUBLIC_URL } from '../../public/Wishboard/constants';

interface CardViewProps {
  inquiry: any;
  snapshot: any;
  isExpanded: boolean;
  onToggle: () => void;
  setSelectedInquiry: (inquiry: any) => void;
  setShowDeclineModal: (show: boolean) => void;
  setShowInviteModal: (show: boolean) => void;
  isSelected: boolean; // 🌟 批次選取狀態
  onSelect: () => void; // 🌟 批次選取切換
  handleEnterInquiryWorkspace: (id: string) => void;
  handleViewCommission: (id: string) => void;
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
  setShowInviteModal,
  isSelected,
  onSelect,
  handleEnterInquiryWorkspace,
  handleViewCommission
}) => {
  const canDecline = !['accepted', 'declined', 'closed'].includes(inquiry.inquiry_status);

  // 🌟 1. 根據 Controller 邏輯：投單者資訊在接案模式下對應到 artist_name 欄位
  const clientName = inquiry.artist_name || snapshot.client_name || '匿名委託人';
  const clientId = inquiry.artist_public_id || snapshot.client_public_id || 'unknown';

  // 🌟 2. 圖片路徑清洗與 R2 網域補全
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

  // 🌟 3. 抓取結構化的問題與備註 (由 InquireModal 建立)
  const answers = snapshot.answers || []; 
  const note = unescapeHtml(snapshot.note || snapshot.message || ''); 

  // 🌟 4. 輪播與燈箱狀態管理
  const [imgIdx, setImgIdx] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const nextImg = (e: React.MouseEvent) => {
    e.stopPropagation(); // 🔒 隔離事件，防止觸發卡片展開
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

  return (
    <>
      <div className={`offer-card-container ${isExpanded ? 'is-expanded' : ''}`} onClick={onToggle}>
        

        
        {/* 左側：單張輪播展示 */}
        <div className="offer-card-gallery">
        {/* 🌟 批次選取勾選框 */}
        <div className="card-checkbox-wrapper" onClick={e => e.stopPropagation()}>
          <input 
            type="checkbox" 
            className="card-checkbox" 
            checked={isSelected} 
            onChange={onSelect} 
          />
        </div>
          {validImages.length > 0 ? (
            <div className="offer-carousel-wrapper" onClick={openLightbox}>
              <img 
                src={validImages[imgIdx]} 
                alt={`委託人參考圖 ${imgIdx + 1}`} 
                className="offer-ref-img" 
                referrerPolicy="no-referrer"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
              {validImages.length > 1 && (
                <div className="offer-img-counter">{imgIdx + 1} / {validImages.length}</div>
              )}
              {validImages.length > 1 && (
                <>
                  <button className="offer-img-nav offer-img-prev" onClick={prevImg}>❮</button>
                  <button className="offer-img-nav offer-img-next" onClick={nextImg}>❯</button>
                </>
              )}
              <div className="offer-img-overlay">
                <span className="offer-img-overlay-text">點擊放大</span>
              </div>
            </div>
          ) : (
            <div className="offer-no-img">無附上參考圖</div>
          )}
        </div>

        {/* 右側：內容區塊 */}
        <div className="offer-card-content">
          <div className="offer-card-header">
            <div className="offer-client-info">
              <span className="client-name">{clientName}</span>
              <span className="client-id">@{clientId}</span>
            </div>
            <span className={`inbox-badge status-${inquiry.inquiry_status}`}>
              {getStatusLabel(inquiry.inquiry_status)}
            </span>
          </div>

          {/* 中間：需求內容 (CSS 負責漸層隱藏處理) */}
          <div className="offer-text-area">
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
          </div>

          {/* 底部操作按鈕 */}
          {isExpanded && (
            <div className="offer-actions" onClick={(e) => e.stopPropagation()}>
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
                <button className="btn-primary" onClick={() => { setSelectedInquiry({ ...inquiry, question_template: snapshot.question_template || inquiry.question_template }); setShowInviteModal(true); }}>
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

      {/* 🌟 燈箱 (Lightbox) */}
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