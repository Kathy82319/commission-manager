// src/pages/Inbox/OfferList/CardView.tsx
import React from 'react';
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

  // 🌟 1. 抓取案主名稱與 ID (投單者被紀錄在 artist_id 欄位中)
  const clientName = inquiry.artist_name || snapshot.client_name || '匿名委託人';
  const clientId = inquiry.artist_public_id || snapshot.client_public_id || 'unknown';

  // 🌟 2. 圖片處理
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
  const validImages = images.filter(Boolean).map(getFullUrl).slice(0, 3);

  // 🌟 3. 抓取結構化的問題與備註
  const answers = snapshot.answers || []; // 新增的結構化資料
  const note = unescapeHtml(snapshot.note || snapshot.message || ''); // 如果沒有 answers，備註就會是揉在一起的字串

  return (
    <div className={`offer-card-container ${isExpanded ? 'is-expanded' : ''}`} onClick={onToggle}>
      
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

        <div className="offer-text-area">
          {answers.length > 0 ? (
            <>
              {answers.map((ans: any, idx: number) => (
                <div key={idx} className="qa-block">
                  <div className="q-text">Q: {unescapeHtml(ans.question)}</div>
                  <div className="a-text">A: {unescapeHtml(ans.answer) || '無填寫'}</div>
                </div>
              ))}
              {/* 將純文字備註獨立顯示出來 */}
              {snapshot.message && (
                <div className="qa-block note-block mt-4">
                  <div className="q-text">備註：</div>
                  <div className="a-text">{unescapeHtml(snapshot.message)}</div>
                </div>
              )}
            </>
          ) : note ? (
            // 💡 相容舊資料：如果這筆單是之前投的，只有 message，就顯示它
            <div className="qa-block">
              <div className="q-text">委託需求內容：</div>
              <div className="a-text">{note}</div>
            </div>
          ) : (
            <div className="text-[#A0978D] text-sm italic mt-2">此委託人尚未填寫詳細需求說明。</div>
          )}
        </div>

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