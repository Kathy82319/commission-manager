// src/pages/Inbox/index.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';
import '../../styles/Inbox.css';

import { InboundTab } from './InboundTab';
import { OutboundTab } from './OutboundTab';
import { DirectInboundTab } from './DirectInboundTab'; 

export const Inbox: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  // 🌟 核心變更：不再使用 activeTab，改為 selectedFolder
  // 'direct' = 個人頁專屬委託
  // 'outbound' = 我投遞的申請
  // 'bulletin-XXX' = 許願池收件
  const [selectedFolder, setSelectedFolder] = useState<string>('direct');
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [clientBulletins, setClientBulletins] = useState<any[]>([]);
  const [clientInquiries, setClientInquiries] = useState<any[]>([]);
  const [artistInquiries, setArtistInquiries] = useState<any[]>([]);
  const [directInquiries, setDirectInquiries] = useState<any[]>([]);
  const [directOutboundInquiries, setDirectOutboundInquiries] = useState<any[]>([]);
  const [blacklistedIds, setBlacklistedIds] = useState<string[]>([]);

  // Modal 狀態
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false); 
  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null);
  const [selectedInquiry, setSelectedInquiry] = useState<any>(null);
  const [batchDeclineIds, setBatchDeclineIds] = useState<Set<string>>(new Set());
  
  const isBatchMode = batchDeclineIds.size > 0;
  const isCancelMode = !!cancelTargetId; 

  const [declineReason, setDeclineReason] = useState('');
  const [declineTemplates, setDeclineTemplates] = useState<string[]>([
    '目前檔期較滿，暫不接單', 
    '經過評估，可能有預算或價格考量', 
    '較不擅長此題材，怕無法達到您的期望'
  ]);
  const [isEditingTemplates, setIsEditingTemplates] = useState(false);
  const [tempTemplates, setTempTemplates] = useState<string[]>(['', '', '']);

  // 🌟 一次性撈取所有收件匣資料，供左側選單計算紅點數字
  const fetchInbox = async () => {
    setLoading(true);
    try {
      const [
        meRes, relRes, 
        clientBulletinRes, artistBulletinRes, 
        directInRes, directOutRes
      ] = await Promise.all([
        apiClient.get('/api/users/me'),
        apiClient.get('/api/relations'),
        apiClient.get('/api/bulletins/client/inbox'),
        apiClient.get('/api/bulletins/artist/inbox'),
        apiClient.get('/api/direct-inquiries'),
        apiClient.get('/api/direct-inquiries/outbound')
      ]);

      if (meRes.success) {
        setCurrentUser(meRes.data);
        try {
          const settings = typeof meRes.data.profile_settings === 'string' ? JSON.parse(meRes.data.profile_settings) : meRes.data.profile_settings;
          if (settings?.decline_templates && Array.isArray(settings.decline_templates)) {
            setDeclineTemplates(settings.decline_templates);
          }
        } catch(e) {}
      }

      if (relRes.success && relRes.data) {
        const bIds = relRes.data.filter((r: any) => r.relation_type === 'blacklist').map((r: any) => r.target_user_id);
        setBlacklistedIds(bIds);
      }

      if (clientBulletinRes.success) {
        setClientBulletins(clientBulletinRes.data.bulletins || []);
        setClientInquiries(clientBulletinRes.data.inquiries || []);
      }
      if (artistBulletinRes.success) setArtistInquiries(artistBulletinRes.data || []);
      if (directInRes.success) setDirectInquiries(directInRes.data || []);
      if (directOutRes.success) setDirectOutboundInquiries(directOutRes.data || []);

    } catch (error) { 
      console.error("無法載入收件匣", error); 
    } finally { 
      setLoading(false); 
    }
  };

  // 僅在初次載入或觸發更新時撈取，不需要依賴 selectedFolder 變動
  useEffect(() => { fetchInbox(); }, []);

  const handleCloseModal = () => {
    setShowDeclineModal(false);
    setIsEditingTemplates(false);
    setBatchDeclineIds(new Set());
    setSelectedInquiry(null);
    setCancelTargetId(null);
    setDeclineReason('');
  };

  const handleConfirmDecline = async () => {
    if (!isBatchMode && !selectedInquiry && !isCancelMode) return;
    
    const defaultReason = isCancelMode 
      ? '案主已撤銷許願 / 結束徵件' 
      // 這裡簡單判斷如果是由自己主動投出去被婉拒的
      : (selectedInquiry?.inquiry_status === 'pending' && selectedFolder === 'outbound')
        ? '已撤回申請' 
        : '已找到合適人選 / 終止洽談';
        
    const finalReason = declineReason || defaultReason;

    try {
      if (isCancelMode && cancelTargetId) {
        const res = await apiClient.patch(`/api/bulletins/${cancelTargetId}/close`, { decline_reason: finalReason });
        if (!res.success) throw new Error(res.message);
        alert('許願貼文已成功撤銷，並已發送婉拒通知給相關繪師。');
      } else if (isBatchMode) {
        const targetIds = Array.from(batchDeclineIds);
        const res = await apiClient.post('/api/inquiries/batch-decline', { 
          inquiry_ids: targetIds,
          decline_reason: finalReason 
        });
        if (!res.success) throw new Error(res.message);
        alert(`批次處理完成！共成功婉拒了 ${res.processed_count} 筆提案。`);
      } else if (selectedInquiry) {
        const inquiryId = selectedInquiry.inquiry_id || selectedInquiry.id;
        
        if (selectedInquiry.showcase_id) {
          await apiClient.post(`/api/direct-inquiries/${inquiryId}/decline`, { decline_reason: finalReason });
        } else {
          await apiClient.post(`/api/inquiries/${inquiryId}/decline`, { decline_reason: finalReason });
        }
        alert('已傳送婉拒/撤回通知，對話已關閉。');
      }

      handleCloseModal(); 
      fetchInbox(); 
    } catch (error: any) { 
      alert(error.message || '操作發生錯誤，請稍後再試。'); 
    }
  };

  const handleDirectInvite = async (inquiryToInvite: any) => {
    if (!inquiryToInvite) return;
    try {
      await apiClient.patch(`/api/inquiries/${inquiryToInvite.inquiry_id}/submit-response`, { 
        client_response: "案主已確認提案，開啟聊天室與您詳談細節。" 
      });
      fetchInbox(); 
    } catch (error: any) { 
      alert(error.message || '開啟聊天室失敗'); 
    }
  };

  const handleSaveTemplates = async () => {
    try {
      const settings = typeof currentUser?.profile_settings === 'string' 
        ? JSON.parse(currentUser.profile_settings || '{}') 
        : (currentUser?.profile_settings || {});
        
      settings.decline_templates = tempTemplates;
      await apiClient.patch('/api/users/me', { profile_settings: JSON.stringify(settings) });
      setDeclineTemplates(tempTemplates);
      setIsEditingTemplates(false);
      alert('✅ 罐頭訊息已成功儲存！');
    } catch (e) {
      alert('儲存失敗，請檢查網路連線');
    }
  };

  const handleEnterInquiryWorkspace = (inquiryId: string) => navigate(`/inquiry/workspace/${inquiryId}`);
  
  const handleViewCommission = (commissionId?: string) => {
    if (!commissionId) {
      alert('無法取得委託單資訊，請直接前往工作區查看。');
      navigate('/artist/notebook');
      return;
    }
    navigate(selectedFolder.startsWith('bulletin-') ? `/client/orders?id=${commissionId}` : `/artist/notebook?id=${commissionId}`); 
  };

  const handleCancelBulletinTrigger = (bulletinId: string) => {
    setCancelTargetId(bulletinId);
    setShowDeclineModal(true);
  };

  const handleFolderSelect = (folder: string) => {
    setSelectedFolder(folder);
    setShowMobileSidebar(false);
  };

  // =====================================
  // 計算未讀數量與渲染邏輯
  // =====================================
  const pendingDirectCount = directInquiries.filter(i => i.status === 'pending').length;
  const openBulletins = clientBulletins.filter(b => b.status === 'open');

  // 動態獲取當前選擇的標題名稱 (供手機版 Header 使用)
  const getMobileHeaderTitle = () => {
    if (selectedFolder === 'direct') return '專屬客製化委託';
    if (selectedFolder === 'outbound') return '我投遞的申請';
    if (selectedFolder.startsWith('bulletin-')) {
      const b = clientBulletins.find(b => b.id === selectedFolder.split('-')[1]);
      return b ? b.title || '許願池提案' : '許願池提案';
    }
    return '收件匣';
  };

  return (
    <div className="inbox-layout">
      
      {/* 🌟 遮罩層 (手機版選單用) */}
      <div className={`sidebar-overlay ${showMobileSidebar ? 'open' : ''}`} onClick={() => setShowMobileSidebar(false)}></div>

      {/* 🌟 左側導覽列 (資料夾) */}
      <div className={`inbox-sidebar custom-scrollbar ${showMobileSidebar ? 'open' : ''}`}>
        <div className="inbox-sidebar-header">
          <h1 className="inbox-sidebar-title">收件匣</h1>
          <button onClick={() => setShowRulesModal(true)} className="inbox-rules-btn">
            <span style={{ fontWeight: 'bold' }}>?</span> 規則
          </button>
        </div>

        <div className="sidebar-group">
          <div className="sidebar-group-title">📥 收到申請</div>
          
          <div className={`sidebar-item ${selectedFolder === 'direct' ? 'active' : ''}`} onClick={() => handleFolderSelect('direct')}>
            <span className="sidebar-item-text">📁 專屬客製化委託</span>
            {pendingDirectCount > 0 && <span className="sidebar-badge">{pendingDirectCount}</span>}
          </div>

          {openBulletins.map(b => {
            const pendingCount = clientInquiries.filter(i => i.bulletin_id === b.id && i.inquiry_status === 'pending').length;
            const folderId = `bulletin-${b.id}`;
            return (
              <div key={folderId} className={`sidebar-item ${selectedFolder === folderId ? 'active' : ''}`} onClick={() => handleFolderSelect(folderId)}>
                <span className="sidebar-item-text">📌 {b.title || '未命名許願'}</span>
                {pendingCount > 0 && <span className="sidebar-badge">{pendingCount}</span>}
              </div>
            );
          })}
        </div>

        <div className="sidebar-group">
          <div className="sidebar-group-title">🚀 追蹤狀態</div>
          <div className={`sidebar-item ${selectedFolder === 'outbound' ? 'active' : ''}`} onClick={() => handleFolderSelect('outbound')}>
            <span className="sidebar-item-text">📁 我投遞的申請</span>
          </div>
        </div>
      </div>

      {/* 🌟 右側主內容區 */}
      <div className="inbox-main custom-scrollbar">
        
        {/* 手機版頂部 Header */}
        <div className="mobile-inbox-header">
          <button className="mobile-menu-btn" onClick={() => setShowMobileSidebar(true)}>☰</button>
          <span className="mobile-header-title">{getMobileHeaderTitle()}</span>
        </div>

        <div className="inbox-content-wrapper">
          {loading ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#A0978D' }}>資料載入中...</div>
          ) : selectedFolder === 'direct' ? (
            <DirectInboundTab 
              inquiries={directInquiries}
              navigate={navigate}
              setSelectedInquiry={setSelectedInquiry}
              setShowDeclineModal={setShowDeclineModal}
              handleEnterInquiryWorkspace={handleEnterInquiryWorkspace}
              handleViewCommission={handleViewCommission}
              blacklistedIds={blacklistedIds}
              setSelectedIdsForBatch={setBatchDeclineIds}
            />
          ) : selectedFolder === 'outbound' ? (
            <OutboundTab 
              artistInquiries={artistInquiries}
              directOutboundInquiries={directOutboundInquiries}
              setSelectedInquiry={setSelectedInquiry}
              setShowDeclineModal={setShowDeclineModal}
              handleEnterInquiryWorkspace={handleEnterInquiryWorkspace}
              handleViewCommission={handleViewCommission}
              blacklistedIds={blacklistedIds} 
            />
          ) : selectedFolder.startsWith('bulletin-') ? (
            // 🌟 將選定的 bulletin ID 傳遞給 InboundTab (下一階段會優化這裡)
            <InboundTab 
              clientBulletins={clientBulletins.filter(b => b.id === selectedFolder.split('-')[1])}
              clientInquiries={clientInquiries}
              navigate={navigate}
              setSelectedInquiry={setSelectedInquiry}
              setShowDeclineModal={setShowDeclineModal}
              handleDirectInvite={handleDirectInvite}
              handleEnterInquiryWorkspace={handleEnterInquiryWorkspace}
              handleViewCommission={handleViewCommission}
              setSelectedIdsForBatch={setBatchDeclineIds}
              blacklistedIds={blacklistedIds}
              handleCancelBulletin={handleCancelBulletinTrigger} 
            />
          ) : null}
        </div>
      </div>

      {/* ========== 原有的 Modals ========== */}
      {showRulesModal && (
        <div className="inbox-modal-overlay" onClick={() => setShowRulesModal(false)}>
           <div className="inbox-modal-content rules-modal-content" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #EAE6E1', paddingBottom: '12px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', color: '#5D4A3E' }}><span>📋</span> 收件匣規則</h2>
              <button onClick={() => setShowRulesModal(false)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#A0978D' }}>✕</button>
            </div>
            
            <ul style={{ padding: 0, margin: 0, listStyle: 'none', color: '#7A7269', fontSize: '14px', lineHeight: '1.6' }}>
              <li style={{ marginBottom: '12px' }}>
                <strong style={{ color: '#4A7294' }}>許願池時效限制</strong>：刊登文章限時 <span style={{ color: '#EF4444' }}>3 天</span>，過期將自動下架，確保提案都是最新需求。
              </li>
              <li style={{ marginBottom: '12px' }}>
                <strong style={{ color: '#4A7294' }}>處理期限</strong>：收到提案後請盡速處理。倒數 <span style={{ color: '#EF4444' }}>不足 12 小時</span> 的提案將亮起紅燈警示。
              </li>
              <li style={{ marginBottom: '12px' }}>
                <strong style={{ color: '#4A7294' }}>逾期處理</strong>：超過 <span style={{ color: '#EF4444' }}>7 天</span> 未處理的提案，系統將視為無效並自動標記為「已失效」歸檔。
              </li>
            </ul>

            <div style={{ marginTop: '24px', textAlign: 'right' }}>
              <button style={{ padding: '8px 16px', background: '#5D4A3E', color: '#FFF', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => setShowRulesModal(false)}>
                我了解了
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeclineModal && (
        <div className="inbox-modal-overlay">
          <div className="inbox-modal-content decline-mode">
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#EF4444', marginBottom: '8px', marginTop: 0 }}>
              {isCancelMode 
                ? '⚠️ 撤銷許願與婉拒提案' 
                : isBatchMode 
                  ? `批次婉拒 (${batchDeclineIds.size} 筆)` 
                  : (selectedInquiry?.status === 'pending' || selectedInquiry?.inquiry_status === 'pending') && selectedFolder === 'outbound' ? '撤回申請' : '禮貌婉拒'
              }
            </h2>
            
            <p style={{ color: '#A05C5C', fontSize: '13px', marginBottom: '20px', padding: '12px', backgroundColor: '#FEF2F2', borderRadius: '8px', border: '1px solid #FECACA' }}>
              {isCancelMode
                ? '您即將撤銷這篇許願貼文。這將會關閉該貼文，並將所有尚未處理的提案一併婉拒。請填寫統一的婉拒理由以示尊重。'
                : isBatchMode
                  ? '您即將同時婉拒多筆提案，這項操作無法復原。請填寫統一的婉拒理由以示尊重。'
                  : '這將會終止洽談，建議附上簡單理由以示尊重。'
              }
            </p>

            <div className="template-manager" style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#5D4A3E' }}>快速帶入罐頭訊息：</div>
                <button 
                  style={{ background: 'none', border: 'none', color: '#4A7294', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' }}
                  onClick={() => {
                    if (!isEditingTemplates) {
                      const defaults = [...declineTemplates];
                      while (defaults.length < 3) defaults.push('');
                      setTempTemplates(defaults);
                    }
                    setIsEditingTemplates(!isEditingTemplates);
                  }}
                >
                  {isEditingTemplates ? '✕ 取消編輯' : '⚙️ 編輯罐頭訊息'}
                </button>
              </div>

              {isEditingTemplates ? (
                <div style={{ backgroundColor: '#FBFBF9', padding: '12px', borderRadius: '8px', border: '1px solid #EAE6E1' }}>
                  <div style={{ fontSize: '11px', color: '#A0978D', marginBottom: '8px' }}>在此修改您的 3 則常用婉拒原因，儲存後下次也可直接使用。</div>
                  {tempTemplates.map((temp, idx) => (
                    <div key={idx} style={{ marginBottom: '8px' }}>
                      <input 
                        type="text" 
                        value={temp} 
                        onChange={(e) => {
                          const newT = [...tempTemplates];
                          newT[idx] = e.target.value;
                          setTempTemplates(newT);
                        }} 
                        placeholder={`罐頭訊息 ${idx + 1}`}
                        style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #DED9D3', fontSize: '13px' }}
                      />
                    </div>
                  ))}
                  <div style={{ textAlign: 'right', marginTop: '12px' }}>
                    <button style={{ padding: '6px 12px', background: '#4A7294', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' }} onClick={handleSaveTemplates}>儲存變更</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {declineTemplates.map((template, idx) => {
                    if (!template.trim()) return null;
                    return (
                      <button 
                        key={idx}
                        type="button"
                        style={{ padding: '6px 12px', backgroundColor: '#FDFDFB', border: '1px solid #DED9D3', borderRadius: '99px', fontSize: '12px', color: '#7A7269', cursor: 'pointer' }}
                        onClick={() => setDeclineReason(template)}
                      >
                        {template}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <textarea 
              placeholder="例如：預算不符、時程已滿、或已找到合適人選..."
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              disabled={isEditingTemplates}
              maxLength={200} 
              style={{ width: '100%', minHeight: '100px', padding: '12px', borderRadius: '8px', border: '1px solid #DED9D3', fontSize: '13px', resize: 'vertical', opacity: isEditingTemplates ? 0.5 : 1, marginBottom: '20px', fontFamily: 'inherit' }}
            ></textarea>
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <button style={{ flex: 1, padding: '12px', background: '#F4F4F1', color: '#7A7269', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }} onClick={handleCloseModal}>再想想</button>
              <button style={{ flex: 1, padding: '12px', background: '#EF4444', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: isEditingTemplates ? 'not-allowed' : 'pointer', opacity: isEditingTemplates ? 0.5 : 1 }} onClick={handleConfirmDecline} disabled={isEditingTemplates}>確認送出</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};