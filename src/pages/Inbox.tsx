// src/pages/Inbox.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import '../styles/Inbox.css';
import '../styles/Wishboard.css';

export const Inbox: React.FC = () => {
  const navigate = useNavigate();
  
  // 狀態管理
  const [activeTab, setActiveTab] = useState<'client' | 'artist'>('client');
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 案主回填提問 Modal 狀態
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedInquiry, setSelectedInquiry] = useState<any>(null);
  const [inviteResponse, setInviteResponse] = useState('');

  // 獲取收件匣資料
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
  }, [activeTab]);

  // 動作：禮貌婉拒
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

  // 案主動作：送出提問回覆 (邀請詳談)
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
      alert('已送出回覆！現在您可以進入洽談室與繪師溝通。');
      setShowInviteModal(false);
      setInviteResponse('');
      fetchInbox();
    } catch (error: any) {
      alert(error.message || '送出失敗');
    }
  };

  // 跳轉至媒合洽談室
  const handleEnterInquiryWorkspace = (inquiryId: string) => {
    navigate(`/inquiry/workspace/${inquiryId}`);
  };

  // 跳轉至正式委託工作區
  const handleViewCommission = (commissionId: string) => {
    if (!commissionId) {
      alert('找不到關聯的委託單');
      return;
    }
    navigate(`/workspace/${commissionId}`);
  };

  return (
    <div className="inbox-container">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">收件匣</h1>
      </div>

      {/* 視角切換頁籤 */}
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
            const snapshot = JSON.parse(item.artist_snapshot || '{}');
            
            return (
              <div key={item.inquiry_id} className="inbox-item">
                <div className="flex justify-between items-start">
                  <div>
                    <span className={`inbox-badge status-${item.inquiry_status}`}>
                      {item.inquiry_status === 'pending' ? '待處理' : 
                       item.inquiry_status === 'submitted' ? '洽談中' : 
                       item.inquiry_status === 'proposed' ? '待審閱協議' : 
                       item.inquiry_status === 'accepted' ? '已成交' : '已結束'}
                    </span>
                    <h3 className="text-lg font-bold mt-2">
                      {activeTab === 'client' ? `針對您的許願：${item.bulletin_content}` : `投遞項目：${item.bulletin_content}`}
                    </h3>
                  </div>
                </div>

                {/* 資訊卡：根據視角顯示不同內容 */}
                {activeTab === 'client' ? (
                  <div className="artist-info-box">
                    <p className="text-blue-600 font-bold">繪師簡歷摘要</p>
                    <p><strong>項目：</strong>{snapshot.title}</p>
                    <p><strong>參考價格：</strong>{snapshot.price}</p>
                    <p className="text-gray-500 text-sm mt-1"><strong>協議預覽：</strong>{snapshot.terms}</p>
                  </div>
                ) : (
                  item.client_response && (
                    <div className="bg-blue-50 p-4 rounded border border-blue-100 mt-2">
                      <p className="text-blue-800 font-bold mb-1">案主回覆的需求細節：</p>
                      <p className="text-gray-700 whitespace-pre-wrap">{item.client_response}</p>
                    </div>
                  )
                )}

                {/* 婉拒理由顯示 */}
                {item.inquiry_status === 'declined' && item.decline_reason && (
                  <div className="bg-red-50 p-3 rounded border border-red-100 mt-2 text-red-800 text-sm">
                    <strong>婉拒理由：</strong>{item.decline_reason}
                  </div>
                )}

                {/* 動態按鈕區塊 */}
                <div className="action-buttons mt-4">
                  {/* --- 案主視角按鈕 --- */}
                  {activeTab === 'client' && (
                    <>
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
                      
                      {(item.inquiry_status === 'submitted' || item.inquiry_status === 'proposed') && (
                        <button className="btn-primary" onClick={() => handleEnterInquiryWorkspace(item.inquiry_id)}>
                          進入洽談室 {item.inquiry_status === 'proposed' && "(繪師已發送協議)"}
                        </button>
                      )}

                      {item.inquiry_status === 'accepted' && (
                        <button className="btn-secondary" onClick={() => handleViewCommission(item.commission_id)}>
                          查看正式委託單
                        </button>
                      )}
                    </>
                  )}

                  {/* --- 繪師視角按鈕 --- */}
                  {activeTab === 'artist' && (
                    <>
                      {(item.inquiry_status === 'submitted' || item.inquiry_status === 'proposed') && (
                        <button className="btn-primary" onClick={() => handleEnterInquiryWorkspace(item.inquiry_id)}>
                          進入洽談室
                        </button>
                      )}

                      {item.inquiry_status === 'accepted' && (
                        <button className="btn-secondary" onClick={() => handleViewCommission(item.commission_id)}>
                          查看正式委託單
                        </button>
                      )}
                      
                      {(item.inquiry_status === 'pending' || item.inquiry_status === 'submitted') && (
                        <button className="btn-secondary" onClick={() => handleDecline(item.inquiry_id)}>
                          撤回投遞 / 結束洽談
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 案主回填提問 Modal */}
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