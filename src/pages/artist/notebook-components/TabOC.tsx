// src/pages/artist/notebook-components/TabOC.tsx
import { useState } from 'react';
import { Maximize2, X, Image as ImageIcon } from 'lucide-react';
import { OCDetailCard } from '../../../components/OC/OCDetailCard';
import type { OCCardData } from '../../../components/OC/OCDetailCard'; // 🌟 修正：獨立引入純型別
import type { Commission } from './notebookUtils';

interface TabOCProps {
  selectedOrder: Commission;
}

export function TabOC({ selectedOrder }: TabOCProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 嘗試從訂單解析 OC 快照 (未來我們寫入表單時會存放於此)
  let ocData: OCCardData | null = null;
  try {
    if ((selectedOrder as any).oc_snapshot) {
      ocData = JSON.parse((selectedOrder as any).oc_snapshot);
    }
  } catch (e) {
    console.error("無法解析 OC 資料", e);
  }

  // 若尚未綁定 OC
  if (!ocData) {
    return (
      <div style={{ backgroundColor: '#FFF', borderRadius: '12px', padding: '40px', textAlign: 'center', border: '1px dashed #DED9D3', color: '#A0978D' }}>
        此委託單尚未綁定任何專屬角色設定卡 (OC)。
      </div>
    );
  }

  // 如果有綁定，渲染「防爆精簡摘要版」
  return (
    <div className="fade-in">
      <div style={{ backgroundColor: '#FDFDFB', border: '1px solid #EAE6E1', borderRadius: '12px', padding: '24px' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #EAE6E1', paddingBottom: '16px', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#5D4A3E' }}>{ocData.name || '未命名角色'}</div>
            <div style={{ fontSize: '13px', color: '#A0978D', marginTop: '4px' }}>已綁定專屬角色卡</div>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', backgroundColor: '#5D4A3E', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', transition: 'background 0.2s' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#4A3B31'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#5D4A3E'}
          >
            <Maximize2 size={16} /> 檢視完整設定卡
          </button>
        </div>

        {/* 摘要資訊區 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 2fr)', gap: '24px' }}>
          {/* 左側主圖縮圖 */}
          <div style={{ aspectRatio: '4/3', backgroundColor: '#F4F0EB', borderRadius: '8px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #EAE6E1' }}>
             {ocData.images && ocData.images.length > 0 ? (
               <img src={ocData.images[0].previewUrl} alt="主圖" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
             ) : (
               <div style={{ color: '#A0978D', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                 <ImageIcon size={24} opacity={0.5} />
                 <span style={{ fontSize: '12px' }}>無參考圖</span>
               </div>
             )}
          </div>

          {/* 右側高亮資訊 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* 特殊雷點與必帶 */}
            {ocData.must_have && (
              <div style={{ borderLeft: '4px solid #8CB369', backgroundColor: 'rgba(140, 179, 105, 0.05)', padding: '10px 14px', borderRadius: '0 8px 8px 0' }}>
                <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#5D4A3E', display: 'block', marginBottom: '4px' }}>必帶元素：</span>
                <span style={{ fontSize: '14px', color: '#332D28' }}>{ocData.must_have}</span>
              </div>
            )}
            
            {ocData.donts && (
              <div style={{ borderLeft: '4px solid #E11D48', backgroundColor: 'rgba(225, 29, 72, 0.05)', padding: '10px 14px', borderRadius: '0 8px 8px 0' }}>
                <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#E11D48', display: 'block', marginBottom: '4px' }}>絕對雷點：</span>
                <span style={{ fontSize: '14px', color: '#332D28' }}>{ocData.donts}</span>
              </div>
            )}

            {!ocData.must_have && !ocData.donts && (
               <div style={{ fontSize: '14px', color: '#A0978D' }}>此角色無設定特殊的必帶元素或雷點。請點擊「檢視完整設定卡」查看髮色與服裝細節。</div>
            )}
          </div>
        </div>

      </div>

      {/* 🌟 全螢幕 Modal：顯示完整 OCDetailCard */}
      {isModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.6)', 
          zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
          animation: 'fadeIn 0.2s ease-in-out'
        }}>
          <div style={{ 
            width: '100%', maxWidth: '900px', maxHeight: '90vh', backgroundColor: 'transparent',
            position: 'relative', display: 'flex', flexDirection: 'column'
          }}>
            
            {/* 關閉按鈕 */}
            <button 
              onClick={() => setIsModalOpen(false)}
              style={{ position: 'absolute', top: '-40px', right: 0, background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 'bold' }}
            >
              關閉 <X size={20} />
            </button>

            {/* 滾動內容區 */}
            <div style={{ overflowY: 'auto', borderRadius: '12px', backgroundColor: '#FDFDFB' }}>
              <OCDetailCard ocData={ocData} />
            </div>

          </div>
        </div>
      )}
    </div>
  );
}