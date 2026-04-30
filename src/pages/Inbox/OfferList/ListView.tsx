// src/pages/Inbox/OfferList/ListView.tsx
import React from 'react';
import { getStatusLabel } from '../utils/formatters';
import { R2_PUBLIC_URL } from '../../public/Wishboard/constants';

interface ListViewProps {
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

export const ListView: React.FC<ListViewProps> = ({
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
  
  // 🌟 判斷狀態的輔助邏輯
  const isPending = inquiry.inquiry_status === 'pending';
  const isChattable = ['submitted', 'proposed'].includes(inquiry.inquiry_status);
  const isAccepted = inquiry.inquiry_status === 'accepted';

  // 1. 抓取投單者名稱
  const clientName = inquiry.artist_name || snapshot.client_name || '匿名委託人';
  
  // 2. 準備摘要文字 (包含資安過濾)
  const getSummary = () => {
    const firstAns = snapshot.answers?.[0]?.answer;
    const msg = snapshot.message || inquiry.client_response || '';
    const rawText = unescapeHtml(firstAns || msg);
    return rawText.length > 30 ? rawText.substring(0, 30) + '...' : rawText;
  };

  // 3. 圖片處理 (僅展開後顯示)
  let images: string[] = [];
  try {
    const rawImageStr = snapshot.images || '[]';
    images = Array.isArray(rawImageStr) ? rawImageStr : JSON.parse(unescapeHtml(rawImageStr));
  } catch {
    images = snapshot.images ? [snapshot.images] : [];
  }
  const validImages = images.filter(Boolean).map(url => 
    url.startsWith('http') ? url : `${R2_PUBLIC_URL}/${url}`
  ).slice(0, 3);

  return (
    <div className={`list-view-row-container ${isExpanded ? 'is-expanded' : ''}`}>
      {/* 🌟 縮摺狀態的列 */}
      <div className="list-main-row" onClick={onToggle}>
        <div className="col-checkbox" onClick={e => e.stopPropagation()}>
          <input type="checkbox" />
        </div>
        
        <div className="col-name">
          <span className="client-name">{clientName}</span>
          <span className="client-id-mini">@{inquiry.artist_public_id?.substring(0,8) || 'unknown'}</span>
        </div>

        <div className="col-summary">
          {getSummary() || <span className="text-italic opacity-50">無填寫需求摘要</span>}
        </div>

        <div className="col-status">
          <span className={`inbox-badge status-${inquiry.inquiry_status}`}>
            {getStatusLabel(inquiry.inquiry_status)}
          </span>
        </div>

        <div className="col-time">
          {new Date(inquiry.latest_update_at).toLocaleDateString()}
        </div>

        <div className="col-arrow">
          {isExpanded ? '▴' : '▾'}
        </div>
      </div>

      {/* 🌟 展開後的詳細資訊區 */}
      {isExpanded && (
        <div className="list-expanded-detail">
          <div className="detail-grid">
            <div className="detail-images">
              {validImages.length > 0 ? (
                validImages.map((img, idx) => (
                  <img key={idx} src={img} alt="參考圖" referrerPolicy="no-referrer" />
                ))
              ) : (
                <div className="no-img-placeholder">無圖</div>
              )}
            </div>

            <div className="detail-content">
              {snapshot.answers?.length > 0 ? (
                snapshot.answers.map((ans: any, idx: number) => (
                  <div key={idx} className="detail-qa">
                    <div className="detail-q">Q: {unescapeHtml(ans.question)}</div>
                    <div className="detail-a">{unescapeHtml(ans.answer)}</div>
                  </div>
                ))
              ) : (
                <div className="detail-message">
                  <strong>需求訊息：</strong>
                  <p>{unescapeHtml(snapshot.message || inquiry.client_response)}</p>
                </div>
              )}
              
              <div className="detail-actions" onClick={e => e.stopPropagation()}>
                {/* 🌟 修正：補上之前漏掉的按鈕邏輯與變數讀取 */}
                {isChattable && (
                  <button className="btn-primary" onClick={() => handleEnterInquiryWorkspace(inquiry.inquiry_id)}>
                    💬 進入聊天室
                  </button>
                )}
                {isAccepted && (
                  <button className="btn-success" onClick={() => handleViewCommission(inquiry.commission_id)}>
                    前往正式委託單
                  </button>
                )}
                {isPending && (
                  <button className="btn-primary" onClick={() => { setSelectedInquiry(inquiry); setShowInviteModal(true); }}>
                    ✉️ 邀請詳談
                  </button>
                )}
                {canDecline && (
                  <button className="btn-secondary-red" onClick={() => { setSelectedInquiry(inquiry); setShowDeclineModal(true); }}>
                    婉拒
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};