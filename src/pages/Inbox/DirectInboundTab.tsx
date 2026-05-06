// src/pages/Inbox/DirectInboundTab.tsx
import React from 'react';

interface DirectInboundTabProps {
  inquiries: any[];
  navigate: any;
  setSelectedInquiry: (inq: any) => void;
  setShowDeclineModal: (show: boolean) => void;
  handleEnterInquiryWorkspace: (id: string) => void;
  handleViewCommission: (id?: string) => void;
  blacklistedIds: string[];
  setSelectedIdsForBatch?: (ids: Set<string>) => void;
}

export const DirectInboundTab: React.FC<DirectInboundTabProps> = ({
  inquiries,
  setSelectedInquiry,
  setShowDeclineModal,
  handleEnterInquiryWorkspace,
  handleViewCommission,
  blacklistedIds
}) => {
  
  // 格式化時間
  const formatTime = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T') + 'Z');
    return d.toLocaleString('zh-TW', {
      month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false
    });
  };

  // 渲染狀態標籤
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': 
        return <span className="status-badge" style={{ backgroundColor: '#FDF4E6', color: '#A67B3E', border: '1px solid #FDE0B5', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>待處理</span>;
      case 'proposed': 
        return <span className="status-badge" style={{ backgroundColor: '#EBF2F7', color: '#4A7294', border: '1px solid #C1D6E8', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>已提案 (待案主確認)</span>;
      case 'accepted': 
        return <span className="status-badge" style={{ backgroundColor: '#E8F3EB', color: '#4E7A5A', border: '1px solid #C2E0CC', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>已成單</span>;
      case 'declined': 
        return <span className="status-badge" style={{ backgroundColor: '#F4F0EB', color: '#A0978D', border: '1px solid #DED9D3', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>已婉拒</span>;
      default: 
        return <span className="status-badge">{status}</span>;
    }
  };

  if (!inquiries || inquiries.length === 0) {
    return (
      <div className="inbox-empty-state" style={{ textAlign: 'center', padding: '60px 20px', color: '#A0978D', backgroundColor: '#FAFAFA', borderRadius: '12px', border: '1px dashed #DED9D3', marginTop: '20px' }}>
        <div style={{ fontSize: '40px', marginBottom: '16px' }}>📭</div>
        <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#7A7269', marginBottom: '8px' }}>目前沒有來自個人頁的委託申請</div>
        <div style={{ fontSize: '14px' }}>當委託人透過您的個人頁面送出表單時，申請會顯示在這裡。</div>
      </div>
    );
  }

  return (
    <div className="inquiry-list" style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '20px' }}>
      {inquiries.map((inq) => {
        const isBlacklisted = blacklistedIds.includes(inq.client_id);
        const isClosed = inq.status === 'accepted' || inq.status === 'declined';

        return (
          <div 
            key={inq.id} 
            className={`inquiry-card ${isClosed ? 'closed' : ''}`}
            style={{ 
              backgroundColor: '#FFFFFF', 
              border: `1px solid ${isBlacklisted ? '#EF4444' : '#EAE6E1'}`, 
              borderRadius: '12px', 
              padding: '20px',
              opacity: isClosed ? 0.7 : 1,
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* 黑名單側邊裝飾線 */}
            {isBlacklisted && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', backgroundColor: '#EF4444' }} />}

            <div className="inquiry-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid #F4F0EB', paddingBottom: '12px' }}>
              <div className="inquiry-client-info" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="client-name" style={{ fontWeight: 'bold', color: '#5D4A3E', fontSize: '16px' }}>
                  {inq.client_name || '案主'}
                </span>
                {isBlacklisted && (
                  <span className="badge-blacklist" style={{ backgroundColor: '#FEE2E2', color: '#EF4444', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', border: '1px solid #FECACA' }}>
                    黑名單
                  </span>
                )}
                <span className="inquiry-time" style={{ color: '#A0978D', fontSize: '12px' }}>
                  {formatTime(inq.created_at)}
                </span>
              </div>
              <div className="inquiry-status">
                {getStatusBadge(inq.status)}
              </div>
            </div>

            <div className="inquiry-body" style={{ marginBottom: '20px' }}>
              <div className="inquiry-title" style={{ fontSize: '15px', color: '#5D4A3E', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                🛒 申請項目：{inq.showcase_title || '未知名稱項目'}
              </div>
              <div className="inquiry-desc" style={{ color: '#7A7269', fontSize: '13px', marginTop: '8px', backgroundColor: '#FBFBF9', padding: '12px', borderRadius: '8px', border: '1px solid #EAE6E1' }}>
                委託人已填寫專屬客製化表單並同意協議，請進入洽談室查看詳細需求。
              </div>
            </div>

            <div className="inquiry-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              {inq.status === 'pending' || inq.status === 'proposed' ? (
                <>
                  <button 
                    className="action-btn"
                    style={{ padding: '8px 16px', backgroundColor: '#FFFFFF', color: '#A05C5C', border: '1px solid #E8C1C1', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}
                    onClick={() => {
                      setSelectedInquiry(inq);
                      setShowDeclineModal(true);
                    }}
                  >
                    婉拒申請
                  </button>
                  <button 
                    className="action-btn"
                    style={{ padding: '8px 16px', backgroundColor: '#5D4A3E', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}
                    onClick={() => handleEnterInquiryWorkspace(inq.id)}
                  >
                    進入洽談室查看
                  </button>
                </>
              ) : inq.status === 'accepted' ? (
                <button 
                  className="action-btn"
                  style={{ padding: '8px 16px', backgroundColor: '#4E7A5A', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}
                  onClick={() => handleViewCommission(inq.commission_id)}
                >
                  前往查看委託單 ➔
                </button>
              ) : (
                <span className="closed-text" style={{ color: '#A0978D', fontSize: '13px', fontWeight: 'bold' }}>
                  此對話已結束
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};