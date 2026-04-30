// src/pages/Inbox/OfferList/CardView.tsx
import React from 'react';
import { getStatusLabel } from '../utils/formatters';

// 🌟 從許願池引入圖床常數
import { R2_PUBLIC_URL } from '../../public/Wishboard/constants';

interface CardViewProps {
  inquiry: any;
  snapshot: any;
  isExpanded: boolean;
  onToggle: () => void;
  setSelectedInquiry: (inquiry: any) => void;
  setShowDeclineModal: (show: boolean) => void;
  setShowInviteModal: (show: boolean) => void;
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
  handleEnterInquiryWorkspace,
  handleViewCommission
}) => {
  const canDecline = !['accepted', 'declined', 'closed'].includes(inquiry.inquiry_status);

  // 🌟 1. 精準屬性映射 (Property Mapping)
  const clientName = inquiry.client_name || '匿名委託人';
  
  // 因為目前的 SQL 沒有撈取 client_public_id，我們先用 client_id 的前 8 碼代替，或者直接顯示一個預設字串
  // 如果你需要精確的 @ID，請記得去修改 worker 裡的 SQL 加上 u.public_id as client_public_id
  const clientId = inquiry.client_public_id || (inquiry.client_id ? inquiry.client_id.substring(0,8) : 'unknown');

  // 🌟 2. 圖片路徑清洗
  let images: string[] = [];
  try {
    // 案主投單的圖存在 snapshot.images 中
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
  const validImages = images.filter(Boolean).map(getFullUrl).slice(0, 3);

  // 🌟 3. 抓取真正填寫的內容 (確定是存在 message 裡)
  const message = unescapeHtml(snapshot.message || '');
  const fallbackResponse = unescapeHtml(inquiry.client_response || '');

  return (
    <div className={`offer-card-container ${isExpanded ? 'is-expanded' : ''}`} onClick={onToggle}>
      
      {/* 左側：參考圖 Grid 排版 */}
      <div className={`offer-card-gallery img-count-${validImages.length || 0}`}>
        {validImages.length > 0 ? (
          validImages.map((img: string, idx: number) => (
            <img 
              key={idx} 
              src={img} 
              alt={`委託人參考圖 ${idx + 1}`} 
              className="offer-ref-img" 
              referrerPolicy="no-referrer"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          ))
        ) : (
          <div className="offer-no-img">無附上參考圖</div>
        )}
      </div>

      {/* 右側：內容區塊 */}
      <div className="offer-card-content">
        
        {/* 頂部：案主名稱 + 狀態 */}
        <div className="offer-card-header">
          <div className="offer-client-info">
            <span className="client-name">{clientName}</span>
            <span className="client-id">@{clientId}</span>
          </div>
          <span className={`inbox-badge status-${inquiry.inquiry_status}`}>
            {getStatusLabel(inquiry.inquiry_status)}
          </span>
        </div>

        {/* 中間：需求與備註 */}
        <div className="offer-text-area">
          {message ? (
            <div className="qa-block">
              <div className="q-text">委託需求內容：</div>
              {/* 🔒 資安防護：React 預設防 XSS */}
              <div className="a-text">{message}</div>
            </div>
          ) : fallbackResponse ? (
            <div className="qa-block">
              <div className="q-text">回填需求單：</div>
              <div className="a-text">{fallbackResponse}</div>
            </div>
          ) : (
            <div className="text-[#A0978D] text-sm italic mt-2">此委託人尚未填寫詳細需求說明。</div>
          )}
        </div>

        {/* 底部操作按鈕 */}
        {isExpanded && (
          <div className="offer-actions" onClick={(e) => e.stopPropagation() /* 🔒 防止觸發卡片收合 */}>
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
  );
};