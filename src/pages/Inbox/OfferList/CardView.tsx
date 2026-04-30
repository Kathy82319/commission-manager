// src/pages/Inbox/OfferList/CardView.tsx
import React, { useState } from 'react';
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

  // 🌟 容錯資料抓取 (Fallback Extraction)
  // 為了防止取不到值，我們同時檢查 snapshot 與 inquiry 本身
  const clientName = snapshot.client_name || inquiry.client_name || inquiry.user_name || '匿名案主';
  const clientId = snapshot.client_public_id || inquiry.client_public_id || 'unknown';
  
  const budgetMin = snapshot.budget_min || inquiry.budget_min || '?';
  const budgetMax = snapshot.budget_max || inquiry.budget_max || '?';
  const scheduleType = snapshot.schedule_type || inquiry.schedule_type || 'flexible';
  const specificDate = snapshot.specific_date || inquiry.specific_date || '未指定';

  // 整理圖片：過濾掉空字串或 null，確保陣列裡都是真實的圖片路徑
  const rawImages = snapshot.images || snapshot.ref_images || inquiry.ref_images || [];
  const images = Array.isArray(rawImages) ? rawImages.filter(Boolean).slice(0, 3) : [];

  // 整理問答：防範未填寫的情況
  const answers = snapshot.answers || snapshot.custom_answers || []; 
  const note = snapshot.note || snapshot.remark || '';
  const fallbackResponse = inquiry.client_response || '';

  return (
    <div className={`offer-card-container ${isExpanded ? 'is-expanded' : ''}`} onClick={onToggle}>
      
      {/* 🌟 左側：1~3張參考圖 (Grid 排版) */}
      <div className={`offer-card-gallery img-count-${images.length || 0}`}>
        {images.length > 0 ? (
          images.map((img: string, idx: number) => (
            // 🔒 資安防護：
            // 1. referrerPolicy 防追蹤。
            // 2. onError: 若 URL 損毀（例如只有 R2 key 沒有網域），自動隱藏圖片，防止 UI 破版。
            <img 
              key={idx} 
              src={img} 
              alt={`參考圖 ${idx + 1}`} 
              className="offer-ref-img" 
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
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
            <span className="client-name">{clientName}</span>
            <span className="client-id">@{clientId}</span>
          </div>
          <span className={`inbox-badge status-${inquiry.inquiry_status}`}>
            {getStatusLabel(inquiry.inquiry_status)}
          </span>
        </div>

        {/* 預算與排單標籤 */}
        <div className="offer-tags">
          <span className="tag-budget">💰 預算：{budgetMin} ~ {budgetMax}</span>
          <span className="tag-schedule">📅 排單：{scheduleType === 'flexible' ? '可接受排單' : specificDate}</span>
        </div>

        {/* 中間：問答與備註 */}
        <div className="offer-text-area">
          {answers.length > 0 ? (
            answers.map((ans: any, idx: number) => (
              <div key={idx} className="qa-block">
                <div className="q-text">Q: {ans.question}</div>
                {/* 🔒 React 預設防 XSS */}
                <div className="a-text">A: {ans.answer || '無填寫'}</div>
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