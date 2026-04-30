// src/pages/Inbox/index.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';
import '../../styles/Inbox.css';
import '../../styles/Wishboard.css';

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

      // 🔒 資安防護：後端應在此 endpoint 確認使用者身分
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
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px', minHeight: 'calc(100vh - 64px)', backgroundColor: '#FDFDFB' }}>
      <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#5D4A3E', marginBottom: '24px' }}>訊息中心</h1>

      <div style={{ display: 'flex', gap: '16px', borderBottom: '2px solid #EAE6E1', marginBottom: '24px' }}>
        <button 
          style={{ padding: '12px 24px', background: 'none', border: 'none', borderBottom: activeTab === 'client' ? '3px solid #ff8c00' : '3px solid transparent', fontSize: '16px', fontWeight: 'bold', color: activeTab === 'client' ? '#ff8c00' : '#A0978D', cursor: 'pointer', transition: 'all 0.2s ease', marginBottom: '-2px' }}
          onClick={() => setActiveTab('client')}
        >
          已發佈許願
        </button>
        <button 
          style={{ padding: '12px 24px', background: 'none', border: 'none', borderBottom: activeTab === 'artist' ? '3px solid #ff8c00' : '3px solid transparent', fontSize: '16px', fontWeight: 'bold', color: activeTab === 'artist' ? '#ff8c00' : '#A0978D', cursor: 'pointer', transition: 'all 0.2s ease', marginBottom: '-2px' }}
          onClick={() => setActiveTab('artist')}
        >
          我投遞的履歷
        </button>
      </div>

      <div style={{ fontSize: '14px', color: '#A0978D', backgroundColor: '#FBFBF9', padding: '12px 16px', borderRadius: '8px', border: '1px solid #EAE6E1', display: 'inline-block', marginBottom: '24px' }}>
        💡 提示：為了保持版面整潔，已婉拒或撤回的提案將於 3 天後自動隱藏。
      </div>

      {loading ? (
        <p className="text-center p-10 text-[#A0978D] font-bold">載入中...</p>
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

      {/* 邀請彈窗 */}
      {showInviteModal && (
        <div className="modal-overlay">
          <div className="modal-content-paper">
            <div className="paper-deco"></div>
            <h2 className="text-2xl font-bold text-[#5D4A3E] mb-2 mt-2">✉️ 邀請繪師詳談</h2>
            <p className="text-sm text-[#A0978D] mb-6 border-b border-[#EAE6E1] pb-4">
              填寫下方的回信，系統將為您建立專屬的「聊天室」，讓雙方能夠進一步溝通細節與合約。
            </p>

            <div className="bg-[#FBFBF9] p-5 rounded-xl border border-[#EAE6E1] mb-6 shadow-sm">
              <strong className="text-[#007BFF] flex items-center gap-2 mb-2 text-sm">
                <span className="bg-[#EAE6E1] w-6 h-6 flex items-center justify-center rounded-full text-[#5D4A3E]">Q</span>
                繪師希望您提供的資訊：
              </strong>
              <div className="text-[#7A7269] text-sm leading-relaxed ml-8">
                {selectedInquiry?.question_template || "是否有特殊需求或要加購的的部分？（例如：背景、道具、額外角色）"}
              </div>
            </div>
            
            <textarea 
              className="paper-textarea"
              placeholder="請在此撰寫您的回信內容，建議包含對繪師提問的回答、額外的需求說明或是對提案的回饋。"
              value={inviteResponse}
              onChange={(e) => setInviteResponse(e.target.value)}
            ></textarea>
            
            <div className="flex justify-end gap-4 mt-8">
              <button className="btn-paper-cancel" onClick={() => setShowInviteModal(false)}>取消捨棄</button>
              <button className="btn-paper-submit" onClick={handleSendInvite}>確認並送出回信 ➔</button>
            </div>
          </div>
        </div>
      )}

      {/* 婉拒與撤回彈窗 */}
      {showDeclineModal && (
        <div className="modal-overlay">
          <div className="modal-content-paper decline-modal" style={{ maxWidth: '550px' }}>
            <div className="paper-deco-red"></div>
            <h2 className="text-2xl font-bold text-[#A05C5C] mb-2 mt-2">
              {selectedInquiry?.inquiry_status === 'pending' && activeTab === 'artist' ? '撤回投遞' : '禮貌婉拒提案'}
            </h2>
            <p className="text-sm text-[#A0978D] mb-4 border-b border-[#F5C6C6] pb-4">
              這將會終止與此對象的洽談，建議附上簡單理由以示尊重。
            </p>

            <div className="mb-4">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#A05C5C' }}>快速帶入罐頭訊息：</div>
                <button 
                  style={{ fontSize: '13px', color: '#4A7294', fontWeight: 'bold', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
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
                <div style={{ background: '#FAFAFA', border: '1px solid #EAE6E1', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
                  <div style={{ fontSize: '12px', color: '#7A7269', marginBottom: '12px' }}>在此修改您的 3 則常用婉拒/撤回原因，儲存後下次也可直接使用。</div>
                  {tempTemplates.map((temp, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                      <input 
                        type="text" 
                        value={temp} 
                        onChange={(e) => {
                          const newT = [...tempTemplates];
                          newT[idx] = e.target.value;
                          setTempTemplates(newT);
                        }} 
                        placeholder={`罐頭訊息 ${idx + 1}`}
                        style={{ flex: 1, padding: '10px 12px', border: '1px solid #DED9D3', borderRadius: '6px', fontSize: '13px', outline: 'none' }}
                      />
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                    <button 
                      style={{ background: '#5D4A3E', color: 'white', fontSize: '13px', fontWeight: 'bold', padding: '8px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer' }}
                      onClick={handleSaveTemplates}
                    >
                      儲存變更
                    </button>
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
                        style={{ fontSize: '12px', background: '#FFF5F5', border: '1px solid #F5C6C6', color: '#A05C5C', padding: '6px 12px', borderRadius: '20px', cursor: 'pointer', transition: 'background 0.2s' }}
                        onClick={() => setDeclineReason(template)}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#FCE8E6'}
                        onMouseLeave={(e) => e.currentTarget.style.background = '#FFF5F5'}
                      >
                        {template}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <textarea 
              className="paper-textarea decline-textarea"
              placeholder="例如：預算不符、時程已滿、或已找到合適人選..."
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              disabled={isEditingTemplates}
              style={{ opacity: isEditingTemplates ? 0.5 : 1 }}
            ></textarea>
            
            <div className="flex justify-end gap-4 mt-6">
              <button className="btn-paper-cancel" onClick={() => { setShowDeclineModal(false); setIsEditingTemplates(false); }}>再想想</button>
              <button className="btn-paper-submit-red" onClick={handleConfirmDecline} disabled={isEditingTemplates}>確認送出</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};