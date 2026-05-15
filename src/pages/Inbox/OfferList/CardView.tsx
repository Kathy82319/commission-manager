// src/pages/Inbox/OfferList/CardView.tsx
import React, { useState } from 'react';
import { getStatusLabel, renderChips } from '../utils/formatters';
import { R2_PUBLIC_URL } from '../../public/Wishboard/constants';
import { Ban, X } from 'lucide-react'; 

interface CardViewProps {
  inquiry: any;
  snapshot: any;
  setSelectedInquiry: (inquiry: any) => void;
  setShowDeclineModal: (show: boolean) => void;
  handleDirectInvite: (inquiry: any) => void;
  isSelected: boolean; 
  onSelect: () => void; 
  handleEnterInquiryWorkspace: (id: string) => void;
  handleViewCommission: (id: string) => void;
  blacklistedIds?: string[]; 
}

const unescapeHtml = (str: string) => {
  if (!str) return '';
  return str.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#039;/g, "'");
};

export const CardView: React.FC<CardViewProps> = ({
  inquiry,
  snapshot,
  setShowDeclineModal,
  handleDirectInvite,
  isSelected,
  onSelect,
  handleEnterInquiryWorkspace,
  handleViewCommission,
  blacklistedIds = [] 
}) => {
  const canDecline = !['accepted', 'declined', 'closed'].includes(inquiry.inquiry_status);
  const isDeclined = inquiry.inquiry_status === 'declined';

  const clientName = inquiry.artist_name || snapshot.client_name || snapshot.artist_name || '匿名用戶';
  const clientId = inquiry.artist_public_id || snapshot.client_public_id || snapshot.artist_public_id || 'unknown';
  const avatarUrl = inquiry.artist_avatar || snapshot.client_avatar || snapshot.artist_avatar || null;
  const isBlacklisted = blacklistedIds.includes(inquiry.artist_id);

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
  const validImages = images.filter(Boolean).map(getFullUrl).slice(0, 5);
  
  const note = unescapeHtml(snapshot.message || snapshot.note || (snapshot.answers?.[0]?.answer) || ''); 

  const [imgIdx, setImgIdx] = useState(0);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const nextImg = (e: React.MouseEvent) => { e.stopPropagation(); setImgIdx((prev) => (prev + 1) % validImages.length); };
  const prevImg = (e: React.MouseEvent) => { e.stopPropagation(); setImgIdx((prev) => (prev - 1 + validImages.length) % validImages.length); };

  const stopPropagation = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <>
      <div 
        onClick={() => setShowDetailsModal(true)} 
        style={{ 
          display: 'flex', flexDirection: 'column', height: '100%', 
          background: isDeclined ? '#F9F9F9' : '#FFFFFF', 
          border: `1px solid ${isBlacklisted ? '#EF4444' : (isSelected ? '#4A7294' : '#EAE6E1')}`, 
          borderRadius: '16px', overflow: 'hidden', 
          boxShadow: isSelected ? '0 0 0 2px #4A7294' : '0 4px 12px rgba(0,0,0,0.04)',
          filter: isDeclined ? 'grayscale(50%)' : 'none',
          opacity: isDeclined ? 0.7 : 1,
          cursor: 'pointer', 
          transition: 'all 0.2s', position: 'relative',
          width: '100%', boxSizing: 'border-box'
        }} 
        onMouseOver={(e) => { if(!isSelected) e.currentTarget.style.borderColor = '#C1D6E8'; }}
        onMouseOut={(e) => { if(!isSelected) e.currentTarget.style.borderColor = '#EAE6E1'; }}
      >
        
        <div onClick={stopPropagation} style={{ position: 'absolute', top: '12px', left: '12px', zIndex: 10 }}>
          <input type="checkbox" checked={isSelected} onChange={onSelect} style={{ width: '20px', height: '20px', cursor: 'pointer', borderRadius: '4px' }} />
        </div>

        <div style={{ position: 'absolute', top: '12px', right: '12px', zIndex: 10 }}>
          <span className={`status-${inquiry.inquiry_status}`} style={{ padding: '4px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(4px)', border: '1px solid rgba(0,0,0,0.1)', color: '#5D4A3E', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            {getStatusLabel(inquiry.inquiry_status)}
          </span>
        </div>

        <div style={{ height: '240px', width: '100%', backgroundColor: '#F4F4F1', position: 'relative' }}>
          {validImages.length > 0 ? (
            <>
              <img src={validImages[imgIdx]} alt="預覽圖" style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
              {validImages.length > 1 && (
                <>
                  <button onClick={prevImg} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5 }}>❮</button>
                  <button onClick={nextImg} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5 }}>❯</button>
                  <div style={{ position: 'absolute', bottom: '12px', right: '12px', background: 'rgba(0,0,0,0.7)', color: 'white', fontSize: '11px', padding: '4px 8px', borderRadius: '6px', fontWeight: 'bold', zIndex: 5 }}>
                    {imgIdx + 1} / {validImages.length}
                  </div>
                </>
              )}
            </>
          ) : (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#A0978D', fontSize: '14px', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '24px' }}>🖼️</span>
              無附上參考圖
            </div>
          )}

          <div style={{ position: 'absolute', bottom: '-24px', right: '16px', width: '56px', height: '56px', borderRadius: '50%', border: '3px solid #FFFFFF', backgroundColor: '#EAE6E1', overflow: 'hidden', zIndex: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#A0978D' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              </div>
            )}
          </div>
        </div>

        <div style={{ padding: '28px 16px 16px 16px', display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div style={{ marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <h3 style={{ margin: 0, fontWeight: 'bold', color: '#5D4A3E', fontSize: '18px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={clientName}>{clientName}</h3>
              {isBlacklisted && <span title="黑名單繪師" style={{ display: 'flex', alignItems: 'center' }}><Ban size={16} color="#EF4444" /></span>}
            </div>
            <div style={{ color: '#A0978D', fontSize: '13px', fontFamily: 'monospace', marginTop: '2px' }}>@{clientId}</div>
          </div>

          {note ? (
            <div style={{ color: '#7A7269', fontSize: '13px', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.6', marginBottom: '16px' }}>
              {note}
            </div>
          ) : (
            <div style={{ color: '#A0978D', fontSize: '13px', fontStyle: 'italic', marginBottom: '16px' }}>
              此提案未填寫文字描述。
            </div>
          )}

// 在 CardView 內部的 return 區塊，找到裝按鈕的地方：
// 🌟 核心修正：替換此區塊，解除寫死的寬度，利用 Flex 讓按鈕自適應縮放
          <div onClick={stopPropagation} style={{ marginTop: 'auto', display: 'flex', gap: '8px', flexWrap: 'wrap', paddingTop: '12px', borderTop: '1px solid #F0ECE7' }}>
            {canDecline && (
              <button 
                onClick={() => setShowDeclineModal(true)}
                style={{ flex: '1 1 auto', padding: '10px', backgroundColor: '#FFFFFF', color: '#EF4444', border: '1px solid #FECACA', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s' }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#FEF2F2'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#FFFFFF'}
              >
                {inquiry.inquiry_status === 'pending' ? '婉拒' : '終止'}
              </button>
            )}
            {inquiry.inquiry_status === 'pending' && (
              <button 
                onClick={() => handleDirectInvite(inquiry)}
                style={{ flex: '1 1 auto', padding: '10px', backgroundColor: '#4A7294', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s' }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#3B5D7A'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#4A7294'}
              >
                邀請詳談
              </button>
            )}
            {(inquiry.inquiry_status === 'submitted' || inquiry.inquiry_status === 'proposed') && (
              <button 
                onClick={() => handleEnterInquiryWorkspace(inquiry.inquiry_id)}
                style={{ flex: '1 1 auto', padding: '10px', backgroundColor: '#5D4A3E', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                進入聊天室
              </button>
            )}
            {inquiry.inquiry_status === 'accepted' && (
              <button 
                onClick={() => handleViewCommission(inquiry.commission_id)}
                style={{ flex: '1 1 auto', padding: '10px', backgroundColor: '#4E7A5A', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                前往委託單
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 🌟 彈窗修復：優化 flex 與 minWidth 避免手機版內容被擠到看不見 */}
      {showDetailsModal && (
        <div className="inbox-modal-overlay" onClick={() => setShowDetailsModal(false)} style={{ zIndex: 99999 }}>
          <div 
            className="inbox-modal-content" 
            onClick={stopPropagation} 
            style={{ 
              maxWidth: '900px', width: '100%', padding: '0', 
              display: 'flex', flexWrap: 'wrap', 
              maxHeight: '90vh', overflow: 'hidden', borderRadius: '16px' 
            }}
          >
            <div style={{ flex: '1 1 100%', minWidth: '280px', maxWidth: '100%', backgroundColor: '#1A1A1A', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '250px', maxHeight: '40vh' }}>
              {validImages.length > 0 ? (
                <>
                  <img src={validImages[imgIdx]} alt="放大檢視" style={{ width: '100%', height: '100%', objectFit: 'contain' }} referrerPolicy="no-referrer" />
                  {validImages.length > 1 && (
                    <>
                      <button onClick={prevImg} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>❮</button>
                      <button onClick={nextImg} style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>❯</button>
                      <div style={{ position: 'absolute', bottom: '16px', right: '16px', background: 'rgba(0,0,0,0.6)', color: 'white', fontSize: '12px', padding: '4px 10px', borderRadius: '6px', fontWeight: 'bold' }}>
                        {imgIdx + 1} / {validImages.length}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div style={{ color: '#7A7269', fontSize: '15px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '32px' }}>🖼️</span>無附上圖片
                </div>
              )}
            </div>
            
            <div style={{ flex: '1 1 100%', minWidth: '280px', maxWidth: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#FFFFFF', maxHeight: '50vh' }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #EAE6E1', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <img src={avatarUrl || ''} alt="" style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', display: avatarUrl ? 'block' : 'none', border: '1px solid #EAE6E1' }} />
                  <div>
                    <h2 style={{ margin: 0, fontSize: '20px', color: '#5D4A3E', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {clientName}
                      {isBlacklisted && <span title="黑名單繪師" style={{ display: 'flex' }}><Ban size={16} color="#EF4444" /></span>}
                    </h2>
                    <div style={{ color: '#A0978D', fontSize: '13px', fontFamily: 'monospace', marginTop: '2px' }}>@{clientId}</div>
                  </div>
                </div>
                <button onClick={() => setShowDetailsModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#A0978D', padding: '4px' }}><X size={24} /></button>
              </div>
              
              <div style={{ padding: '24px', overflowY: 'auto', flex: 1, boxSizing: 'border-box' }} className="custom-scrollbar">
                {(snapshot.specialties || snapshot.no_gos) && (
                  <div style={{ marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '15px', color: '#7A7269', borderBottom: '2px solid #EAE6E1', paddingBottom: '8px', marginBottom: '16px' }}>個人設定 / 偏好</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {snapshot.specialties && <div><strong style={{ color: '#4A7294', display: 'block', marginBottom: '8px' }}>舒適圈 / 擅長：</strong>{renderChips(snapshot.specialties, 'good')}</div>}
                      {snapshot.no_gos && <div><strong style={{ color: '#EF4444', display: 'block', marginBottom: '8px' }}>雷點 / 不擅長：</strong>{renderChips(snapshot.no_gos, 'bad')}</div>}
                    </div>
                  </div>
                )}

                {snapshot.answers && snapshot.answers.length > 0 && (
                  <div style={{ marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '15px', color: '#7A7269', borderBottom: '2px solid #EAE6E1', paddingBottom: '8px', marginBottom: '16px' }}>需求問卷回覆</h3>
                    {snapshot.answers.map((ans: any, idx: number) => (
                      <div key={idx} style={{ marginBottom: '16px', backgroundColor: '#FBFBF9', padding: '16px', borderRadius: '8px', border: '1px solid #F0ECE7' }}>
                        <strong style={{ color: '#A67B3E', display: 'block', marginBottom: '6px' }}>Q: {ans.question}</strong>
                        <div style={{ whiteSpace: 'pre-wrap', color: '#5D4A3E', lineHeight: '1.6' }}>A: {ans.answer || '(未填寫)'}</div>
                      </div>
                    ))}
                  </div>
                )}

                {snapshot.message && (
                  <div style={{ marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '15px', color: '#7A7269', borderBottom: '2px solid #EAE6E1', paddingBottom: '8px', marginBottom: '16px' }}>留言備註</h3>
                    <div style={{ whiteSpace: 'pre-wrap', color: '#5D4A3E', lineHeight: '1.6', backgroundColor: '#FBFBF9', padding: '16px', borderRadius: '8px', border: '1px solid #F0ECE7' }}>
                      {snapshot.message}
                    </div>
                  </div>
                )}

                {isDeclined && inquiry.decline_reason && (
                  <div style={{ marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '15px', color: '#EF4444', borderBottom: '2px solid #FECACA', paddingBottom: '8px', marginBottom: '16px' }}>終止 / 撤回原因</h3>
                    <div style={{ whiteSpace: 'pre-wrap', color: '#A05C5C', lineHeight: '1.6', backgroundColor: '#FEF2F2', padding: '16px', borderRadius: '8px', border: '1px solid #FECACA' }}>
                      {inquiry.decline_reason}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};