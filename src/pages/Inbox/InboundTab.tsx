// src/pages/Inbox/InboundTab.tsx
import React from 'react';
import { OfferList } from './OfferList';
import { calculateDaysLeft, filterOldItems } from './utils/formatters';

interface InboundTabProps {
  clientBulletins: any[];
  clientInquiries: any[];
  navigate: (path: string) => void;
  setSelectedInquiry: (inquiry: any) => void;
  setShowDeclineModal: (show: boolean) => void;
  handleDirectInvite: (inquiry: any) => void; 
  handleEnterInquiryWorkspace: (id: string) => void;
  handleViewCommission: () => void;
  setSelectedIdsForBatch?: (ids: Set<string>) => void; 
  blacklistedIds?: string[];
  handleCancelBulletin?: (id: string) => void; 
}

export const InboundTab: React.FC<InboundTabProps> = ({
  clientBulletins,
  clientInquiries,
  setSelectedInquiry,
  setShowDeclineModal,
  handleDirectInvite,
  handleEnterInquiryWorkspace,
  handleViewCommission,
  setSelectedIdsForBatch,
  blacklistedIds = [],
  handleCancelBulletin 
}) => {
  // 透過 index.tsx 傳進來的 clientBulletins 已經被 filter 過，只會有一筆
  const bulletin = clientBulletins[0];

  if (!bulletin) {
    return null;
  }

  const currentInquiries = clientInquiries
    .filter(i => i.bulletin_id === bulletin.id)
    .filter(filterOldItems);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', animation: 'fadeIn 0.2s ease' }}>
      
      {/* 🌟 頂部控制列 (Header) */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', borderBottom: '1px solid #EAE6E1', paddingBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '24px', color: '#5D4A3E', margin: '0 0 8px 0', fontWeight: 'bold' }}>
            📌 {bulletin.title || '未命名貼文'}
          </h2>
          <div style={{ color: '#7A7269', fontSize: '14px' }}>
            已收到 {bulletin.inquiry_count || 0} 份提案
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#D97706', backgroundColor: '#FFFBEB', padding: '8px 12px', borderRadius: '8px', border: '1px solid #FDE68A' }}>
            ⏳ {calculateDaysLeft(bulletin.expires_at)}
          </span>
          <button 
            onClick={() => handleCancelBulletin && handleCancelBulletin(bulletin.id)}
            style={{ padding: '8px 16px', fontSize: '13px', fontWeight: 'bold', color: '#EF4444', backgroundColor: '#FFFFFF', border: '1px solid #FECACA', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#FEF2F2')}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
          >
            🛑 撤銷許願
          </button>
        </div>
      </div>

      {/* 🌟 內容區 */}
      {currentInquiries.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 20px', color: '#A0978D' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>🍃</div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#7A7269' }}>目前還沒有收到提案喔！</div>
          <div style={{ fontSize: '14px', marginTop: '8px' }}>請稍候，或至社群分享您的許願池連結。</div>
        </div>
      ) : (
        <OfferList 
          inquiries={currentInquiries} 
          setSelectedInquiry={setSelectedInquiry}
          setShowDeclineModal={setShowDeclineModal}
          handleDirectInvite={handleDirectInvite}
          handleEnterInquiryWorkspace={handleEnterInquiryWorkspace}
          handleViewCommission={handleViewCommission}
          setSelectedIdsForBatch={setSelectedIdsForBatch}
          blacklistedIds={blacklistedIds}
        />
      )}
    </div>
  );
};