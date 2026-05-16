// src/components/OC/OCDetailCard.tsx
import { useState } from 'react';
import { Check, Image as ImageIcon } from 'lucide-react';
import type { OCImageItem } from './OCImageManager';
import '../../styles/OCCardPage.css'; 

export interface OCCardData {
  id: string;
  name: string;
  gender: string;
  body_type: string;
  hair_desc: string;
  hair_colors: string[]; 
  eyes_desc: string;
  eyes_colors: string[];
  clothing_desc: string;
  clothing_colors: string[];
  traits: string;
  must_have: string;
  donts: string;
  keywords: string[];
  short_intro: string;
  personality: string;
  background: string;
  other_notes: string;
  images: OCImageItem[];
  updated_at: string;
}

interface OCDetailCardProps {
  ocData: OCCardData;
}

export function OCDetailCard({ ocData }: OCDetailCardProps) {
  const [activeTab, setActiveTab] = useState<'intro' | 'background'>('intro');
  const [mainImage, setMainImage] = useState<string | null>(ocData.images?.[0]?.previewUrl || null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  const handleCopyColor = (color: string) => {
    if (!color) return;
    navigator.clipboard.writeText(color.toUpperCase());
    setToastMsg(`已複製色碼：${color.toUpperCase()}`);
    setTimeout(() => setToastMsg(null), 2000);
  };

  const ReadOnlyText = ({ text, placeholder = '無' }: { text: string, placeholder?: string }) => (
    <div style={{ fontSize: '14px', color: text ? '#332D28' : '#A0978D', lineHeight: '1.6', padding: '2px 0' }}>
      {text || placeholder}
    </div>
  );

  const ReadOnlyColorField = ({ label, desc, colors }: { label: string, desc: string, colors: string[] }) => {
    const validColors = colors.filter(c => c);
    return (
      <div style={{ marginBottom: '4px' }}>
        <div className="oc-field-label" style={{ fontSize: '12px', marginBottom: '2px' }}>{label}</div>
        <div className="oc-color-group" style={{ gap: '8px' }}>
          <div style={{ flex: 1, minWidth: '120px' }}>
            <ReadOnlyText text={desc} placeholder={`無描述`} />
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            {validColors.map((color, i) => (
              <div 
                key={i} 
                onClick={() => handleCopyColor(color)}
                style={{ 
                  width: '24px', height: '24px', backgroundColor: color, 
                  border: '1px solid rgba(0,0,0,0.1)', borderRadius: '4px', 
                  cursor: 'pointer', transition: 'transform 0.1s'
                }}
                title={`點擊複製 ${color.toUpperCase()}`}
              />
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ backgroundColor: '#FDFDFB', borderRadius: '12px', overflow: 'hidden', position: 'relative' }}>
      
      {/* 燈箱 */}
      {zoomedImage && (
        <div onClick={() => setZoomedImage(null)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.85)', zIndex: 100005, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', cursor: 'zoom-out' }}>
          <img src={zoomedImage} alt="放大" style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain', borderRadius: '8px' }} />
        </div>
      )}

      {/* Toast */}
      {toastMsg && (
        <div style={{ position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#5D4A3E', color: 'white', padding: '10px 20px', borderRadius: '8px', fontSize: '14px', zIndex: 100, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Check size={16} color="#A67B3E" /> {toastMsg}
        </div>
      )}

      {/* 🌟 核心改動：一體化排版，移除頂部標題 */}
      <div style={{ padding: '24px' }}>
        <div className="oc-intro-grid" style={{ gridTemplateColumns: '1fr 1.2fr', gap: '24px' }}>
          
          {/* 左側：圖片區 (不隨分頁切換而消失) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div 
              onClick={() => mainImage && setZoomedImage(mainImage)}
              style={{ width: '100%', aspectRatio: '4/3', backgroundColor: '#F4F0EB', borderRadius: '12px', overflow: 'hidden', border: '1px solid #EAE6E1', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-in', position: 'relative' }}
            >
              {mainImage ? <img src={mainImage} alt="主圖" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <ImageIcon size={32} opacity={0.5} />}
            </div>
            
            {ocData.images && ocData.images.length > 1 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                {ocData.images.map((img) => (
                  <div key={img.id} onClick={() => setMainImage(img.previewUrl)} style={{ aspectRatio: '1', borderRadius: '6px', overflow: 'hidden', border: mainImage === img.previewUrl ? '2px solid #A67B3E' : '1px solid #EAE6E1', cursor: 'pointer' }}>
                    <img src={img.previewUrl} alt="縮圖" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 右側：詳細資料區 (包含名字與切換按鈕) */}
          <div className="oc-form-column" style={{ gap: '12px' }}>
            
            {/* 🌟 名字整合在此 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <h2 style={{ margin: 0, fontSize: '28px', color: '#5D4A3E', fontWeight: 'bold' }}>{ocData.name || '未命名角色'}</h2>
              
              {/* 🌟 極簡小分頁切換器 */}
              <div style={{ display: 'flex', backgroundColor: '#F4F0EB', padding: '3px', borderRadius: '8px' }}>
                <button 
                  onClick={() => setActiveTab('intro')}
                  style={{ border: 'none', padding: '4px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', backgroundColor: activeTab === 'intro' ? '#FFF' : 'transparent', color: activeTab === 'intro' ? '#8CB369' : '#A0978D', boxShadow: activeTab === 'intro' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none', transition: 'all 0.2s' }}
                >
                  簡介
                </button>
                <button 
                  onClick={() => setActiveTab('background')}
                  style={{ border: 'none', padding: '4px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', backgroundColor: activeTab === 'background' ? '#FFF' : 'transparent', color: activeTab === 'background' ? '#8CB369' : '#A0978D', boxShadow: activeTab === 'background' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none', transition: 'all 0.2s' }}
                >
                  設定
                </button>
              </div>
            </div>

            <div style={{ height: '1px', backgroundColor: '#EAE6E1', width: '100%' }}></div>

            {/* 內容切換 */}
            {activeTab === 'intro' ? (
              <div className="fade-in">
                <div className="oc-form-row-2" style={{ marginBottom: '8px' }}>
                  <div>
                    <div className="oc-field-label" style={{ fontSize: '12px' }}>性別：</div>
                    <ReadOnlyText text={ocData.gender} />
                  </div>
                  <div>
                    <div className="oc-field-label" style={{ fontSize: '12px' }}>體型：</div>
                    <ReadOnlyText text={ocData.body_type} />
                  </div>
                </div>

                <ReadOnlyColorField label="髮色／髮型：" desc={ocData.hair_desc} colors={ocData.hair_colors} />
                <ReadOnlyColorField label="瞳色／瞳型：" desc={ocData.eyes_desc} colors={ocData.eyes_colors} />
                <ReadOnlyColorField label="服裝：" desc={ocData.clothing_desc} colors={ocData.clothing_colors} />

                <div style={{ marginTop: '8px' }}>
                  <div className="oc-field-label" style={{ fontSize: '12px' }}>特點／配件：</div>
                  <ReadOnlyText text={ocData.traits} />
                </div>
                
                {ocData.must_have && (
                  <div className="oc-must-have" style={{ marginTop: '12px', padding: '8px 12px' }}>
                    <div className="oc-field-label" style={{ fontSize: '12px', marginBottom: '2px' }}>必帶元素：</div>
                    <ReadOnlyText text={ocData.must_have} />
                  </div>
                )}

                {ocData.donts && (
                  <div className="oc-donts" style={{ marginTop: '8px', padding: '8px 12px' }}>
                    <div className="oc-field-label" style={{ fontSize: '12px', marginBottom: '2px' }}>絕對雷點：</div>
                    <ReadOnlyText text={ocData.donts} />
                  </div>
                )}
              </div>
            ) : (
              <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <div className="oc-field-label" style={{ fontSize: '12px', color: '#8CB369' }}>角色個性：</div>
                  <div style={{ fontSize: '13px', lineHeight: '1.6', color: '#332D28', whiteSpace: 'pre-wrap', maxHeight: '150px', overflowY: 'auto' }}>
                    {ocData.personality || '無詳細說明'}
                  </div>
                </div>
                <div>
                  <div className="oc-field-label" style={{ fontSize: '12px', color: '#8CB369' }}>人物背景：</div>
                  <div style={{ fontSize: '13px', lineHeight: '1.6', color: '#332D28', whiteSpace: 'pre-wrap', maxHeight: '150px', overflowY: 'auto' }}>
                    {ocData.background || '無詳細說明'}
                  </div>
                </div>
                <div>
                  <div className="oc-field-label" style={{ fontSize: '12px', color: '#8CB369' }}>其他說明：</div>
                  <div style={{ fontSize: '13px', lineHeight: '1.6', color: '#332D28', whiteSpace: 'pre-wrap', maxHeight: '100px', overflowY: 'auto' }}>
                    {ocData.other_notes || '無詳細說明'}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 底部印象關鍵字與個性簡述 (Intro 模式下顯示) */}
        {activeTab === 'intro' && (
          <div className="fade-in" style={{ marginTop: '20px', borderTop: '1px dashed #EAE6E1', paddingTop: '16px' }}>
            {ocData.keywords && ocData.keywords.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                {ocData.keywords.map((kw, i) => (
                  <span key={i} style={{ backgroundColor: '#F4F0EB', color: '#5D4A3E', padding: '3px 10px', borderRadius: '12px', fontSize: '12px' }}>#{kw}</span>
                ))}
              </div>
            )}
            {ocData.short_intro && (
              <div className="oc-short-intro" style={{ margin: 0, padding: '12px 16px' }}>
                <div className="oc-short-intro-title" style={{ fontSize: '13px' }}>個性簡述：</div>
                <ReadOnlyText text={ocData.short_intro} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}