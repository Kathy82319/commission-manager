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
}

export const OfferList: React.FC<OfferListProps> = ({
  inquiries,
  setSelectedInquiry,
  setShowDeclineModal,
  setShowInviteModal,
  handleEnterInquiryWorkspace,
  handleViewCommission
}) => {
  // 記錄哪些卡片被展開了
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  
  // 🌟 批次選擇狀態：紀錄哪些卡片被勾選了
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

  const handleBatchDecline = () => {
    // 🛡️ 批次操作資安提醒：
    // 1. 此處僅能觸發前端 UI (如婉拒原因 Modal)。
    // 2. 最終 API 送出時必須傳送 selectedIds 陣列。
    // 3. 後端必須檢查當前用戶是否真的擁有操作這幾筆 inquiryId 的權限。
    if (selectedIds.size === 0) return;
    
    // 範例：我們可以將第一筆選中的資料帶入 Modal 做範本，
    // 或是在 Modal 組件中特別處理「批量模式」。
    alert(`即將批次處理 ${selectedIds.size} 筆委託。請串接後端 API 並確保後端校驗 artist_id 權限。`);
  };

  return (
    <div className="offer-list-container">
      {/* 🌟 批次工具列：僅在有勾選時出現 */}
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
        try { 
          // 🔒 安全解析：避免因為資料異常導致白屏
          snapshot = JSON.parse(inquiry.artist_snapshot || '{}');
        } catch(e) { 
          console.error("解析快照失敗 (ID: " + inquiry.inquiry_id + ")", e); 
        }

        return (
          <CardView
            key={inquiry.inquiry_id}
            inquiry={inquiry}
            snapshot={snapshot}
            isExpanded={expandedIds.has(inquiry.inquiry_id)}
            onToggle={() => toggleExpand(inquiry.inquiry_id)}
            
            // 🌟 批次控制 Props
            isSelected={selectedIds.has(inquiry.inquiry_id)}
            onSelect={() => toggleSelect(inquiry.inquiry_id)}
            
            setSelectedInquiry={setSelectedInquiry}
            setShowDeclineModal={setShowDeclineModal}
            setShowInviteModal={setShowInviteModal}
            handleEnterInquiryWorkspace={handleEnterInquiryWorkspace}
            handleViewCommission={handleViewCommission}
          />
        );
      })}
    </div>
  );
};