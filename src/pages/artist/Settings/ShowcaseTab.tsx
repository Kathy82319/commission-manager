// src/pages/artist/Settings/ShowcaseTab.tsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import type { QuotaInfo } from '../Settings/types';
import { ShowcaseFormBuilder, type ShowcaseItem } from '../../../components/ShowcaseFormBuilder';
import { Plus, X, Image as ImageIcon } from 'lucide-react';
import { ImageUploader } from '../../../components/ImageUploader';

interface ShowcaseTabProps {
  onToggleGlobalSave: (hide: boolean) => void;
  onToast: (msg: string, type: 'ok' | 'err') => void;
  quotaInfo: QuotaInfo | null;
  isReadOnly?: boolean;
  portfolio?: string[];
}

export function ShowcaseTab({ onToggleGlobalSave, onToast, quotaInfo, isReadOnly, portfolio = [] }: ShowcaseTabProps) {
  const [items, setItems] = useState<ShowcaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ShowcaseItem | null>(null);
  const [showPortfolioPicker, setShowPortfolioPicker] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [imgDraggedIdx, setImgDraggedIdx] = useState<number | null>(null);
  const [imgDragOverIdx, setImgDragOverIdx] = useState<number | null>(null);

  const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

  const limit = useMemo(() => {
    if (quotaInfo?.plan_type === 'pro') return 30;
    if (quotaInfo?.plan_type === 'trial') return 20;
    return 3; 
  }, [quotaInfo]);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/showcase`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        const safeItems = (data.data || []).map((item: any) => {
          let parsedTags: string[] = [];
          try {
            if (Array.isArray(item.tags)) {
              parsedTags = item.tags;
            } else if (typeof item.tags === 'string') {
              const p = JSON.parse(item.tags);
              parsedTags = Array.isArray(p) ? p : [];
            }
          } catch (e) { parsedTags = []; }

          let parsedImages: string[] = [];
          if (item.cover_url) {
            try {
              if (item.cover_url.startsWith('[')) {
                const imgArr = JSON.parse(item.cover_url);
                parsedImages = Array.isArray(imgArr) ? imgArr : [item.cover_url];
              } else {
                parsedImages = [item.cover_url];
              }
            } catch (e) {
              parsedImages = [item.cover_url];
            }
          }

          return { 
            ...item, 
            tags: parsedTags,
            images: parsedImages,
            cover_url: parsedImages[0] || ''
          };
        });
        setItems(safeItems);
      }
    } catch (error) {
      onToast("讀取展示項目失敗", "err");
    } finally {
      setLoading(false);
    }
  }, [API_BASE, onToast]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  useEffect(() => {
    onToggleGlobalSave(isFormOpen);
    return () => onToggleGlobalSave(false);
  }, [isFormOpen, onToggleGlobalSave]);

  const openNewForm = () => {
    if (items.length >= limit) { onToast("已達此版本上限", "err"); return; }
    setEditingItem({ 
      title: '', cover_url: '', images: [], price_info: '', tags: [], description: '', is_active: 1, form_schema: '[]',
      allow_guest: 0, max_orders: 0, show_quota: 1, tos_content: '', current_orders_count: 0 
    });
    setIsFormOpen(true);
    setShowPortfolioPicker(false);
  };

  const openEditForm = (item: ShowcaseItem) => {
    setEditingItem(item);
    setIsFormOpen(true);
    setShowPortfolioPicker(false);
  };

  const handleDeleteItem = async (id: string) => {
    if (!window.confirm("確定要刪除此項目嗎？刪除後無法恢復。")) return;
    try {
      const res = await fetch(`${API_BASE}/api/showcase/${id}`, { method: 'DELETE', credentials: 'include' });
      const data = await res.json();
      if (data.success) { onToast("項目已刪除", "ok"); fetchItems(); }
    } catch (error) { onToast("刪除失敗", "err"); }
  };

  const togglePortfolioImage = (imagePath: string) => {
    if (!imagePath || !editingItem) return;
    const currentImages = editingItem.images || [];
    const exists = currentImages.includes(imagePath);
    let nextImages = [...currentImages];
    if (exists) {
      nextImages = nextImages.filter(img => img !== imagePath);
    } else {
      if (currentImages.length >= 5) { onToast("最多只能選取 5 張圖片", "err"); return; }
      nextImages.push(imagePath);
    }
    setEditingItem({ ...editingItem, images: nextImages, cover_url: nextImages[0] || '' });
  };

  const uploadShowcaseToR2 = async (blob: Blob): Promise<string> => {
    const fileType = blob.type || 'image/jpeg';
    const fileExt = fileType.split('/')[1] || 'jpg';
    const ticketRes = await fetch(`${API_BASE}/api/r2/upload-url`, {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contentType: fileType, bucketType: 'public', originalName: `showcase_${Date.now()}.${fileExt}`, folder: 'showcase' })
    });
    const ticketData = await ticketRes.json();
    if (!ticketData.success) throw new Error(ticketData.error || "無法取得通行證");
    const uploadRes = await fetch(ticketData.uploadUrl, { method: 'PUT', body: blob, headers: { 'Content-Type': fileType } });
    if (!uploadRes.ok) throw new Error("上傳遭拒絕");
    return `https://pub-1d4bcc7f19324c0d95d7bfdfeb1a69e2.r2.dev/${ticketData.fileName}`;
  };

  const handleUploadImage = async (resultBlobs: { preview: Blob }) => {
    if (!editingItem) return;
    const currentImages = editingItem.images || [];
    if (currentImages.length >= 5) { onToast("最多只能上傳 5 張圖片", "err"); return; }
    setIsUploading(true);
    try {
      const url = await uploadShowcaseToR2(resultBlobs.preview);
      const nextImages = [...currentImages, url];
      setEditingItem({ ...editingItem, images: nextImages, cover_url: nextImages[0] || '' });
      onToast("✅ 圖片上傳成功", "ok");
    } catch (err: any) {
      onToast(err.message || "圖片上傳失敗", "err");
    } finally {
      setIsUploading(false);
    }
  };

  const handleBatchShowcaseUpload = async (blobsArray: Array<{ preview: Blob }>) => {
    if (!editingItem) return;
    const currentImages = editingItem.images || [];
    const remaining = 5 - currentImages.length;
    if (remaining <= 0) { onToast("已達 5 張上限", "err"); return; }
    const toUpload = blobsArray.slice(0, remaining);
    setIsUploading(true);
    const newUrls: string[] = [];
    for (const blobs of toUpload) {
      try {
        const url = await uploadShowcaseToR2(blobs.preview);
        newUrls.push(url);
      } catch {
        // 單張失敗不中斷
      }
    }
    if (newUrls.length > 0) {
      const nextImages = [...currentImages, ...newUrls];
      setEditingItem({ ...editingItem, images: nextImages, cover_url: nextImages[0] || '' });
      onToast(`✅ 已上傳 ${newUrls.length} 張圖片`, "ok");
    }
    setIsUploading(false);
    if (blobsArray.length > remaining) {
      onToast(`部分圖片因達 5 張上限略過`, "err");
    }
  };

  const removeImage = (idx: number) => {
    if (!editingItem) return;
    const nextImages = (editingItem.images || []).filter((_, i) => i !== idx);
    setEditingItem({ ...editingItem, images: nextImages, cover_url: nextImages[0] || '' });
  };

  const handleImgDragStart = (e: React.DragEvent, index: number) => {
    setImgDraggedIdx(index);
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleImgDragEnter = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setImgDragOverIdx(index);
  };
  const handleImgDragOver = (e: React.DragEvent) => { e.preventDefault(); };
  const handleImgDragEnd = () => { setImgDraggedIdx(null); setImgDragOverIdx(null); };
  const handleImgDrop = (e: React.DragEvent, dropIdx: number) => {
    e.preventDefault();
    if (!editingItem || imgDraggedIdx === null || imgDraggedIdx === dropIdx) return;
    const imgs = [...(editingItem.images || [])];
    const [moved] = imgs.splice(imgDraggedIdx, 1);
    imgs.splice(dropIdx, 0, moved);
    setEditingItem({ ...editingItem, images: imgs, cover_url: imgs[0] || '' });
    setImgDraggedIdx(null);
    setImgDragOverIdx(null);
  };

  if (isFormOpen && editingItem) {
    const currentImages = editingItem.images || [];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

        
        <div style={{ background: '#FFF', border: '1px solid #EAE6E1', borderRadius: '12px', padding: '20px' }}>

          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <span style={{ fontWeight: 'bold', color: '#5D4A3E', fontSize: '15px' }}>
                作品範例 / 價目表圖片
              </span>
              <span style={{ marginLeft: '8px', fontSize: '13px', color: '#A0978D' }}>
                ({currentImages.length} / 5 張)・第一張為封面・可拖曳排序
              </span>
            </div>
            {!isReadOnly && (
              <button
                type="button"
                onClick={() => setShowPortfolioPicker(!showPortfolioPicker)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: showPortfolioPicker ? '#5D4A3E' : '#F4F0EB', color: showPortfolioPicker ? '#FFF' : '#5D4A3E', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', transition: 'all 0.15s' }}
              >
                <ImageIcon size={14} /> {showPortfolioPicker ? "收起現有作品集" : "從現有作品集挑選"}
              </button>
            )}
          </div>

          
          {showPortfolioPicker && (
            <div style={{ background: '#FAFAFA', padding: '12px', borderRadius: '8px', marginBottom: '16px', border: '1px dashed #DED9D3' }}>
              <div style={{ fontSize: '12px', color: '#A0978D', marginBottom: '10px', fontWeight: 'bold' }}>從作品集挑選・點擊勾選 / 取消，最多 5 張</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: '10px' }}>
                {portfolio.map((url, idx) => {
                  const isSelected = currentImages.includes(url);
                  return (
                    <div
                      key={idx}
                      onClick={() => togglePortfolioImage(url)}
                      style={{ position: 'relative', aspectRatio: '1', borderRadius: '8px', overflow: 'hidden', cursor: 'pointer', border: isSelected ? '3px solid #5D4A3E' : '2px solid #EAE6E1', transition: 'border-color 0.15s, transform 0.15s', transform: isSelected ? 'scale(0.96)' : 'scale(1)' }}
                    >
                      <img src={url} alt={`作品 ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      {isSelected && (
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(93,74,62,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#5D4A3E', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Plus size={14} color="#FFF" />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                {portfolio.length === 0 && (
                  <div style={{ gridColumn: '1/-1', textAlign: 'center', color: '#A0978D', fontSize: '13px', padding: '16px 0' }}>
                    作品集尚無圖片，請先至「作品展示區」上傳
                  </div>
                )}
              </div>
            </div>
          )}

          
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
            {currentImages.map((url, idx) => (
              <div
                key={url + idx}
                draggable={!isReadOnly}
                onDragStart={e => handleImgDragStart(e, idx)}
                onDragEnter={e => handleImgDragEnter(e, idx)}
                onDragOver={handleImgDragOver}
                onDragEnd={handleImgDragEnd}
                onDrop={e => handleImgDrop(e, idx)}
                style={{
                  position: 'relative', width: '90px', height: '90px', borderRadius: '8px',
                  overflow: 'hidden', flexShrink: 0,
                  border: imgDragOverIdx === idx && imgDraggedIdx !== idx
                    ? '3px solid #4E7A5A'
                    : idx === 0 ? '3px solid #A67B3E' : '2px solid #EAE6E1',
                  opacity: imgDraggedIdx === idx ? 0.4 : 1,
                  cursor: isReadOnly ? 'default' : 'grab',
                  transition: 'border-color 0.15s, opacity 0.15s, transform 0.15s',
                  transform: imgDragOverIdx === idx && imgDraggedIdx !== idx ? 'scale(1.05)' : 'scale(1)',
                  boxShadow: idx === 0 ? '0 0 0 2px rgba(166,123,62,0.2)' : 'none'
                }}
                title={idx === 0 ? '封面圖（第一張）· 可拖曳調整順序' : `第 ${idx + 1} 張 · 可拖曳調整順序`}
              >
                <img src={url} alt={`圖片 ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }} />
                
                {idx === 0 && (
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(166,123,62,0.88)', color: '#FFF', fontSize: '10px', textAlign: 'center', padding: '2px 0', fontWeight: 'bold', letterSpacing: '0.5px' }}>封面</div>
                )}
                
                {!isReadOnly && (
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    style={{ position: 'absolute', top: '4px', right: '4px', width: '20px', height: '20px', background: 'rgba(0,0,0,0.6)', color: '#FFF', border: 'none', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0, opacity: 0, transition: 'opacity 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                    onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
                  >
                    <X size={11} />
                  </button>
                )}
              </div>
            ))}

            
            {currentImages.length < 5 && !isReadOnly && (
              <div style={{ width: '90px', height: '90px', borderRadius: '8px', border: '2px dashed #C4BDB5', background: '#FBFBF9', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0, transition: 'border-color 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = '#5D4A3E')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = '#C4BDB5')}
              >
                <ImageUploader
                  onUpload={handleUploadImage}
                  onBatchUpload={handleBatchShowcaseUpload}
                  multiple
                  targetWidth={800}
                  withWatermark={false}
                  buttonText={isUploading ? '上傳中…' : `＋ 新增`}
                  maxSizeMB={3}
                />
              </div>
            )}
          </div>

          
          {currentImages.length > 0 && !isReadOnly && (
            <p style={{ margin: '10px 0 0 0', fontSize: '11px', color: '#A0978D' }}>
              💡 拖曳縮圖可調整順序，第一張（金框）自動作為封面・可多選，單次最多 5 張
            </p>
          )}
          {currentImages.length === 0 && !isReadOnly && (
            <p style={{ margin: '10px 0 0 0', fontSize: '12px', color: '#A05C5C', fontWeight: 'bold' }}>
              ⚠️ 請至少上傳一張圖片或從現有作品集挑選（可多選，單次最多 5 張）
            </p>
          )}
        </div>

        
        <ShowcaseFormBuilder
          initialItem={editingItem}
          onClose={() => setIsFormOpen(false)}
          onSaveSuccess={() => { setIsFormOpen(false); fetchItems(); }}
          onRefreshList={fetchItems}
          onToast={onToast}
          apiBase={API_BASE}
          isReadOnly={isReadOnly}
        />
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ padding: '16px', background: '#FDF4E6', border: '1px solid #F5E6D3', borderRadius: '12px', color: '#A67B3E', fontSize: '14px', fontWeight: 'bold' }}>
        {quotaInfo?.plan_type === 'free' 
          ? `📢 目前您的方案可建立最多 ${limit} 項接委託項目。 (目前數量: ${items.length} / 配額: ${limit})`
          : `📢 您的項目將在個人分頁完整公開展示。 (目前數量: ${items.length} / 配額: ${limit})`
        }
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>
          接委託區管理 
          <span style={{ fontSize: '13px', color: '#A0978D', marginLeft: '12px', fontWeight: 'normal' }}>
            ({items.length} / {limit})
          </span>
        </h3>
        <button
          onClick={openNewForm}
          disabled={items.length >= limit}
          style={{ padding: '10px 20px', background: items.length >= limit ? '#C4BDB5' : '#5D4A3E', color: '#FFF', border: 'none', borderRadius: '8px', cursor: items.length >= limit ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
        >
          {items.length >= limit ? '已達上限' : '+ 新增項目'}
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#A0978D' }}>載入中...</div>
      ) : items.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', background: '#FAFAFA', border: '2px dashed #DED9D3', borderRadius: '12px', color: '#7A7269' }}>
          目前尚未新增任何項目。
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
          {items.map((item, index) => {
            const isFull = item.max_orders > 0 && (item.current_orders_count || 0) >= item.max_orders;
            const imgCount = item.images?.length || 0;
            return (
              <div key={item.id} style={{ border: '1px solid #EAE6E1', borderRadius: '12px', overflow: 'hidden', background: '#FFF', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                {index < limit && (
                  <div style={{ position: 'absolute', top: '10px', left: '10px', background: '#4E7A5A', color: '#FFF', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold', zIndex: 2 }}>公開展示中</div>
                )}
                {isFull && (
                  <div style={{ position: 'absolute', top: '10px', right: '10px', background: '#EF4444', color: '#FFF', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold', zIndex: 2, display: 'flex', alignItems: 'center', gap: '4px' }}>🛑 已滿單</div>
                )}
                {imgCount > 1 && (
                  <div style={{ position: 'absolute', bottom: '130px', right: '10px', background: 'rgba(0,0,0,0.6)', color: '#FFF', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', zIndex: 2 }}>1 / {imgCount} 張</div>
                )}
                <div style={{ height: '180px', background: '#F4F0EB', position: 'relative' }}>
                  <img src={item.cover_url} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: isFull ? 0.7 : 1 }} />
                  {!item.is_active && (
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold', zIndex: 1 }}>已手動隱藏</div>
                  )}
                </div>
                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                  <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#333' }}>{item.title}</div>
                  <div style={{ color: '#A67B3E', fontWeight: 'bold', fontSize: '14px' }}>{item.price_info || '未定價'}</div>
                  {item.max_orders > 0 && (
                    <div style={{ fontSize: '12px', color: '#7A7269', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ flex: 1, height: '6px', background: '#EAE6E1', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', background: isFull ? '#EF4444' : '#4E7A5A', width: `${Math.min(100, ((item.current_orders_count||0) / item.max_orders) * 100)}%` }} />
                      </div>
                      <span>{item.current_orders_count || 0} / {item.max_orders}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                    {Array.isArray(item.tags) && item.tags.slice(0, 3).map((tag, idx) => (
                      <span key={idx} style={{ padding: '2px 8px', background: '#F0ECE7', color: '#7A7269', borderRadius: '12px', fontSize: '12px' }}>#{tag}</span>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', borderTop: '1px solid #EAE6E1' }}>
                  <button onClick={() => openEditForm(item)} style={{ flex: 1, padding: '12px', background: '#FAFAFA', border: 'none', borderRight: '1px solid #EAE6E1', cursor: 'pointer', fontWeight: 'bold', color: '#5D4A3E' }}>編輯 / 設定表單</button>
                  <button onClick={() => item.id && handleDeleteItem(item.id.toString())} style={{ flex: 1, padding: '12px', background: '#FAFAFA', border: 'none', cursor: 'pointer', fontWeight: 'bold', color: '#A05C5C' }}>刪除</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}