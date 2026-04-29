// src/pages/Inbox.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import '../styles/Inbox.css';
import '../styles/Wishboard.css';

const renderChips = (text: string, type: 'good' | 'bad' | 'info') => {
  if (!text || text.trim() === '') return <span className="text-[#A0978D] text-sm">未提供</span>;
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

const safeParseTime = (dateStr?: string) => {
  if (!dateStr) return 0;
  const utcStr = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T') + 'Z';
  return new Date(utcStr).getTime();
};

// ==========================================
// 案主視角的明信片卡片 (保留原本樣式)
// ==========================================
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

  const openLightbox = () => { if (images.length > 0) setLightboxOpen(true); };
  const nextImg = (e: React.MouseEvent) => { e.stopPropagation(); setImgIndex((prev) => (prev + 1) % images.length); };
  const prevImg = (e: React.MouseEvent) => { e.stopPropagation(); setImgIndex((prev) => (prev - 1 + images.length) % images.length); };

  return (
    <>
      <div className="postcard-container relative">
        <div className={`postcard-stamp stamp-${item.inquiry_status}`}>
          {getStatusLabel(item.inquiry_status)}
        </div>

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
                <div className="flex items-center gap-2 text-xs text-[#A0978D] mb-1">
                  <span>投遞繪師</span>
                </div>
                <span className="postcard-artist-name block truncate" onClick={handleArtistClick} title="前往繪師個人頁">
                  {item.artist_name || '匿名繪師'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm mt-4 mb-4">
              <div>
                <strong className="text-[#5D4A3E] block mb-1">舒適圈 / 擅長題材：</strong>
                {renderChips(snapshot.specialties, 'good')}
              </div>
              <div>
                <strong className="text-[#5D4A3E] block mb-1">婉拒 / 雷點：</strong>
                {renderChips(snapshot.no_gos, 'bad')}
              </div>
              <div className="md:col-span-2 pt-2">
                <strong className="text-[#5D4A3E] block mb-1">付款方式與條件：</strong>
                {renderChips(snapshot.payment_methods, 'info')}
              </div>
            </div>
          </div>

          <div className="postcard-actions-wrapper">
            {children}
          </div>
        </div>
      </div>

      {lightboxOpen && (
        <div className="lightbox-overlay" onClick={() => setLightboxOpen(false)}>
          <div className="lightbox-content relative" onClick={(e) => e.stopPropagation()}>
            <button className="lightbox-close" onClick={() => setLightboxOpen(false)}>✕</button>
            {images.length > 1 && <button className="lightbox-nav lightbox-prev" onClick={prevImg}>❮</button>}
            <img src={mainImage as string} alt="Enlarged" className="lightbox-img" />
            {images.length > 1 && <button className="lightbox-nav lightbox-next" onClick={nextImg}>❯</button>}
            {images.length > 1 && <div className="lightbox-counter">{imgIndex + 1} / {images.length}</div>}
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
  
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [clientBulletins, setClientBulletins] = useState<any[]>([]);
  const [clientInquiries, setClientInquiries] = useState<any[]>([]);
  const [artistInquiries, setArtistInquiries] = useState<any[]>([]);
  const [selectedBulletinId, setSelectedBulletinId] = useState<string | null>(null);

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [selectedInquiry, setSelectedInquiry] = useState<any>(null);
  const [inviteResponse, setInviteResponse] = useState('');
  const [declineReason, setDeclineReason] = useState('');

  // 罐頭訊息狀態與編輯狀態
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

  useEffect(() => { fetchInbox(); }, [activeTab]);

  const handleConfirmDecline = async () => {
    if (!selectedInquiry) return;
    try {
      const defaultReason = selectedInquiry.inquiry_status === 'pending' && activeTab === 'artist' 
        ? '繪師已撤回投遞' 
        : '已找到合適人選 / 終止洽談';

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

  const calculateDaysLeft = (expiresAt: string) => {
    const diff = safeParseTime(expiresAt) - Date.now();
    if (diff <= 0) return '已過期';
    return `剩餘 ${Math.ceil(diff / (1000 * 60 * 60 * 24))} 天`;
  };

  const filterOldItems = (item: any) => {
    if (item.inquiry_status === 'declined' || item.inquiry_status === 'cancelled') {
      const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;
      if (safeParseTime(item.latest_update_at) < threeDaysAgo) return false;
    }
    return true;
  };

  const SLOT_TYPES = [
    { id: 'request', label: '徵稿文', icon: '📝', desc: '尋找繪師來為您繪製作品' },
    { id: 'offer', label: '接稿文', icon: '🎨', desc: '展示自己尋找需要繪製的案主' },
    { id: 'other', label: '其他/手作', icon: '✨', desc: '非純繪圖的委託或交流' }
  ];

  return (
    // 🌟 優化整體框架，符合其他管理頁面的版面與標題大小
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
        // ==========================================
        // 🌟 案主視角：保留原本的 dashboard-slots-grid 與 ArtistPostcard
        // ==========================================
        <>
          <div className="mb-8">
            <h2 className="text-lg font-bold text-[#5D4A3E] mb-4 flex items-center gap-2">
              <span className="bg-[#EAE6E1] text-[#5D4A3E] w-6 h-6 flex items-center justify-center rounded-full text-sm"></span> 
              我的許願 (每種分類限一則許願)
            </h2>
            <div className="dashboard-slots-grid">
              {SLOT_TYPES.map(slotType => {
                const bulletin = clientBulletins.find(b => b.category === slotType.id);
                const isSelected = selectedBulletinId === bulletin?.id;
                
                if (bulletin) {
                  return (
                    <div key={slotType.id} className={`dashboard-slot active-slot ${isSelected ? 'selected' : ''}`} onClick={() => setSelectedBulletinId(bulletin.id)}>
                      <div className="slot-header">
                        <span className="slot-icon">{slotType.icon}</span>
                        <span className="slot-category">{slotType.label}刊登中</span>
                      </div>
                      <h3 className="slot-title" title={bulletin.title}>{bulletin.title || '未命名貼文'}</h3>
                      <div className="slot-stats">
                        <div className="stat-item"><span className="stat-num">{bulletin.inquiry_count || 0}</span> 份提案</div>
                        <div className="stat-item expiry">{calculateDaysLeft(bulletin.expires_at)}</div>
                      </div>
                    </div>
                  );
                } else {
                  return (
                    <div key={slotType.id} className="dashboard-slot empty-slot cursor-pointer transition" onClick={() => navigate(`/?category=${slotType.id}`)}>
                      <div className="empty-content">
                        <span className="empty-icon text-3xl mb-2 opacity-50">{slotType.icon}</span>
                        <div className="text-[#7A7269] font-bold mb-1">{slotType.label} 尚有空缺</div>
                        <div className="text-xs text-[#A0978D] mb-3">{slotType.desc}</div>
                        <button className="btn-outline-primary text-sm py-1 px-3">+ 前往發布</button>
                      </div>
                    </div>
                  );
                }
              })}
            </div>
          </div>

          <div className="mb-4">
            <h2 className="text-lg font-bold text-[#5D4A3E] mb-4 flex items-center gap-2">
              <span className="bg-[#EAE6E1] text-[#5D4A3E] w-6 h-6 flex items-center justify-center rounded-full text-sm"></span> 
              收到的繪師履歷
            </h2>
            
            {!selectedBulletinId ? (
              <div className="p-10 text-center bg-[#FBFBF9] rounded-xl border border-dashed border-[#EAE6E1] text-[#A0978D]">
                請點擊上方的「許願種類」來檢視針對該文章收到的提案。
              </div>
            ) : (
              <div className="space-y-8">
                {clientInquiries.filter(i => i.bulletin_id === selectedBulletinId).filter(filterOldItems).length === 0 ? (
                  <div className="p-10 text-center bg-[#FBFBF9] rounded-xl border border-[#EAE6E1] text-[#A0978D] shadow-sm">
                    目前沒有可顯示的提案喔！再等等吧～
                  </div>
                ) : (
                  clientInquiries.filter(i => i.bulletin_id === selectedBulletinId).filter(filterOldItems).map(item => {
                    let snapshot: any = {};
                    try { 
                      const parsed = JSON.parse(item.artist_snapshot || '{}');
                      snapshot = typeof parsed === 'string' ? JSON.parse(parsed) : parsed;
                    } catch(e) {}
                    
                    const canDecline = !['accepted', 'declined', 'closed'].includes(item.inquiry_status);

                    return (
                      <div key={item.inquiry_id}>
                        <ArtistPostcard item={item} snapshot={snapshot} navigate={navigate}>
                          {canDecline && (
                            <button className="btn-secondary-red" onClick={() => { setSelectedInquiry(item); setShowDeclineModal(true); }}>
                              {item.inquiry_status === 'pending' ? '禮貌婉拒' : '終止洽談'}
                            </button>
                          )}
                          {item.inquiry_status === 'pending' && (
                            <button className="btn-primary" onClick={() => { setSelectedInquiry({ ...item, question_template: snapshot.question_template || item.question_template }); setShowInviteModal(true); }}>
                              ✉️ 邀請詳談
                            </button>
                          )}
                          {(item.inquiry_status === 'submitted' || item.inquiry_status === 'proposed') && (
                            <button className="btn-primary" onClick={() => handleEnterInquiryWorkspace(item.inquiry_id)}>
                              💬 進入聊天室 {item.inquiry_status === 'proposed' && "(繪師已發送協議)"}
                            </button>
                          )}
                          {item.inquiry_status === 'accepted' && (
                            <button className="btn-success" onClick={() => handleViewCommission(item.commission_id)}>
                              前往正式委託單
                            </button>
                          )}
                        </ArtistPostcard>

                        {/* 顯示婉拒理由 */}
                        {item.inquiry_status === 'declined' && item.decline_reason && (
                          <div className="bg-[#FCE8E6] p-3 rounded-lg border border-[#F5C6C6] mt-2 mx-4 text-[#A05C5C] text-sm">
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
        // ==========================================
        // 🌟 繪師視角：「我投遞的履歷」全新精緻卡片設計
        // ==========================================
        <div>
          {artistInquiries.filter(filterOldItems).length === 0 ? (
            <p className="text-center p-10 text-[#A0978D] bg-[#FBFBF9] rounded-xl border border-[#EAE6E1]">目前沒有任何投遞紀錄。</p>
          ) : (
            artistInquiries.filter(filterOldItems).map((item) => {
              const canDecline = !['accepted', 'declined', 'closed'].includes(item.inquiry_status);

              return (
                <div key={item.inquiry_id} style={{ background: '#FFFFFF', border: '1px solid #EAE6E1', borderRadius: '12px', padding: '24px', marginBottom: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                  {/* 頭部標題與狀態 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                    <span className={`inbox-badge status-${item.inquiry_status}`} style={{ margin: 0 }}>
                      {getStatusLabel(item.inquiry_status)}
                    </span>
                    <h3 style={{ margin: 0, fontSize: '20px', color: '#5D4A3E', fontWeight: 'bold', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.bulletin_title}>
                      {item.bulletin_title || '未命名貼文'}
                    </h3>
                  </div>

                  {/* 🌟 許願池摘要區塊 (圖文並排) */}
                  <div style={{ display: 'flex', gap: '20px', background: '#FBFBF9', border: '1px solid #EAE6E1', padding: '16px', borderRadius: '12px', marginBottom: '20px' }}>
                    {item.ref_image_key ? (
                      <img src={item.ref_image_key} alt="參考圖" style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #EAE6E1', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: '100px', height: '100px', background: '#F0F0F0', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#A0978D', fontSize: '13px', flexShrink: 0 }}>無參考圖</div>
                    )}
                    
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <span style={{ background: '#FFF5EB', color: '#ff8c00', padding: '4px 10px', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold' }}>💰 預算：{item.budget_min}~{item.budget_max}</span>
                        <span style={{ background: '#E6F4EA', color: '#1E8E3E', padding: '4px 10px', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold' }}>📅 排單：{item.schedule_type === 'flexible' ? '可接受排單' : item.specific_date}</span>
                      </div>
                      <div style={{ fontSize: '14px', color: '#7A7269', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.6' }} title={item.bulletin_content}>
                        {item.bulletin_content}
                      </div>
                    </div>
                  </div>

                  {/* 案主回覆區塊 */}
                  {item.client_response && (
                    <div style={{ background: '#F8FAFC', borderLeft: '4px solid #4A7294', padding: '16px', borderRadius: '0 8px 8px 0', marginBottom: '20px' }}>
                      <strong style={{ color: '#4A7294', fontSize: '14px', marginBottom: '8px', display: 'block' }}>案主回填的提問單：</strong>
                      <p style={{ margin: 0, fontSize: '14px', color: '#5D4A3E', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{item.client_response}</p>
                    </div>
                  )}

                  {/* 婉拒理由區塊 */}
                  {item.inquiry_status === 'declined' && item.decline_reason && (
                    <div style={{ background: '#FEF2F2', borderLeft: '4px solid #EF4444', padding: '16px', borderRadius: '0 8px 8px 0', marginBottom: '20px' }}>
                      <strong style={{ color: '#EF4444', fontSize: '14px', marginBottom: '8px', display: 'block' }}>終止/婉拒理由：</strong>
                      <p style={{ margin: 0, fontSize: '14px', color: '#A05C5C', lineHeight: '1.6' }}>{item.decline_reason}</p>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #EAE6E1', paddingTop: '16px' }}>
                    {(item.inquiry_status === 'submitted' || item.inquiry_status === 'proposed') && (
                      <button className="btn-primary" onClick={() => handleEnterInquiryWorkspace(item.inquiry_id)}>
                        進入聊天室
                      </button>
                    )}
                    {item.inquiry_status === 'accepted' && (
                      <button className="btn-success" onClick={() => handleViewCommission(item.commission_id)}>
                        前往正式委託單
                      </button>
                    )}
                    {canDecline && (
                      <button className="btn-secondary-red" onClick={() => {
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

      {/* 🌟 婉拒與撤回彈窗 (修復編輯功能與樣式) */}
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
                      // 確保展開時一定有 3 個欄位
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