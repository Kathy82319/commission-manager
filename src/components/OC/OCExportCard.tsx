// src/components/OC/OCExportCard.tsx
import React, { useRef, useState, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { Download, Loader2, X } from 'lucide-react';

interface OCExportCardProps {
  ocData: any;
  onClose: () => void;
}

const ColorSwatch = ({ color }: { color: string }) => (
  <span style={{
    display: 'inline-block', width: '16px', height: '16px',
    borderRadius: '50%', backgroundColor: color,
    border: '1.5px solid rgba(0,0,0,0.12)', flexShrink: 0
  }} title={color} />
);

const Section = ({ title, children, accent }: { title: string; children: React.ReactNode; accent?: string }) => (
  <div style={{
    padding: '10px 14px', borderRadius: '8px',
    backgroundColor: accent || '#F9F6F2',
    border: `1px solid ${accent ? 'rgba(0,0,0,0.08)' : '#EAE6E1'}`,
    marginBottom: '8px'
  }}>
    <div style={{ fontSize: '11px', fontWeight: 800, color: '#A67B3E', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>{title}</div>
    {children}
  </div>
);

export function OCExportCard({ ocData, onClose }: OCExportCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const mainImage = ocData.images?.[0]?.previewUrl ?? null;
  const validHairColors = (ocData.hair_colors || []).filter(Boolean);
  const validEyesColors = (ocData.eyes_colors || []).filter(Boolean);
  const validClothingColors = (ocData.clothing_colors || []).filter(Boolean);

  const handleGenerate = async () => {
    if (!cardRef.current) return;
    setIsGenerating(true);
    setPreviewUrl(null);
    try {
      const canvas = await html2canvas(cardRef.current, {
        useCORS: true,
        allowTaint: false,
        scale: 2,
        backgroundColor: '#FDFDFB',
        logging: false,
      });
      setPreviewUrl(canvas.toDataURL('image/png'));
    } catch (e) {
      console.error('匯出失敗', e);
      alert('圖片匯出失敗，請確認圖片來源允許跨域存取。');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!previewUrl) return;
    const a = document.createElement('a');
    a.href = previewUrl;
    a.download = `${ocData.name || 'OC'}_設定卡.png`;
    a.click();
  };

  // Auto-generate on open
  useEffect(() => { handleGenerate(); }, []);

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(15,23,42,0.72)',
      backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 10010, padding: '16px', overflowY: 'auto'
    }} onClick={onClose}>
      <div style={{
        width: '100%', maxWidth: '760px',
        display: 'flex', flexDirection: 'column', gap: '16px',
        margin: 'auto'
      }} onClick={e => e.stopPropagation()}>

        {/* 操作列 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: 'white', fontWeight: 'bold', fontSize: '15px' }}>OC 設定卡預覽</span>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {previewUrl && (
              <button onClick={handleDownload} style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: '#A67B3E', color: 'white', border: 'none',
                padding: '9px 18px', borderRadius: '10px', fontWeight: 'bold',
                fontSize: '14px', cursor: 'pointer'
              }}>
                <Download size={16} /> 下載圖片
              </button>
            )}
            {isGenerating && (
              <span style={{ color: 'white', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> 產出中...
              </span>
            )}
            <button onClick={handleGenerate} disabled={isGenerating} style={{
              background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.3)',
              padding: '9px 14px', borderRadius: '10px', fontSize: '13px', cursor: isGenerating ? 'not-allowed' : 'pointer',
              opacity: isGenerating ? 0.6 : 1
            }}>重新產出</button>
            <button onClick={onClose} style={{
              background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white',
              width: '36px', height: '36px', borderRadius: '8px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}><X size={18} /></button>
          </div>
        </div>

        {/* 若已產出圖片，顯示圖片預覽 */}
        {previewUrl && !isGenerating ? (
          <img src={previewUrl} alt="OC卡預覽" style={{ width: '100%', borderRadius: '14px', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }} />
        ) : (
          /* 產出中 skeleton */
          <div style={{
            width: '100%', minHeight: '300px', borderRadius: '14px',
            background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', color: 'rgba(255,255,255,0.5)', fontSize: '14px',
            gap: '8px'
          }}>
            <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> 正在產出卡片...
          </div>
        )}

        {/* 隱藏的實際渲染卡片（供 html2canvas 擷取） */}
        <div style={{ position: 'absolute', left: '-9999px', top: 0, pointerEvents: 'none' }}>
          <div ref={cardRef} style={{
            width: '720px', backgroundColor: '#FDFDFB',
            fontFamily: '"Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif',
            padding: '28px', boxSizing: 'border-box',
            borderRadius: '16px'
          }}>
            {/* 頂部標題列 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2px solid #EAE6E1', paddingBottom: '14px' }}>
              <div>
                <div style={{ fontSize: '22px', fontWeight: 900, color: '#3D2B1F', letterSpacing: '1px' }}>
                  {ocData.name || '未命名角色'}
                </div>
                {(ocData.gender || ocData.body_type) && (
                  <div style={{ fontSize: '13px', color: '#7A6B62', marginTop: '4px' }}>
                    {[ocData.gender && `性別：${ocData.gender}`, ocData.body_type && `體型：${ocData.body_type}`].filter(Boolean).join('　｜　')}
                  </div>
                )}
              </div>
              <div style={{ fontSize: '11px', color: '#A0978D', textAlign: 'right', lineHeight: '1.6' }}>
                <div style={{ fontWeight: 800, fontSize: '13px', color: '#A67B3E' }}>OC 角色設定卡</div>
                <div>Created with Arti 繪師小幫手</div>
              </div>
            </div>

            {/* 主體：左側圖片 + 右側資訊 */}
            <div style={{ display: 'flex', gap: '20px', marginBottom: '16px' }}>
              {/* 左側圖片 */}
              <div style={{ width: '220px', flexShrink: 0 }}>
                {mainImage ? (
                  <img
                    src={mainImage}
                    alt="角色圖"
                    crossOrigin="anonymous"
                    style={{ width: '220px', height: '220px', objectFit: 'cover', borderRadius: '12px', border: '2px solid #EAE6E1', display: 'block' }}
                  />
                ) : (
                  <div style={{ width: '220px', height: '220px', borderRadius: '12px', backgroundColor: '#F0EBE6', border: '2px dashed #DED9D3', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#BEB5AE', fontSize: '13px', flexDirection: 'column', gap: '8px' }}>
                    <span style={{ fontSize: '36px' }}>🎨</span>
                    <span>尚無圖片</span>
                  </div>
                )}
                {/* 其他圖片縮圖 */}
                {ocData.images?.length > 1 && (
                  <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                    {ocData.images.slice(1, 4).map((img: any, i: number) => (
                      <img key={i} src={img.previewUrl} crossOrigin="anonymous" alt=""
                        style={{ width: '64px', height: '64px', objectFit: 'cover', borderRadius: '6px', border: '1.5px solid #EAE6E1' }}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* 右側屬性 */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {/* 色彩屬性 */}
                {[
                  { label: '髮色／髮型', desc: ocData.hair_desc, colors: validHairColors },
                  { label: '瞳色／瞳型', desc: ocData.eyes_desc, colors: validEyesColors },
                  { label: '服裝', desc: ocData.clothing_desc, colors: validClothingColors },
                ].map(({ label, desc, colors }) => (desc || colors.length > 0) && (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', background: '#F9F6F2', borderRadius: '8px', border: '1px solid #EAE6E1' }}>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#A67B3E', width: '64px', flexShrink: 0 }}>{label}</span>
                    <span style={{ flex: 1, fontSize: '13px', color: '#4A3D35' }}>{desc || '—'}</span>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {colors.map((c: string, i: number) => <ColorSwatch key={i} color={c} />)}
                    </div>
                  </div>
                ))}

                {ocData.traits && (
                  <div style={{ padding: '8px 10px', background: '#F9F6F2', borderRadius: '8px', border: '1px solid #EAE6E1' }}>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#A67B3E' }}>特點／配件　</span>
                    <span style={{ fontSize: '13px', color: '#4A3D35' }}>{ocData.traits}</span>
                  </div>
                )}

                {ocData.keywords?.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '2px' }}>
                    {ocData.keywords.map((kw: string, i: number) => (
                      <span key={i} style={{ padding: '3px 10px', background: '#EDE6DF', color: '#5D4A3E', borderRadius: '12px', fontSize: '12px', fontWeight: 600, border: '1px solid #DED9D3' }}>#{kw}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 必帶元素 */}
            {ocData.must_have && (
              <Section title="✅ 必帶元素" accent="#f0fdf4">
                <div style={{ fontSize: '13px', color: '#166534', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{ocData.must_have}</div>
              </Section>
            )}

            {/* 雷點 */}
            {ocData.donts && (
              <Section title="🚫 絕對雷點" accent="#fff1f2">
                <div style={{ fontSize: '13px', color: '#9f1239', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{ocData.donts}</div>
              </Section>
            )}

            {/* 其他簡述 */}
            {ocData.short_intro && (
              <Section title="📝 其他簡述" accent="#FFFCE8">
                <div style={{ fontSize: '13px', color: '#4A3D35', lineHeight: '1.7', whiteSpace: 'pre-wrap' }}>{ocData.short_intro}</div>
              </Section>
            )}

            {/* 底部 */}
            <div style={{ borderTop: '1px solid #EAE6E1', marginTop: '16px', paddingTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
              <span style={{ fontSize: '11px', color: '#C0B8B0' }}>
                更新於 {new Date(ocData.updated_at || Date.now()).toLocaleDateString('zh-TW')} ‧ Arti 繪師小幫手
              </span>
            </div>
          </div>
        </div>

        {/* spin keyframe */}
        <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
      </div>
    </div>
  );
}
