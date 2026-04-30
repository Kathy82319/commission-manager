// src/pages/Inbox/index.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';
import '../../styles/Inbox.css'; // 我們即將重寫這個檔案

import { InboundTab } from './InboundTab';
import { OutboundTab } from './OutboundTab';

export const Inbox: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'client' | 'artist'>('client');
  const [loading, setLoading] = useState(true);
  
  // 🌟 新增：繪師海選模式的檢視切換狀態
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [clientBulletins, setClientBulletins] = useState<any[]>([]);
  const [clientInquiries, setClientInquiries] = useState<any[]>([]);
  const [artistInquiries, setArtistInquiries] = useState<any[]>([]);

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [selectedInquiry, setSelectedInquiry] = useState<any>(null);
  const [inviteResponse, setInviteResponse] = useState('');
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
      const meData = await apiClient.get('/api/users/me');
      if (meData.success) {
        setCurrentUser(meData.data);
        try {
          const settings = typeof meData.data.profile_settings === 'string' ? JSON.parse(meData.data.profile_settings) : meData.data.profile_settings;
          if (settings?.decline_templates && Array.isArray(settings.decline_templates)) {
            setDeclineTemplates(settings.decline_templates);
          }
        } catch(e) {}
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

  const handleConfirmDecline = async () => {
    if (!selectedInquiry) return;
    try {
      const defaultReason = selectedInquiry.inquiry_status === 'pending' && activeTab === 'artist' 
        ? '繪師已撤回投遞' 
        : '已找到合適人選 / 終止洽談';

      // 🔒 資安防護：後端應在此 endpoint 確認使用者身分，防止 IDOR
      await apiClient.post(`/api/inquiries/${selectedInquiry.inquiry_id}/decline`, { 
        decline_reason: declineReason || defaultReason 
      });
      alert('已傳送婉拒/撤回通知，對話已關閉。');
      setShowDeclineModal(false);
      setDeclineReason('');
      setIsEditingTemplates(false);
      fetchInbox();
    } catch (error: any) { alert(error.message || '操作失敗'); }
  };

  const handleSendInvite = async () => {
    if (!inviteResponse.trim()) return alert('請填寫回覆內容');
    if (!selectedInquiry) return;
    try {
      await apiClient.patch(`/api/inquiries/${selectedInquiry.inquiry_id}/submit-response`, { client_response: inviteResponse });
      alert('回信已送出！現在您可以進入聊天室與繪師溝通。');
      setShowInviteModal(false); 
      setInviteResponse(''); 
      fetchInbox();
    } catch (error: any) { alert(error.message || '送出失敗'); }
  };

  const handleSaveTemplates = async () => {
    try {
      const settings = typeof currentUser?.profile_settings === 'string' 
        ? JSON.parse(currentUser.profile_settings || '{}') 
        : (currentUser?.profile_settings || {});
        
      settings.decline_templates = tempTemplates;
      
      await apiClient.patch('/api/users/me', {
        profile_settings: JSON.stringify(settings)
      });
      
      setDeclineTemplates(tempTemplates);
      setIsEditingTemplates(false);
      alert('✅ 罐頭訊息已成功儲存！');
    } catch (e) {
      alert('儲存失敗，請檢查網路連線');
    }
  };

  const handleEnterInquiryWorkspace = (inquiryId: string) => navigate(`/inquiry/workspace/${inquiryId}`);
  const handleViewCommission = (commissionId: string) => commissionId ? navigate(`/workspace/${commissionId}`) : alert('找不到關聯的委託單');

  return (
    // 🌟 完全對齊 Queue 的容器樣式
    <div className="inbox-page-container">
      <div className="inbox-page-header">
        <h1 className="inbox-page-title">訊息中心</h1>
        
        {/* 🌟 只有在接稿文（案主視角看一堆委託人）時才顯示檢視切換按鈕 */}
        {activeTab === 'client' && (
          <div className="inbox-view-controls">
            <button 
              className={`view-toggle-btn ${viewMode === 'card' ? 'active' : ''}`}
              onClick={() => setViewMode('card')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
              卡片
            </button>
            <button 
              className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
              列表
            </button>
          </div>
        )}
      </div>

      <div className="inbox-tabs-wrapper">
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

      {loading ? (
        <p className="inbox-loading-text">載入中...</p>
      ) : activeTab === 'client' ? (
        <InboundTab 
          clientBulletins={clientBulletins}
          clientInquiries={clientInquiries}
          navigate={navigate}
          setSelectedInquiry={setSelectedInquiry}
          setShowDeclineModal={setShowDeclineModal}
          setShowInviteModal={setShowInviteModal}
          handleEnterInquiryWorkspace={handleEnterInquiryWorkspace}
          handleViewCommission={handleViewCommission}
          viewMode={viewMode} // 🌟 將 viewMode 傳遞給子元件
        />
      ) : (
        <OutboundTab 
          artistInquiries={artistInquiries}
          setSelectedInquiry={setSelectedInquiry}
          setShowDeclineModal={setShowDeclineModal}
          handleEnterInquiryWorkspace={handleEnterInquiryWorkspace}
          handleViewCommission={handleViewCommission}
        />
      )}

      {/* 邀請與婉拒彈窗保持原樣，CSS 會在 Inbox.css 中統一控制 */}
      {showInviteModal && (
        <div className="inbox-modal-overlay">
          <div className="inbox-modal-content">
            <h2 className="modal-title">✉️ 邀請繪師詳談</h2>
            <p className="modal-desc">
              填寫下方的回信，系統將為您建立專屬的「聊天室」，讓雙方能夠進一步溝通細節與合約。
            </p>

            <div className="modal-question-box">
              <strong>
                <span className="q-icon">Q</span>
                繪師希望您提供的資訊：
              </strong>
              <div className="q-text">
                {selectedInquiry?.question_template || "是否有特殊需求或要加購的的部分？（例如：背景、道具、額外角色）"}
              </div>
            </div>
            
            <textarea 
              className="modal-textarea"
              placeholder="請在此撰寫您的回信內容，建議包含對繪師提問的回答、額外的需求說明或是對提案的回饋。"
              value={inviteResponse}
              onChange={(e) => setInviteResponse(e.target.value)}
            ></textarea>
            
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowInviteModal(false)}>取消捨棄</button>
              <button className="btn-submit" onClick={handleSendInvite}>確認並送出回信 ➔</button>
            </div>
          </div>
        </div>
      )}

      {showDeclineModal && (
        <div className="inbox-modal-overlay">
          <div className="inbox-modal-content decline-mode">
            <h2 className="modal-title red">
              {selectedInquiry?.inquiry_status === 'pending' && activeTab === 'artist' ? '撤回投遞' : '禮貌婉拒提案'}
            </h2>
            <p className="modal-desc red-border">
              這將會終止與此對象的洽談，建議附上簡單理由以示尊重。
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
              style={{ opacity: isEditingTemplates ? 0.5 : 1 }}
            ></textarea>
            
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => { setShowDeclineModal(false); setIsEditingTemplates(false); }}>再想想</button>
              <button className="btn-submit-red" onClick={handleConfirmDecline} disabled={isEditingTemplates}>確認送出</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};