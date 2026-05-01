// src/pages/Inbox/OutboundTab.tsx
import React, { useState } from 'react';
import { getStatusLabel, filterOldItems } from './utils/formatters';
import { R2_PUBLIC_URL } from '../public/Wishboard/constants';
import { ImageIcon, ChevronDown, ChevronUp, FileText, User, HelpCircle, MessageSquare, Quote } from 'lucide-react';

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
          const isOffer = item.bulletin_category === 'offer'; // true = 案主投遞繪師(接委託), false = 繪師投遞案主(徵委託)
          
          const isExpanded = expandedIds.includes(item.inquiry_id);
          const snapshot = parseSnapshot(item.artist_snapshot);

          // 🌟 安全解析許願池原始內容與問卷題目
          let displayContent = item.bulletin_content;
          let originalQuestions: string[] = [];
          try {
            const parsedContent = JSON.parse(item.bulletin_content || '{}');
            displayContent = parsedContent.description || item.bulletin_content;
            if (Array.isArray(parsedContent.questions)) {
              originalQuestions = parsedContent.questions;
            }
          } catch (e) {
            // 解析失敗維持原樣
          }

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
                  <div style={{ fontSize: '13px', color: '#7A7269', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.5' }}>
                    {displayContent}
                  </div>
                </div>

                <div style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: '#A0978D' }}>
                  {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
              </div>

              {isExpanded && (
                <div style={{ background: '#FFFFFF', border: '1px solid #EAE6E1', borderRadius: '8px', padding: '20px', marginBottom: '20px', animation: 'fadeIn 0.2s ease', boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.02)' }}>
                  
                  {/* 🌟 Email 風格：上方引用原貼文內容 */}
                  <div style={{ background: '#F8FAFC', borderLeft: '4px solid #CBD5E1', padding: '16px', borderRadius: '0 8px 8px 0', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748B', marginBottom: '12px' }}>
                      <Quote size={16} />
                      <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 'bold' }}>原始許願內容摘要</h4>
                    </div>
                    <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#475569', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                      {displayContent}
                    </p>
                    {originalQuestions.length > 0 && (
                      <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed #CBD5E1' }}>
                        <strong style={{ fontSize: '13px', color: '#64748B', display: 'block', marginBottom: '8px' }}>繪師提出的問卷：</strong>
                        <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#475569', lineHeight: '1.6' }}>
                          {originalQuestions.map((q, idx) => (
                            <li key={idx}>{q}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* 🌟 下方：我的回覆與投遞 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#4B5563', marginBottom: '16px', paddingBottom: '8px', borderBottom: '1px solid #F3F4F6' }}>
                    <FileText size={18} color="#3B82F6" />
                    <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 'bold', color: '#1F2937' }}>我的回覆與投遞</h4>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '0 8px' }}>
                    {isOffer ? (
                      // === 案主投遞繪師(接委託)：顯示詳細問卷與回覆 ===
                      <>
                        {snapshot.question_template && (
                          <div>
                            <strong style={{ fontSize: '13px', color: '#6B7280', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                              <HelpCircle size={14} /> 我的問卷回覆：
                            </strong>
                            <p style={{ margin: 0, fontSize: '14px', color: '#1F2937', whiteSpace: 'pre-wrap', lineHeight: '1.7', background: '#F9FAFB', padding: '16px', borderRadius: '8px', border: '1px solid #F3F4F6' }}>
                              {snapshot.question_template}
                            </p>
                          </div>
                        )}
                        {snapshot.message && (
                          <div style={{ marginTop: '8px' }}>
                            <strong style={{ fontSize: '13px', color: '#6B7280', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                              <MessageSquare size={14} /> 備註與補充留言：
                            </strong>
                            <p style={{ margin: 0, fontSize: '14px', color: '#1F2937', whiteSpace: 'pre-wrap', lineHeight: '1.7' }}>
                              {snapshot.message}
                            </p>
                          </div>
                        )}
                      </>
                    ) : (
                      // === 繪師投遞案主(徵委託)：顯示招呼語 ===
                      snapshot.message && (
                        <div>
                          <strong style={{ fontSize: '13px', color: '#6B7280', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                            <MessageSquare size={14} /> 自我介紹 / 備註：
                          </strong>
                          <p style={{ margin: 0, fontSize: '14px', color: '#1F2937', whiteSpace: 'pre-wrap', lineHeight: '1.7', background: '#F9FAFB', padding: '16px', borderRadius: '8px', border: '1px solid #F3F4F6' }}>
                            {snapshot.message}
                          </p>
                        </div>
                      )
                    )}

                    {/* 圖片一律顯示 */}
                    {snapshot.images && snapshot.images.length > 0 && (
                      <div style={{ marginTop: '8px' }}>
                        <strong style={{ fontSize: '13px', color: '#6B7280', display: 'block', marginBottom: '12px' }}>附件圖片：</strong>
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                          {snapshot.images.map((img: string, idx: number) => (
                            <img key={idx} src={getFullUrl(img)} alt={`附件 ${idx + 1}`} referrerPolicy="no-referrer" style={{ width: '120px', height: '120px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #E5E7EB', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }} />
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