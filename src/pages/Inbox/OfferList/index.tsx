// src/pages/Inbox/OfferList/index.tsx
import React, { useState } from 'react';
import { CardView } from './CardView';

interface OfferListProps {
  inquiries: any[];
  setSelectedInquiry: (inquiry: any) => void;
  setShowDeclineModal: (show: boolean) => void;
  handleDirectInvite: (inquiry: any) => void;
  handleEnterInquiryWorkspace: (id: string) => void;
  handleViewCommission: (id: string) => void;
  setSelectedIdsForBatch?: (ids: Set<string>) => void; 
  blacklistedIds?: string[]; 
}

export const OfferList: React.FC<OfferListProps> = ({
  inquiries,
  setSelectedInquiry,
  setShowDeclineModal,
  handleDirectInvite, 
  handleEnterInquiryWorkspace,
  handleViewCommission,
  setSelectedIdsForBatch,
  blacklistedIds = [] 
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      newSet.has(id) ? newSet.delete(id) : newSet.add(id);
      return newSet;
    });
  };

  const handleSingleDecline = (inquiry: any) => {
    if (setSelectedIdsForBatch) setSelectedIdsForBatch(new Set()); 
    setSelectedInquiry(inquiry);
    setShowDeclineModal(true);
  };

  const handleBatchDecline = () => {
    if (selectedIds.size === 0) return;
    setSelectedInquiry(null); 
    if (setSelectedIdsForBatch) {
      setSelectedIdsForBatch(selectedIds);
      setShowDeclineModal(true);
    }
  };

  return (
    <div className="offer-list-container">
      {selectedIds.size > 0 && (
        <div className="batch-action-bar" style={{ marginBottom: '20px', padding: '12px 20px', backgroundColor: '#5D4A3E', color: 'white', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="batch-info" style={{ fontWeight: 'bold' }}>已選取 {selectedIds.size} 筆提案</div>
          <div className="batch-btns" style={{ display: 'flex', gap: '12px' }}>
            <button style={{ padding: '6px 16px', backgroundColor: '#EF4444', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }} onClick={handleBatchDecline}>批次禮貌婉拒</button>
            <button style={{ padding: '6px 16px', backgroundColor: 'transparent', color: 'white', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '6px', cursor: 'pointer' }} onClick={() => setSelectedIds(new Set())}>取消選取</button>
          </div>
        </div>
      )}

      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', 
        gap: '16px',
        width: '100%',
        boxSizing: 'border-box',
        alignItems: 'start'
      }}>
        {inquiries.map(inquiry => {
          let snapshot: any = {};
          try { snapshot = JSON.parse(inquiry.artist_snapshot || '{}'); } catch(e) {}

          return (
            <CardView
              key={inquiry.inquiry_id}
              inquiry={inquiry}
              snapshot={snapshot}
              isSelected={selectedIds.has(inquiry.inquiry_id)}
              onSelect={() => toggleSelect(inquiry.inquiry_id)}
              setSelectedInquiry={setSelectedInquiry}
              setShowDeclineModal={() => handleSingleDecline(inquiry)}
              handleDirectInvite={handleDirectInvite}
              handleEnterInquiryWorkspace={handleEnterInquiryWorkspace}
              handleViewCommission={handleViewCommission}
              blacklistedIds={blacklistedIds} 
            />
          );
        })}
      </div>
    </div>
  );
};