// src/pages/Inbox/InboundTab.tsx
import React, { useState, useEffect } from 'react';
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
  handleViewCommission: (id: string) => void;
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
  const bulletin = clientBulletins[0];

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setSelectedIds(new Set());
    if (setSelectedIdsForBatch) {
      setSelectedIdsForBatch(new Set());
    }
  }, [bulletin?.id, setSelectedIdsForBatch]);

  if (!bulletin) {
    return null;
  }

  const currentInquiries = clientInquiries
    .filter(i => i.bulletin_id === bulletin.id)
    .filter(filterOldItems);

  const isClosed = bulletin.status !== 'open';

  const handleBatchSelectionChange = (newIds: Set<string>) => {
    setSelectedIds(newIds);
    if (setSelectedIdsForBatch) {
      setSelectedIdsForBatch(newIds);
    }
  };

  const triggerBatchDecline = () => {
    if (selectedIds.size === 0) return;
    setSelectedInquiry(null); 
    setShowDeclineModal(true);
  };

  return (
    <div style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', animation: 'fadeIn 0.2s ease', boxSizing: 'border-box' }}>
      
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', borderBottom: '1px solid #EAE6E1', paddingBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '24px', color: '#5D4A3E', margin: '0 0 8px 0', fontWeight: 'bold' }}>
            📌 {bulletin.title || '未命名貼文'}
          </h2>
          <div style={{ color: '#7A7269', fontSize: '14px' }}>
            已收到 {bulletin.inquiry_count || 0} 份提案
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          
          {selectedIds.size > 0 && (
            <button
              onClick={triggerBatchDecline}
              style={{
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 'bold',
                color: '#FFFFFF',
                backgroundColor: '#EF4444',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(239, 68, 68, 0.2)',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#DC2626')}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#EF4444')}
            >
              🤝 批次禮貌婉拒 ({selectedIds.size} 筆)
            </button>
          )}

          <span style={{ 
            fontSize: '13px', 
            fontWeight: 'bold', 
            color: isClosed ? '#6B7280' : '#D97706', 
            backgroundColor: isClosed ? '#F3F4F6' : '#FFFBEB', 
            padding: '8px 12px', 
            borderRadius: '8px', 
            border: `1px solid ${isClosed ? '#D1D5DB' : '#FDE68A'}` 
          }}>
            {isClosed ? '🗄️ 已結束' : `⏳ ${calculateDaysLeft(bulletin.expires_at)}`}
          </span>
          
          
          {!isClosed && (
            <button 
              onClick={() => handleCancelBulletin && handleCancelBulletin(bulletin.id)}
              style={{ 
                padding: '8px 16px', 
                fontSize: '13px', 
                fontWeight: 'bold', 
                color: '#7A7269', 
                backgroundColor: '#FFFFFF', 
                border: '1px solid #DED9D3', 
                borderRadius: '8px', 
                cursor: 'pointer', 
                transition: 'all 0.2s' 
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#F4F4F1';
                e.currentTarget.style.color = '#EF4444';
                e.currentTarget.style.borderColor = '#FECACA';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#FFFFFF';
                e.currentTarget.style.color = '#7A7269';
                e.currentTarget.style.borderColor = '#DED9D3';
              }}
            >
              🔒 關閉許願
            </button>
          )}
        </div>
      </div>

      {currentInquiries.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 20px', color: '#A0978D' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>🍃</div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#7A7269' }}>
            {isClosed ? '此許願池沒有留存任何提案紀錄。' : '目前還沒有收到提案喔！'}
          </div>
          {!isClosed && <div style={{ fontSize: '14px', marginTop: '8px' }}>請稍候，或至社群分享您的許願池連結。</div>}
        </div>
      ) : (
        <OfferList 
          inquiries={currentInquiries} 
          setSelectedInquiry={setSelectedInquiry}
          setShowDeclineModal={setShowDeclineModal}
          handleDirectInvite={handleDirectInvite}
          handleEnterInquiryWorkspace={handleEnterInquiryWorkspace}
          handleViewCommission={handleViewCommission}
          setSelectedIdsForBatch={handleBatchSelectionChange}
          blacklistedIds={blacklistedIds}
        />
      )}
    </div>
  );
};