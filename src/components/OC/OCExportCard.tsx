import React, { useRef, useState, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { Download, Loader2, X } from 'lucide-react';

interface OCExportCardProps {
  ocData: any;
  onClose: () => void;
}

async function toDataUrl(url: string): Promise<string> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch { return ''; }
}

const ColorSwatch = ({ color }: { color: string }) => (
  <span style={{ display: 'inline-block', width: '15px', height: '15px', borderRadius: '50%', backgroundColor: color, border: '1.5px solid rgba(0,0,0,0.15)', flexShrink: 0 }} />
);

export function OCExportCard({ ocData, onClose }: OCExportCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imgMap, setImgMap] = useState<Record<string, string>>({});
  const [imagesReady, setImagesReady] = useState(false);

  const validHairColors = (ocData.hair_colors || []).filter(Boolean);
  const validEyesColors = (ocData.eyes_colors || []).filter(Boolean);
  const validClothingColors = (ocData.clothing_colors || []).filter(Boolean);

  // 屬性列：性別/體型 併入，不再獨立顯示
  const allAttrRows = [
    ...(ocData.gender   ? [{ label: '性別', desc: ocData.gender,    colors: [] as string[] }] : []),
    ...(ocData.body_type ? [{ label: '體型', desc: ocData.body_type, colors: [] as string[] }] : []),
    ...([
      { label: '髮色', desc: ocData.hair_desc,     colors: validHairColors },
      { label: '瞳色', desc: ocData.eyes_desc,     colors: validEyesColors },
      { label: '服裝', desc: ocData.clothing_desc,  colors: validClothingColors },
    ].filter(({ desc, colors }) => desc || colors.length > 0)),
    ...(ocData.traits ? [{ label: '特點', desc: ocData.traits, colors: [] as string[] }] : []),
  ];

  useEffect(() => {
    const urls: string[] = (ocData.images || []).map((img: any) => img.previewUrl).filter(Boolean);
    if (urls.length === 0) { setImagesReady(true); return; }
    Promise.all(urls.map(async (url) => ({ url, data: await toDataUrl(url) })))
      .then(results => {
        const map: Record<string, string> = {};
        results.forEach(({ url, data }) => { if (data) map[url] = data; });
        setImgMap(map);
        setImagesReady(true);
      });
  }, []);

  useEffect(() => {
    if (imagesReady) handleGenerate();
  }, [imagesReady]);

  const handleGenerate = async () => {
    if (!cardRef.current) return;
    setIsGenerating(true);
    setPreviewUrl(null);
    try {
      const canvas = await html2canvas(cardRef.current, {
        useCORS: true, allowTaint: false, scale: 2,
        backgroundColor: null, logging: false,
      });
      setPreviewUrl(canvas.toDataURL('image/png'));
    } catch (e) {
      console.error('匯出失敗', e);
      alert('圖片匯出失敗，請稍後再試。');
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

  const getImg = (url: string) => imgMap[url] || url;
  const mainImageSrc = ocData.images?.[0]?.previewUrl ? getImg(ocData.images[0].previewUrl) : null;

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.72)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10010, padding: '16px', overflowY: 'auto' }}
      onClick={onClose}
    >
      <div style={{ width: '100%', maxWidth: '780px', display: 'flex', flexDirection: 'column', gap: '16px', margin: 'auto' }} onClick={e => e.stopPropagation()}>

        {/* 工具列 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: 'white', fontWeight: 700, fontSize: '15px' }}>OC 設定卡預覽</span>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {isGenerating && (
              <span style={{ color: 'white', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> 產出中...
              </span>
            )}
            {!isGenerating && imagesReady && (
              <button onClick={handleGenerate} style={{ background: 'rgba(255,255,255,0.13)', color: 'white', border: '1px solid rgba(255,255,255,0.25)', padding: '8px 14px', borderRadius: '9px', fontSize: '13px', cursor: 'pointer' }}>
                重新產出
              </button>
            )}
            {previewUrl && (
              <button onClick={handleDownload} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#A67B3E', color: 'white', border: 'none', padding: '8px 18px', borderRadius: '9px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}>
                <Download size={15} /> 下載
              </button>
            )}
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', width: '34px', height: '34px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={17} />
            </button>
          </div>
        </div>

        {/* 預覽區 */}
        {previewUrl && !isGenerating ? (
          <img src={previewUrl} alt="OC卡預覽" style={{ width: '100%', borderRadius: '14px', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }} />
        ) : (
          <div style={{ width: '100%', minHeight: '260px', borderRadius: '14px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.45)', fontSize: '14px', gap: '8px' }}>
            <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
            {imagesReady ? '正在產出卡片...' : '載入圖片中...'}
          </div>
        )}

        {/* 隱藏渲染區 */}
        <div style={{ position: 'absolute', left: '-9999px', top: 0, pointerEvents: 'none' }}>
          <div ref={cardRef} style={{
            width: '900px',
            backgroundColor: '#1A1208',
            fontFamily: '"Noto Sans TC","PingFang TC","Microsoft JhengHei",sans-serif',
            borderRadius: '20px', overflow: 'hidden',
          }}>
            {/* 主圖：固定 4:3 容器，contain 不拉伸 */}
            <div style={{ width: '900px', height: '675px', position: 'relative', backgroundColor: '#2A1A0A', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              {mainImageSrc
                ? <img src={mainImageSrc} alt="角色圖" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }} />
                : <div style={{ color: '#7A6240', fontSize: '16px' }}>尚無圖片</div>
              }
              {/* 底部漸層遮罩，讓名字疊在圖上更易讀 */}
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '200px', background: 'linear-gradient(to bottom, transparent, #1A1208)' }} />
              <div style={{ position: 'absolute', bottom: '24px', left: '28px', right: '28px' }}>
                <div style={{ fontSize: '40px', fontWeight: 900, color: 'white', letterSpacing: '1px', lineHeight: '1.1', textShadow: '0 2px 12px rgba(0,0,0,0.7)' }}>
                  {ocData.name || '未命名角色'}
                </div>
              </div>
            </div>

            {/* 內容區 */}
            <div style={{ padding: '20px 28px 22px' }}>
              {/* 屬性列 */}
              {allAttrRows.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
                  {allAttrRows.map(({ label, desc, colors }) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#C9A96E', width: '30px', flexShrink: 0 }}>{label}</span>
                      <span style={{ flex: 1, fontSize: '13px', color: 'rgba(255,255,255,0.78)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{desc || '—'}</span>
                      {colors.length > 0 && (
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {colors.map((c: string, i: number) => <ColorSwatch key={i} color={c} />)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* 必帶 / 雷點 */}
              {(ocData.must_have || ocData.donts) && (
                <div style={{ display: 'grid', gridTemplateColumns: ocData.must_have && ocData.donts ? '1fr 1fr' : '1fr', gap: '10px', marginBottom: '16px' }}>
                  {ocData.must_have && (
                    <div style={{ backgroundColor: 'rgba(134,191,104,0.1)', border: '1px solid rgba(134,191,104,0.28)', borderRadius: '10px', padding: '10px 13px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 800, color: '#86BF68', marginBottom: '5px' }}>✅ 必帶元素</div>
                      <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.75)', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{ocData.must_have}</div>
                    </div>
                  )}
                  {ocData.donts && (
                    <div style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.22)', borderRadius: '10px', padding: '10px 13px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 800, color: '#F87171', marginBottom: '5px' }}>🚫 絕對雷點</div>
                      <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.75)', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{ocData.donts}</div>
                    </div>
                  )}
                </div>
              )}

              {/* 關鍵字 + 品牌 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {(ocData.keywords || []).map((kw: string, i: number) => (
                    <span key={i} style={{ padding: '3px 10px', backgroundColor: 'rgba(201,169,110,0.13)', color: '#C9A96E', borderRadius: '20px', fontSize: '12px', fontWeight: 600, border: '1px solid rgba(201,169,110,0.28)' }}>#{kw}</span>
                  ))}
                </div>
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.28)', flexShrink: 0 }}>✦ Arti 繪師小幫手</span>
              </div>
            </div>
          </div>
        </div>

        <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
      </div>
    </div>
  );
}
