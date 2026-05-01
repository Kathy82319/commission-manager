// src/pages/Inbox/OutboundTab.tsx
import React, { useState } from 'react';
import { getStatusLabel, filterOldItems } from './utils/formatters';
import { R2_PUBLIC_URL } from '../public/Wishboard/constants';
import { ImageIcon, ChevronDown, ChevronUp, User } from 'lucide-react';

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

          let displayContent = item.bulletin_content;
          let originalQuestions: string[] = [];
          try {
            const parsedContent = JSON.parse(item.bulletin_content || '{}');
            displayContent = parsedContent.description || item.bulletin_content;
            if (Array.isArray(parsedContent.questions)) originalQuestions = parsedContent.questions;
          } catch (e) {}

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

              {/* 🌟 常駐顯示：原許願池的描述與提問 */}
              <div style={{ display: 'flex', gap: '20px', background: '#F4F4F1', border: '1px solid #EAE6E1', padding: '16px', borderRadius: '12px', marginBottom: '16px' }}>
                {bulletinImg ? (
                  <img src={bulletinImg} alt="參考圖" referrerPolicy="no-referrer" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #DED9D3', flexShrink: 0 }} />
                ) : (
                  <div style={{ width: '80px', height: '80px', background: '#EAE6E1', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#A0978D', flexShrink: 0 }}>
                    <ImageIcon size={24} opacity={0.5} />
                  </div>
                )}
                
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#7A7269', fontWeight: 'bold' }}>原許願池的描述</h4>
                  <div className="custom-scrollbar" style={{ maxHeight: '120px', overflowY: 'auto', fontSize: '13px', color: '#5D4A3E', lineHeight: '1.6', wordBreak: 'break-word', overflowWrap: 'anywhere', paddingRight: '8px' }}>
                    <div style={{ whiteSpace: 'pre-wrap' }}>{displayContent}</div>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => toggleExpand(item.inquiry_id)}
                style={{ width: '100%', background: isExpanded ? '#FBFBF9' : '#FFFFFF', border: '1px solid #EAE6E1', padding: '10px', borderRadius: '8px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', color: '#A67B3E', fontSize: '13px', fontWeight: 'bold', marginBottom: '20px', transition: 'all 0.2s' }}
              >
                {isExpanded ? <>▲ 收起我的投遞與回覆</> : <>▼ 查看我的投遞與回覆</>}
              </button>

              {/* 🌟 展開顯示：我的回覆與備註 */}
              {isExpanded && (
                <div style={{ background: '#F4F4F1', border: '1px solid #EAE6E1', borderRadius: '12px', padding: '16px', marginBottom: '20px', animation: 'fadeIn 0.2s ease' }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#7A7269', fontWeight: 'bold' }}>我的回覆與備註</h4>
                  <div className="custom-scrollbar" style={{ maxHeight: '200px', overflowY: 'auto', fontSize: '13px', color: '#5D4A3E', lineHeight: '1.6', wordBreak: 'break-word', overflowWrap: 'anywhere', paddingRight: '8px' }}>
                    
                    {/* 🌟 正確解析 answers 陣列 */}
                    {snapshot.answers && snapshot.answers.length > 0 && (
                      <div style={{ marginBottom: '12px' }}>
                        {snapshot.answers.map((ans: any, idx: number) => (
                          <div key={idx} style={{ marginBottom: '8px', paddingBottom: '8px', borderBottom: idx !== snapshot.answers.length - 1 ? '1px dashed #DED9D3' : 'none' }}>
                            <strong style={{ color: '#7A7269' }}>Q: {ans.question}</strong>
                            <div style={{ whiteSpace: 'pre-wrap', marginTop: '2px' }}>A: {ans.answer || '(未填寫)'}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {snapshot.message && (
                      <div style={{ marginTop: snapshot.answers && snapshot.answers.length > 0 ? '12px' : '0', paddingTop: snapshot.answers && snapshot.answers.length > 0 ? '12px' : '0', borderTop: snapshot.answers && snapshot.answers.length > 0 ? '1px dashed #DED9D3' : 'none' }}>
                        <strong style={{ color: '#7A7269' }}>備註留言：</strong>
                        <div style={{ whiteSpace: 'pre-wrap', marginTop: '2px' }}>{snapshot.message}</div>
                      </div>
                    )}

                    {/* 如果是繪師投遞，顯示舒適圈與雷點 */}
                    {!isOffer && (snapshot.specialties || snapshot.no_gos) && (
                      <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed #DED9D3' }}>
                        {snapshot.specialties && <div style={{ marginBottom: '4px' }}><strong style={{ color: '#ff8c00' }}>舒適圈/擅長：</strong> {snapshot.specialties}</div>}
                        {snapshot.no_gos && <div><strong style={{ color: '#e11d48' }}>雷點/不擅長：</strong> {snapshot.no_gos}</div>}
                      </div>
                    )}
                    
                    {snapshot.images && snapshot.images.length > 0 && (
                      <div style={{ marginTop: '12px' }}>
                        <strong style={{ color: '#7A7269' }}>附件圖片：</strong>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                          {snapshot.images.map((img: string, idx: number) => (
                            <img key={idx} src={getFullUrl(img)} alt={`附件 ${idx + 1}`} referrerPolicy="no-referrer" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #DED9D3' }} />
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