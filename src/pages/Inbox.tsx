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

const getStatusLabel = (status: string) => {
  switch(status) {
    case 'pending': return '待確認';
    case 'submitted': return '洽談中';
    case 'proposed': return '待審閱協議';
    case 'accepted': return '已轉為正式委託';
    case 'declined': return '已婉拒 / 終止';
    case 'closed': return '徵件結束';
    default: return '未知狀態';
  }
};

// 🌟 明信片卡片元件 (加入燈箱與郵戳設計)
const ArtistPostcard = ({ item, snapshot, navigate, children }: any) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [imgIndex, setImgIndex] = useState(0);

  const handleArtistClick = (e: React.MouseEvent) => {
    e.stopPropagation(); 
    const targetId = item.artist_public_id || item.artist_id;
    if (targetId) navigate(`/${targetId}`);
  };

  const images: string[] = Array.isArray(snapshot.images) ? snapshot.images : [];
  const mainImage = images.length > 0 ? images[imgIndex] : null;

  const openLightbox = () => {
    if (images.length > 0) setLightboxOpen(true);
  };
  
  const nextImg = (e: React.MouseEvent) => {
    e.stopPropagation();
    setImgIndex((prev) => (prev + 1) % images.length);
  };
  
  const prevImg = (e: React.MouseEvent) => {
    e.stopPropagation();
    setImgIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <>
      <div className="postcard-container relative">
        {/* 🌟 右上角狀態郵戳 (Stamp) */}
        <div className={`postcard-stamp stamp-${item.inquiry_status}`}>
          {getStatusLabel(item.inquiry_status)}
        </div>

        {/* 左側：圖片展示區 */}
        <div className="postcard-image-section cursor-pointer group" onClick={openLightbox} title={images.length > 0 ? "點擊放大檢視" : ""}>
          {images.length > 0 ? (
            <>
              <img src={images[0]} alt="Reference" className="postcard-image transition duration-300 group-hover:scale-105" />
              {images.length > 1 && (
                <div className="postcard-image-count">
                  1 / {images.length} 張附圖
                </div>
              )}
              <div className="postcard-image-overlay">
                <span className="text-white text-sm bg-black bg-opacity-50 px-3 py-1 rounded-full backdrop-blur-sm">點擊放大</span>
              </div>
            </>
          ) : (
            <div className="postcard-image-fallback">
              <span className="flex flex-col items-center gap-2">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-50"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                無附圖提案
              </span>
            </div>
          )}
        </div>

        {/* 右側：繪師資訊與條件 */}
        <div className="postcard-content-section flex flex-col h-full justify-between">
          <div>
            <div className="postcard-header">
              {item.artist_avatar ? (
                <img src={item.artist_avatar} alt="Avatar" className="postcard-avatar cursor-pointer" onClick={handleArtistClick} title="點擊前往繪師個人頁" />
              ) : (
                <div className="postcard-avatar-fallback cursor-pointer" onClick={handleArtistClick} title="點擊前往繪師個人頁">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                </div>
              )}
              
              <div className="flex-1">
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                  <span>投遞繪師</span>
                </div>
                <span className="postcard-artist-name block truncate" onClick={handleArtistClick} title="前往繪師個人頁">
                  {item.artist_name || '匿名繪師'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm mt-4 mb-4">
              <div>
                <strong className="text-gray-700 block mb-1">舒適圈 / 擅長題材：</strong>
                {renderChips(snapshot.specialties, 'good')}
              </div>
              <div>
                <strong className="text-gray-700 block mb-1">婉拒 / 雷點：</strong>
                {renderChips(snapshot.no_gos, 'bad')}
              </div>
              <div className="md:col-span-2 pt-2">
                <strong className="text-gray-700 block mb-1">付款方式與條件：</strong>
                {renderChips(snapshot.payment_methods, 'info')}
              </div>
            </div>
          </div>

          {/* 🌟 動作按鈕區 (由外部傳入 children，已透過 CSS 固定在右下角) */}
          <div className="postcard-actions-wrapper">
            {children}
          </div>
        </div>
      </div>

      {/* 🌟 燈箱 Lightbox Modal */}
      {lightboxOpen && (
        <div className="lightbox-overlay" onClick={() => setLightboxOpen(false)}>
          <div className="lightbox-content relative" onClick={(e) => e.stopPropagation()}>
            <button className="lightbox-close" onClick={() => setLightboxOpen(false)}>✕</button>
            
            {images.length > 1 && (
              <button className="lightbox-nav lightbox-prev" onClick={prevImg}>❮</button>
            )}
            
            <img src={mainImage as string} alt="Enlarged" className="lightbox-img" />
            
            {images.length > 1 && (
              <button className="lightbox-nav lightbox-next" onClick={nextImg}>❯</button>
            )}

            {images.length > 1 && (
              <div className="lightbox-counter">
                {imgIndex + 1} / {images.length}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export const Inbox: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'client' | 'artist'>('client');
  const [loading, setLoading] = useState(true);
  
  const [clientBulletins, setClientBulletins] = useState<any[]>([]);
  const [clientInquiries, setClientInquiries] = useState<any[]>([]);
  const [artistInquiries, setArtistInquiries] = useState<any[]>([]);
  const [selectedBulletinId, setSelectedBulletinId] = useState<string | null>(null);

  // 🌟 彈窗狀態管理
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [selectedInquiry, setSelectedInquiry] = useState<any>(null);
  const [inviteResponse, setInviteResponse] = useState('');
  const [declineReason, setDeclineReason] = useState('');

  const fetchInbox = async () => {
    setLoading(true);
    try {
      if (activeTab === 'client') {
        const data = await apiClient.get('/api/bulletins/client/inbox');
        if (data.success) {
          setClientBulletins(data.data.bulletins || []);
          setClientInquiries(data.data.inquiries || []);
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

  // 🌟 婉拒確認送出
  const handleConfirmDecline = async () => {
    if (!selectedInquiry) return;
    try {
      await apiClient.post(`/api/inquiries/${selectedInquiry.inquiry_id}/decline`, { decline_reason: declineReason || '已找到合適人選 / 終止洽談' });
      alert('已傳送系統婉拒通知，對話已關閉。');
      setShowDeclineModal(false);
      setDeclineReason('');
      fetchInbox();
    } catch (error: any) { alert(error.message || '婉拒失敗'); }
  };

  // 🌟 邀請確認送出
  const handleSendInvite = async () => {
    if (!inviteResponse.trim()) return alert('請填寫回覆內容');
    if (!selectedInquiry) return;
    try {
      await apiClient.patch(`/api/inquiries/${selectedInquiry.inquiry_id}/submit-response`, { client_response: inviteResponse });
      alert('回信已送出！現在您可以進入洽談室與繪師溝通。');
      setShowInviteModal(false); 
      setInviteResponse(''); 
      fetchInbox();
    } catch (error: any) { alert(error.message || '送出失敗'); }
  };

  const handleEnterInquiryWorkspace = (inquiryId: string) => navigate(`/inquiry-workspace/${inquiryId}`);
  const handleViewCommission = (commissionId: string) => commissionId ? navigate(`/workspace/${commissionId}`) : alert('找不到關聯的委託單');

  const calculateDaysLeft = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - new Date().getTime();
    if (diff <= 0) return '已過期';
    return `剩餘 ${Math.ceil(diff / (1000 * 60 * 60 * 24))} 天`;
  };

  const SLOT_TYPES = [
    { id: 'request', label: '徵稿文', icon: '📝', desc: '尋找繪師來為您繪製作品' },
    { id: 'offer', label: '接稿文', icon: '🎨', desc: '展示自己尋找需要繪製的案主' },
    { id: 'other', label: '其他/手作', icon: '✨', desc: '非純繪圖的委託或交流' }
  ];

  return (
    <div className="inbox-container">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">訊息中心</h1>
      </div>

      <div className="wishboard-tabs mb-8 border-b border-gray-200">
        <button className={`tab-btn ${activeTab === 'client' ? 'active' : ''}`} onClick={() => setActiveTab('client')}>
          已發佈許願
        </button>
        <button className={`tab-btn ${activeTab === 'artist' ? 'active' : ''}`} onClick={() => setActiveTab('artist')}>
          我投遞的履歷
        </button>
      </div>

      {loading ? (
        <p className="text-center p-10 text-gray-500 font-bold">載入中...</p>
      ) : activeTab === 'client' ? (
        <>
          <div className="mb-8">
            <h2 className="text-lg font-bold text-gray-700 mb-4 flex items-center gap-2">
              <span className="bg-purple-100 text-purple-700 w-6 h-6 flex items-center justify-center rounded-full text-sm"></span> 
              我的許願 (每種分類限一則許願)
            </h2>
            <div className="dashboard-slots-grid">
              {SLOT_TYPES.map(slotType => {
                const bulletin = clientBulletins.find(b => b.category === slotType.id);
                const isSelected = selectedBulletinId === bulletin?.id;
                
                if (bulletin) {
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

          <div className="mb-4">
            <h2 className="text-lg font-bold text-gray-700 mb-4 flex items-center gap-2">
              <span className="bg-purple-100 text-purple-700 w-6 h-6 flex items-center justify-center rounded-full text-sm"></span> 
              收到的繪師履歷
            </h2>
            
            {!selectedBulletinId ? (
              <div className="p-10 text-center bg-gray-50 rounded-xl border border-dashed border-gray-300 text-gray-500">
                請點擊上方的「發布槽」來檢視針對該文章收到的提案。
              </div>
            ) : (
              <div className="space-y-8">
                {clientInquiries.filter(i => i.bulletin_id === selectedBulletinId).length === 0 ? (
                  <div className="p-10 text-center bg-gray-50 rounded-xl border border-gray-200 text-gray-500 shadow-sm">
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

                    return (
                      <div key={item.inquiry_id}>
                        {/* 🌟 獨立的明信片元件，將動作按鈕作為 children 傳入 */}
                        <ArtistPostcard item={item} snapshot={snapshot} navigate={navigate}>
                          {canDecline && (
                            <button 
                              className="btn-secondary-red" 
                              onClick={() => { 
                                setSelectedInquiry(item); 
                                setShowDeclineModal(true); 
                              }}
                            >
                              {item.inquiry_status === 'pending' ? '禮貌婉拒' : '終止洽談'}
                            </button>
                          )}
                          {item.inquiry_status === 'pending' && (
                            <button 
                              className="btn-primary" 
                              onClick={() => { 
                                setSelectedInquiry({ ...item, question_template: snapshot.question_template || item.question_template }); 
                                setShowInviteModal(true); 
                              }}
                            >
                              ✉️ 邀請詳談
                            </button>
                          )}
                          {(item.inquiry_status === 'submitted' || item.inquiry_status === 'proposed') && (
                            <button 
                              className="btn-primary" 
                              onClick={() => handleEnterInquiryWorkspace(item.inquiry_id)}
                            >
                              💬 進入洽談室 {item.inquiry_status === 'proposed' && "(繪師已發送協議)"}
                            </button>
                          )}
                          {item.inquiry_status === 'accepted' && (
                            <button 
                              className="btn-success" 
                              onClick={() => handleViewCommission(item.commission_id)}
                            >
                              前往正式委託單
                            </button>
                          )}
                        </ArtistPostcard>

                        {/* 婉拒理由獨立顯示於卡片外，保持卡片乾淨 */}
                        {item.inquiry_status === 'declined' && item.decline_reason && (
                          <div className="bg-red-50 p-3 rounded-lg border border-red-100 mt-2 mx-4 text-red-800 text-sm">
                            <strong>終止/婉拒理由：</strong>{item.decline_reason}
                          </div>
                        )}
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

              return (
                <div key={item.inquiry_id} className="inbox-item relative overflow-hidden bg-white shadow-sm border border-gray-200 rounded-xl">
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

                  <div className="action-buttons mt-5 border-t pt-4 border-gray-100 flex gap-2 justify-end">
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
                      <button className="btn-secondary text-red-600 hover:bg-red-50" onClick={() => {
                        setSelectedInquiry(item);
                        setShowDeclineModal(true);
                      }}>
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

      {/* 🌟 邀請彈窗 (信紙風格) */}
      {showInviteModal && (
        <div className="modal-overlay">
          <div className="modal-content-paper">
            {/* 信封頂部裝飾條 */}
            <div className="paper-deco"></div>
            
            <h2 className="text-2xl font-bold text-[#5D4A3E] mb-2 mt-2">✉️ 邀請繪師詳談</h2>
            <p className="text-sm text-[#A0978D] mb-6 border-b border-[#EAE6E1] pb-4">
              填寫下方的回信，系統將為您建立專屬的「洽談室」，讓雙方能夠進一步溝通細節與合約。
            </p>

            <div className="bg-white p-5 rounded-xl border border-[#EAE6E1] mb-6 shadow-sm">
              <strong className="text-[#5D4A3E] flex items-center gap-2 mb-2 text-sm">
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
              <button className="btn-paper-cancel" onClick={() => setShowInviteModal(false)}>
                取消捨棄
              </button>
              <button className="btn-paper-submit" onClick={handleSendInvite}>
                確認並送出回信 ➔
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🌟 婉拒彈窗 (信紙風格，紅色調) */}
      {showDeclineModal && (
        <div className="modal-overlay">
          <div className="modal-content-paper" style={{ borderColor: '#fecaca' }}>
            <div className="paper-deco" style={{ background: 'repeating-linear-gradient(45deg, #f87171 0, #f87171 20px, #fff 20px, #fff 40px)' }}></div>
            
            <h2 className="text-2xl font-bold text-red-800 mb-2 mt-2">禮貌婉拒提案</h2>
            <p className="text-sm text-gray-500 mb-6 border-b border-red-100 pb-4">
              這將會終止與此繪師的洽談，建議附上簡單理由以示尊重。
            </p>

            <textarea 
              className="paper-textarea"
              style={{ borderColor: '#fecaca' }}
              placeholder="例如：預算不符、時程已滿、或已找到合適人選..."
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
            ></textarea>
            
            <div className="flex justify-end gap-4 mt-8">
              <button className="btn-paper-cancel" onClick={() => setShowDeclineModal(false)}>
                再想想
              </button>
              <button className="btn-paper-submit" style={{ backgroundColor: '#e11d48' }} onClick={handleConfirmDecline}>
                確認婉拒
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};