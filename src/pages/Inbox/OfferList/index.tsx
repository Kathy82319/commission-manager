// src/pages/Inbox/OfferList/index.tsx
import React, { useState } from 'react';
import { CardView } from './CardView';
import { ListView } from './ListView'; 

interface OfferListProps {
  inquiries: any[];
  viewMode: 'card' | 'list';
  setSelectedInquiry: (inquiry: any) => void;
  setShowDeclineModal: (show: boolean) => void;
  setShowInviteModal: (show: boolean) => void;
  handleEnterInquiryWorkspace: (id: string) => void;
  handleViewCommission: (id: string) => void;
}

export const OfferList: React.FC<OfferListProps> = ({
  inquiries,
  viewMode,
  setSelectedInquiry,
  setShowDeclineModal,
  setShowInviteModal,
  handleEnterInquiryWorkspace,
  handleViewCommission
}) => {
  // 記錄哪些訂單被「點擊展開」了 (存 inquiry_id)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // 整理傳給子元件的共用 Props，讓程式碼保持乾淨
  const commonProps = {
    setSelectedInquiry,
    setShowDeclineModal,
    setShowInviteModal,
    handleEnterInquiryWorkspace,
    handleViewCommission
  };

  return (
    <div className="offer-list-container">
      {inquiries.map(inquiry => {
        // 🔒 資安防護：安全的 JSON 解析，防範 JSON Injection 或損毀導致前端白畫面
        let snapshot: any = {};
        try { 
          const parsed = JSON.parse(inquiry.artist_snapshot || '{}');
          snapshot = typeof parsed === 'string' ? JSON.parse(parsed) : parsed;
        } catch(e) {
          console.error(`無法解析案主快照 (Inquiry ID: ${inquiry.inquiry_id})`, e);
        }

        const isExpanded = expandedIds.has(inquiry.inquiry_id);

if (viewMode === 'card') {
  return (
    <CardView
      key={inquiry.inquiry_id}
      inquiry={inquiry}
      snapshot={snapshot}
      isExpanded={isExpanded}
      onToggle={() => toggleExpand(inquiry.inquiry_id)}
      {...commonProps}
    />
  );
} else {
  return (
    <ListView
      key={inquiry.inquiry_id}
      inquiry={inquiry}
      snapshot={snapshot}
      isExpanded={isExpanded}
      onToggle={() => toggleExpand(inquiry.inquiry_id)}
      {...commonProps}
    />
          );
        }
      })}
    </div>
  );
};