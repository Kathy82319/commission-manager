import React, { useState } from 'react';
import { apiClient } from '../../api/client';

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
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const formatTime = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T') + 'Z');
    return d.toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': 
        return <span className="status-badge" style={{ backgroundColor: '#FDF4E6', color: '#A67B3E', border: '1px solid #FDE0B5', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>待處理</span>;
      case 'proposed': 
        return <span className="status-badge" style={{ backgroundColor: '#EBF2F7', color: '#4A7294', border: '1px solid #C1D6E8', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>已提案 (待案主確認)</span>;
      case 'accepted': 
        return <span className="status-badge" style={{ backgroundColor: '#E8F3EB', color: '#4E7A5A', border: '1px solid #C2E0CC', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>已成單</span>;
      case 'declined': 
        return <span className="status-badge" style={{ backgroundColor: '#F4F0EB', color: '#A0978D', border: '1px solid #DED9D3', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>已婉拒 / 取消</span>;
      default: 
        return <span className="status-badge">{status}</span>;
    }
  };

  // 🌟 Phase 4: 一鍵轉自由模式
  const handleConvertToFreeMode = async (inqId: string) => {
    if (!window.confirm("系統將直接建立一張「自由模式」委託單到您的筆記本，方便您使用專屬連結讓訪客綁定。\n\n確認要轉單嗎？")) return;
    setIsProcessing(true);
    try {
      const res = await apiClient.post(`/api/direct-inquiries/${inqId}/convert-free`, {});
      if (res.success) {
        alert("轉換成功！已將該表單建立為自由模式委託單。");
        window.location.href = '/artist/notebook';
      } else {
        alert(res.error || "轉換失敗，請稍後再試");
      }
    } catch (e) {
      alert("網路異常，轉換失敗");
    } finally {
      setIsProcessing(false);
    }
  };

  // 🌟 Phase 4: 訪客單直接婉拒
  const handleDeclineGuest = async (inqId: string) => {
    if (!window.confirm("確定要婉拒/取消此訪客委託嗎？(可隨時恢復)")) return;
    setIsProcessing(true);
    try {
      const res = await apiClient.post(`/api/direct-inquiries/${inqId}/decline`, {});
      if (res.success) {
        window.location.reload();
      } else {
        alert(res.error || "婉拒失敗");
      }
    } catch (e) {
      alert("網路異常");
    } finally {
      setIsProcessing(false);
    }
  };

  // 🌟 Phase 4: 從婉拒狀態恢復
  const handleRestore = async (inqId: string) => {
    setIsProcessing(true);
    try {
      const res = await apiClient.post(`/api/direct-inquiries/${inqId}/restore`, {});
      if (res.success) {
        window.location.reload();
      } else {
        alert(res.error || "恢復失敗");
      }
    } catch (e) {
      alert("網路異常");
    } finally {
      setIsProcessing(false);
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
        const isGuest = !inq.client_id;
        const isBlacklisted = !isGuest && blacklistedIds.includes(inq.client_id);
        const isClosed = inq.status === 'accepted';
        // 🌟 Phase 4: 婉拒狀態整張卡片反灰，透明度降低
        const isDeclined = inq.status === 'declined';
        const isExpanded = expandedIds.includes(inq.id);

        let parsedAnswers: any[] = [];
        try { parsedAnswers = JSON.parse(inq.form_answers || '[]'); } catch (e) {}

        return (
          <div key={inq.id} className={`inquiry-card ${isClosed || isDeclined ? 'closed' : ''}`} style={{ backgroundColor: isDeclined ? '#F9F9F9' : '#FFFFFF', border: `1px solid ${isBlacklisted ? '#EF4444' : '#EAE6E1'}`, borderRadius: '12px', padding: '20px', opacity: (isClosed || isDeclined) ? 0.6 : 1, position: 'relative', overflow: 'hidden', filter: isDeclined ? 'grayscale(50%)' : 'none', transition: 'all 0.3s' }}>
            
            {isBlacklisted && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', backgroundColor: '#EF4444' }} />}

            <div className="inquiry-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid #F4F0EB', paddingBottom: '12px' }}>
              <div className="inquiry-client-info" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="client-name" style={{ fontWeight: 'bold', color: '#5D4A3E', fontSize: '16px' }}>
                  {isGuest ? '👤 訪客委託' : (inq.client_name || '案主')}
                </span>
                {isGuest && (
                  <span style={{ backgroundColor: '#EBF2F7', color: '#4A7294', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>免登入表單</span>
                )}
                {isBlacklisted && (
                  <span className="badge-blacklist" style={{ backgroundColor: '#FEE2E2', color: '#EF4444', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', border: '1px solid #FECACA' }}>黑名單</span>
                )}
                <span className="inquiry-time" style={{ color: '#A0978D', fontSize: '12px' }}>{formatTime(inq.created_at)}</span>
              </div>
              <div className="inquiry-status">{getStatusBadge(inq.status)}</div>
            </div>

            <div className="inquiry-body" style={{ marginBottom: '16px' }}>
              <div className="inquiry-title" style={{ fontSize: '15px', color: '#5D4A3E', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                🛒 申請項目：{inq.showcase_title || '未知名稱項目'}
              </div>
              
              <div className="inquiry-desc" style={{ color: '#7A7269', fontSize: '13px', marginTop: '12px', backgroundColor: '#FBFBF9', padding: '12px', borderRadius: '8px', border: '1px solid #EAE6E1' }}>
                {isGuest ? (
                  <div>
                    <strong>此為訪客送出的表單，無法使用站內聊天室。</strong><br/>
                    請點擊下方展開查看表單，若雙方於站外確認完畢，可點擊「建立自由模式委託單」收錄至筆記本中。
                  </div>
                ) : (
                  "委託人已填寫專屬客製化表單並同意協議，請進入洽談室查看詳細需求與報價。"
                )}
              </div>

              {/* 🌟 Phase 4: 聯絡資訊醒目展示 */}
              {isGuest && inq.guest_contact_info && (
                <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '8px', color: '#92400E', fontSize: '14px', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <span>📞</span>
                  <div>
                    <strong style={{ display: 'block', marginBottom: '4px' }}>訪客留下的聯絡方式：</strong>
                    <div style={{ wordBreak: 'break-word', lineHeight: '1.5' }}>{inq.guest_contact_info}</div>
                  </div>
                </div>
              )}
            </div>

            <button 
              onClick={() => toggleExpand(inq.id)}
              style={{ width: '100%', background: isExpanded ? '#FDFDFB' : '#FFFFFF', border: '1px dashed #DED9D3', padding: '8px', borderRadius: '8px', cursor: 'pointer', color: '#A67B3E', fontSize: '13px', fontWeight: 'bold', marginBottom: '16px', transition: 'all 0.2s' }}
            >
              {isExpanded ? '▲ 收起表單內容' : '▼ 展開表單內容'}
            </button>

            {isExpanded && (
              <div style={{ background: '#FDFDFB', border: '1px solid #EAE6E1', borderRadius: '8px', padding: '16px', marginBottom: '16px', fontSize: '13px', color: '#5D4A3E', maxHeight: '250px', overflowY: 'auto' }} className="custom-scrollbar">
                {parsedAnswers.length > 0 ? parsedAnswers.map((qa: any, i: number) => (
                  <div key={i} style={{ marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px dashed #EAE6E1' }}>
                    <strong style={{ color: '#A67B3E' }}>Q: {qa.question}</strong><br/>
                    <span style={{ whiteSpace: 'pre-wrap', marginTop: '4px', display: 'block' }}>A: {Array.isArray(qa.answer) ? qa.answer.join(', ') : (qa.answer || '(未填寫)')}</span>
                  </div>
                )) : (
                  <div style={{ color: '#A0978D', fontStyle: 'italic' }}>未填寫客製化問答。</div>
                )}
              </div>
            )}

            <div className="inquiry-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              {isDeclined ? (
                // 🌟 Phase 4: 提供「恢復」按鈕
                <button 
                  disabled={isProcessing}
                  style={{ padding: '8px 16px', backgroundColor: '#FFFFFF', color: '#5D4A3E', border: '1px solid #DED9D3', borderRadius: '6px', fontWeight: 'bold', cursor: isProcessing ? 'not-allowed' : 'pointer', fontSize: '13px' }}
                  onClick={() => handleRestore(inq.id)}
                >
                  ↺ 恢復此委託
                </button>
              ) : inq.status === 'pending' || inq.status === 'proposed' ? (
                <>
                  {isGuest ? (
                    // 🌟 Phase 4: 訪客專屬動線 (無聊天室)
                    <>
                      <button 
                        disabled={isProcessing}
                        style={{ padding: '8px 16px', backgroundColor: '#FFFFFF', color: '#A05C5C', border: '1px solid #E8C1C1', borderRadius: '6px', fontWeight: 'bold', cursor: isProcessing ? 'not-allowed' : 'pointer', fontSize: '13px' }}
                        onClick={() => handleDeclineGuest(inq.id)}
                      >
                        婉拒 / 取消
                      </button>
                      <button 
                        disabled={isProcessing}
                        style={{ padding: '8px 16px', backgroundColor: '#4E7A5A', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: isProcessing ? 'not-allowed' : 'pointer', fontSize: '13px' }}
                        onClick={() => handleConvertToFreeMode(inq.id)}
                      >
                        建立自由模式委託單 ➔
                      </button>
                    </>
                  ) : (
                    // 🌟 一般會員動線
                    <>
                      <button 
                        style={{ padding: '8px 16px', backgroundColor: '#FFFFFF', color: '#A05C5C', border: '1px solid #E8C1C1', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}
                        onClick={() => { setSelectedInquiry(inq); setShowDeclineModal(true); }}
                      >
                        婉拒申請
                      </button>
                      <button 
                        style={{ padding: '8px 16px', backgroundColor: '#5D4A3E', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}
                        onClick={() => handleEnterInquiryWorkspace(inq.id)}
                      >
                        進入洽談室查看
                      </button>
                    </>
                  )}
                </>
              ) : inq.status === 'accepted' ? (
                <button 
                  style={{ padding: '8px 16px', backgroundColor: '#4E7A5A', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}
                  onClick={() => handleViewCommission(inq.commission_id)}
                >
                  前往查看委託單 ➔
                </button>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
};