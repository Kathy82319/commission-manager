// src/pages/Inbox/OutboundTab.tsx
import React from 'react';
import { getStatusLabel } from './utils/formatters';
import { R2_PUBLIC_URL } from '../public/Wishboard/constants';
import { Ban } from 'lucide-react'; 
import '../../styles/Notebook.css'; 

interface OutboundTabProps {
  artistInquiries: any[];
  directOutboundInquiries?: any[]; 
  selectedInquiryId?: string; 
  setSelectedInquiry: (inquiry: any) => void;
  setShowDeclineModal: (show: boolean) => void;
  handleEnterInquiryWorkspace: (id: string) => void;
  handleViewCommission: (id: string) => void; 
  blacklistedIds?: string[];
}

export const OutboundTab: React.FC<OutboundTabProps> = ({
  artistInquiries = [],
  directOutboundInquiries = [],
  selectedInquiryId,
  setSelectedInquiry,
  setShowDeclineModal,
  handleEnterInquiryWorkspace,
  handleViewCommission,
  blacklistedIds = []
}) => {
  const getFullUrl = (url: string) => {
    if (!url) return '';
    return url.startsWith('http') ? url : `${R2_PUBLIC_URL}/${url}`;
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
    } catch (e) { return {}; }
  };

  const handleWithdrawClick = (item: any) => {
    const confirmMsg = item.is_direct 
      ? '確定要撤回這筆委託申請嗎？'
      : '⚠️ 注意：同一篇貼文最多只能投遞 2 次，撤回不會退還這次的額度（撤回或被婉拒都算在內）。\n\n確定要撤回嗎？';
    if (window.confirm(confirmMsg)) {
      setSelectedInquiry(item);
      setShowDeclineModal(true);
    }
  };

  const formatTime = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T') + 'Z');
    return d.toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
  };

  let selectedInq: any = null;
  const directMatch = directOutboundInquiries.find(i => i.id === selectedInquiryId);
  
  if (directMatch) {
    selectedInq = { 
      ...directMatch, 
      is_direct: true, 
      inquiry_id: directMatch.id, 
      inquiry_status: directMatch.status, 
      bulletin_title: directMatch.showcase_title || '客製化委託申請' 
    };
  } else {
    const artistMatch = artistInquiries.find(i => i.inquiry_id === selectedInquiryId);
    if (artistMatch) {
      selectedInq = { ...artistMatch, is_direct: false };
    }
  }

  if (!selectedInq) {
    return (
      <div style={{ padding: '100px 20px', textAlign: 'center', color: '#A0978D' }}>
        <div style={{ fontSize: '40px', marginBottom: '16px', opacity: 0.5 }}>🚀</div>
        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#7A7269', marginBottom: '8px' }}>請從左側清單選擇一筆申請紀錄以查看詳情</div>
      </div>
    );
  }

  const targetName = selectedInq.is_direct ? selectedInq.artist_name : selectedInq.client_name;
  const targetPublicId = selectedInq.is_direct ? selectedInq.artist_public_id : selectedInq.client_public_id;
  const targetIdForBlacklist = selectedInq.is_direct ? selectedInq.artist_id : selectedInq.client_id;
  const isBlacklisted = blacklistedIds.includes(targetIdForBlacklist);
  const canWithdraw = !['accepted', 'declined', 'closed'].includes(selectedInq.inquiry_status);

  const bulletinImg = !selectedInq.is_direct ? getBulletinImage(selectedInq.ref_image_key) : null;
  const isOffer = !selectedInq.is_direct && selectedInq.bulletin_category === 'offer'; 
  const snapshot = !selectedInq.is_direct ? parseSnapshot(selectedInq.artist_snapshot) : {};
  let displayContent = selectedInq.bulletin_content;
  if (!selectedInq.is_direct) {
    try {
      const parsed = JSON.parse(selectedInq.bulletin_content || '{}');
      displayContent = parsed.description || selectedInq.bulletin_content;
    } catch (e) {}
  }

  let parsedFormAnswers: any[] = [];
  if (selectedInq.is_direct) {
    try { parsedFormAnswers = JSON.parse(selectedInq.form_answers || '[]'); } catch (e) {}
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', animation: 'fadeIn 0.2s ease' }}>
      
      <div className="main-header" style={{ marginBottom: '24px', backgroundColor: 'transparent', padding: 0 }}>
        <div className="main-header-info">
          <h2 className="main-title" style={{ fontSize: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            投遞對象：{targetName || '未知使用者'}
            {targetPublicId && <span style={{ fontSize: '16px', color: '#A0978D', fontFamily: 'monospace' }}>@{targetPublicId}</span>}
          </h2>
          <div className="main-subtitle" style={{ fontSize: '15px', color: '#4A7294', fontWeight: 'bold', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ 
              background: selectedInq.is_direct ? '#EBF2F7' : (isOffer ? '#EFF6FF' : '#FDF2F8'), 
              color: selectedInq.is_direct ? '#4A7294' : (isOffer ? '#2563EB' : '#DB2777'), 
              padding: '2px 10px', 
              borderRadius: '999px', 
              fontSize: '12px', 
            }}>
              {selectedInq.is_direct ? '專屬委託表單' : (isOffer ? '許願池接委託' : '許願池徵委託')}
            </span>
            <span>申請項目：{selectedInq.bulletin_title}</span>
          </div>
          {isBlacklisted && (
            <div style={{ display: 'inline-block', padding: '6px 12px', background: '#FEF2F2', color: '#EF4444', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', border: '1px solid #FECACA', marginTop: '12px' }}>
              <Ban size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'text-bottom' }} /> 
              警告：您已將此用戶列入黑名單。
            </div>
          )}
        </div>
      </div>

      
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', padding: '16px', backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #EAE6E1' }}>
        <span className={`status-${selectedInq.inquiry_status}`} style={{ padding: '6px 16px', borderRadius: '6px', fontSize: '14px', fontWeight: 'bold' }}>
          {getStatusLabel(selectedInq.inquiry_status)}
        </span>
        <span style={{ fontSize: '13px', color: '#7A7269' }}>投遞時間：{formatTime(selectedInq.created_at)}</span>
      </div>

      
      {selectedInq.client_response && (
        <div style={{ background: '#F8FAFC', borderLeft: '4px solid #4A7294', padding: '20px', borderRadius: '0 12px 12px 0', marginBottom: '24px' }}>
          <strong style={{ color: '#4A7294', fontSize: '15px', marginBottom: '8px', display: 'block' }}>對方回覆：</strong>
          <p style={{ margin: 0, fontSize: '14px', color: '#5D4A3E', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{selectedInq.client_response}</p>
        </div>
      )}

      {(selectedInq.inquiry_status === 'declined' || selectedInq.inquiry_status === 'closed') && selectedInq.decline_reason && (
        <div style={{ background: '#FEF2F2', borderLeft: '4px solid #EF4444', padding: '20px', borderRadius: '0 12px 12px 0', marginBottom: '24px' }}>
          <strong style={{ color: '#EF4444', fontSize: '15px', marginBottom: '8px', display: 'block' }}>終止/撤回原因：</strong>
          <p style={{ margin: 0, fontSize: '14px', color: '#A05C5C', lineHeight: '1.6' }}>{selectedInq.decline_reason}</p>
        </div>
      )}

      
      {!selectedInq.is_direct && (
        <div className="section-card" style={{ marginBottom: '24px', backgroundColor: '#FDFDFB' }}>
          <h3 className="section-title" style={{ fontSize: '15px' }}>🔍 對方許願池原文摘要</h3>
          <div style={{ display: 'flex', gap: '16px', marginTop: '12px' }}>
            {bulletinImg ? (
              <img src={bulletinImg} alt="參考圖" style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #DED9D3' }} referrerPolicy="no-referrer" />
            ) : (
              <div style={{ width: '100px', height: '100px', background: '#EAE6E1', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#A0978D' }}>無附圖</div>
            )}
            <div style={{ flex: 1, fontSize: '13px', color: '#5D4A3E', lineHeight: '1.6', whiteSpace: 'pre-wrap', maxHeight: '120px', overflowY: 'auto' }}>
              {displayContent}
            </div>
          </div>
        </div>
      )}

      
      <div className="section-card" style={{ marginBottom: '24px' }}>
        <h3 className="section-title">{selectedInq.is_direct ? '📄 我填寫的表單內容' : '📄 我的投遞內容'}</h3>
        <div style={{ fontSize: '14px', color: '#5D4A3E', lineHeight: '1.8', marginTop: '16px' }}>
          {selectedInq.is_direct ? (
            parsedFormAnswers.length > 0 ? parsedFormAnswers.map((qa: any, i: number) => (
              <div key={i} style={{ marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px dashed #EAE6E1' }}>
                <strong style={{ color: '#A67B3E', display: 'block', marginBottom: '4px' }}>Q: {qa.question}</strong>
                <span>A: {Array.isArray(qa.answer) ? qa.answer.join(', ') : (qa.answer || '(未填寫)')}</span>
              </div>
            )) : <p style={{ fontStyle: 'italic', color: '#A0978D' }}>無內容</p>
          ) : (
            <>
              {snapshot.answers?.map((ans: any, idx: number) => (
                <div key={idx} style={{ marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px dashed #EAE6E1' }}>
                  <strong style={{ color: '#A67B3E', display: 'block', marginBottom: '4px' }}>Q: {ans.question}</strong>
                  <div>A: {ans.answer || '(未填寫)'}</div>
                </div>
              ))}
              {snapshot.message && (
                <div style={{ marginBottom: '16px' }}>
                  <strong style={{ color: '#A67B3E', display: 'block', marginBottom: '4px' }}>備註留言：</strong>
                  <div style={{ whiteSpace: 'pre-wrap' }}>{snapshot.message}</div>
                </div>
              )}
              {snapshot.images?.length > 0 && (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' }}>
                  {snapshot.images.map((img: string, i: number) => (
                    <img key={i} src={getFullUrl(img)} alt="附圖" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #DED9D3' }} referrerPolicy="no-referrer" />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '32px' }}>
        {canWithdraw && (
          <button className="action-btn" style={{ backgroundColor: '#FFFFFF', color: '#EF4444', border: '1px solid #FECACA', padding: '8px 24px', lineHeight: '1.5', textAlign: 'center' }} onClick={() => handleWithdrawClick(selectedInq)}>
            撤回申請<br />終止洽談
          </button>
        )}
        {(selectedInq.inquiry_status === 'submitted' || selectedInq.inquiry_status === 'proposed' || (selectedInq.is_direct && selectedInq.inquiry_status === 'pending')) && (
          <button className="action-btn btn-primary" style={{ padding: '12px 24px' }} onClick={() => handleEnterInquiryWorkspace(selectedInq.inquiry_id)}>
            💬 進入聊天室
          </button>
        )}
        {selectedInq.inquiry_status === 'accepted' && (
          <button className="action-btn btn-success" style={{ padding: '12px 24px' }} onClick={() => handleViewCommission(selectedInq.commission_id)}>
            前往正式委託單 ➔
          </button>
        )}
      </div>
    </div>
  );
};