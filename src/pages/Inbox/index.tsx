// src/pages/Inbox/index.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';
import '../../styles/Inbox.css';

import { InboundTab } from './InboundTab';
import { OutboundTab } from './OutboundTab';

export const Inbox: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'client' | 'artist'>('client');
  const [loading, setLoading] = useState(true);
  
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [clientBulletins, setClientBulletins] = useState<any[]>([]);
  const [clientInquiries, setClientInquiries] = useState<any[]>([]);
  const [artistInquiries, setArtistInquiries] = useState<any[]>([]);

  const [blacklistedIds, setBlacklistedIds] = useState<string[]>([]);

  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false); 
  
  // 🌟 新增：撤銷許願的目標 ID 狀態 (用來取代舊的 showCancelModal 邏輯)
  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null);
  
  const [selectedInquiry, setSelectedInquiry] = useState<any>(null);
  const [batchDeclineIds, setBatchDeclineIds] = useState<Set<string>>(new Set());
  
  const isBatchMode = batchDeclineIds.size > 0;
  const isCancelMode = !!cancelTargetId; // 🌟 判斷目前是否為撤銷整篇文章模式

  const [declineReason, setDeclineReason] = useState('');
  const [declineTemplates, setDeclineTemplates] = useState<string[]>([
    '目前檔期較滿，暫不接單', 
    '經過評估，可能有預算或價格考量', 
    '較不擅長此題材，怕無法達到您的期望'
  ]);
  const [isEditingTemplates, setIsEditingTemplates] = useState(false);
  const [tempTemplates, setTempTemplates] = useState<string[]>(['', '', '']);

  const fetchInbox = async () => {
    setLoading(true);
    try {
      const [meData, relData] = await Promise.all([
        apiClient.get('/api/users/me'),
        apiClient.get('/api/relations')
      ]);

      if (meData.success) {
        setCurrentUser(meData.data);
        try {
          const settings = typeof meData.data.profile_settings === 'string' ? JSON.parse(meData.data.profile_settings) : meData.data.profile_settings;
          if (settings?.decline_templates && Array.isArray(settings.decline_templates)) {
            setDeclineTemplates(settings.decline_templates);
          }
        } catch(e) {}
      }

      if (relData.success && relData.data) {
        const bIds = relData.data
          .filter((r: any) => r.relation_type === 'blacklist')
          .map((r: any) => r.target_user_id);
        setBlacklistedIds(bIds);
      }

      if (activeTab === 'client') {
        const data = await apiClient.get('/api/bulletins/client/inbox');
        if (data.success) {
          setClientBulletins(data.data.bulletins || []);
          setClientInquiries(data.data.inquiries || []);
        }
      } else {
        const data = await apiClient.get('/api/bulletins/artist/inbox');
        if (data.success) {
          setArtistInquiries(data.data || []);
        }
      }
    } catch (error) { 
      console.error("無法載入收件匣", error); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { fetchInbox(); }, [activeTab]);

  // 🛡️ 防護重點：統一的關閉彈窗與清空狀態邏輯，防止狀態污染
  const handleCloseModal = () => {
    setShowDeclineModal(false);
    setIsEditingTemplates(false);
    setBatchDeclineIds(new Set());
    setSelectedInquiry(null);
    setCancelTargetId(null);
    setDeclineReason('');
  };

  // 🌟 核心修改：合併處理單筆婉拒、批次婉拒與撤銷許願
  const handleConfirmDecline = async () => {
    if (!isBatchMode && !selectedInquiry && !isCancelMode) return;
    
    // 動態決定預設理由
    const defaultReason = isCancelMode 
      ? '案主已撤銷許願 / 結束徵件' 
      : (selectedInquiry?.inquiry_status === 'pending' && activeTab === 'artist')
        ? '繪師已撤回投遞' 
        : '已找到合適人選 / 終止洽談';
        
    const finalReason = declineReason || defaultReason;

    try {
      if (isCancelMode && cancelTargetId) {
        // 🌟 1. 撤銷整篇許願文章模式，帶入理由給後端
        const res = await apiClient.patch(`/api/bulletins/${cancelTargetId}/close`, { decline_reason: finalReason });
        if (!res.success) throw new Error(res.message);
        alert('許願貼文已成功撤銷，並已發送婉拒通知給相關繪師。');
        
      } else if (isBatchMode) {
        // 2. 批次婉拒模式
        const targetIds = Array.from(batchDeclineIds);
        const res = await apiClient.post('/api/inquiries/batch-decline', { 
          inquiry_ids: targetIds,
          decline_reason: finalReason 
        });
        if (!res.success) throw new Error(res.message);
        alert(`批次處理完成！共成功婉拒了 ${res.processed_count} 筆提案。`);
        
      } else if (selectedInquiry) {
        // 3. 單筆婉拒模式
        await apiClient.post(`/api/inquiries/${selectedInquiry.inquiry_id}/decline`, { decline_reason: finalReason });
        alert('已傳送婉拒/撤回通知，對話已關閉。');
      }

      handleCloseModal(); // 清除狀態並關閉彈窗
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
      navigate(activeTab === 'client' ? '/client/orders' : '/artist/notebook');
      return;
    }
    
    if (activeTab === 'client') {
      navigate(`/client/orders?id=${commissionId}`); 
    } else {
      navigate(`/artist/notebook?id=${commissionId}`); 
    }
  };

  // 🌟 修改：觸發撤銷許願時，將 ID 存入並開啟共用的婉拒視窗
  const handleCancelBulletinTrigger = (bulletinId: string) => {
    setCancelTargetId(bulletinId);
    setShowDeclineModal(true);
  };

  return (
    <div className="inbox-page-container">
      <div className="inbox-page-header">
        <h1 className="inbox-page-title">許願收件匣</h1>
      </div>

      <div className="inbox-tabs-wrapper">
        <div className="inbox-tabs-group">
          <button 
            className={`inbox-tab-btn ${activeTab === 'client' ? 'active' : ''}`}
            onClick={() => setActiveTab('client')}
          >
            我的許願池
          </button>
          <button 
            className={`inbox-tab-btn ${activeTab === 'artist' ? 'active' : ''}`}
            onClick={() => setActiveTab('artist')}
          >
            我投遞的履歷
          </button>
        </div>
        
        <button onClick={() => setShowRulesModal(true)} className="inbox-rules-btn">
          <span className="info-icon">?</span> 說明
        </button>
      </div>

      {loading ? (
        <p className="inbox-loading-text">載入中...</p>
      ) : activeTab === 'client' ? (
        <InboundTab 
          clientBulletins={clientBulletins}
          clientInquiries={clientInquiries}
          navigate={navigate}
          setSelectedInquiry={setSelectedInquiry}
          setShowDeclineModal={setShowDeclineModal}
          handleDirectInvite={handleDirectInvite}
          handleEnterInquiryWorkspace={handleEnterInquiryWorkspace}
          handleViewCommission={handleViewCommission}
          setSelectedIdsForBatch={setBatchDeclineIds}
          blacklistedIds={blacklistedIds}
          handleCancelBulletin={handleCancelBulletinTrigger} // 🌟 傳遞新的觸發器
        />
      ) : (
        <OutboundTab 
          artistInquiries={artistInquiries}
          setSelectedInquiry={setSelectedInquiry}
          setShowDeclineModal={setShowDeclineModal}
          handleEnterInquiryWorkspace={handleEnterInquiryWorkspace}
          handleViewCommission={handleViewCommission}
          blacklistedIds={blacklistedIds} 
        />
      )}

      {showRulesModal && (
        <div className="inbox-modal-overlay" onClick={() => setShowRulesModal(false)}>
          <div className="inbox-modal-content rules-modal-content" onClick={e => e.stopPropagation()}>
            <div className="rules-modal-header">
              <h2><span>📋</span> 許願與投遞規則</h2>
              <button className="rules-close-btn" onClick={() => setShowRulesModal(false)}>✕</button>
            </div>
            
            <ul className="rules-list">
              <li className="rules-list-item">
                <span className="rules-bullet">•</span>
                <div><span className="rules-highlight">刊登限額</span>：每種類型（徵稿 / 接稿 / 其他）限刊登一則。</div>
              </li>
              <li className="rules-list-item">
                <span className="rules-bullet">•</span>
                <div><span className="rules-highlight">時效限制</span>：刊登文章限時 <span className="rules-danger">3 天</span>，過期將自動下架，確保提案都是最新需求。</div>
              </li>
              <li className="rules-list-item">
                <span className="rules-bullet">•</span>
                <div><span className="rules-highlight">處理期限</span>：收到提案後請盡速決定「進入聊天室」或「禮貌婉拒」。倒數 <span className="rules-danger">不足 12 小時</span> 的提案將亮起紅燈警示。</div>
              </li>
              <li className="rules-list-item">
                <span className="rules-bullet">•</span>
                <div><span className="rules-highlight">逾期處理</span>：超過 <span className="rules-danger">7 天</span> 未處理的提案，系統將視為無效並自動標記為「已失效」歸檔。</div>
              </li>
            </ul>

            <div className="rules-modal-footer">
              <button className="btn-primary" onClick={() => setShowRulesModal(false)}>
                我了解了
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🌟 共用的大型處理 Modal */}
      {showDeclineModal && (
        <div className="inbox-modal-overlay">
          <div className="inbox-modal-content decline-mode">
            <h2 className="modal-title red">
              {/* 🌟 動態判斷標題 */}
              {isCancelMode 
                ? '⚠️ 撤銷許願與婉拒提案' 
                : isBatchMode 
                  ? `批次婉拒 (${batchDeclineIds.size} 筆)` 
                  : (selectedInquiry?.inquiry_status === 'pending' && activeTab === 'artist' ? '撤回投遞' : '禮貌婉拒提案')
              }
            </h2>
            
            <p className="modal-desc red-border">
              {/* 🌟 動態判斷說明文字 */}
              {isCancelMode
                ? '您即將撤銷這篇許願貼文。這將會關閉該貼文，並將所有尚未處理的提案一併婉拒。請填寫統一的婉拒理由以示尊重。'
                : isBatchMode
                  ? '您即將同時婉拒多筆委託提案，這項操作無法復原。請填寫統一的婉拒理由以示尊重。'
                  : '這將會終止與此對象的洽談，建議附上簡單理由以示尊重。'
              }
            </p>

            <div className="template-manager">
              <div className="template-header">
                <div className="template-title">快速帶入罐頭訊息：</div>
                <button 
                  className="template-toggle-btn"
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
                <div className="template-edit-box">
                  <div className="template-edit-hint">在此修改您的 3 則常用婉拒/撤回原因，儲存後下次也可直接使用。</div>
                  {tempTemplates.map((temp, idx) => (
                    <div key={idx} className="template-input-row">
                      <input 
                        type="text" 
                        value={temp} 
                        onChange={(e) => {
                          const newT = [...tempTemplates];
                          newT[idx] = e.target.value;
                          setTempTemplates(newT);
                        }} 
                        placeholder={`罐頭訊息 ${idx + 1}`}
                        className="template-input"
                      />
                    </div>
                  ))}
                  <div className="template-save-row">
                    <button className="btn-save-template" onClick={handleSaveTemplates}>儲存變更</button>
                  </div>
                </div>
              ) : (
                <div className="template-chips-wrapper">
                  {declineTemplates.map((template, idx) => {
                    if (!template.trim()) return null;
                    return (
                      <button 
                        key={idx}
                        type="button"
                        className="template-chip"
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
              className="modal-textarea"
              placeholder="例如：預算不符、時程已滿、或已找到合適人選..."
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              disabled={isEditingTemplates}
              maxLength={200} // 🛡️ 防護重點：長度限制防呆
              style={{ opacity: isEditingTemplates ? 0.5 : 1 }}
            ></textarea>
            
            <div className="modal-actions">
              <button 
                className="btn-cancel" 
                onClick={handleCloseModal} // 🌟 統一呼叫防污染清除函式
              >
                再想想
              </button>
              <button 
                className="btn-submit-red" 
                onClick={handleConfirmDecline} 
                disabled={isEditingTemplates}
              >
                確認送出
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};