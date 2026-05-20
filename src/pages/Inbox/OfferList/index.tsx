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

    // 🔒 狀態防護：過濾出真正處於 pending 狀態的 ID，防止誤送已歸檔的單據
    const validPendingIds = Array.from(selectedIds).filter(id => {
      const inq = inquiries.find(i => i.inquiry_id === id);
      return inq && (inq.inquiry_status === 'pending' || inq.status === 'pending');
    });

    if (validPendingIds.length === 0) {
      alert('所選項目已不在待處理狀態，無法批次婉拒！');
      setSelectedIds(new Set()); // 清空無效選取
      return;
    }

    setSelectedInquiry(null); 
    if (setSelectedIdsForBatch) {
      setSelectedIdsForBatch(new Set(validPendingIds));
      setShowDeclineModal(true);
    }
  };

  // 判斷是否還有任何 pending 狀態的提案，用來決定要不要顯示批次工具列
  const hasPendingInquiries = inquiries.some(i => i.inquiry_status === 'pending' || i.status === 'pending');

  return (
    <div className="offer-list-container">
      {selectedIds.size > 0 && hasPendingInquiries && (
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

          const isPending = inquiry.inquiry_status === 'pending' || inquiry.status === 'pending';

          return (
              <CardView
              key={inquiry.inquiry_id}
              inquiry={inquiry}
              snapshot={snapshot}
              isSelected={selectedIds.has(inquiry.inquiry_id)}
              
              // 💡 修改處：一律傳入函式，但在函式內部判斷狀態
              onSelect={() => {
                if (isPending) toggleSelect(inquiry.inquiry_id);
              }}
              
              setSelectedInquiry={setSelectedInquiry}
              setShowDeclineModal={() => {
                if (isPending) handleSingleDecline(inquiry);
              }}
              handleDirectInvite={isPending ? handleDirectInvite : () => {}}
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