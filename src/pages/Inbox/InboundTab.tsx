// src/pages/Inbox/InboundTab.tsx
import React, { useState } from 'react';
import { OfferList } from './OfferList';
import { calculateDaysLeft, filterOldItems } from './utils/formatters';

const SLOT_TYPES = [
  { id: 'request', label: '徵委託', icon: '📝', desc: '尋找繪師來為您繪製作品' },
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
  blacklistedIds?: string[];
  handleCancelBulletin?: (id: string) => void; 
}

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
  blacklistedIds = [],
  handleCancelBulletin 
}) => {
  const [selectedBulletinId, setSelectedBulletinId] = useState<string | null>(
    clientBulletins.length > 0 ? clientBulletins[0].id : null
  );

  // 這裡的變數目前用不到，但保留作為擴充判斷備用
  // const activeBulletinCategory = clientBulletins.find(b => b.id === selectedBulletinId)?.category;

  const currentInquiries = clientInquiries
    .filter(i => i.bulletin_id === selectedBulletinId)
    .filter(filterOldItems);

  return (
    <>
      <div className="mb-8">
        <div className="dashboard-slots-grid">
          {SLOT_TYPES.map(slotType => {
            const bulletin = clientBulletins.find(b => b.category === slotType.id && b.status === 'open');
            const isSelected = selectedBulletinId === bulletin?.id;
            
            if (bulletin) {
              return (
                <div key={slotType.id} className={`dashboard-slot active-slot ${isSelected ? 'selected' : ''}`} onClick={() => setSelectedBulletinId(bulletin.id)} style={{ position: 'relative' }}>
                  
                  <div style={{ position: 'absolute', top: '12px', right: '12px', fontSize: '12px', fontWeight: 'bold', color: '#D97706', backgroundColor: '#FFFBEB', padding: '4px 8px', borderRadius: '6px', border: '1px solid #FDE68A' }}>
                    {calculateDaysLeft(bulletin.expires_at)}
                  </div>

                  <div className="slot-header">
                    <span className="slot-icon">{slotType.icon}</span>
                    <span className="slot-category">{slotType.label}刊登中</span>
                  </div>
                  <h3 className="slot-title" title={bulletin.title}>{bulletin.title || '未命名貼文'}</h3>
                  <div className="slot-stats" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="stat-item"><span className="stat-num">{bulletin.inquiry_count || 0}</span> 份提案</div>
                    
                    <button 
                      style={{ 
                        padding: '4px 10px', fontSize: '12px', fontWeight: 'bold', color: '#EF4444', 
                        backgroundColor: '#FFF', border: '1px solid #EF4444', borderRadius: '6px', 
                        cursor: 'pointer', transition: 'all 0.2s'
                      }}
                      onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#FEF2F2')}
                      onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#FFF')}
                      onClick={(e) => {
                        e.stopPropagation(); 
                        if (typeof handleCancelBulletin === 'function') {
                          handleCancelBulletin(bulletin.id);
                        } else {
                          alert("⚠️ 系統提示：找不到撤銷功能！請確認您的 Inbox/index.tsx 有加入 handleCancelBulletin 並傳遞給 InboundTab。");
                        }
                      }}
                    >
                      撤銷許願
                    </button>
                  </div>
                </div>
              );
            } else {
              const isOther = slotType.id === 'other';

              return (
                <div 
                  key={slotType.id} 
                  className={`dashboard-slot empty-slot transition ${isOther ? 'opacity-60' : ''}`} 
                  style={{ cursor: isOther ? 'not-allowed' : 'pointer', filter: isOther ? 'grayscale(0.3)' : 'none' }}
                  onClick={() => {
                    if (isOther) return; 
                    navigate(`/?tab=${slotType.id}`);
                  }}
                >
                  <div className="empty-content">
                    <span className="empty-icon text-3xl mb-2 opacity-50">{slotType.icon}</span>
                    <div className="text-[#7A7269] font-bold mb-1">
                      {slotType.label} {isOther ? '即將開放' : '尚有空缺'}
                    </div>
                    <div className="text-xs text-[#A0978D] mb-3">{slotType.desc}</div>
                    <button 
                      className="btn-outline-primary text-sm py-1 px-3"
                      style={isOther ? { borderColor: '#D1D5DB', color: '#9CA3AF', backgroundColor: '#F3F4F6', cursor: 'not-allowed' } : {}}
                      disabled={isOther}
                    >
                      {isOther ? '🚧 建置中' : '+ 前往發布'}
                    </button>
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
              // 🌟 核心修正：不論是「徵委託」還是「接稿文」，只要是收件匣，一律統一使用 OfferList 來渲染正確的 CardView 卡片排版
              <OfferList 
                inquiries={currentInquiries} 
                setSelectedInquiry={setSelectedInquiry}
                setShowDeclineModal={setShowDeclineModal}
                handleDirectInvite={handleDirectInvite}
                handleEnterInquiryWorkspace={handleEnterInquiryWorkspace}
                handleViewCommission={handleViewCommission}
                setSelectedIdsForBatch={setSelectedIdsForBatch}
                blacklistedIds={blacklistedIds}
              />
            )}
          </div>
        )}
      </div>
    </>
  );
};