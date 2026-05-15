// src/pages/Inbox/DirectInboundTab.tsx
import React, { useState } from 'react';
import { apiClient } from '../../api/client';
import { Ban } from 'lucide-react';
import '../../styles/Notebook.css'; 

interface DirectInboundTabProps {
  inquiries: any[];
  selectedInquiryId?: string; 
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
  selectedInquiryId,
  setSelectedInquiry,
  setShowDeclineModal,
  handleEnterInquiryWorkspace,
  handleViewCommission,
  blacklistedIds
}) => { 
  const [isProcessing, setIsProcessing] = useState(false);

  const formatTime = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T') + 'Z');
    return d.toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
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
        // 🌟 修正：優先抓取後端回傳的 message，如果沒有才抓 error
        alert(res.message || res.error || "轉換失敗，請稍後再試");
      }
    } catch (e: any) {
      // 🌟 修正：攔截 apiClient 拋出的 Error，提取後端的 JSON 錯誤訊息
      const errorMessage = e?.response?.data?.message || e?.response?.data?.error || e?.message || "網路異常，轉換失敗";
      alert(errorMessage);
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
        alert(res.message || res.error || "婉拒失敗");
      }
    } catch (e: any) {
      const errorMessage = e?.response?.data?.message || e?.response?.data?.error || e?.message || "網路異常";
      alert(errorMessage);
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
        alert(res.message || res.error || "恢復失敗");
      }
    } catch (e: any) {
      const errorMessage = e?.response?.data?.message || e?.response?.data?.error || e?.message || "網路異常";
      alert(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  // 找出當前選中的那筆資料
  const selectedInq = inquiries.find(i => i.id === selectedInquiryId);

  // 防呆：如果找不到資料
  if (!selectedInq) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px', color: '#A0978D' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>📭</div>
        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#7A7269', marginBottom: '8px' }}>找不到該筆委託申請</div>
        <div style={{ fontSize: '14px' }}>請從左側清單重新選擇。</div>
      </div>
    );
  }

  const isGuestSelected = !selectedInq.client_id;
  const isBlacklistSelected = !isGuestSelected && blacklistedIds.includes(selectedInq.client_id);
  
  let parsedAnswers: any[] = [];
  try { parsedAnswers = JSON.parse(selectedInq.form_answers || '[]'); } catch (e) {}

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', animation: 'fadeIn 0.2s ease' }}>
      
      
      <div className="main-header" style={{ marginBottom: '24px', backgroundColor: 'transparent', padding: 0 }}>
        <div className="main-header-info">
          <h2 className="main-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '24px' }}>
            {isGuestSelected ? '👤 訪客委託' : (selectedInq.client_name || '案主')}
          </h2>
          
          <div className="main-subtitle" style={{ fontSize: '15px', color: '#4A7294', fontWeight: 'bold', marginTop: '8px' }}>
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

      
      {selectedInq.status === 'declined' && (
        <div style={{ padding: '16px', backgroundColor: '#FCE8E6', border: '1px solid #F5C6C6', borderRadius: '12px', color: '#A05C5C', marginBottom: '24px' }}>
          <strong style={{ display: 'block', marginBottom: '4px' }}>此申請已被婉拒或取消</strong>
          您可以點擊下方按鈕將其恢復至待處理狀態。
        </div>
      )}

      
      {isGuestSelected && selectedInq.guest_contact_info && (
        <div className="section-card" style={{ backgroundColor: '#FFFBEB', borderColor: '#FDE68A', marginBottom: '24px' }}>
          <h3 className="section-title" style={{ color: '#92400E', borderBottomColor: '#FDE68A', display: 'flex', alignItems: 'center', gap: '6px' }}>
            📞 訪客留下的聯絡方式
          </h3>
          <div style={{ fontSize: '15px', color: '#92400E', lineHeight: '1.6', whiteSpace: 'pre-wrap', fontWeight: 'bold' }}>
            {selectedInq.guest_contact_info}
          </div>
          <div style={{ fontSize: '13px', color: '#B45309', marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed #FDE68A' }}>
            💡 提示：此為訪客訂單，無法使用站內聊天室。若雙方於站外確認完畢，可點擊下方「建立自由模式委託單」收錄至系統中管理。
          </div>
        </div>
      )}

      
      <div className="section-card" style={{ opacity: selectedInq.status === 'declined' ? 0.6 : 1, filter: selectedInq.status === 'declined' ? 'grayscale(50%)' : 'none', transition: 'all 0.3s' }}>
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
  );
};