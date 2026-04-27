// src/pages/Inbox.tsx
import React, { useEffect, useState } from 'react';
import '../styles/Inbox.css';
import '../styles/Wishboard.css'; // 共用 Modal 樣式
import { apiClient } from '../api/client';

export const Inbox: React.FC = () => {
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal 狀態
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedInquiry, setSelectedInquiry] = useState<any>(null);
  const [inviteResponse, setInviteResponse] = useState('');

  const fetchInbox = async () => {
    try {
      const res = await fetch('/api/bulletins/client/inbox');
      const data = await res.json();
      if (data.success) setInquiries(data.data);
    } catch (error) { console.error("無法載入收件匣", error); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchInbox(); }, []);

// 動作：禮貌婉拒 (一鍵婉拒)
  const handleDecline = async (inquiryId: string) => {
    const reason = prompt("請選擇婉拒理由：\n1. 題材不符\n2. 時程已滿\n3. 預算不符", "題材不符");
    if (!reason) return;

    try {
      // 直接使用 apiClient.post，不需要寫 headers 跟 body: JSON.stringify
      await apiClient.post(`/api/inquiries/${inquiryId}/decline`, {
        decline_reason: reason
      });
      
      alert('已傳送系統婉拒通知，對話已關閉。');
      fetchInbox();
    } catch (error: any) {
      // apiClient 已經幫忙解析了錯誤訊息
      alert(error.message || '婉拒失敗');
    }
  };

  // 動作：送出邀請詳談 (回填提問)
  const handleSendInvite = async () => {
    if (!inviteResponse.trim()) {
      alert('請填寫回覆內容');
      return;
    }
    if (!selectedInquiry) return;
    
    try {
      // 直接使用 apiClient.patch
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

  if (loading) return <p className="text-center p-10">載入中...</p>;

  return (
    <div className="inbox-container">
      <h1 className="text-2xl font-bold mb-6">收到的投遞清單</h1>
      
      {inquiries.map((item) => {
        const snapshot = JSON.parse(item.artist_snapshot || '{}');
        return (
          <div key={item.inquiry_id} className="inbox-item">
            <div className="flex justify-between items-start">
              <div>
                <span className={`inbox-badge status-${item.inquiry_status}`}>
                  {item.inquiry_status === 'pending' ? '待處理' : 
                   item.inquiry_status === 'declined' ? '已婉拒' : '洽談中'}
                </span>
                <h3 className="text-lg font-bold mt-2">針對：{item.bulletin_content}</h3>
              </div>
            </div>

            <div className="artist-info-box">
              <p className="text-blue-600 font-bold">🎨 繪師簡歷摘要</p>
              <p><strong>項目：</strong>{snapshot.title}</p>
              <p><strong>參考價格：</strong>{snapshot.price}</p>
              <p className="text-gray-500 text-sm mt-1"><strong>協議預覽：</strong>{snapshot.terms}</p>
            </div>

            {item.inquiry_status === 'pending' && (
              <div className="action-buttons">
                <button 
                  className="btn-primary" 
                  onClick={() => {
                    setSelectedInquiry(item);
                    setShowInviteModal(true);
                  }}
                >
                  邀請詳談 (填寫提問單)
                </button>
                <button 
                  className="btn-secondary" 
                  onClick={() => handleDecline(item.inquiry_id)}
                >
                  禮貌婉拒
                </button>
              </div>
            )}
          </div>
        );
      })}

      {/* 邀請詳談 Modal */}
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