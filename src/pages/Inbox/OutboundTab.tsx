// src/pages/Inbox/OutboundTab.tsx
import React from 'react';
import { getStatusLabel, filterOldItems } from './utils/formatters';
import { R2_PUBLIC_URL } from '../public/Wishboard/constants';
import { Ban } from 'lucide-react'; 
import '../../styles/Notebook.css'; 

interface OutboundTabProps {
  artistInquiries: any[];
  directOutboundInquiries?: any[]; 
  selectedInquiryId?: string; // 接收選中的 ID
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
      : '⚠️ 注意：撤回後將消耗投遞機會。\n\n確定要撤回嗎？';
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

  // 統合所有投遞紀錄
  const combinedInquiries = [
    ...artistInquiries.map(item => ({ ...item, is_direct: false })),
    ...directOutboundInquiries.map(item => ({
      ...item,
      is_direct: true,
      inquiry_id: item.id, 
      inquiry_status: item.status, 
      bulletin_title: item.showcase_title || '客製化委託申請',
    }))
  ];

  // 根據 ID 找到當前要顯示的資料
  const selectedInq = combinedInquiries.find(i => i.inquiry_id === selectedInquiryId);

  // 如果找不到選中的項目，顯示空白提示
  if (!selectedInq) {
    return (
      <div style={{ padding: '100px 20px', textAlign: 'center', color: '#A0978D' }}>
        <div style={{ fontSize: '40px', marginBottom: '16px', opacity: 0.5 }}>📄</div>
        <p>請從左側清單選擇一筆申請紀錄以查看詳情</p>
      </div>
    );
  }

  // 提取顯示資料
  const targetName = selectedInq.is_direct ? selectedInq.artist_name : selectedInq.client_name;
  const targetPublicId = selectedInq.is_direct ? selectedInq.artist_public_id : selectedInq.client_public_id;
  const targetIdForBlacklist = selectedInq.is_direct ? selectedInq.artist_id : selectedInq.client_id;
  const isBlacklisted = blacklistedIds.includes(targetIdForBlacklist);
  const canWithdraw = !['accepted', 'declined', 'closed'].includes(selectedInq.inquiry_status);

  // 許願池相關
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

  // 個人表單相關
  let parsedFormAnswers: any[] = [];
  if (selectedInq.is_direct) {
    try { parsedFormAnswers = JSON.parse(selectedInq.form_answers || '[]'); } catch (e) {}
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', animation: 'fadeIn 0.2s ease' }}>
      
      {/* 標題區 */}
      <div className="main-header" style={{ marginBottom: '24px', backgroundColor: 'transparent', padding: 0 }}>
        <div className="main-header-info">
          <h2 className="main-title" style={{ fontSize: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            投遞對象：{targetName || '未知使用者'}
            {targetPublicId && <span style={{ fontSize: '16px', color: '#A0978D', fontFamily: 'monospace' }}>@{targetPublicId}</span>}
          </h2>
          <div className="main-subtitle" style={{ fontSize: '15px', color: '#4A7294', fontWeight: 'bold', marginTop: '8px' }}>
            申請項目：{selectedInq.bulletin_title}
          </div>
          {isBlacklisted && (
            <div style={{ display: 'inline-block', padding: '6px 12px', background: '#FEF2F2', color: '#EF4444', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', border: '1px solid #FECACA', marginTop: '12px' }}>
              ⚠️ 注意：您已將此用戶列入黑名單。
            </div>
          )}
        </div>
      </div>

      {/* 狀態卡片 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', padding: '16px', backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #EAE6E1' }}>
        <span className={`status-${selectedInq.inquiry_status}`} style={{ padding: '6px 16px', borderRadius: '6px', fontSize: '14px', fontWeight: 'bold' }}>
          {getStatusLabel(selectedInq.inquiry_status)}
        </span>
        <span style={{ fontSize: '13px', color: '#7A7269' }}>投遞時間：{formatTime(selectedInq.created_at)}</span>
      </div>

      {/* 許願池原文摘要 */}
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

      {/* 我寫的內容 */}
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
                    <img key={i} src={getFullUrl(img)} alt="附圖" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '6px' }} referrerPolicy="no-referrer" />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* 底部按鈕 */}
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '32px' }}>
        {canWithdraw && (
          <button className="action-btn" style={{ backgroundColor: '#FFFFFF', color: '#EF4444', border: '1px solid #FECACA', padding: '12px 24px' }} onClick={() => handleWithdrawClick(selectedInq)}>
            撤回申請 / 終止洽談
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