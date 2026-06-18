import React, { useRef, useState, useEffect, useCallback } from 'react';
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
  const visualRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const [activeTemplate, setActiveTemplate] = useState<'visual' | 'card'>('visual');
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imgMap, setImgMap] = useState<Record<string, string>>({});
  const [imagesReady, setImagesReady] = useState(false);

  const validHairColors = (ocData.hair_colors || []).filter(Boolean);
  const validEyesColors = (ocData.eyes_colors || []).filter(Boolean);
  const validClothingColors = (ocData.clothing_colors || []).filter(Boolean);

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

  const handleGenerate = useCallback(async (template?: 'visual' | 'card') => {
    const t = template ?? activeTemplate;
    const ref = t === 'visual' ? visualRef : cardRef;
    if (!ref.current) return;
    setIsGenerating(true);
    setPreviewUrl(null);
    try {
      const canvas = await html2canvas(ref.current, {
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
  }, [activeTemplate]);

  useEffect(() => {
    if (imagesReady) handleGenerate();
  }, [imagesReady]);

  const handleTemplateSwitch = (t: 'visual' | 'card') => {
    if (t === activeTemplate) return;
    setActiveTemplate(t);
    setPreviewUrl(null);
    setTimeout(() => handleGenerate(t), 50);
  };

  const handleDownload = () => {
    if (!previewUrl) return;
    const a = document.createElement('a');
    a.href = previewUrl;
    a.download = `${ocData.name || 'OC'}_${activeTemplate === 'visual' ? '圖片版' : '名片版'}.png`;
    a.click();
  };

  const getImg = (url: string) => imgMap[url] || url;
  const mainImageSrc = ocData.images?.[0]?.previewUrl ? getImg(ocData.images[0].previewUrl) : null;

  const attrRows = [
    { label: '髮色', desc: ocData.hair_desc, colors: validHairColors },
    { label: '瞳色', desc: ocData.eyes_desc, colors: validEyesColors },
    { label: '服裝', desc: ocData.clothing_desc, colors: validClothingColors },
  ].filter(({ desc, colors }) => desc || colors.length > 0);

  // ── 圖片版 (900×auto, dark, portrait-ish) ──────────────────────────────
  const VisualTemplate = (
    <div ref={visualRef} style={{
      width: '900px',
      backgroundColor: '#1A1208',
      fontFamily: '"Noto Sans TC","PingFang TC","Microsoft JhengHei",sans-serif',
      borderRadius: '20px', overflow: 'hidden',
    }}>
      {/* 主圖 */}
      <div style={{ width: '900px', height: '500px', position: 'relative', overflow: 'hidden' }}>
        {mainImageSrc
          ? <img src={mainImageSrc} alt="角色圖" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          : <div style={{ width: '100%', height: '100%', backgroundColor: '#2D1F0F', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7A6240', fontSize: '16px' }}>尚無圖片</div>
        }
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '220px', background: 'linear-gradient(to bottom, transparent, #1A1208)' }} />
        <div style={{ position: 'absolute', bottom: '22px', left: '28px', right: '28px' }}>
          <div style={{ fontSize: '40px', fontWeight: 900, color: 'white', letterSpacing: '1px', lineHeight: '1.1', textShadow: '0 2px 12px rgba(0,0,0,0.6)' }}>
            {ocData.name || '未命名角色'}
          </div>
          {(ocData.gender || ocData.body_type) && (
            <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.65)', marginTop: '5px' }}>
              {[ocData.gender, ocData.body_type].filter(Boolean).join('　·　')}
            </div>
          )}
        </div>
      </div>

      {/* 內容 */}
      <div style={{ padding: '22px 28px 24px' }}>
        {/* 屬性列 */}
        {attrRows.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', marginBottom: '18px' }}>
            {attrRows.map(({ label, desc, colors }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#C9A96E', width: '30px', flexShrink: 0 }}>{label}</span>
                <span style={{ flex: 1, fontSize: '13px', color: 'rgba(255,255,255,0.78)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{desc || '—'}</span>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {colors.map((c: string, i: number) => <ColorSwatch key={i} color={c} />)}
                </div>
              </div>
            ))}
            {ocData.traits && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#C9A96E', width: '30px', flexShrink: 0 }}>特點</span>
                <span style={{ flex: 1, fontSize: '13px', color: 'rgba(255,255,255,0.78)' }}>{ocData.traits}</span>
              </div>
            )}
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
  );

  // ── 名片版 (900×605, 明信片比例 15.2:10.2, light, horizontal) ──────────
  const cardAttrRows = [
    ...(ocData.gender ? [{ label: '性別', desc: ocData.gender, colors: [] }] : []),
    ...(ocData.body_type ? [{ label: '體型', desc: ocData.body_type, colors: [] }] : []),
    ...attrRows,
    ...(ocData.traits ? [{ label: '特點', desc: ocData.traits, colors: [] }] : []),
  ];

  const CardTemplate = (
    <div ref={cardRef} style={{
      width: '900px', height: '605px',
      backgroundColor: '#FDFDFB',
      fontFamily: '"Noto Sans TC","PingFang TC","Microsoft JhengHei",sans-serif',
      borderRadius: '16px', overflow: 'hidden', display: 'flex',
    }}>
      {/* 左側圖片：contain，不拉伸 */}
      <div style={{ width: '300px', flexShrink: 0, backgroundColor: '#F4F0EB', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
        {mainImageSrc
          ? <img src={mainImageSrc} alt="角色圖" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }} />
          : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#BEB5AE', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
              <span style={{ fontSize: '36px' }}>🎨</span>尚無圖片
            </div>
        }
        <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: '32px', background: 'linear-gradient(to right, transparent, #FDFDFB)' }} />
      </div>

      {/* 右側資訊 */}
      <div style={{ flex: 1, padding: '22px 26px', display: 'flex', flexDirection: 'column', gap: '10px', overflow: 'hidden' }}>
        {/* 標題 + 品牌 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ fontSize: '28px', fontWeight: 900, color: '#3D2B1F', letterSpacing: '-0.5px', lineHeight: '1.1' }}>
            {ocData.name || '未命名角色'}
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '10px' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#A67B3E' }}>OC 角色設定卡</div>
            <div style={{ fontSize: '10px', color: '#C0B8B0', marginTop: '2px' }}>✦ Arti 繪師小幫手</div>
          </div>
        </div>

        {/* 屬性列（含性別/體型） */}
        {cardAttrRows.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {cardAttrRows.map(({ label, desc, colors }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 9px', backgroundColor: '#F4F0EB', borderRadius: '6px' }}>
                <span style={{ fontSize: '10px', fontWeight: 700, color: '#A67B3E', width: '54px', flexShrink: 0 }}>{label}</span>
                <span style={{ flex: 1, fontSize: '12px', color: '#4A3D35', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{desc || '—'}</span>
                {colors.length > 0 && (
                  <div style={{ display: 'flex', gap: '3px' }}>{colors.map((c: string, i: number) => <ColorSwatch key={i} color={c} />)}</div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 必帶 / 雷點 */}
        {(ocData.must_have || ocData.donts) && (
          <div style={{ display: 'flex', gap: '8px', flex: 1, minHeight: 0, overflow: 'hidden' }}>
            {ocData.must_have && (
              <div style={{ flex: 1, backgroundColor: 'rgba(140,179,105,0.08)', border: '1px solid rgba(140,179,105,0.28)', borderRadius: '8px', padding: '8px 10px', overflow: 'hidden' }}>
                <div style={{ fontSize: '10px', fontWeight: 800, color: '#6A8A4F', marginBottom: '4px' }}>✅ 必帶元素</div>
                <div style={{ fontSize: '11px', color: '#4A3D35', lineHeight: '1.55', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 5, WebkitBoxOrient: 'vertical' } as React.CSSProperties}>{ocData.must_have}</div>
              </div>
            )}
            {ocData.donts && (
              <div style={{ flex: 1, backgroundColor: 'rgba(217,83,79,0.05)', border: '1px solid rgba(217,83,79,0.18)', borderRadius: '8px', padding: '8px 10px', overflow: 'hidden' }}>
                <div style={{ fontSize: '10px', fontWeight: 800, color: '#B53D39', marginBottom: '4px' }}>🚫 絕對雷點</div>
                <div style={{ fontSize: '11px', color: '#4A3D35', lineHeight: '1.55', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 5, WebkitBoxOrient: 'vertical' } as React.CSSProperties}>{ocData.donts}</div>
              </div>
            )}
          </div>
        )}

        {/* 關鍵字 */}
        {ocData.keywords?.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {ocData.keywords.slice(0, 8).map((kw: string, i: number) => (
              <span key={i} style={{ padding: '2px 8px', backgroundColor: '#EDE6DF', color: '#5D4A3E', borderRadius: '10px', fontSize: '11px', fontWeight: 600 }}>#{kw}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.72)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10010, padding: '16px', overflowY: 'auto' }}
      onClick={onClose}
    >
      <div style={{ width: '100%', maxWidth: '780px', display: 'flex', flexDirection: 'column', gap: '16px', margin: 'auto' }} onClick={e => e.stopPropagation()}>

        {/* 工具列 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          {/* 格式選擇 */}
          <div style={{ display: 'flex', gap: '6px', background: 'rgba(255,255,255,0.08)', padding: '4px', borderRadius: '12px' }}>
            {([['visual', '🖼️ 圖片版'], ['card', '🗂️ 名片版']] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => handleTemplateSwitch(key)}
                style={{ padding: '7px 16px', borderRadius: '9px', border: 'none', fontSize: '13px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s', background: activeTemplate === key ? '#A67B3E' : 'transparent', color: activeTemplate === key ? 'white' : 'rgba(255,255,255,0.55)' }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* 操作按鈕 */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {isGenerating && (
              <span style={{ color: 'white', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> 產出中...
              </span>
            )}
            {!isGenerating && imagesReady && (
              <button onClick={() => handleGenerate()} style={{ background: 'rgba(255,255,255,0.13)', color: 'white', border: '1px solid rgba(255,255,255,0.25)', padding: '8px 14px', borderRadius: '9px', fontSize: '13px', cursor: 'pointer' }}>
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

        {/* 隱藏渲染區（供 html2canvas 擷取） */}
        <div style={{ position: 'absolute', left: '-9999px', top: 0, pointerEvents: 'none' }}>
          {VisualTemplate}
          {CardTemplate}
        </div>

        <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
      </div>
    </div>
  );
}
