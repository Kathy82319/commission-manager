// src/pages/Inbox/OutboundTab.tsx
import React from 'react';
import { getStatusLabel, filterOldItems } from './utils/formatters';

interface OutboundTabProps {
  artistInquiries: any[];
  setSelectedInquiry: (inquiry: any) => void;
  setShowDeclineModal: (show: boolean) => void;
  handleEnterInquiryWorkspace: (id: string) => void;
  handleViewCommission: (id: string) => void;
}

export const OutboundTab: React.FC<OutboundTabProps> = ({
  artistInquiries,
  setSelectedInquiry,
  setShowDeclineModal,
  handleEnterInquiryWorkspace,
  handleViewCommission
}) => {
  return (
    <div>
      {artistInquiries.filter(filterOldItems).length === 0 ? (
        <p className="text-center p-10 text-[#A0978D] bg-[#FBFBF9] rounded-xl border border-[#EAE6E1]">目前沒有任何投遞紀錄。</p>
      ) : (
        artistInquiries.filter(filterOldItems).map((item) => {
          const canDecline = !['accepted', 'declined', 'closed'].includes(item.inquiry_status);

          return (
            <div key={item.inquiry_id} style={{ background: '#FFFFFF', border: '1px solid #EAE6E1', borderRadius: '12px', padding: '24px', marginBottom: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
              {/* 頭部標題與狀態 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                <span className={`inbox-badge status-${item.inquiry_status}`} style={{ margin: 0 }}>
                  {getStatusLabel(item.inquiry_status)}
                </span>
                <h3 style={{ margin: 0, fontSize: '20px', color: '#5D4A3E', fontWeight: 'bold', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.bulletin_title}>
                  {item.bulletin_title || '未命名貼文'}
                </h3>
              </div>

              {/* 🌟 許願池摘要區塊 */}
              <div style={{ display: 'flex', gap: '20px', background: '#FBFBF9', border: '1px solid #EAE6E1', padding: '16px', borderRadius: '12px', marginBottom: '20px' }}>
                {item.ref_image_key ? (
                  // 🔒 資安防護：加入 referrerPolicy 防止外部圖床追蹤
                  <img src={item.ref_image_key} alt="參考圖" referrerPolicy="no-referrer" style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #EAE6E1', flexShrink: 0 }} />
                ) : (
                  <div style={{ width: '100px', height: '100px', background: '#F0F0F0', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#A0978D', fontSize: '13px', flexShrink: 0 }}>無參考圖</div>
                )}
                
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <span style={{ background: '#FFF5EB', color: '#ff8c00', padding: '4px 10px', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold' }}>💰 預算：{item.budget_min}~{item.budget_max}</span>
                    <span style={{ background: '#E6F4EA', color: '#1E8E3E', padding: '4px 10px', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold' }}>📅 排單：{item.schedule_type === 'flexible' ? '可接受排單' : item.specific_date}</span>
                  </div>
                  <div style={{ fontSize: '14px', color: '#7A7269', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.6' }} title={item.bulletin_content}>
                    {item.bulletin_content}
                  </div>
                </div>
              </div>

              {/* 案主回覆區塊 */}
              {item.client_response && (
                <div style={{ background: '#F8FAFC', borderLeft: '4px solid #4A7294', padding: '16px', borderRadius: '0 8px 8px 0', marginBottom: '20px' }}>
                  <strong style={{ color: '#4A7294', fontSize: '14px', marginBottom: '8px', display: 'block' }}>案主回填的提問單：</strong>
                  <p style={{ margin: 0, fontSize: '14px', color: '#5D4A3E', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{item.client_response}</p>
                </div>
              )}

              {/* 婉拒理由區塊 */}
              {item.inquiry_status === 'declined' && item.decline_reason && (
                <div style={{ background: '#FEF2F2', borderLeft: '4px solid #EF4444', padding: '16px', borderRadius: '0 8px 8px 0', marginBottom: '20px' }}>
                  <strong style={{ color: '#EF4444', fontSize: '14px', marginBottom: '8px', display: 'block' }}>終止/婉拒理由：</strong>
                  <p style={{ margin: 0, fontSize: '14px', color: '#A05C5C', lineHeight: '1.6' }}>{item.decline_reason}</p>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #EAE6E1', paddingTop: '16px' }}>
                {(item.inquiry_status === 'submitted' || item.inquiry_status === 'proposed') && (
                  <button className="btn-primary" onClick={() => handleEnterInquiryWorkspace(item.inquiry_id)}>
                    進入聊天室
                  </button>
                )}
                {item.inquiry_status === 'accepted' && (
                  <button className="btn-success" onClick={() => handleViewCommission(item.commission_id)}>
                    前往正式委託單
                  </button>
                )}
                {canDecline && (
                  <button className="btn-secondary-red" onClick={() => {
                    setSelectedInquiry(item);
                    setShowDeclineModal(true);
                  }}>
                    {item.inquiry_status === 'pending' ? '撤回投遞' : '終止洽談'}
                  </button>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};