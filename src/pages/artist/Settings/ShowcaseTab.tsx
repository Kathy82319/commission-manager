// src/pages/artist/Settings/ShowcaseTab.tsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import type { QuotaInfo } from '../Settings/types';
import { ShowcaseFormBuilder, type ShowcaseItem } from '../../../components/ShowcaseFormBuilder';
import { Plus, X, Image as ImageIcon } from 'lucide-react';

interface ShowcaseTabProps {
  onToggleGlobalSave: (hide: boolean) => void;
  onToast: (msg: string, type: 'ok' | 'err') => void;
  quotaInfo: QuotaInfo | null;
  isReadOnly?: boolean; 
}

export function ShowcaseTab({ onToggleGlobalSave, onToast, quotaInfo, isReadOnly }: ShowcaseTabProps) {
  const [items, setItems] = useState<ShowcaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ShowcaseItem | null>(null);

  // 用於作品集挑選器的狀態
  const [showPortfolioPicker, setShowPortfolioPicker] = useState(false);

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
          // 1. 處理標籤
          let parsedTags: string[] = [];
          try {
            if (Array.isArray(item.tags)) {
              parsedTags = item.tags;
            } else if (typeof item.tags === 'string') {
              const p = JSON.parse(item.tags);
              parsedTags = Array.isArray(p) ? p : [];
            }
          } catch (e) { parsedTags = []; }

          // 2. 處理做法 A 的多圖解析邏輯 (相容舊有 cover_url 欄位)
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
            // 確保組件內有 images 陣列可用，若無則拿第一張回填 cover_url 供後端參考
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
    if (items.length >= limit) {
      onToast("已達此版本上限", "err");
      return;
    }
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
      if (data.success) {
        onToast("項目已刪除", "ok");
        fetchItems();
      }
    } catch (error) {
      onToast("刪除失敗", "err");
    }
  };

  // 處理從現有作品集勾選/取消圖片的邏輯 (上限 5 張)
  const togglePortfolioImage = (imagePath: string) => {
    if (!imagePath || !editingItem) return;
    const currentImages = editingItem.images || [];
    const exists = currentImages.includes(imagePath);

    let nextImages = [...currentImages];
    if (exists) {
      nextImages = nextImages.filter(img => img !== imagePath);
    } else {
      if (currentImages.length >= 5) {
        onToast("最多只能選取 5 張圖片", "err");
        return;
      }
      nextImages.push(imagePath);
    }

    setEditingItem({
      ...editingItem,
      images: nextImages,
      cover_url: nextImages[0] || '' // 將第一張作為預設主封面
    });
  };

  if (isFormOpen && editingItem) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* 由 ShowcaseTab 掌控的作品集挑選區 (仿 OfferModal 邏輯) */}
        <div style={{ background: '#FFF', border: '1px solid #EAE6E1', borderRadius: '12px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontWeight: 'bold', color: '#5D4A3E' }}>
              作品範例 / 價目表挑選器 (目前已選 {editingItem.images?.length || 0} / 5 張)
            </span>
            <button 
              type="button" 
              onClick={() => setShowPortfolioPicker(!showPortfolioPicker)} 
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: '#F4F0EB', border: 'none', borderRadius: '6px', cursor: 'pointer', color: '#5D4A3E', fontSize: '13px', fontWeight: 'bold' }}
            >
              <ImageIcon size={14} /> {showPortfolioPicker ? "隱藏現有項目集" : "從現有項目集挑選"}
            </button>
          </div>

          {showPortfolioPicker && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '12px', background: '#FAFAFA', padding: '12px', borderRadius: '8px', marginBottom: '16px', border: '1px dashed #DED9D3' }}>
              {items.filter(item => item && item.id !== editingItem.id && item.cover_url).map(item => {
                const isSelected = editingItem.images?.includes(item.cover_url);
                return (
                  <div 
                    key={item.id} 
                    onClick={() => togglePortfolioImage(item.cover_url)}
                    style={{ position: 'relative', width: '100px', height: '100px', borderRadius: '8px', overflow: 'hidden', cursor: 'pointer', border: isSelected ? '3px solid #5D4A3E' : '1px solid #EAE6E1' }}
                  >
                    <img src={item.cover_url} alt="portfolio" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    {isSelected && (
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(93, 74, 62, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF' }}>
                        <Plus size={20} />
                      </div>
                    )}
                  </div>
                );
              })}
              {items.filter(item => item && item.id !== editingItem.id && item.cover_url).length === 0 && (
                <div style={{ gridColumn: '1/-1', textAlign: 'center', color: '#A0978D', fontSize: '13px', padding: '10px' }}>無其他項目封面可供挑選</div>
              )}
            </div>
          )}

          {/* 已選取的圖片預覽與刪除排序欄 */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {(editingItem.images || []).map((url, idx) => (
              <div key={idx} style={{ position: 'relative', width: '90px', height: '90px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #EAE6E1' }}>
                <img src={url} alt="預覽" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button 
                  type="button" 
                  onClick={() => togglePortfolioImage(url)}
                  style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.6)', color: '#FFF', border: 'none', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                  <X size={12}/>
                </button>
                {idx === 0 && (
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: '#5D4A3E', color: '#FFF', fontSize: '10px', textAlign: 'center', padding: '2px 0' }}>主封面</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 呼叫原本的 FormBuilder，並把更新後的儲存狀態對接進去 */}
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
          style={{ 
            padding: '10px 20px', 
            background: items.length >= limit ? '#C4BDB5' : '#5D4A3E', 
            color: '#FFF', 
            border: 'none', 
            borderRadius: '8px', 
            cursor: items.length >= limit ? 'not-allowed' : 'pointer', 
            fontWeight: 'bold' 
          }}
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
                  <div style={{ position: 'absolute', top: '10px', left: '10px', background: '#4E7A5A', color: '#FFF', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold', zIndex: 2 }}>
                    公開展示中
                  </div>
                )}

                {isFull && (
                  <div style={{ position: 'absolute', top: '10px', right: '10px', background: '#EF4444', color: '#FFF', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold', zIndex: 2, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    🛑 已滿單
                  </div>
                )}

                {/* 右下角或右上角顯示多圖徽章 */}
                {imgCount > 1 && (
                  <div style={{ position: 'absolute', bottom: '130px', right: '10px', background: 'rgba(0,0,0,0.6)', color: '#FFF', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', zIndex: 2 }}>
                    1 / {imgCount} 張
                  </div>
                )}

                <div style={{ height: '180px', background: '#F4F0EB', position: 'relative' }}>
                  <img src={item.cover_url} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: isFull ? 0.7 : 1 }} />
                  {!item.is_active && (
                    <div style={{ position: 'absolute', top: '0', left: '0', right: '0', bottom: '0', background: 'rgba(0,0,0,0.4)', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold', zIndex: 1 }}>已手動隱藏</div>
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