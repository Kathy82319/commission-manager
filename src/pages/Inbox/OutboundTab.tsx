// src/pages/Inbox/OutboundTab.tsx
import React, { useState } from 'react';
import { getStatusLabel, filterOldItems } from './utils/formatters';
import { R2_PUBLIC_URL } from '../public/Wishboard/constants';
import { ImageIcon, ChevronDown, ChevronUp, FileText, User } from 'lucide-react';

interface OutboundTabProps {
  artistInquiries: any[];
  setSelectedInquiry: (inquiry: any) => void;
  setShowDeclineModal: (show: boolean) => void;
  handleEnterInquiryWorkspace: (id: string) => void;
  handleViewCommission: (id: string) => void; // 🌟 加回參數
}

export const OutboundTab: React.FC<OutboundTabProps> = ({
  artistInquiries,
  setSelectedInquiry,
  setShowDeclineModal,
  handleEnterInquiryWorkspace,
  handleViewCommission
}) => {
  const [expandedIds, setExpandedIds] = useState<string[]>([]);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const getFullUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${R2_PUBLIC_URL}/${url}`;
  };

  const getBulletinImage = (refImageKey: string) => {
    try {
      const parsed = JSON.parse(refImageKey || '[]');
      const firstImg = Array.isArray(parsed) ? parsed[0] : parsed;
      return firstImg ? getFullUrl(firstImg) : null;
    } catch {
      return refImageKey ? getFullUrl(refImageKey) : null;
    }
  };

  const parseSnapshot = (snapshotData: any) => {
    try {
      if (!snapshotData) return {};
      return typeof snapshotData === 'string' ? JSON.parse(snapshotData) : snapshotData;
    } catch (e) {
      console.error("解析投遞內容失敗", e);
      return {};
    }
  };

  const handleWithdrawClick = (item: any) => {
    if (item.inquiry_status === 'pending') {
      const isConfirmed = window.confirm(
        '⚠️ 注意：每則許願限投遞 2 次，撤回後將消耗 1 次機會。\n\n確定要撤回這筆投遞嗎？'
      );
      if (!isConfirmed) return;
    }
    setSelectedInquiry(item);
    setShowDeclineModal(true);
  };

  return (
    <div>
      {artistInquiries.filter(filterOldItems).length === 0 ? (
        <p className="text-center p-10 text-[#A0978D] bg-[#FBFBF9] rounded-xl border border-[#EAE6E1]">
          目前沒有任何投遞紀錄。
        </p>
      ) : (
        artistInquiries.filter(filterOldItems).map((item) => {
          const canDecline = !['accepted', 'declined', 'closed'].includes(item.inquiry_status);
          const bulletinImg = getBulletinImage(item.ref_image_key);
          const isOffer = item.bulletin_category === 'offer';
          
          const isExpanded = expandedIds.includes(item.inquiry_id);
          const snapshot = parseSnapshot(item.artist_snapshot);

          return (
          <div key={item.inquiry_id} style={{ background: '#FFFFFF', border: '1px solid #EAE6E1', borderRadius: '12px', padding: '24px', marginBottom: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#7A7269', marginBottom: '12px' }}>
                <User size={14} style={{ opacity: 0.7 }} />
                <span>投遞對象：</span>
                <span style={{ fontWeight: 'bold', color: '#5D4A3E' }}>
                  {item.client_name || '未知使用者'}
                </span>
                <span style={{ fontFamily: 'monospace', opacity: 0.6 }}>
                  @{item.client_public_id || 'unknown'}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                <span className={`inbox-badge status-${item.inquiry_status}`} style={{ margin: 0, flexShrink: 0 }}>
                  {getStatusLabel(item.inquiry_status)}
                </span>
                
                <h3 style={{ margin: 0, fontSize: '20px', color: '#5D4A3E', fontWeight: 'bold', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.bulletin_title}>
                  {item.bulletin_title || '未命名貼文'}
                </h3>

                <span style={{ 
                  background: isOffer ? '#EFF6FF' : '#FDF2F8', 
                  color: isOffer ? '#2563EB' : '#DB2777', 
                  padding: '4px 12px', 
                  borderRadius: '999px', 
                  fontSize: '13px', 
                  fontWeight: 'bold',
                  flexShrink: 0 
                }}>
                  {isOffer ? '接委託' : '徵委託'}
                </span>
              </div>

              <div 
                onClick={() => toggleExpand(item.inquiry_id)}
                style={{ 
                  display: 'flex', gap: '20px', background: isExpanded ? '#F4F4F1' : '#FBFBF9', 
                  border: '1px solid #EAE6E1', padding: '16px', borderRadius: '12px', marginBottom: '20px',
                  cursor: 'pointer', transition: 'background 0.2s ease', position: 'relative'
                }}
                title="點擊查看/收起我的提案內容"
              >
                {bulletinImg ? (
                  <img src={bulletinImg} alt="參考圖" referrerPolicy="no-referrer" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #EAE6E1', flexShrink: 0 }} />
                ) : (
                  <div style={{ width: '80px', height: '80px', background: '#F0F0F0', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#A0978D', flexShrink: 0 }}>
                    <ImageIcon size={24} opacity={0.5} />
                  </div>
                )}
                
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '24px' }}>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {isOffer && (
                      <span style={{ background: '#FFF5EB', color: '#ff8c00', padding: '2px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold' }}>
                        💰 預算/底價：{item.budget_min} ~ {item.budget_max}
                      </span>
                    )}
                    <span style={{ background: '#E6F4EA', color: '#1E8E3E', padding: '2px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold' }}>
                      📅 排單：{item.schedule_type === 'flexible' ? '可接受排單' : item.specific_date}
                    </span>
                  </div>
                  
                  <div style={{ fontSize: '13px', color: '#7A7269', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.5' }}>
                    {item.bulletin_content}
                  </div>
                </div>

                <div style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: '#A0978D' }}>
                  {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
              </div>

              {isExpanded && (
                <div style={{ background: '#FAFAFA', border: '1px solid #E5E7EB', borderRadius: '8px', padding: '20px', marginBottom: '20px', animation: 'fadeIn 0.2s ease' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#4B5563', marginBottom: '16px', borderBottom: '1px solid #E5E7EB', paddingBottom: '12px' }}>
                    <FileText size={18} />
                    <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 'bold' }}>我的投遞內容</h4>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {snapshot.message && (
                      <div>
                        <strong style={{ fontSize: '13px', color: '#9CA3AF', display: 'block', marginBottom: '4px' }}>招呼語 / 備註：</strong>
                        <p style={{ margin: 0, fontSize: '14px', color: '#374151', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{snapshot.message}</p>
                      </div>
                    )}
                    
                    {snapshot.question_template && (
                      <div>
                        <strong style={{ fontSize: '13px', color: '#9CA3AF', display: 'block', marginBottom: '4px' }}>問卷回答：</strong>
                        <p style={{ margin: 0, fontSize: '14px', color: '#374151', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{snapshot.question_template}</p>
                      </div>
                    )}

                    {snapshot.images && snapshot.images.length > 0 && (
                      <div>
                        <strong style={{ fontSize: '13px', color: '#9CA3AF', display: 'block', marginBottom: '8px' }}>附件圖片：</strong>
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                          {snapshot.images.map((img: string, idx: number) => (
                            <img key={idx} src={getFullUrl(img)} alt={`附件 ${idx + 1}`} referrerPolicy="no-referrer" style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #E5E7EB' }} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {item.client_response && (
                <div style={{ background: '#F8FAFC', borderLeft: '4px solid #4A7294', padding: '16px', borderRadius: '0 8px 8px 0', marginBottom: '20px' }}>
                  <strong style={{ color: '#4A7294', fontSize: '14px', marginBottom: '8px', display: 'block' }}>案主/繪師的回覆：</strong>
                  <p style={{ margin: 0, fontSize: '14px', color: '#5D4A3E', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{item.client_response}</p>
                </div>
              )}

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
                  // 🌟 恢復傳遞 commission_id
                  <button className="btn-success" onClick={() => handleViewCommission(item.commission_id)}>
                    進入委託單管理
                  </button>
                )}
                
                {canDecline && (
                  <button className="btn-secondary-red" onClick={() => handleWithdrawClick(item)}>
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