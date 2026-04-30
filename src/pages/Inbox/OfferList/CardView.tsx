// src/pages/Inbox/OfferList/CardView.tsx
import React from 'react';
import { getStatusLabel } from '../utils/formatters';

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

  // 整理圖片：最多取 3 張
  const rawImages = snapshot.images || snapshot.ref_images || [];
  const images = Array.isArray(rawImages) ? rawImages.slice(0, 3) : [];

  // 整理問答：假設 snapshot 內有紀錄案主的問答，若無則降級顯示 client_response
  const answers = snapshot.answers || []; 
  const note = snapshot.note || '';
  const fallbackResponse = inquiry.client_response || '';

  return (
    <div className={`offer-card-container ${isExpanded ? 'is-expanded' : ''}`} onClick={onToggle}>
      
      {/* 🌟 左側：1~3張參考圖 (Grid 排版) */}
      <div className={`offer-card-gallery img-count-${images.length}`}>
        {images.length > 0 ? (
          images.map((img: string, idx: number) => (
            // 🔒 資安防護：防外部圖片追蹤
            <img key={idx} src={img} alt={`參考圖 ${idx + 1}`} className="offer-ref-img" referrerPolicy="no-referrer" />
          ))
        ) : (
          <div className="offer-no-img">無參考圖</div>
        )}
      </div>

      {/* 🌟 右側：內容區塊 */}
      <div className="offer-card-content">
        
        {/* 頂部：案主名稱 + 狀態 */}
        <div className="offer-card-header">
          <div className="offer-client-info">
            <span className="client-name">{inquiry.client_name || '匿名案主'}</span>
            <span className="client-id">@{inquiry.client_public_id || 'unknown'}</span>
          </div>
          <span className={`inbox-badge status-${inquiry.inquiry_status}`}>
            {getStatusLabel(inquiry.inquiry_status)}
          </span>
        </div>

        {/* 預算與排單標籤 */}
        <div className="offer-tags">
          <span className="tag-budget">💰 預算：{inquiry.budget_min}~{inquiry.budget_max}</span>
          <span className="tag-schedule">📅 排單：{inquiry.schedule_type === 'flexible' ? '可接受排單' : inquiry.specific_date}</span>
        </div>

        {/* 中間：問答與備註 (未展開時會套用 line-clamp 隱藏) */}
        <div className="offer-text-area">
          {answers.length > 0 ? (
            answers.map((ans: any, idx: number) => (
              <div key={idx} className="qa-block">
                <div className="q-text">Q: {ans.question}</div>
                {/* 🔒 資安防護：React 預設防 XSS */}
                <div className="a-text">A: {ans.answer}</div>
              </div>
            ))
          ) : (
            fallbackResponse && (
              <div className="qa-block">
                <div className="q-text">回填需求單：</div>
                <div className="a-text">{fallbackResponse}</div>
              </div>
            )
          )}

          {note && (
            <div className="qa-block note-block">
              <div className="q-text">備註：</div>
              <div className="a-text">{note}</div>
            </div>
          )}
        </div>

        {/* 底部操作按鈕 (只有展開時，或手機版為了方便操作才顯示) */}
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