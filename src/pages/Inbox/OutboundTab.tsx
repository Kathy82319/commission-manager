// src/pages/Inbox/OutboundTab.tsx
import React, { useState } from 'react';
import { getStatusLabel, filterOldItems } from './utils/formatters';
import { R2_PUBLIC_URL } from '../public/Wishboard/constants';
import { ImageIcon, User, Ban } from 'lucide-react'; 

interface OutboundTabProps {
  artistInquiries: any[];
  directOutboundInquiries?: any[]; // 🌟 新增：接收來自個人頁的送出申請
  setSelectedInquiry: (inquiry: any) => void;
  setShowDeclineModal: (show: boolean) => void;
  handleEnterInquiryWorkspace: (id: string) => void;
  handleViewCommission: (id: string) => void; 
  blacklistedIds?: string[];
}

export const OutboundTab: React.FC<OutboundTabProps> = ({
  artistInquiries,
  directOutboundInquiries = [], // 預設為空陣列
  setSelectedInquiry,
  setShowDeclineModal,
  handleEnterInquiryWorkspace,
  handleViewCommission,
  blacklistedIds = []
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
      // 🌟 區分兩種不同單的撤回提示
      const confirmMsg = item.is_direct 
        ? '確定要撤回這筆委託申請嗎？'
        : '⚠️ 注意：每則許願限投遞 2 次，撤回後將消耗 1 次機會。\n\n確定要撤回這筆投遞嗎？';
        
      const isConfirmed = window.confirm(confirmMsg);
      if (!isConfirmed) return;
    }
    setSelectedInquiry(item);
    setShowDeclineModal(true);
  };

  // 🌟 核心邏輯：將個人頁委託與許願池委託合併，並統一欄位名稱方便排序與過濾
  const combinedInquiries = [
    ...artistInquiries.map(item => ({ ...item, is_direct: false })),
    ...directOutboundInquiries.map(item => ({
      ...item,
      is_direct: true,
      inquiry_id: item.id, // 對齊 ID 欄位
      inquiry_status: item.status, // 對齊狀態欄位供 filterOldItems 使用
      bulletin_title: item.showcase_title || '客製化委託申請',
    }))
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // 過濾掉過期的項目
  const filteredInquiries = combinedInquiries.filter(filterOldItems);

  return (
    <div>
      {filteredInquiries.length === 0 ? (
        <p className="text-center p-10 text-[#A0978D] bg-[#FBFBF9] rounded-xl border border-[#EAE6E1]" style={{ textAlign: 'center', padding: '40px', color: '#A0978D' }}>
          目前沒有任何送出申請或投遞紀錄。
        </p>
      ) : (
        filteredInquiries.map((item) => {
          const canDecline = !['accepted', 'declined', 'closed'].includes(item.inquiry_status);
          const isExpanded = expandedIds.includes(item.inquiry_id);
          
          // 判斷對象 (許願池是 client_name，個人頁委託則是 artist_name)
          const targetName = item.is_direct ? item.artist_name : item.client_name;
          const targetPublicId = item.is_direct ? item.artist_public_id : item.client_public_id;
          const targetIdForBlacklist = item.is_direct ? item.artist_id : item.client_id;
          const isBlacklisted = blacklistedIds.includes(targetIdForBlacklist);

          // 許願池專用變數
          const bulletinImg = !item.is_direct ? getBulletinImage(item.ref_image_key) : null;
          const isOffer = !item.is_direct && item.bulletin_category === 'offer'; 
          const snapshot = !item.is_direct ? parseSnapshot(item.artist_snapshot) : {};

          let displayContent = item.bulletin_content;
          if (!item.is_direct) {
            try {
              const parsedContent = JSON.parse(item.bulletin_content || '{}');
              displayContent = parsedContent.description || item.bulletin_content;
            } catch (e) {}
          }

          // 個人頁委託專用變數
          let parsedFormAnswers: any[] = [];
          if (item.is_direct) {
            try { parsedFormAnswers = JSON.parse(item.form_answers || '[]'); } catch (e) {}
          }

          return (
          <div key={item.inquiry_id} style={{ background: '#FFFFFF', border: '1px solid #EAE6E1', borderRadius: '12px', padding: '24px', marginBottom: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#7A7269', marginBottom: '12px', flexWrap: 'wrap' }}>
                <User size={14} style={{ opacity: 0.7 }} />
                <span>投遞對象：</span>
                <span style={{ fontWeight: 'bold', color: '#5D4A3E' }}>
                  {targetName || '未知使用者'}
                </span>
                {targetPublicId && (
                  <span style={{ fontFamily: 'monospace', opacity: 0.6 }}>
                    @{targetPublicId}
                  </span>
                )}
                
                {isBlacklisted && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#FEF2F2', color: '#EF4444', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', border: '1px solid #FECACA', marginLeft: 'auto' }}>
                    <Ban size={12} /> 已列入黑名單
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                <span className={`inbox-badge status-${item.inquiry_status}`} style={{ margin: 0, flexShrink: 0 }}>
                  {getStatusLabel(item.inquiry_status)}
                </span>
                
                <h3 style={{ margin: 0, fontSize: '20px', color: '#5D4A3E', fontWeight: 'bold', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.bulletin_title}>
                  {item.bulletin_title}
                </h3>

                {/* 🌟 根據單子類型顯示不同顏色的標籤 */}
                <span style={{ 
                  background: item.is_direct ? '#EBF2F7' : (isOffer ? '#EFF6FF' : '#FDF2F8'), 
                  color: item.is_direct ? '#4A7294' : (isOffer ? '#2563EB' : '#DB2777'), 
                  padding: '4px 12px', 
                  borderRadius: '999px', 
                  fontSize: '13px', 
                  fontWeight: 'bold',
                  flexShrink: 0 
                }}>
                  {item.is_direct ? '個人頁委託' : (isOffer ? '接委託' : '徵委託')}
                </span>
              </div>

              {/* 摘要區塊：區分許願池與客製表單 */}
              <div style={{ display: 'flex', gap: '20px', background: '#F4F4F1', border: '1px solid #EAE6E1', padding: '16px', borderRadius: '12px', marginBottom: '16px' }}>
                {!item.is_direct ? (
                  <>
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
                  </>
                ) : (
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#7A7269', fontWeight: 'bold' }}>委託申請說明</h4>
                    <p style={{ fontSize: '13px', color: '#5D4A3E', margin: 0, lineHeight: '1.6' }}>
                      您已向繪師送出「{item.showcase_title}」的客製化委託申請。<br/>
                      詳細填寫內容可點擊下方展開查看。
                    </p>
                  </div>
                )}
              </div>

              <button 
                onClick={() => toggleExpand(item.inquiry_id)}
                style={{ width: '100%', background: isExpanded ? '#FBFBF9' : '#FFFFFF', border: '1px solid #EAE6E1', padding: '10px', borderRadius: '8px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', color: '#A67B3E', fontSize: '13px', fontWeight: 'bold', marginBottom: '20px', transition: 'all 0.2s' }}
              >
                {isExpanded ? <>▲ 收起{item.is_direct ? '我填寫的表單' : '我的投遞與回覆'}</> : <>▼ 查看{item.is_direct ? '我填寫的表單' : '我的投遞與回覆'}</>}
              </button>

              {/* 展開的詳細內容區塊 */}
              {isExpanded && (
                <div style={{ background: '#F4F4F1', border: '1px solid #EAE6E1', borderRadius: '12px', padding: '16px', marginBottom: '20px', animation: 'fadeIn 0.2s ease' }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#7A7269', fontWeight: 'bold' }}>
                    {item.is_direct ? '我填寫的表單內容' : '我的回覆與備註'}
                  </h4>
                  <div className="custom-scrollbar" style={{ maxHeight: '200px', overflowY: 'auto', fontSize: '13px', color: '#5D4A3E', lineHeight: '1.6', wordBreak: 'break-word', overflowWrap: 'anywhere', paddingRight: '8px' }}>
                    
                    {item.is_direct ? (
                      /* 🌟 個人頁委託表單問答渲染 */
                      <div style={{ paddingBottom: '8px' }}>
                        {parsedFormAnswers.length > 0 ? parsedFormAnswers.map((qa, i) => (
                          <div key={i} style={{ marginBottom: '10px' }}>
                            <strong style={{ color: '#A67B3E' }}>Q: {qa.question}</strong><br/>
                            <span style={{ whiteSpace: 'pre-wrap' }}>A: {Array.isArray(qa.answer) ? qa.answer.join(', ') : (qa.answer || '(未填寫)')}</span>
                          </div>
                        )) : (
                          <div style={{ color: '#A0978D', fontStyle: 'italic' }}>未填寫客製化問答。</div>
                        )}
                      </div>
                    ) : (
                      /* 許願池履歷渲染 */
                      <>
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
                      </>
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

              {(item.inquiry_status === 'declined' || item.inquiry_status === 'closed') && item.decline_reason && (
                <div style={{ background: '#FEF2F2', borderLeft: '4px solid #EF4444', padding: '16px', borderRadius: '0 8px 8px 0', marginBottom: '20px' }}>
                  <strong style={{ color: '#EF4444', fontSize: '14px', marginBottom: '8px', display: 'block' }}>終止/撤回原因：</strong>
                  <p style={{ margin: 0, fontSize: '14px', color: '#A05C5C', lineHeight: '1.6' }}>{item.decline_reason}</p>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #EAE6E1', paddingTop: '16px' }}>
                {(item.inquiry_status === 'submitted' || item.inquiry_status === 'proposed' || (item.is_direct && item.inquiry_status === 'pending')) && (
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
                    {item.inquiry_status === 'pending' ? '撤回申請' : '終止洽談'}
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