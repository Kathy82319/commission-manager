// src/pages/Inbox/OfferList/index.tsx
import React, { useState } from 'react';
import { CardView } from './CardView';

interface OfferListProps {
  inquiries: any[];
  setSelectedInquiry: (inquiry: any) => void;
  setShowDeclineModal: (show: boolean) => void;
  setShowInviteModal: (show: boolean) => void;
  handleEnterInquiryWorkspace: (id: string) => void;
  handleViewCommission: (id: string) => void;
  // 🌟 新增：將 selectedIds 提升到父層（通常是 InboundTab 或 Inbox/index.tsx）去管理，
  // 或者透過 callback 傳遞，但為了最快見效，我們在這裡直接把 selectedIds 傳給 setShowDeclineModal，
  // 讓 Modal 知道這是一次批次操作。
  setSelectedIdsForBatch?: (ids: Set<string>) => void; 
}

export const OfferList: React.FC<OfferListProps> = ({
  inquiries,
  setSelectedInquiry,
  setShowDeclineModal,
  setShowInviteModal,
  handleEnterInquiryWorkspace,
  handleViewCommission,
  setSelectedIdsForBatch // 如果父層有傳，我們就用；沒有的話我們暫時用 alert 擋著（後面會去改父層）
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

  // 🌟 單筆婉拒：清空批次，設定單筆
  const handleSingleDecline = (inquiry: any) => {
    if (setSelectedIdsForBatch) setSelectedIdsForBatch(new Set()); // 清空批次狀態
    setSelectedInquiry(inquiry);
    setShowDeclineModal(true);
  };

  // 🌟 批次婉拒：清空單筆，設定批次
  const handleBatchDecline = () => {
    if (selectedIds.size === 0) return;
    setSelectedInquiry(null); // 確保單筆是空的，這就是批次模式的訊號
    if (setSelectedIdsForBatch) {
      setSelectedIdsForBatch(selectedIds);
      setShowDeclineModal(true);
    } else {
      // 防呆：如果還沒接通上層，先保留 alert
      alert(`即將批次處理 ${selectedIds.size} 筆委託。請串接父層狀態。`);
    }
  };

  return (
    <div className="offer-list-container">
      {/* 🌟 批次工具列 */}
      {selectedIds.size > 0 && (
        <div className="batch-action-bar">
          <div className="batch-info">已選取 {selectedIds.size} 筆委託</div>
          <div className="batch-btns">
            <button className="btn-secondary-red" onClick={handleBatchDecline}>批次禮貌婉拒</button>
            <button className="btn-paper-cancel" style={{color: 'white'}} onClick={() => setSelectedIds(new Set())}>取消選取</button>
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
            // 🌟 替換為單筆處理函式
            setShowDeclineModal={() => handleSingleDecline(inquiry)}
            setShowInviteModal={setShowInviteModal}
            handleEnterInquiryWorkspace={handleEnterInquiryWorkspace}
            handleViewCommission={handleViewCommission}
          />
        );
      })}
    </div>
  );
};