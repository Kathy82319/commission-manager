// src/pages/Inbox/OfferList/CardView.tsx
import React from 'react';
import { getStatusLabel } from '../utils/formatters';

// 💡 如果你的 R2_PUBLIC_URL 是存在 env 或其他常數檔，可以替換這裡的 import
// 例如: import { R2_PUBLIC_URL } from '../../public/Wishboard/constants';
const R2_PUBLIC_URL = import.meta.env.VITE_R2_PUBLIC_URL || 'https://pub-your-r2-url.r2.dev'; // 請確保這裡的網址正確

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

// 🌟 從 WishCard 移植的解碼函式
const unescapeHtml = (str: string) => {
  if (!str) return '';
  return str.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#039;/g, "'");
};

export const CardView: React.FC<CardViewProps> = ({
  inquiry,
  snapshot, // 注意：這裡的 snapshot 是上一層已經 try-catch 解析過的物件
  isExpanded,
  onToggle,
  setSelectedInquiry,
  setShowDeclineModal,
  setShowInviteModal,
  handleEnterInquiryWorkspace,
  handleViewCommission
}) => {
  const canDecline = !['accepted', 'declined', 'closed'].includes(inquiry.inquiry_status);

  // 🌟 1. 處理案主名稱與 ID (考慮多種欄位命名可能性)
  const clientName = snapshot.client_name || inquiry.client_name || inquiry.sender_name || '匿名案主';
  const clientId = snapshot.client_public_id || inquiry.client_public_id || 'unknown';
  
  // 🌟 2. 處理預算與排單 (若無則顯示未提供)
  const budgetMin = snapshot.budget_min || inquiry.budget_min || '';
  const budgetMax = snapshot.budget_max || inquiry.budget_max || '';
  const budgetDisplay = budgetMin && budgetMax ? `$${budgetMin} ~ $${budgetMax}` : (budgetMin || budgetMax ? `$${budgetMin || budgetMax}` : '依繪師報價 / 未提供');
  
  const scheduleType = snapshot.schedule_type || inquiry.schedule_type || 'flexible';
  const specificDate = snapshot.specific_date || inquiry.specific_date || '';

  // 🌟 3. 處理圖片與 R2 網域補全 (移植 WishCard 邏輯)
  let images: string[] = [];
  try {
    const rawImageStr = snapshot.images || snapshot.ref_images || inquiry.ref_images || inquiry.ref_image_key || '[]';
    // 若本來就是陣列就直接用，若是字串則嘗試解碼並 parse
    if (Array.isArray(rawImageStr)) {
      images = rawImageStr;
    } else {
      const parsed = JSON.parse(unescapeHtml(rawImageStr));
      images = Array.isArray(parsed) ? parsed : [parsed];
    }
  } catch {
    // 若 Parse 失敗，嘗試直接當作單一網址字串
    const fallbackStr = snapshot.images || snapshot.ref_images || inquiry.ref_images || inquiry.ref_image_key;
    images = fallbackStr ? [unescapeHtml(fallbackStr)] : [];
  }

  // 補全 R2 URL
  const getFullUrl = (url: string) => {
    if (!url) return '';
    return url.startsWith('http') ? url : `${R2_PUBLIC_URL}/${url}`;
  };
  const validImages = images.filter(Boolean).map(getFullUrl).slice(0, 3); // 最多取3張

  // 🌟 4. 處理問答與備註
  const answers = snapshot.answers || snapshot.custom_answers || []; 
  const note = unescapeHtml(snapshot.note || snapshot.remark || '');
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
              alt={`案主參考圖 ${idx + 1}`} 
              className="offer-ref-img" 
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.style.display = 'none'; // 圖片損毀時隱藏，避免破版
              }}
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

        {/* 預算與排單標籤 */}
        <div className="offer-tags">
          <span className="tag-budget">💰 預算：{budgetDisplay}</span>
          <span className="tag-schedule">📅 排單：{scheduleType === 'flexible' ? '可接受排單' : `指定日期: ${specificDate}`}</span>
        </div>

        {/* 中間：問答與備註 */}
        <div className="offer-text-area">
          {answers.length > 0 ? (
            answers.map((ans: any, idx: number) => (
              <div key={idx} className="qa-block">
                <div className="q-text">Q: {unescapeHtml(ans.question)}</div>
                <div className="a-text">A: {unescapeHtml(ans.answer) || '無填寫'}</div>
              </div>
            ))
          ) : (
            fallbackResponse ? (
              <div className="qa-block">
                <div className="q-text">回填需求單：</div>
                <div className="a-text">{fallbackResponse}</div>
              </div>
            ) : (
              <div className="text-[#A0978D] text-sm italic mt-2">此案主尚未填寫詳細需求說明。</div>
            )
          )}

          {note && (
            <div className="qa-block note-block mt-4">
              <div className="q-text">備註：</div>
              <div className="a-text">{note}</div>
            </div>
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
  );
};