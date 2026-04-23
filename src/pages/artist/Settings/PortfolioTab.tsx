import { useState, useMemo } from 'react';
import { ImageUploader } from '../../../components/ImageUploader';
import type { ProfileSettings, FormDataState, QuotaInfo } from '../Settings/types';

interface Props {
  formData: FormDataState;
  settings: ProfileSettings;
  setSettings: React.Dispatch<React.SetStateAction<ProfileSettings>>;
  quotaInfo: QuotaInfo | null; // 需從 Settings.tsx 傳入
}

export function PortfolioTab({ formData, settings, setSettings, quotaInfo }: Props) {
  const [isPortfolioUploading, setIsPortfolioUploading] = useState(false);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

  // 1. 根據方案決定配額 (免費6, 試用20, 專業30)
  const portfolioLimit = useMemo(() => {
    if (quotaInfo?.plan_type === 'pro') return 30;
    if (quotaInfo?.plan_type === 'trial') return 20;
    return 6;
  }, [quotaInfo]);

  const handlePortfolioUpload = async (resultBlobs: { preview: Blob }) => {
    // 2. 資安與配額守衛：系統寫入極限為 40 張，或超過目前方案配額則攔截
    if (settings.portfolio.length >= 40) {
      alert("已達系統儲存上限 (40張)");
      return;
    }
    if (settings.portfolio.length >= portfolioLimit) {
      alert("免費版本已達上限");
      return;
    }

    setIsPortfolioUploading(true);
    try {
      const fileType = resultBlobs.preview.type || 'image/jpeg';
      const fileExt = fileType.split('/')[1] || 'jpg';
      const ticketRes = await fetch(`${API_BASE}/api/r2/upload-url`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentType: fileType, bucketType: 'public', originalName: `portfolio.${fileExt}`, folder: 'portfolio' }) 
      });
      
      const ticketData = await ticketRes.json();
      if (!ticketData.success) throw new Error(ticketData.error || "無法取得上傳通行證");
      
      const uploadRes = await fetch(ticketData.uploadUrl, { method: 'PUT', body: resultBlobs.preview, headers: { 'Content-Type': fileType } });
      if (!uploadRes.ok) throw new Error("上傳遭拒絕");

      const finalUrl = `https://pub-1d4bcc7f19324c0d95d7bfdfeb1a69e2.r2.dev/${ticketData.fileName}`;
      setSettings(prev => ({ ...prev, portfolio: [...prev.portfolio, finalUrl] }));
    } catch (err: any) {
      alert(err.message || "作品上傳失敗");
    } finally {
      setIsPortfolioUploading(false);
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 3. 修正：動態方案提醒區塊文字 */}
      <div style={{ padding: '16px', background: '#FDF4E6', border: '1px solid #F5E6D3', borderRadius: '12px', color: '#A67B3E', fontSize: '14px', fontWeight: 'bold' }}>
        {quotaInfo?.plan_type === 'free' 
          ? `📢 目前您的方案僅公開前 6 張作品。 (目前已上傳: ${settings.portfolio.length} / 配額: ${portfolioLimit})`
          : `📢 您的作品將在個人頁面完整公開展示。 (目前已上傳: ${settings.portfolio.length} / 配額: ${portfolioLimit})`
        }
      </div>

      <div style={{ backgroundColor: '#FAFAFA', padding: '20px', borderRadius: '12px', border: '1px dashed #DED9D3' }}>
        <ImageUploader 
          onUpload={handlePortfolioUpload} 
          targetWidth={1200} 
          withWatermark={true} 
          watermarkText={formData.display_name} 
          buttonText={isPortfolioUploading ? "上傳中..." : "上傳作品圖檔"} 
          maxSizeMB={5} 
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '16px' }}>
        {settings.portfolio.map((img, i) => {
          // 4. 修正：動態判斷公開標籤。免費版僅限前 6，其餘版本標註所有配額內項目
          const isPublic = quotaInfo?.plan_type === 'free' ? i < 6 : i < portfolioLimit;

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