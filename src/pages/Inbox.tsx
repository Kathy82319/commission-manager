// src/pages/Inbox.tsx
import React, { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import '../styles/Inbox.css';
import '../styles/Wishboard.css';
import { useNavigate } from 'react-router-dom'; // 新增這行

export const Inbox: React.FC = () => {
  const navigate = useNavigate();
  // 控制當前觀看的視角
  const [activeTab, setActiveTab] = useState<'client' | 'artist'>('client');
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 案主邀請 Modal 狀態
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedInquiry, setSelectedInquiry] = useState<any>(null);
  const [inviteResponse, setInviteResponse] = useState('');

  const fetchInbox = async () => {
    setLoading(true);
    try {
      const endpoint = activeTab === 'client' 
        ? '/api/bulletins/client/inbox' 
        : '/api/bulletins/artist/inbox';
        
      const data = await apiClient.get(endpoint);
      if (data.success) {
        setInquiries(data.data);
      }
    } catch (error) { 
      console.error("無法載入收件匣", error); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { 
    fetchInbox(); 
  }, [activeTab]); // 當切換 Tab 時重新撈取資料

  // 共用動作：婉拒 (繪師與案主皆可使用)
  const handleDecline = async (inquiryId: string) => {
    const reason = prompt("請選擇婉拒理由：\n1. 題材不符\n2. 時程已滿\n3. 預算不符", "題材不符");
    if (!reason) return;

    try {
      await apiClient.post(`/api/inquiries/${inquiryId}/decline`, {
        decline_reason: reason
      });
      alert('已傳送系統婉拒通知，對話已關閉。');
      fetchInbox();
    } catch (error: any) { 
      alert(error.message || '婉拒失敗'); 
    }
  };

  // 案主動作：送出邀請詳談 (回填提問)
  const handleSendInvite = async () => {
    if (!inviteResponse.trim()) {
      alert('請填寫回覆內容');
      return;
    }
    if (!selectedInquiry) return;
    
    try {
      await apiClient.patch(`/api/inquiries/${selectedInquiry.inquiry_id}/submit-response`, {
        client_response: inviteResponse
      });
      alert('已送出回覆！待繪師確認後將會開啟聊天室。');
      setShowInviteModal(false);
      setInviteResponse('');
      fetchInbox();
    } catch (error: any) {
      alert(error.message || '送出失敗');
      console.error(error);
    }
  };

  // 繪師動作：接受並開啟詳談 (準備轉換為正式委託單)
// Inbox.tsx 中的 handleAcceptAndOpenChat
  const handleAcceptAndOpenChat = async (inquiryId: string) => {
    // 現在不直接建立 Commission，而是跳轉到洽談室
    navigate(`/inquiry/workspace/${inquiryId}`);
  };

  return (
    <div className="inbox-container">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">收件匣</h1>
      </div>

      {/* 切換視角的 Tabs */}
      <div className="wishboard-tabs mb-6">
        <button 
          className={`tab-btn ${activeTab === 'client' ? 'active' : ''}`} 
          onClick={() => setActiveTab('client')}
        >
          我發布的許願 (案主視角)
        </button>
        <button 
          className={`tab-btn ${activeTab === 'artist' ? 'active' : ''}`} 
          onClick={() => setActiveTab('artist')}
        >
          我投遞的意向 (繪師視角)
        </button>
      </div>

      {loading ? (
        <p className="text-center p-10">載入中...</p>
      ) : inquiries.length === 0 ? (
        <p className="text-center p-10 text-gray-500">目前沒有任何紀錄。</p>
      ) : (
        <div className="space-y-4">
          {inquiries.map((item) => {
            
            return (
              <div key={item.inquiry_id} className="inbox-item">
                <div className="flex justify-between items-start">
                  <div>
                    <span className={`inbox-badge status-${item.inquiry_status}`}>
                      {item.inquiry_status === 'pending' ? '待處理' : 
                       item.inquiry_status === 'submitted' ? '已回填提問' : 
                       item.inquiry_status === 'declined' ? '已婉拒' : '洽談中'}
                    </span>
                    <h3 className="text-lg font-bold mt-2">
                      {activeTab === 'client' ? `針對您的許願：${item.bulletin_content}` : `投遞項目：${item.bulletin_content}`}
                    </h3>
                    {activeTab === 'artist' && (
                      <p className="text-sm text-gray-500 mt-1">預算區間：{item.budget_range}</p>
                    )}
                  </div>
                </div>

                {/* 案主視角：顯示繪師簡歷 */}
                {/* 案主可執行的動作 */}
{activeTab === 'client' && (
  <div className="action-buttons">
    {/* 狀態為 pending 時：顯示邀請詳談 */}
    {item.inquiry_status === 'pending' && (
      <>
        <button 
          className="btn-primary" 
          onClick={() => {
            setSelectedInquiry(item);
            setShowInviteModal(true);
          }}
        >
          邀請詳談 (填寫提問單)
        </button>
        <button className="btn-secondary" onClick={() => handleDecline(item.inquiry_id)}>
          禮貌婉拒
        </button>
      </>
    )}

    {/* 狀態為 submitted 或 proposed 時：顯示進入洽談室 */}
    {(item.inquiry_status === 'submitted' || item.inquiry_status === 'proposed') && (
      <button 
        className="btn-primary" 
        onClick={() => navigate(`/inquiry/workspace/${item.inquiry_id}`)}
      >
        進入洽談室
      </button>
    )}
    
    {/* 如果已經 accepted，則導向正式的 Workspace */}
    {item.inquiry_status === 'accepted' && (
      <button 
        className="btn-secondary" 
        style={{ borderColor: '#2563eb', color: '#2563eb' }}
        onClick={() => {
          // 這裡需要透過 API 獲取正式的 commission_id，或者在 item 中原本就有帶過來
          // 假設我們在後端 getClientInbox 已經補上了 commission_id 欄位
          if (item.commission_id) {
            navigate(`/workspace/${item.commission_id}`);
          } else {
            alert('找不到對應的委託單，請重整頁面');
          }
        }}
      >
        查看正式委託單
      </button>
    )}
  </div>
)}

                {/* 繪師視角：顯示案主回覆 */}
                {activeTab === 'artist' && item.client_response && (
                  <div className="bg-blue-50 p-4 rounded border border-blue-100 mt-2">
                    <p className="text-blue-800 font-bold mb-1">案主回覆的需求細節：</p>
                    <p className="text-gray-700 whitespace-pre-wrap">{item.client_response}</p>
                  </div>
                )}

                {/* 被婉拒時顯示理由 */}
                {item.inquiry_status === 'declined' && item.decline_reason && (
                  <div className="bg-red-50 p-3 rounded border border-red-100 mt-2 text-red-800 text-sm">
                    <strong>婉拒理由：</strong>{item.decline_reason}
                  </div>
                )}

                {/* 操作按鈕區塊 */}
                <div className="action-buttons">
                  {/* 案主可執行的動作 */}
                  {activeTab === 'client' && item.inquiry_status === 'pending' && (
                    <>
                      <button 
                        className="btn-primary" 
                        onClick={() => {
                          setSelectedInquiry(item);
                          setShowInviteModal(true);
                        }}
                      >
                        邀請詳談 (填寫提問單)
                      </button>
                      <button className="btn-secondary" onClick={() => handleDecline(item.inquiry_id)}>
                        禮貌婉拒
                      </button>
                    </>
                  )}

                  {/* 繪師可執行的動作 */}
                  {activeTab === 'artist' && item.inquiry_status === 'submitted' && (
                    <>
                      <button className="btn-primary" onClick={() => handleAcceptAndOpenChat(item.inquiry_id)}>
                        接受並開啟詳談
                      </button>
                      <button className="btn-secondary" onClick={() => handleDecline(item.inquiry_id)}>
                        禮貌婉拒
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 案主邀請詳談 Modal */}
      {showInviteModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 className="text-xl font-bold mb-2">填寫需求細節</h2>
            <p className="text-sm text-gray-600 mb-4 bg-yellow-50 p-3 rounded border border-yellow-200">
              <strong>繪師要求提供的資訊：</strong><br/>
              {selectedInquiry?.question_template || "請提供角色設定與希望的表情。"}
            </p>
            
            <textarea 
              className="w-full border p-3 rounded h-40"
              placeholder="請根據繪師的要求填寫內容..."
              value={inviteResponse}
              onChange={(e) => setInviteResponse(e.target.value)}
            ></textarea>

            <div className="modal-actions mt-4">
              <button className="btn-secondary" onClick={() => setShowInviteModal(false)}>取消</button>
              <button className="btn-primary" onClick={handleSendInvite}>確認送出</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};