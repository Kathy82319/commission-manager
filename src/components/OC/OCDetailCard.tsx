// src/components/OC/OCDetailCard.tsx
import { useState } from 'react';
import { createPortal } from 'react-dom';
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
  variant?: 'default' | 'flat';
}

export function OCDetailCard({ ocData, variant = 'default' }: OCDetailCardProps) {
  const [activeTab, setActiveTab] = useState<'intro' | 'background'>('intro');
  const [mainImage, setMainImage] = useState<string | null>(ocData.images?.[0]?.previewUrl || null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  const isFlat = variant === 'flat';

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
      <div style={{ marginBottom: '6px' }}>
        <div className="oc-field-label" style={{ fontSize: '12px', marginBottom: '2px', color: '#7A7269' }}>{label}</div>
        <div className="oc-color-group" style={{ gap: '12px', display: 'flex', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: '120px' }}>
            <ReadOnlyText text={desc} placeholder={`無描述`} />
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            {validColors.map((color, i) => (
              <div 
                key={i} 
                onClick={() => handleCopyColor(color)}
                style={{ 
                  width: '24px', height: '24px', backgroundColor: color, 
                  border: '1px solid rgba(0,0,0,0.15)', borderRadius: '6px', 
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
    <div className={`oc-detail-container ${isFlat ? 'is-flat' : ''}`} style={
      isFlat ? {
        backgroundColor: 'rgba(255, 255, 255, 0.78)', 
        backdropFilter: 'blur(16px)',                  
        WebkitBackdropFilter: 'blur(16px)',
        borderRadius: '16px',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.04)',
        position: 'relative'
      } : {
        backgroundColor: '#FDFDFB', 
        borderRadius: '12px', 
        overflow: 'hidden', 
        position: 'relative' 
      }
    }>
      
      
      <style>{`
        .local-responsive-grid {
          display: grid;
          grid-template-columns: ${isFlat ? 'minmax(200px, 380px) 1fr' : '1fr 1.2fr'};
          gap: ${isFlat ? '36px' : '24px'};
        }
        @media (max-width: 768px) {
          .local-responsive-grid {
            grid-template-columns: 1fr !important;
            gap: 16px !important;
          }
          .oc-card-content-wrapper {
            padding: 16px !important;
          }
          .oc-card-header {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 12px !important;
          }
          .oc-card-header h2 {
            font-size: 22px !important;
          }
          .oc-card-tabs {
            width: 100% !important;
            justify-content: flex-start !important;
            overflow-x: auto !important;
          }
          .oc-tab-btn {
            flex: 1;
            text-align: center;
          }
        }
      `}</style>

      
      {zoomedImage && createPortal(
        <div 
          onClick={(e) => {
            e.stopPropagation(); 
            setZoomedImage(null);
          }} 
          style={{ 
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
            width: '100vw', height: '100vh', 
            backgroundColor: 'rgba(0, 0, 0, 0.85)', 
            zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', 
            padding: '24px', cursor: 'zoom-out' 
          }}
        >
          <img 
            src={zoomedImage} 
            alt="放大" 
            onClick={(e) => e.stopPropagation()} 
            style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain', borderRadius: '8px', cursor: 'default' }} 
          />
        </div>,
        document.body 
      )}

      
      {toastMsg && (
        <div style={{ position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#5D4A3E', color: 'white', padding: '10px 20px', borderRadius: '8px', fontSize: '14px', zIndex: 100, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Check size={16} color="#A67B3E" /> {toastMsg}
        </div>
      )}

      
      <div className="oc-card-content-wrapper" style={{ padding: isFlat ? '32px' : '24px' }}>
        
        <div className={activeTab === 'intro' ? 'oc-intro-grid local-responsive-grid' : ''}>

          {activeTab === 'intro' && (
            <div className="oc-images-section" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div
                onClick={() => mainImage && setZoomedImage(mainImage)}
                style={{ width: '100%', aspectRatio: '4/3', backgroundColor: '#EFECE7', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-in', position: 'relative' }}
              >
                {mainImage ? <img src={mainImage} alt="主圖" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <ImageIcon size={32} opacity={0.3} color="#5D4A3E" />}
              </div>

              {ocData.images && ocData.images.length > 1 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                  {ocData.images.map((img) => (
                    <div key={img.id} onClick={() => setMainImage(img.previewUrl)} style={{ aspectRatio: '1', borderRadius: '8px', overflow: 'hidden', border: mainImage === img.previewUrl ? '2px solid #5D4A3E' : '1px solid rgba(0,0,0,0.05)', cursor: 'pointer', opacity: mainImage === img.previewUrl ? 1 : 0.6, transition: 'all 0.2s' }}>
                      <img src={img.previewUrl} alt="縮圖" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="oc-form-column" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            
            <div className="oc-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px', borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '12px' }}>
              <h2 style={{ margin: 0, fontSize: isFlat ? '30px' : '26px', color: '#4A3B32', fontWeight: '900', letterSpacing: '-0.5px', lineHeight: '1.2', wordBreak: 'break-word' }}>
                {ocData.name || '未命名角色'}
              </h2>
              
              <div className="oc-card-tabs" style={{ display: 'flex', gap: isFlat ? '16px' : '4px', backgroundColor: isFlat ? 'transparent' : '#F4F0EB', padding: isFlat ? '0' : '3px', borderRadius: '8px', width: isFlat ? 'auto' : 'fit-content' }}>
                <button 
                  onClick={() => setActiveTab('intro')}
                  className={`oc-tab-btn ${activeTab === 'intro' ? 'active' : ''} ${isFlat ? 'flat' : 'default'}`}
                >
                  簡介
                </button>
                <button 
                  onClick={() => setActiveTab('background')}
                  className={`oc-tab-btn ${activeTab === 'background' ? 'active' : ''} ${isFlat ? 'flat' : 'default'}`}
                >
                  詳細設定
                </button>
              </div>
            </div>

            
            {activeTab === 'intro' ? (
              <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="oc-form-row-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <div className="oc-field-label" style={{ fontSize: '12px', color: '#7A7269', marginBottom: '2px' }}>性別：</div>
                    <ReadOnlyText text={ocData.gender} />
                  </div>
                  <div>
                    <div className="oc-field-label" style={{ fontSize: '12px', color: '#7A7269', marginBottom: '2px' }}>體型：</div>
                    <ReadOnlyText text={ocData.body_type} />
                  </div>
                </div>

                <div>
                  <ReadOnlyColorField label="髮色／髮型：" desc={ocData.hair_desc} colors={ocData.hair_colors} />
                  <ReadOnlyColorField label="瞳色／瞳型：" desc={ocData.eyes_desc} colors={ocData.eyes_colors} />
                  <ReadOnlyColorField label="服裝：" desc={ocData.clothing_desc} colors={ocData.clothing_colors} />
                </div>

                <div>
                  <div className="oc-field-label" style={{ fontSize: '12px', color: '#7A7269', marginBottom: '2px' }}>特點／配件：</div>
                  <ReadOnlyText text={ocData.traits} />
                </div>
                
                {(ocData.must_have || ocData.donts) && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                    {ocData.must_have && (
                      <div className="oc-must-have" style={{ padding: '10px 14px', backgroundColor: 'rgba(140, 179, 105, 0.1)', borderLeft: '4px solid #8CB369', borderRadius: '4px 8px 8px 4px' }}>
                        <div className="oc-field-label" style={{ fontSize: '12px', fontWeight: 'bold', color: '#6A8A4F', marginBottom: '4px' }}>必帶元素：</div>
                        <div style={{ fontSize: '14px', color: '#332D28', lineHeight: '1.5' }}>{ocData.must_have}</div>
                      </div>
                    )}

                    {ocData.donts && (
                      <div className="oc-donts" style={{ padding: '10px 14px', backgroundColor: 'rgba(217, 83, 79, 0.08)', borderLeft: '4px solid #D9534F', borderRadius: '4px 8px 8px 4px' }}>
                        <div className="oc-field-label" style={{ fontSize: '12px', fontWeight: 'bold', color: '#B53D39', marginBottom: '4px' }}>絕對雷點：</div>
                        <div style={{ fontSize: '14px', color: '#332D28', lineHeight: '1.5' }}>{ocData.donts}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {[
                  { label: '角色個性', value: ocData.personality },
                  { label: '人物背景說明', value: ocData.background },
                  { label: '其他說明', value: ocData.other_notes },
                ].map(({ label, value }) => (
                  <div key={label} style={{ backgroundColor: '#FFF', padding: '16px', borderRadius: '10px', border: '1px solid #EAE6E1' }}>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#4A3B32', borderBottom: '1px solid #F4F0EB', paddingBottom: '8px', marginBottom: '12px' }}>{label}</div>
                    <div style={{ fontSize: '14px', lineHeight: '1.7', color: value ? '#444' : '#A0978D', whiteSpace: 'pre-wrap' }}>
                      {value || '無詳細說明'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        
        {activeTab === 'intro' && (
          <div className="fade-in" style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px dashed rgba(0,0,0,0.08)' }}>
            {ocData.keywords && ocData.keywords.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                {ocData.keywords.map((kw, i) => (
                  <span key={i} style={{ backgroundColor: 'rgba(0,0,0,0.04)', color: '#5D4A3E', padding: '4px 12px', borderRadius: '50px', fontSize: '13px', fontWeight: '600' }}>#{kw}</span>
                ))}
              </div>
            )}
            {ocData.short_intro && (
              <div className="oc-short-intro" style={{ margin: 0, padding: '16px', backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: '12px' }}>
                <div className="oc-short-intro-title" style={{ fontSize: '13px', fontWeight: 'bold', color: '#5D4A3E', marginBottom: '6px' }}>個性簡述：</div>
                <div style={{ fontSize: '14px', lineHeight: '1.6', color: '#444' }}>{ocData.short_intro}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}