// src/components/OC/OCDetailCard.tsx
import { useState } from 'react';
import { Copy, Check, Image as ImageIcon } from 'lucide-react';
import type { OCImageItem } from './OCImageManager';
import '../../styles/OCCardPage.css'; // 沿用我們之前寫好的排版 CSS

// 定義傳入的資料型別
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

  // 複製色碼功能
  const handleCopyColor = (color: string) => {
    if (!color) return;
    navigator.clipboard.writeText(color.toUpperCase());
    setToastMsg(`已複製色碼：${color.toUpperCase()}`);
    setTimeout(() => setToastMsg(null), 2000);
  };

  // 唯讀的文字顯示區塊
  const ReadOnlyText = ({ text, placeholder = '無' }: { text: string, placeholder?: string }) => (
    <div style={{ fontSize: '14px', color: text ? '#332D28' : '#A0978D', lineHeight: '1.6', padding: '4px 0' }}>
      {text || placeholder}
    </div>
  );

  // 唯讀的顏色顯示區塊 (支援點擊複製)
  const ReadOnlyColorField = ({ label, desc, colors }: { label: string, desc: string, colors: string[] }) => {
    const validColors = colors.filter(c => c);
    return (
      <div>
        <div className="oc-field-label">{label}</div>
        <div className="oc-color-group">
          <div style={{ flex: 1, minWidth: '160px' }}>
            <ReadOnlyText text={desc} placeholder={`無${label.replace('：', '')}描述`} />
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {validColors.length > 0 ? validColors.map((color, i) => (
              <div 
                key={i} 
                onClick={() => handleCopyColor(color)}
                style={{ 
                  width: '32px', height: '32px', backgroundColor: color, 
                  border: '1px solid rgba(0,0,0,0.1)', borderRadius: '6px', 
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)', transition: 'transform 0.1s'
                }}
                title={`點擊複製 ${color.toUpperCase()}`}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              />
            )) : <span style={{ fontSize: '13px', color: '#A0978D' }}>無色票</span>}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ backgroundColor: '#FDFDFB', borderRadius: '12px', overflow: 'hidden', position: 'relative' }}>
      
      {/* Toast 提示 (複製色碼時顯示) */}
      {toastMsg && (
        <div style={{ 
          position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', 
          backgroundColor: '#5D4A3E', color: 'white', padding: '10px 20px', 
          borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', zIndex: 100, 
          display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          animation: 'fadeIn 0.2s ease-in-out' 
        }}>
          <Check size={16} color="#A67B3E" /> {toastMsg}
        </div>
      )}

      {/* 標題與頁籤區 */}
      <div style={{ padding: '24px 32px 0 32px', borderBottom: '1px solid #EAE6E1', backgroundColor: '#FFF' }}>
        <h2 style={{ margin: '0 0 20px 0', color: '#5D4A3E', fontSize: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          {ocData.name || '未命名角色'}
        </h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            className={`oc-tab-btn ${activeTab === 'intro' ? 'active' : 'inactive'}`}
            onClick={() => setActiveTab('intro')}
            style={{ borderRadius: '8px 8px 0 0', padding: '10px 24px', margin: 0 }}
          >
            簡介
          </button>
          <button 
            className={`oc-tab-btn ${activeTab === 'background' ? 'active' : 'inactive'}`}
            onClick={() => setActiveTab('background')}
            style={{ borderRadius: '8px 8px 0 0', padding: '10px 24px', margin: 0 }}
          >
            背景詳細設定
          </button>
        </div>
      </div>

      <div style={{ padding: '32px' }}>
        {activeTab === 'intro' && (
          <div className="fade-in">
            <div className="oc-intro-grid">
              
              {/* 左側：圖片預覽畫廊 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ 
                  width: '100%', aspectRatio: '4/3', backgroundColor: '#F4F0EB', 
                  borderRadius: '12px', overflow: 'hidden', border: '1px solid #EAE6E1',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  {mainImage ? (
                    <img src={mainImage} alt="主圖" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  ) : (
                    <div style={{ color: '#A0978D', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <ImageIcon size={32} opacity={0.5} />
                      <span style={{ fontSize: '13px' }}>無提供參考圖</span>
                    </div>
                  )}
                </div>
                
                {/* 縮圖列表 */}
                {ocData.images && ocData.images.length > 1 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                    {ocData.images.map((img, idx) => (
                      <div 
                        key={img.id} 
                        onClick={() => setMainImage(img.previewUrl)}
                        style={{ 
                          aspectRatio: '1', borderRadius: '8px', overflow: 'hidden', 
                          border: mainImage === img.previewUrl ? '2px solid #A67B3E' : '1px solid #EAE6E1',
                          cursor: 'pointer', opacity: mainImage === img.previewUrl ? 1 : 0.6,
                          transition: 'all 0.2s'
                        }}
                      >
                        <img src={img.previewUrl} alt={`縮圖 ${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 右側：資料檢視 */}
              <div className="oc-form-column">
                <div className="oc-form-row-2">
                  <div>
                    <div className="oc-field-label">性別：</div>
                    <ReadOnlyText text={ocData.gender} />
                  </div>
                  <div>
                    <div className="oc-field-label">體型：</div>
                    <ReadOnlyText text={ocData.body_type} />
                  </div>
                </div>

                <ReadOnlyColorField label="髮色／髮型：" desc={ocData.hair_desc} colors={ocData.hair_colors} />
                <ReadOnlyColorField label="瞳色／瞳型：" desc={ocData.eyes_desc} colors={ocData.eyes_colors} />
                <ReadOnlyColorField label="服裝：" desc={ocData.clothing_desc} colors={ocData.clothing_colors} />

                <div>
                  <div className="oc-field-label">特點／配件：</div>
                  <ReadOnlyText text={ocData.traits} />
                </div>
                
                {ocData.must_have && (
                  <div className="oc-must-have">
                    <div className="oc-field-label">必帶元素：</div>
                    <ReadOnlyText text={ocData.must_have} />
                  </div>
                )}

                {ocData.donts && (
                  <div className="oc-donts">
                    <div className="oc-field-label">絕對雷點：</div>
                    <ReadOnlyText text={ocData.donts} />
                  </div>
                )}

                {ocData.keywords && ocData.keywords.length > 0 && (
                  <div>
                    <div className="oc-field-label">印象關鍵字：</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                      {ocData.keywords.map((kw, i) => (
                        <span key={i} style={{ backgroundColor: '#F4F0EB', color: '#5D4A3E', padding: '4px 12px', borderRadius: '16px', fontSize: '13px' }}>
                          #{kw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 個性簡述 */}
            {ocData.short_intro && (
              <div className="oc-short-intro" style={{ marginTop: '24px' }}>
                <div className="oc-short-intro-title">個性簡述：</div>
                <ReadOnlyText text={ocData.short_intro} />
              </div>
            )}
          </div>
        )}

        {activeTab === 'background' && (
          <div className="fade-in oc-form-column">
            <div>
              <h4 className="oc-field-label" style={{ borderBottom: '1px solid #F4F0EB', paddingBottom: '8px', marginBottom: '12px' }}>角色個性</h4>
              <div style={{ fontSize: '14px', lineHeight: '1.8', color: '#332D28', whiteSpace: 'pre-wrap' }}>
                {ocData.personality || '無詳細說明'}
              </div>
            </div>
            
            <div style={{ marginTop: '24px' }}>
              <h4 className="oc-field-label" style={{ borderBottom: '1px solid #F4F0EB', paddingBottom: '8px', marginBottom: '12px' }}>人物背景說明</h4>
              <div style={{ fontSize: '14px', lineHeight: '1.8', color: '#332D28', whiteSpace: 'pre-wrap' }}>
                {ocData.background || '無詳細說明'}
              </div>
            </div>

            <div style={{ marginTop: '24px' }}>
              <h4 className="oc-field-label" style={{ borderBottom: '1px solid #F4F0EB', paddingBottom: '8px', marginBottom: '12px' }}>其他說明</h4>
              <div style={{ fontSize: '14px', lineHeight: '1.8', color: '#332D28', whiteSpace: 'pre-wrap' }}>
                {ocData.other_notes || '無詳細說明'}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}