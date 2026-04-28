// src/pages/Inbox.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import '../styles/Inbox.css';
import '../styles/Wishboard.css';

const renderChips = (text: string, type: 'good' | 'bad' | 'info') => {
  if (!text || text.trim() === '') return <span className="text-gray-400 text-sm">未提供</span>;
  // 將逗號、頓號、空白作為分隔符
  const tags = text.split(/[,、\s]+/).filter(t => t.trim() !== '');
  return (
    <div className="chip-group">
      {tags.map((t, i) => (
        <span key={i} className={`chip-tag chip-${type}`}>{t}</span>
      ))}
    </div>
  );
};

const ArtistPostcard = ({ item, snapshot, navigate }: any) => {
  // 處理點擊頭像或名稱跳轉至公開頁面
  const handleArtistClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // 避免觸發外層的其他點擊事件
    const targetId = item.artist_public_id || item.artist_id;
    if (targetId) navigate(`/${targetId}`);
  };

  // 取得快照中的圖片陣列
  const images: string[] = Array.isArray(snapshot.images) ? snapshot.images : [];
  const mainImage = images.length > 0 ? images[0] : null;

  return (
    <div className="postcard-container">
      {/* 左側：圖片展示區 */}
      <div className="postcard-image-section">
        {mainImage ? (
          <>
            <img src={mainImage} alt="Reference" className="postcard-image" />
            {images.length > 1 && (
              <div className="postcard-image-count">
                1 / {images.length} 張附圖
              </div>
            )}
          </>
        ) : (
          <div className="postcard-image-fallback">
            <span className="flex flex-col items-center gap-2">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-50"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
              純文字提案
            </span>
          </div>
        )}
      </div>

      {/* 右側：繪師資訊與條件 */}
      <div className="postcard-content-section">
        <div className="postcard-header">
          <img 
            src={item.artist_avatar || 'https://via.placeholder.com/100'} 
            alt="Avatar" 
            className="postcard-avatar cursor-pointer"
            onClick={handleArtistClick}
            title="點擊前往繪師個人頁"
          />
          <div>
            <span className="text-xs text-gray-500 block mb-1">投遞繪師</span>
            <span 
              className="postcard-artist-name"
              onClick={handleArtistClick}
              title="前往繪師個人頁"
            >
              {item.artist_name || '匿名繪師'}
            </span>
          </div>
        </div>

        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm mt-2 overflow-y-auto pr-2">
          {/* 舒適圈與雷點掃視 */}
          <div>
            <strong className="text-gray-700 block mb-1">舒適圈 / 擅長題材：</strong>
            {renderChips(snapshot.specialties, 'good')}
          </div>
          <div>
            <strong className="text-gray-700 block mb-1">婉拒 / 雷點：</strong>
            {renderChips(snapshot.no_gos, 'bad')}
          </div>
          
          {/* 其他重要資訊 (佔據全寬) */}
          <div className="md:col-span-2 mt-2 pt-3 border-t border-gray-100">
            <strong className="text-gray-700 block mb-1">付款方式與條件：</strong>
            {renderChips(snapshot.payment_methods, 'info')}
          </div>
        </div>
      </div>
    </div>
  );
};

export const Inbox: React.FC = () => {
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<'client' | 'artist'>('client');
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
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
  }, [activeTab]);

  const handleDecline = async (inquiryId: string) => {
    const reason = prompt("請輸入婉拒/終止理由 (例如：時程已滿、預算不符、已找到合適人選)：", "已找到合適人選 / 終止洽談");
    if (!reason) return;

    try {
      await apiClient.post(`/api/inquiries/${inquiryId}/decline`, {
        decline_reason: reason
      });
      alert('已傳送系統婉拒/終止通知，對話已關閉。');
      fetchInbox();
    } catch (error: any) { 
      alert(error.message || '婉拒失敗'); 
    }
  };

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

  const handleEnterInquiryWorkspace = (inquiryId: string) => {
    navigate(`/inquiry/workspace/${inquiryId}`);
  };

  const handleViewCommission = (commissionId: string) => {
    if (!commissionId) {
      alert('找不到關聯的委託單');
      return;
    }
    navigate(`/workspace/${commissionId}`);
  };

  const getStatusLabel = (status: string) => {
    switch(status) {
      case 'pending': return '待確認';
      case 'submitted': return '洽談中';
      case 'proposed': return '待審閱協議';
      case 'accepted': return '已轉為正式委託';
      case 'declined': return '已婉拒 / 終止';
      case 'closed': return '徵件已結束 (未入選)';
      default: return '未知狀態';
    }
  };

  // 🌟 判斷是否為未讀狀態
  const isUnread = (item: any) => {
    if (!item.latest_update_at) return false;
    const latest = new Date(item.latest_update_at).getTime();
    
    // 如果是被取消的單，就不亮紅點
    if (['declined', 'closed'].includes(item.inquiry_status)) return false;

    if (activeTab === 'client') {
      if (!item.last_read_at_client) return true;
      return latest > new Date(item.last_read_at_client).getTime();
    } else {
      // 繪師視角，排除自己剛投遞時的狀態
      if (item.inquiry_status === 'pending') return false; 
      if (!item.last_read_at_artist) return true;
      return latest > new Date(item.last_read_at_artist).getTime();
    }
  };

  return (
    <div className="inbox-container">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">收件匣</h1>
      </div>

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
            let snapshot: any = {};
            try { 
              const parsed1 = JSON.parse(item.artist_snapshot || '{}');
              snapshot = typeof parsed1 === 'string' ? JSON.parse(parsed1) : parsed1;
            } catch(e) {}
            
            const canDecline = !['accepted', 'declined', 'closed'].includes(item.inquiry_status);
            
            // 🌟 判斷這張卡片是否要亮紅點
            const showRedDot = isUnread(item);

            return (
              <div key={item.inquiry_id} className="inbox-item relative overflow-hidden">
                {/* 🌟 實體紅點 UI */}
                {showRedDot && (
                  <div className="absolute top-0 right-0 w-0 h-0 border-t-[40px] border-t-red-500 border-l-[40px] border-l-transparent z-10" title="有新進度">
                     <span className="absolute -top-[32px] -left-[16px] text-white text-xs font-bold transform">新</span>
                  </div>
                )}

                <div className="flex justify-between items-start">
                  <div>
                    <span className={`inbox-badge status-${item.inquiry_status}`}>
                      {getStatusLabel(item.inquiry_status)}
                    </span>
                    <h3 className="text-lg font-bold mt-2 text-gray-800">
                      {activeTab === 'client' ? `針對您的許願：${item.bulletin_content}` : `投遞項目：${item.bulletin_content}`}
                    </h3>
                  </div>
                </div>

                {activeTab === 'client' ? (
                  <ArtistPostcard item={item} snapshot={snapshot} navigate={navigate} />
                ) : (
                  item.client_response && (
                    <div className="bg-blue-50 p-4 rounded border border-blue-100 mt-4">
                      <p className="text-blue-800 font-bold mb-2">案主回覆的需求細節：</p>
                      <p className="text-gray-700 whitespace-pre-wrap text-sm">{item.client_response}</p>
                    </div>
                  )
                )}

                {item.inquiry_status === 'declined' && item.decline_reason && (
                  <div className="bg-red-50 p-3 rounded border border-red-100 mt-4 text-red-800 text-sm">
                    <strong>終止/婉拒理由：</strong>{item.decline_reason}
                  </div>
                )}

                <div className="action-buttons mt-5 border-t pt-4 border-gray-100 flex gap-2">
                  {activeTab === 'client' && (
                    <>
                      {item.inquiry_status === 'pending' && (
                        <button 
                          className="btn-primary" 
                          onClick={() => {
                            setSelectedInquiry({ ...item, question_template: snapshot.question_template || item.question_template });
                            setShowInviteModal(true);
                          }}
                        >
                          邀請詳談 (填寫提問單)
                        </button>
                      )}
                      
                      {(item.inquiry_status === 'submitted' || item.inquiry_status === 'proposed') && (
                        <button className="btn-primary" onClick={() => handleEnterInquiryWorkspace(item.inquiry_id)}>
                          進入洽談室 {item.inquiry_status === 'proposed' && "(繪師已發送協議)"}
                        </button>
                      )}

                      {item.inquiry_status === 'accepted' && (
                        <button className="btn-secondary" onClick={() => handleViewCommission(item.commission_id)}>
                          前往正式委託單
                        </button>
                      )}

                      {canDecline && (
                        <button className="btn-secondary text-red-600 hover:bg-red-50" onClick={() => handleDecline(item.inquiry_id)}>
                          {item.inquiry_status === 'pending' ? '禮貌婉拒' : '終止洽談'}
                        </button>
                      )}
                    </>
                  )}

                  {activeTab === 'artist' && (
                    <>
                      {(item.inquiry_status === 'submitted' || item.inquiry_status === 'proposed') && (
                        <button className="btn-primary" onClick={() => handleEnterInquiryWorkspace(item.inquiry_id)}>
                          進入洽談室
                        </button>
                      )}

                      {item.inquiry_status === 'accepted' && (
                        <button className="btn-secondary" onClick={() => handleViewCommission(item.commission_id)}>
                          前往正式委託單
                        </button>
                      )}
                      
                      {canDecline && (
                        <button className="btn-secondary text-red-600 hover:bg-red-50" onClick={() => handleDecline(item.inquiry_id)}>
                          {item.inquiry_status === 'pending' ? '撤回投遞' : '終止洽談'}
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

      {showInviteModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 className="text-xl font-bold mb-2">填寫需求細節</h2>
            <p className="text-sm text-gray-600 mb-4 bg-purple-50 p-3 rounded border border-purple-200">
              <strong className="text-purple-800">繪師要求提供的資訊：</strong><br/>
              {selectedInquiry?.question_template || "請提供角色設定與希望的表情。"}
            </p>
            
            <textarea 
              className="w-full border border-gray-300 p-3 rounded h-40 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none"
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