// src/pages/Inbox/DirectInboundTab.tsx
import React, { useState } from 'react';
import { apiClient } from '../../api/client';
import { Ban } from 'lucide-react';
import '../../styles/Notebook.css'; // 🌟 直接複用筆記本的強大分欄樣式

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
  // 🌟 核心：改成左右分欄的狀態管理
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const formatTime = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T') + 'Z');
    return d.toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': 
        return <span className="card-tag" style={{ backgroundColor: '#FDF4E6', color: '#A67B3E', border: '1px solid #FDE0B5' }}>待處理</span>;
      case 'proposed': 
        return <span className="card-tag" style={{ backgroundColor: '#EBF2F7', color: '#4A7294', border: '1px solid #C1D6E8' }}>已提案</span>;
      case 'accepted': 
        return <span className="card-tag badge-completed">已成單</span>;
      case 'declined': 
        return <span className="card-tag badge-cancelled">已婉拒/取消</span>;
      default: 
        return <span className="card-tag">{status}</span>;
    }
  };

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
      <div style={{ textAlign: 'center', padding: '80px 20px', color: '#A0978D' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>📭</div>
        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#7A7269', marginBottom: '8px' }}>目前沒有收到客製化委託申請</div>
        <div style={{ fontSize: '14px' }}>當委託人透過您的個人頁面送出表單時，申請會顯示在這裡。</div>
      </div>
    );
  }

  const selectedInq = inquiries.find(i => i.id === selectedId);
  const isGuestSelected = selectedInq && !selectedInq.client_id;
  const isBlacklistSelected = selectedInq && !isGuestSelected && blacklistedIds.includes(selectedInq.client_id);
  
  let parsedAnswers: any[] = [];
  if (selectedInq) {
    try { parsedAnswers = JSON.parse(selectedInq.form_answers || '[]'); } catch (e) {}
  }

  return (
    <div className="notebook-container" style={{ height: '100%', margin: 0, padding: 0 }}>
      
      {/* ================= 左側清單區 ================= */}
      <div className={`notebook-sidebar ${selectedId ? 'mobile-hide' : ''}`} style={{ height: 'calc(100vh - 140px)' }}>
        <div className="sidebar-header" style={{ position: 'sticky', top: 0, zIndex: 10 }}>
          <span className="sidebar-title">申請列表 ({inquiries.length})</span>
        </div>

        <div className="sidebar-list-container">
          {inquiries.map((inq) => {
            const isGuest = !inq.client_id;
            const isBlacklisted = !isGuest && blacklistedIds.includes(inq.client_id);
            const isClosed = inq.status === 'accepted' || inq.status === 'declined';
            const isSelected = selectedId === inq.id;

            return (
              <div 
                key={inq.id} 
                onClick={() => { setSelectedId(inq.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }} 
                className={`sidebar-card ${isSelected ? 'selected' : ''} ${isClosed ? 'cancelled' : ''}`}
                style={{ opacity: isClosed ? 0.7 : 1 }}
              >
                <div className="card-meta-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ color: '#A0978D', fontSize: '12px' }}>{formatTime(inq.created_at)}</span>
                  {isGuest && (
                    <span className="card-mode-badge" style={{ backgroundColor: '#EBF2F7', color: '#4A7294' }}>訪客單</span>
                  )}
                </div>
                
                <div className="card-title-row" style={{ marginTop: '4px' }}>
                  <span className="card-client-name" style={{ fontSize: '15px' }}>
                    {isGuest ? '👤 訪客委託' : (inq.client_name || '未知案主')}
                  </span>
                </div>
                
                <div className="card-info-row" style={{ marginTop: '2px', color: '#7A7269', fontSize: '13px' }}>
                  項目：{inq.showcase_title || '未命名'}
                </div>

                <div className="card-tags-row" style={{ marginTop: '8px' }}>
                  {getStatusBadge(inq.status)}
                  {isBlacklisted && (
                    <span className="card-tag" style={{ backgroundColor: '#FEE2E2', color: '#EF4444', border: '1px solid #FECACA' }}>
                      🚫 黑名單
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ================= 右側詳細內容區 ================= */}
      <div className={`notebook-main ${!selectedId ? 'mobile-hide' : ''}`} style={{ height: 'calc(100vh - 140px)', overflowY: 'auto', backgroundColor: '#FBFBF9' }}>
        {!selectedInq ? (
          <div className="main-empty">
            <span style={{ fontSize: '40px', marginBottom: '16px', display: 'block', opacity: 0.5 }}>📄</span>
            請從左側選擇一筆申請以查看詳細表單內容
          </div>
        ) : (
          <div className="main-content-wrapper" style={{ maxWidth: '800px', margin: '0 auto' }}>
            
            {/* 標題與基礎資訊 */}
            <div className="main-header" style={{ marginBottom: '24px', backgroundColor: 'transparent' }}>
              <div className="main-header-info">
                <button className="mobile-back-btn" onClick={() => setSelectedId(null)}>⬅ 返回列表</button>
                <h2 className="main-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {isGuestSelected ? '👤 訪客委託' : (selectedInq.client_name || '案主')}
                </h2>
                
                <div className="main-subtitle" style={{ fontSize: '15px', color: '#4A7294', fontWeight: 'bold' }}>
                  申請項目：{selectedInq.showcase_title || '未知項目'}
                </div>
                
                {isBlacklistSelected && (
                  <div style={{ display: 'inline-block', padding: '6px 12px', background: '#FEF2F2', color: '#EF4444', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', border: '1px solid #FECACA', marginTop: '12px' }}>
                    <Ban size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'text-bottom' }} /> 
                    警告：此案主已被您列入黑名單，請謹慎接單。
                  </div>
                )}
              </div>
            </div>

            {/* 婉拒狀態提示 */}
            {selectedInq.status === 'declined' && (
              <div style={{ padding: '16px', backgroundColor: '#FCE8E6', border: '1px solid #F5C6C6', borderRadius: '12px', color: '#A05C5C', marginBottom: '24px' }}>
                <strong style={{ display: 'block', marginBottom: '4px' }}>此申請已被婉拒或取消</strong>
                您可以點擊下方按鈕將其恢復至待處理狀態。
              </div>
            )}

            {/* 訪客專屬聯絡資訊 (醒目展示) */}
            {isGuestSelected && selectedInq.guest_contact_info && (
              <div className="section-card" style={{ backgroundColor: '#FFFBEB', borderColor: '#FDE68A', marginBottom: '24px' }}>
                <h3 className="section-title" style={{ color: '#92400E', borderBottomColor: '#FDE68A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  📞 訪客留下的聯絡方式
                </h3>
                <div style={{ fontSize: '15px', color: '#92400E', lineHeight: '1.6', whiteSpace: 'pre-wrap', fontWeight: 'bold' }}>
                  {selectedInq.guest_contact_info}
                </div>
                <div style={{ fontSize: '13px', color: '#B45309', marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed #FDE68A' }}>
                  💡 提示：此為免登入訪客，無法使用站內聊天室。若雙方於站外確認完畢，可點擊下方「建立自由模式委託單」收錄至系統中管理。
                </div>
              </div>
            )}

            {/* 表單問答內容區 */}
            <div className="section-card">
              <h3 className="section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <span>📝 委託需求表單內容</span>
                <span style={{ fontSize: '13px', color: '#A0978D', fontWeight: 'normal' }}>
                  送出時間：{formatTime(selectedInq.created_at)}
                </span>
              </h3>
              
              <div style={{ fontSize: '14px', color: '#5D4A3E', lineHeight: '1.8' }}>
                {parsedAnswers.length > 0 ? parsedAnswers.map((qa: any, i: number) => (
                  <div key={i} style={{ marginBottom: '20px', backgroundColor: '#FBFBF9', padding: '16px', borderRadius: '8px', border: '1px solid #EAE6E1' }}>
                    <strong style={{ color: '#A67B3E', display: 'block', marginBottom: '8px', fontSize: '15px' }}>Q: {qa.question}</strong>
                    <div style={{ whiteSpace: 'pre-wrap', color: '#333' }}>A: {Array.isArray(qa.answer) ? qa.answer.join(', ') : (qa.answer || '(未填寫)')}</div>
                  </div>
                )) : (
                  <div style={{ color: '#A0978D', fontStyle: 'italic', textAlign: 'center', padding: '20px' }}>此案主未填寫客製化問答。</div>
                )}
              </div>
            </div>

            {/* 底部操作列 (Action Bar) */}
            <div className="section-card" style={{ marginTop: '24px', backgroundColor: 'transparent', border: 'none', boxShadow: 'none', padding: 0, display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              
              {selectedInq.status === 'declined' ? (
                <button 
                  disabled={isProcessing}
                  className="action-btn"
                  style={{ backgroundColor: '#FFFFFF', color: '#5D4A3E', border: '1px solid #DED9D3', padding: '14px 24px', fontSize: '15px' }}
                  onClick={() => handleRestore(selectedInq.id)}
                >
                  {isProcessing ? '處理中...' : '↺ 恢復此委託'}
                </button>
              ) : selectedInq.status === 'pending' || selectedInq.status === 'proposed' ? (
                <>
                  {isGuestSelected ? (
                    <>
                      <button 
                        disabled={isProcessing}
                        className="action-btn"
                        style={{ backgroundColor: '#FFFFFF', color: '#EF4444', border: '1px solid #FECACA', padding: '14px 24px', fontSize: '15px' }}
                        onClick={() => handleDeclineGuest(selectedInq.id)}
                      >
                        婉拒 / 取消
                      </button>
                      <button 
                        disabled={isProcessing}
                        className="action-btn btn-success"
                        style={{ padding: '14px 24px', fontSize: '15px' }}
                        onClick={() => handleConvertToFreeMode(selectedInq.id)}
                      >
                        建立自由模式委託單 ➔
                      </button>
                    </>
                  ) : (
                    <>
                      <button 
                        className="action-btn"
                        style={{ backgroundColor: '#FFFFFF', color: '#EF4444', border: '1px solid #FECACA', padding: '14px 24px', fontSize: '15px' }}
                        onClick={() => { setSelectedInquiry(selectedInq); setShowDeclineModal(true); }}
                      >
                        婉拒申請
                      </button>
                      <button 
                        className="action-btn btn-primary"
                        style={{ padding: '14px 24px', fontSize: '15px' }}
                        onClick={() => handleEnterInquiryWorkspace(selectedInq.id)}
                      >
                        💬 進入洽談室查看
                      </button>
                    </>
                  )}
                </>
              ) : selectedInq.status === 'accepted' ? (
                <button 
                  className="action-btn btn-success"
                  style={{ padding: '14px 24px', fontSize: '15px' }}
                  onClick={() => handleViewCommission(selectedInq.commission_id)}
                >
                  前往查看正式委託單 ➔
                </button>
              ) : null}

            </div>

          </div>
        )}
      </div>
    </div>
  );
};