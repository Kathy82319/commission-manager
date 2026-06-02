import { useState, useMemo } from 'react';
import { ImageUploader } from '../../../components/ImageUploader';
import type { ProfileSettings, FormDataState, QuotaInfo } from '../Settings/types';

interface Props {
  formData: FormDataState;
  settings: ProfileSettings;
  setSettings: React.Dispatch<React.SetStateAction<ProfileSettings>>;
  quotaInfo: QuotaInfo | null; 
}

export function PortfolioTab({ formData, settings, setSettings, quotaInfo }: Props) {
  const [isPortfolioUploading, setIsPortfolioUploading] = useState(false);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

  const portfolioLimit = useMemo(() => {
    if (quotaInfo?.plan_type === 'pro') return 30;
    if (quotaInfo?.plan_type === 'trial') return 20;
    return 15;
  }, [quotaInfo]);

  const uploadOneToR2 = async (blob: Blob): Promise<string> => {
    const fileType = blob.type || 'image/jpeg';
    const fileExt = fileType.split('/')[1] || 'jpg';
    const ticketRes = await fetch(`${API_BASE}/api/r2/upload-url`, {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contentType: fileType, bucketType: 'public', originalName: `portfolio.${fileExt}`, folder: 'portfolio' })
    });
    const ticketData = await ticketRes.json();
    if (!ticketData.success) throw new Error(ticketData.error || "無法取得上傳通行證");
    const uploadRes = await fetch(ticketData.uploadUrl, { method: 'PUT', body: blob, headers: { 'Content-Type': fileType } });
    if (!uploadRes.ok) throw new Error("上傳遭拒絕");
    return `https://pub-1d4bcc7f19324c0d95d7bfdfeb1a69e2.r2.dev/${ticketData.fileName}`;
  };

  const handlePortfolioUpload = async (resultBlobs: { preview: Blob }) => {
    if (settings.portfolio.length >= 40) { alert("已達系統儲存上限 (40張)"); return; }
    if (settings.portfolio.length >= portfolioLimit) { alert("已達方案上限"); return; }
    setIsPortfolioUploading(true);
    try {
      const url = await uploadOneToR2(resultBlobs.preview);
      setSettings(prev => ({ ...prev, portfolio: [...prev.portfolio, url] }));
    } catch (err: any) {
      alert(err.message || "作品上傳失敗");
    } finally {
      setIsPortfolioUploading(false);
    }
  };

  const handleBatchPortfolioUpload = async (blobsArray: Array<{ preview: Blob }>) => {
    const current = settings.portfolio;
    const hardLimit = Math.min(portfolioLimit, 40);
    const remaining = hardLimit - current.length;
    if (remaining <= 0) { alert("已達上傳上限"); return; }
    const toUpload = blobsArray.slice(0, remaining);
    setIsPortfolioUploading(true);
    const newUrls: string[] = [];
    for (const blobs of toUpload) {
      try {
        const url = await uploadOneToR2(blobs.preview);
        newUrls.push(url);
      } catch {
        // 單張失敗不中斷，繼續下一張
      }
    }
    if (newUrls.length > 0) {
      setSettings(prev => ({ ...prev, portfolio: [...prev.portfolio, ...newUrls] }));
    }
    setIsPortfolioUploading(false);
    if (blobsArray.length > remaining) {
      alert(`已上傳 ${newUrls.length} 張，其餘因達上限略過。`);
    }
  };

  const handleRemoveImage = (index: number) => {
    setSettings(prev => ({ ...prev, portfolio: prev.portfolio.filter((_, i) => i !== index) }));
  };

  const handleDragStart = (idx: number) => setDraggedIdx(idx);
  
  const handleDragOver = (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault(); 
    if (draggedIdx === null || draggedIdx === targetIdx) return; 
    const newPortfolio = [...settings.portfolio]; 
    const item = newPortfolio.splice(draggedIdx, 1)[0]; 
    newPortfolio.splice(targetIdx, 0, item); 
    setDraggedIdx(targetIdx); 
    setSettings(prev => ({ ...prev, portfolio: newPortfolio }));
  };

  const layout = settings.portfolio_layout ?? 'grid';
  const blurred = settings.portfolio_blurred ?? false;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* 版型選擇 */}
      <div style={{ background: '#FFFFFF', border: '1px solid #EAE6E1', borderRadius: '12px', padding: '20px' }}>
        <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#5D4A3E', marginBottom: '12px' }}>作品展示版型</div>
        <div style={{ display: 'flex', gap: '12px' }}>
          {([
            { value: 'grid', label: '⊞ 塊狀', desc: '固定正方形格子' },
            { value: 'masonry', label: '⧉ 瀑布流', desc: '依圖片比例自然排列' },
          ] as const).map(opt => (
            <button
              key={opt.value}
              onClick={() => setSettings(prev => ({ ...prev, portfolio_layout: opt.value }))}
              style={{
                flex: 1, padding: '12px', borderRadius: '10px', cursor: 'pointer',
                border: layout === opt.value ? '2px solid #4A7294' : '1px solid #DED9D3',
                background: layout === opt.value ? '#EBF2F7' : '#FAFAFA',
                color: layout === opt.value ? '#4A7294' : '#7A7269',
                fontWeight: layout === opt.value ? 'bold' : 'normal',
                textAlign: 'center', transition: 'all 0.15s',
              }}
            >
              <div style={{ fontSize: '15px' }}>{opt.label}</div>
              <div style={{ fontSize: '11px', marginTop: '4px', opacity: 0.8 }}>{opt.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* 浮水印設定 */}
      <div style={{ background: '#FFFFFF', border: '1px solid #EAE6E1', borderRadius: '12px', padding: '20px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={blurred}
            onChange={e => setSettings(prev => ({ ...prev, portfolio_blurred: e.target.checked }))}
            style={{ width: '18px', height: '18px', accentColor: '#4A7294', cursor: 'pointer', flexShrink: 0 }}
          />
          <div>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#5D4A3E' }}>上傳作品時自動加上浮水印</div>
            <div style={{ fontSize: '12px', color: '#A0978D', marginTop: '4px', lineHeight: 1.6 }}>
              開啟後，浮水印將在上傳時覆蓋您的作品，若要無浮水印版本需取消勾選後重新上傳。<br />
              💡 如果您習慣自己在作品上加浮水印，建議關閉此功能，避免出現兩層浮水印。
            </div>
          </div>
        </label>
      </div>

      <div style={{ padding: '16px', background: '#FDF4E6', border: '1px solid #F5E6D3', borderRadius: '12px', color: '#A67B3E', fontSize: '14px', fontWeight: 'bold' }}>
        {quotaInfo?.plan_type === 'free' 
          ? `📢 目前您的方案僅公開前 15 張作品。 (目前已上傳: ${settings.portfolio.length} / 配額: ${portfolioLimit})`
          : `📢 您的作品將在個人頁面完整公開展示。 (目前已上傳: ${settings.portfolio.length} / 配額: ${portfolioLimit})`
        }
      </div>

      <div style={{ backgroundColor: '#FAFAFA', padding: '20px', borderRadius: '12px', border: '1px dashed #DED9D3' }}>
        <ImageUploader
          onUpload={handlePortfolioUpload}
          onBatchUpload={handleBatchPortfolioUpload}
          multiple
          targetWidth={1200}
          withWatermark={blurred}
          watermarkText={formData.display_name}
          buttonText={isPortfolioUploading ? "上傳中..." : "上傳作品圖檔（可多選，單次最多 10 張）"}
          maxSizeMB={5}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '16px' }}>
        {settings.portfolio.map((img, i) => {
          const isPublic = quotaInfo?.plan_type === 'free' ? i < 15 : i < portfolioLimit;

          return (
            <div 
              key={i} 
              draggable 
              onDragStart={() => handleDragStart(i)} 
              onDragOver={(e) => handleDragOver(e, i)} 
              onDragEnd={() => setDraggedIdx(null)} 
              style={{ 
                position: 'relative', 
                aspectRatio: '1/1', 
                borderRadius: '12px', 
                overflow: 'hidden', 
                border: isPublic ? '2px solid #4E7A5A' : '1px solid #EAE6E1',
                opacity: draggedIdx === i ? 0.5 : 1, 
                cursor: 'grab', 
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)' 
              }}
            >
              <img src={img} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={`Portfolio ${i}`} />
              {isPublic && (
                <div style={{ position: 'absolute', top: '0', left: '0', background: '#4E7A5A', color: '#FFF', fontSize: '10px', padding: '2px 6px', borderRadius: '0 0 8px 0', fontWeight: 'bold', zIndex: 2 }}>公開</div>
              )}
              <button 
                onClick={() => handleRemoveImage(i)} 
                style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(255,255,255,0.9)', color: '#A05C5C', border: 'none', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', boxShadow: '0 2px 6px rgba(0,0,0,0.1)', zIndex: 2 }}
              >
                X
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}