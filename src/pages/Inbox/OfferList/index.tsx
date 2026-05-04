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
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const newSet = new Set(prev);
      newSet.has(id) ? newSet.delete(id) : newSet.add(id);
      return newSet;
    });
  };

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
    } else {
      alert(`即將批次處理 ${selectedIds.size} 筆委託。請串接父層狀態。`);
    }
  };

  return (
    <div className="offer-list-container">
      {selectedIds.size > 0 && (
        <div className="batch-action-bar">
          <div className="batch-info">已選取 {selectedIds.size} 筆委託</div>
          <div className="batch-btns">
            <button className="btn-secondary-red" onClick={handleBatchDecline}>批次禮貌婉拒</button>
            <button className="btn-paper-cancel" style={{color: 'black'}} onClick={() => setSelectedIds(new Set())}>取消選取</button>
          </div>
        </div>
      )}

      {inquiries.map(inquiry => {
        let snapshot: any = {};
        try { snapshot = JSON.parse(inquiry.artist_snapshot || '{}'); } catch(e) {}

        return (
          <CardView
            key={inquiry.inquiry_id}
            inquiry={inquiry}
            snapshot={snapshot}
            isExpanded={expandedIds.has(inquiry.inquiry_id)}
            onToggle={() => toggleExpand(inquiry.inquiry_id)}
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
  );
};