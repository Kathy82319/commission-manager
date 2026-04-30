// src/pages/Inbox/InboundTab.tsx
import React, { useState } from 'react';
import { ArtistPostcard } from './components/ArtistPostcard';
import { calculateDaysLeft, filterOldItems } from './utils/formatters';
import { OfferList } from './OfferList'; // 🌟 新增這一行

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
  setShowInviteModal: (show: boolean) => void;
  handleEnterInquiryWorkspace: (id: string) => void;
  handleViewCommission: (id: string) => void;
  viewMode: 'card' | 'list'; 
}

export const InboundTab: React.FC<InboundTabProps> = ({
  clientBulletins,
  clientInquiries,
  navigate,
  setSelectedInquiry,
  setShowDeclineModal,
  setShowInviteModal,
  handleEnterInquiryWorkspace,
  handleViewCommission,
  viewMode 
}) => {
  const [selectedBulletinId, setSelectedBulletinId] = useState<string | null>(
    clientBulletins.length > 0 ? clientBulletins[0].id : null
  );

  // 🌟 使用變數：取得目前選中的是哪一種文章
  const activeBulletinCategory = clientBulletins.find(b => b.id === selectedBulletinId)?.category;

  // 過濾出當前選中貼文的提案
  const currentInquiries = clientInquiries
    .filter(i => i.bulletin_id === selectedBulletinId)
    .filter(filterOldItems);

  return (
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
          收到的繪師履歷 / 案主委託
        </h2>
        
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
              // 🌟 這裡使用變數：根據文章類型切換不同視圖
activeBulletinCategory === 'offer' ? (
  // 🌟 載入我們的海選模式容器
  <OfferList 
    inquiries={currentInquiries} 
    viewMode={viewMode}
    setSelectedInquiry={setSelectedInquiry}
    setShowDeclineModal={setShowDeclineModal}
    setShowInviteModal={setShowInviteModal}
    handleEnterInquiryWorkspace={handleEnterInquiryWorkspace}
    handleViewCommission={handleViewCommission}
  />
) : (
                // 原本的徵稿文 (Request) 明信片模式
                currentInquiries.map(item => {
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

                      {item.inquiry_status === 'declined' && item.decline_reason && (
                        <div className="bg-[#FCE8E6] p-3 rounded-lg border border-[#F5C6C6] mt-2 mx-4 text-[#A05C5C] text-sm">
                          <strong>終止/婉拒理由：</strong>{item.decline_reason}
                        </div>
                      )}
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