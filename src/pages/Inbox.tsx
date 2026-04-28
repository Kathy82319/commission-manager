// src/pages/Inbox.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import '../styles/Inbox.css';
import '../styles/Wishboard.css';

const renderChips = (text: string, type: 'good' | 'bad' | 'info') => {
  if (!text || text.trim() === '') return <span className="text-gray-400 text-sm">未提供</span>;
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
  const handleArtistClick = (e: React.MouseEvent) => {
    e.stopPropagation(); 
    const targetId = item.artist_public_id || item.artist_id;
    if (targetId) navigate(`/${targetId}`);
  };

  const images: string[] = Array.isArray(snapshot.images) ? snapshot.images : [];
  const mainImage = images.length > 0 ? images[0] : null;

  return (
    <div className="postcard-container">
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
          <div>
            <strong className="text-gray-700 block mb-1">舒適圈 / 擅長題材：</strong>
            {renderChips(snapshot.specialties, 'good')}
          </div>
          <div>
            <strong className="text-gray-700 block mb-1">婉拒 / 雷點：</strong>
            {renderChips(snapshot.no_gos, 'bad')}
          </div>
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
  const [loading, setLoading] = useState(true);
  
  // 🌟 雙身分資料庫狀態
  const [clientBulletins, setClientBulletins] = useState<any[]>([]);
  const [clientInquiries, setClientInquiries] = useState<any[]>([]);
  const [artistInquiries, setArtistInquiries] = useState<any[]>([]);
  
  // 🌟 儀表板：目前選中的插槽 (預設展開第一個有資料的插槽)
  const [selectedBulletinId, setSelectedBulletinId] = useState<string | null>(null);

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedInquiry, setSelectedInquiry] = useState<any>(null);
  const [inviteResponse, setInviteResponse] = useState('');

  const fetchInbox = async () => {
    setLoading(true);
    try {
      if (activeTab === 'client') {
        const data = await apiClient.get('/api/bulletins/client/inbox');
        if (data.success) {
          setClientBulletins(data.data.bulletins || []);
          setClientInquiries(data.data.inquiries || []);
          // 若還沒選擇插槽，且有發布文章，自動選中第一篇
          if (!selectedBulletinId && data.data.bulletins?.length > 0) {
            setSelectedBulletinId(data.data.bulletins[0].id);
          }
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

  useEffect(() => { 
    fetchInbox(); 
  }, [activeTab]);

  const handleDecline = async (inquiryId: string) => {
    const reason = prompt("請輸入婉拒/終止理由 (例如：時程已滿、預算不符、已找到合適人選)：", "已找到合適人選 / 終止洽談");
    if (!reason) return;

    try {
      await apiClient.post(`/api/inquiries/${inquiryId}/decline`, { decline_reason: reason });
      alert('已傳送系統婉拒通知，對話已關閉。');
      fetchInbox();
    } catch (error: any) { alert(error.message || '婉拒失敗'); }
  };

  const handleSendInvite = async () => {
    if (!inviteResponse.trim()) return alert('請填寫回覆內容');
    if (!selectedInquiry) return;
    
    try {
      await apiClient.patch(`/api/inquiries/${selectedInquiry.inquiry_id}/submit-response`, { client_response: inviteResponse });
      alert('已送出回覆！現在您可以進入洽談室與繪師溝通。');
      setShowInviteModal(false); setInviteResponse(''); fetchInbox();
    } catch (error: any) { alert(error.message || '送出失敗'); }
  };

  const handleEnterInquiryWorkspace = (inquiryId: string) => navigate(`/inquiry-workspace/${inquiryId}`);
  const handleViewCommission = (commissionId: string) => commissionId ? navigate(`/workspace/${commissionId}`) : alert('找不到關聯的委託單');

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

  const isUnread = (item: any) => {
    if (!item.latest_update_at || ['declined', 'closed'].includes(item.inquiry_status)) return false;
    const latest = new Date(item.latest_update_at).getTime();
    if (activeTab === 'client') return !item.last_read_at_client || latest > new Date(item.last_read_at_client).getTime();
    return item.inquiry_status !== 'pending' && (!item.last_read_at_artist || latest > new Date(item.last_read_at_artist).getTime());
  };

  const calculateDaysLeft = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - new Date().getTime();
    if (diff <= 0) return '已過期';
    return `剩餘 ${Math.ceil(diff / (1000 * 60 * 60 * 24))} 天`;
  };

  // 🌟 定義三個固定的插槽
  const SLOT_TYPES = [
    { id: 'request', label: '徵稿文', icon: '📝', desc: '尋找繪師來為您繪製作品' },
    { id: 'offer', label: '接稿文', icon: '✨', desc: '展示自己尋找需要繪製的案主' },
    { id: 'other', label: '其他/手作', icon: '🎨', desc: '非純繪圖的委託或交流' }
  ];

  return (
    <div className="inbox-container">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">訊息中心</h1>
      </div>

      <div className="wishboard-tabs mb-8 border-b border-gray-200">
        <button className={`tab-btn ${activeTab === 'client' ? 'active' : ''}`} onClick={() => setActiveTab('client')}>
          我的發布儀表板 (案主)
        </button>
        <button className={`tab-btn ${activeTab === 'artist' ? 'active' : ''}`} onClick={() => setActiveTab('artist')}>
          我投遞的意向 (繪師)
        </button>
      </div>

      {loading ? (
        <p className="text-center p-10 text-gray-500 font-bold">載入中...</p>
      ) : activeTab === 'client' ? (
        <>
          {/* 🌟 階段三：發布儀表板 (My Posts Dashboard) */}
          <div className="mb-8">
            <h2 className="text-lg font-bold text-gray-700 mb-4 flex items-center gap-2">
              <span className="bg-purple-100 text-purple-700 w-6 h-6 flex items-center justify-center rounded-full text-sm">1</span> 
              我的發布槽 (每種分類限刊登一篇)
            </h2>
            <div className="dashboard-slots-grid">
              {SLOT_TYPES.map(slotType => {
                const bulletin = clientBulletins.find(b => b.category === slotType.id);
                const isSelected = selectedBulletinId === bulletin?.id;
                
                if (bulletin) {
                  // 刊登中狀態
                  return (
                    <div 
                      key={slotType.id} 
                      className={`dashboard-slot active-slot ${isSelected ? 'selected' : ''}`}
                      onClick={() => setSelectedBulletinId(bulletin.id)}
                    >
                      <div className="slot-header">
                        <span className="slot-icon">{slotType.icon}</span>
                        <span className="slot-category">{slotType.label}刊登中</span>
                      </div>
                      <h3 className="slot-title" title={bulletin.title}>{bulletin.title || '未命名貼文'}</h3>
                      <div className="slot-stats">
                        <div className="stat-item">
                          <span className="stat-num">{bulletin.inquiry_count || 0}</span> 份提案
                        </div>
                        <div className="stat-item expiry">
                          {calculateDaysLeft(bulletin.expires_at)}
                        </div>
                      </div>
                    </div>
                  );
                } else {
                  // 空閒中狀態 (引導發布)
                  return (
                    <div 
                      key={slotType.id} 
                      className="dashboard-slot empty-slot cursor-pointer transition hover:bg-gray-50"
                      onClick={() => navigate(`/?category=${slotType.id}`)}
                    >
                      <div className="empty-content">
                        <span className="empty-icon text-3xl mb-2 opacity-50">{slotType.icon}</span>
                        <div className="text-gray-500 font-bold mb-1">{slotType.label} 尚有空缺</div>
                        <div className="text-xs text-gray-400 mb-3">{slotType.desc}</div>
                        <button className="btn-outline-purple text-sm py-1 px-3">
                          + 前往發布
                        </button>
                      </div>
                    </div>
                  );
                }
              })}
            </div>
          </div>

          {/* 🌟 階段四：明信片展開區 (依據選中的發布槽顯示對應提案) */}
          <div className="mb-4">
            <h2 className="text-lg font-bold text-gray-700 mb-4 flex items-center gap-2">
              <span className="bg-purple-100 text-purple-700 w-6 h-6 flex items-center justify-center rounded-full text-sm">2</span> 
              收到的繪師提案
            </h2>
            
            {!selectedBulletinId ? (
              <div className="p-10 text-center bg-gray-50 rounded-xl border border-dashed border-gray-300 text-gray-500">
                請點擊上方的「發布槽」來檢視針對該文章收到的提案。
              </div>
            ) : (
              <div className="space-y-6">
                {clientInquiries.filter(i => i.bulletin_id === selectedBulletinId).length === 0 ? (
                  <div className="p-10 text-center bg-gray-50 rounded-xl border border-gray-200 text-gray-500">
                    這篇文章目前還沒有收到任何提案喔！再等等吧～
                  </div>
                ) : (
                  clientInquiries.filter(i => i.bulletin_id === selectedBulletinId).map(item => {
                    let snapshot: any = {};
                    try { 
                      const parsed = JSON.parse(item.artist_snapshot || '{}');
                      snapshot = typeof parsed === 'string' ? JSON.parse(parsed) : parsed;
                    } catch(e) {}
                    
                    const canDecline = !['accepted', 'declined', 'closed'].includes(item.inquiry_status);
                    const showRedDot = isUnread(item);

                    return (
                      <div key={item.inquiry_id} className="inbox-item relative overflow-hidden bg-white shadow-sm border border-gray-200 rounded-xl">
                        {showRedDot && (
                          <div className="absolute top-0 right-0 w-0 h-0 border-t-[40px] border-t-red-500 border-l-[40px] border-l-transparent z-10" title="有新進度">
                             <span className="absolute -top-[32px] -left-[16px] text-white text-xs font-bold transform">新</span>
                          </div>
                        )}

                        <div className="flex justify-between items-center mb-3">
                          <span className={`inbox-badge status-${item.inquiry_status}`}>
                            {getStatusLabel(item.inquiry_status)}
                          </span>
                        </div>

                        {/* 明信片 UI */}
                        <ArtistPostcard item={item} snapshot={snapshot} navigate={navigate} />

                        {/* 回覆顯示與動作區 */}
                        {item.inquiry_status === 'declined' && item.decline_reason && (
                          <div className="bg-red-50 p-3 rounded-lg border border-red-100 mt-4 text-red-800 text-sm">
                            <strong>終止/婉拒理由：</strong>{item.decline_reason}
                          </div>
                        )}

                        <div className="mt-4 pt-4 border-t border-gray-100 flex gap-3 flex-wrap">
                          {item.inquiry_status === 'pending' && (
                            <button className="btn-primary flex-1 md:flex-none" onClick={() => { setSelectedInquiry({ ...item, question_template: snapshot.question_template || item.question_template }); setShowInviteModal(true); }}>
                              邀請詳談 (填寫提問單)
                            </button>
                          )}
                          {(item.inquiry_status === 'submitted' || item.inquiry_status === 'proposed') && (
                            <button className="btn-primary flex-1 md:flex-none" onClick={() => handleEnterInquiryWorkspace(item.inquiry_id)}>
                              進入洽談室 {item.inquiry_status === 'proposed' && "(繪師已發送協議)"}
                            </button>
                          )}
                          {item.inquiry_status === 'accepted' && (
                            <button className="btn-secondary flex-1 md:flex-none" onClick={() => handleViewCommission(item.commission_id)}>
                              前往正式委託單
                            </button>
                          )}
                          {canDecline && (
                            <button className="btn-secondary text-red-600 hover:bg-red-50 hover:border-red-200 flex-1 md:flex-none" onClick={() => handleDecline(item.inquiry_id)}>
                              {item.inquiry_status === 'pending' ? '禮貌婉拒' : '終止洽談'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </>
      ) : (
        /* 繪師視角 (保留原來的列表邏輯) */
        <div className="space-y-4">
          {artistInquiries.length === 0 ? (
            <p className="text-center p-10 text-gray-500">目前沒有任何投遞紀錄。</p>
          ) : (
            artistInquiries.map((item) => {
              const canDecline = !['accepted', 'declined', 'closed'].includes(item.inquiry_status);
              const showRedDot = isUnread(item);

              return (
                <div key={item.inquiry_id} className="inbox-item relative overflow-hidden">
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
                        投遞項目：{item.bulletin_title}
                      </h3>
                    </div>
                  </div>

                  {item.client_response && (
                    <div className="bg-blue-50 p-4 rounded border border-blue-100 mt-4">
                      <p className="text-blue-800 font-bold mb-2">案主回覆的需求細節：</p>
                      <p className="text-gray-700 whitespace-pre-wrap text-sm">{item.client_response}</p>
                    </div>
                  )}

                  {item.inquiry_status === 'declined' && item.decline_reason && (
                    <div className="bg-red-50 p-3 rounded border border-red-100 mt-4 text-red-800 text-sm">
                      <strong>終止/婉拒理由：</strong>{item.decline_reason}
                    </div>
                  )}

                  <div className="action-buttons mt-5 border-t pt-4 border-gray-100 flex gap-2">
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
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* 邀請視窗保持不變 */}
      {showInviteModal && (
        <div className="modal-overlay">
          <div className="modal-content max-w-lg">
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
            <div className="flex justify-end gap-3 mt-4">
              <button className="btn-secondary" onClick={() => setShowInviteModal(false)}>取消</button>
              <button className="btn-primary" onClick={handleSendInvite}>確認送出</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};