// src/pages/Inbox/InboundTab.tsx
import React, { useState } from 'react';
import { ArtistPostcard } from './components/ArtistPostcard';
import { OfferList } from './OfferList';
import { calculateDaysLeft, filterOldItems } from './utils/formatters';
import { R2_PUBLIC_URL } from '../public/Wishboard/constants';
import { Ban } from 'lucide-react'; // 🌟 引入 Ban 圖示

const SLOT_TYPES = [
  { id: 'request', label: '徵稿文', icon: '📝', desc: '尋找繪師來為您繪製作品' },
  { id: 'offer', label: '接稿文', icon: '🎨', desc: '展示自己尋找需要繪製的案主' },
  { id: 'other', label: '其他/手作', icon: '✨', desc: '非純繪圖的委託或交流' }
];

interface InboundTabProps {
  clientBulletins: any[];
  clientInquiries: any[];
  navigate: (path: string) => void;
  setSelectedInquiry: (inquiry: any) => void;
  setShowDeclineModal: (show: boolean) => void;
  handleDirectInvite: (inquiry: any) => void; 
  handleEnterInquiryWorkspace: (id: string) => void;
  handleViewCommission: () => void;
  setSelectedIdsForBatch?: (ids: Set<string>) => void; 
  blacklistedIds?: string[]; // 🌟 接收黑名單清單
}

const unescapeHtml = (str: string) => {
  if (!str) return '';
  return str.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#039;/g, "'");
};

export const InboundTab: React.FC<InboundTabProps> = ({
  clientBulletins,
  clientInquiries,
  navigate,
  setSelectedInquiry,
  setShowDeclineModal,
  handleDirectInvite,
  handleEnterInquiryWorkspace,
  handleViewCommission,
  setSelectedIdsForBatch,
  blacklistedIds = [] // 🌟 預設為空陣列
}) => {
  const [selectedBulletinId, setSelectedBulletinId] = useState<string | null>(
    clientBulletins.length > 0 ? clientBulletins[0].id : null
  );

  const activeBulletinCategory = clientBulletins.find(b => b.id === selectedBulletinId)?.category;

  const currentInquiries = clientInquiries
    .filter(i => i.bulletin_id === selectedBulletinId)
    .filter(filterOldItems);

  return (
    <>
      <div className="mb-8">
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
        <div style={{ height: '40px' }}></div>
        
        {!selectedBulletinId ? (
          <div className="p-10 text-center bg-[#FBFBF9] rounded-xl border border-dashed border-[#EAE6E1] text-[#A0978D]">
            請點擊上方的「許願種類」來檢視針對該文章收到的提案。
          </div>
        ) : (
          <div className="space-y-8">
            {currentInquiries.length === 0 ? (
              <div className="p-10 text-center bg-[#FBFBF9] rounded-xl border border-[#EAE6E1] text-[#A0978D] shadow-sm">
                目前沒有可顯示的提案喔！再等等吧～
              </div>
            ) : (
              activeBulletinCategory === 'offer' ? (
                <OfferList 
                  inquiries={currentInquiries} 
                  setSelectedInquiry={setSelectedInquiry}
                  setShowDeclineModal={setShowDeclineModal}
                  handleDirectInvite={handleDirectInvite}
                  handleEnterInquiryWorkspace={handleEnterInquiryWorkspace}
                  handleViewCommission={handleViewCommission}
                  setSelectedIdsForBatch={setSelectedIdsForBatch}
                  blacklistedIds={blacklistedIds} // 🌟 也把黑名單傳給 OfferList 讓它處理
                />
              ) : (
                currentInquiries.map(item => {
                  let snapshot: any = {};
                  try { 
                    const rawSnapshot = unescapeHtml(item.artist_snapshot || '{}');
                    const parsed = JSON.parse(rawSnapshot);
                    snapshot = typeof parsed === 'string' ? JSON.parse(parsed) : parsed;
                  } catch(e) {}

                  let images: string[] = [];
                  const rawImages = snapshot.images || snapshot.ref_images || item.ref_images || item.ref_image_key || [];
                  
                  if (Array.isArray(rawImages)) {
                    images = rawImages;
                  } else if (typeof rawImages === 'string') {
                    try {
                      const parsedImgs = JSON.parse(unescapeHtml(rawImages));
                      images = Array.isArray(parsedImgs) ? parsedImgs : [parsedImgs];
                    } catch {
                      images = [unescapeHtml(rawImages)];
                    }
                  }

                  snapshot.images = images.filter(Boolean).map(url => 
                    url.startsWith('http') ? url : `${R2_PUBLIC_URL}/${url}`
                  );
                  
                  const canDecline = !['accepted', 'declined', 'closed'].includes(item.inquiry_status);
                  
                  // 🌟 判斷投遞的繪師是否在我的黑名單中
                  const isBlacklisted = blacklistedIds.includes(item.artist_id);

                  return (
                    <div key={item.inquiry_id} style={{ position: 'relative' }}>
                      {/* 🌟 若為黑名單，在卡片上方顯示警告標籤 */}
                      {isBlacklisted && (
                        <div style={{ position: 'absolute', top: '-12px', right: '16px', background: '#FEF2F2', color: '#EF4444', padding: '4px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', border: '1px solid #FECACA', zIndex: 10, display: 'flex', alignItems: 'center', gap: '4px', boxShadow: '0 2px 6px rgba(239, 68, 68, 0.15)' }}>
                          <Ban size={14} /> 黑名單繪師
                        </div>
                      )}
                      
                      <ArtistPostcard item={item} snapshot={snapshot} navigate={navigate}>
                        
                        {item.inquiry_status === 'declined' && item.decline_reason && (
                          <div className="w-full mb-4 p-4 bg-[#FEF2F2] border-l-4 border-[#EF4444] rounded-r-lg">
                            <div className="text-[#EF4444] font-bold text-sm mb-1">終止/撤回原因：</div>
                            <div className="text-[#A05C5C] text-sm whitespace-pre-wrap">{item.decline_reason}</div>
                          </div>
                        )}

                        {canDecline && (
                          <button className="btn-secondary-red" onClick={() => { setSelectedInquiry(item); setShowDeclineModal(true); }}>
                            {item.inquiry_status === 'pending' ? '禮貌婉拒' : '終止洽談'}
                          </button>
                        )}
                        {item.inquiry_status === 'pending' && (
                          <button className="btn-primary" onClick={() => handleDirectInvite(item)}>
                            ✉️ 邀請詳談
                          </button>
                        )}
                        {(item.inquiry_status === 'submitted' || item.inquiry_status === 'proposed') && (
                          <button className="btn-primary" onClick={() => handleEnterInquiryWorkspace(item.inquiry_id)}>
                            💬 進入聊天室 {item.inquiry_status === 'proposed' && "(繪師已發送協議)"}
                          </button>
                        )}
                        {item.inquiry_status === 'accepted' && (
                          <button className="btn-success" onClick={() => handleViewCommission()}>
                            進入委託單管理
                          </button>
                        )}
                      </ArtistPostcard>
                    </div>
                  );
                })
              )
            )}
          </div>
        )}
      </div>
    </>
  );
};