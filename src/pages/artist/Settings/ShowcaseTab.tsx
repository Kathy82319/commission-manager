import { useState, useEffect, useCallback, useMemo } from 'react';
import type { QuotaInfo } from '../Settings/types';
import { ShowcaseFormBuilder, type ShowcaseItem } from '../../../components/ShowcaseFormBuilder';

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

  const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

  const limit = useMemo(() => {
    if (quotaInfo?.plan_type === 'pro') return 30;
    if (quotaInfo?.plan_type === 'trial') return 20;
    return 6; 
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
          return { ...item, tags: parsedTags };
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
      title: '', cover_url: '', price_info: '', tags: [], description: '', is_active: 1, form_schema: '[]',
      allow_guest: 0, max_orders: 0, show_quota: 1, tos_content: '', current_orders_count: 0 
    });
    setIsFormOpen(true);
  };

  const openEditForm = (item: ShowcaseItem) => {
    setEditingItem(item);
    setIsFormOpen(true);
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

  // 🌟 如果正在開啟表單，直接渲染獨立抽離的建置器元件
  if (isFormOpen && editingItem) {
    return (
      <ShowcaseFormBuilder
        initialItem={editingItem}
        onClose={() => setIsFormOpen(false)}
        onSaveSuccess={() => { setIsFormOpen(false); fetchItems(); }}
        onRefreshList={fetchItems}
        onToast={onToast}
        apiBase={API_BASE}
        isReadOnly={isReadOnly}
      />
    );
  }

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ padding: '16px', background: '#FDF4E6', border: '1px solid #F5E6D3', borderRadius: '12px', color: '#A67B3E', fontSize: '14px', fontWeight: 'bold' }}>
        {quotaInfo?.plan_type === 'free' 
          ? `📢 目前您的方案僅公開前 6 項項目。 (目前數量: ${items.length} / 配額: ${limit})`
          : `📢 您的項目將在個人分頁完整公開展示。 (目前數量: ${items.length} / 配額: ${limit})`
        }
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>
          販售區管理 
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
          {items.map((item, index) => (
            <div key={item.id} style={{ border: '1px solid #EAE6E1', borderRadius: '12px', overflow: 'hidden', background: '#FFF', display: 'flex', flexDirection: 'column', position: 'relative' }}>
              {(quotaInfo?.plan_type === 'free' ? index < 6 : index < limit) && (
                <div style={{ position: 'absolute', top: '10px', right: '10px', background: '#4E7A5A', color: '#FFF', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold', zIndex: 2 }}>
                  公開展示中
                </div>
              )}

              <div style={{ height: '180px', background: '#F4F0EB', position: 'relative' }}>
                <img src={item.cover_url} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                {!item.is_active && (
                  <div style={{ position: 'absolute', top: '0', left: '0', right: '0', bottom: '0', background: 'rgba(0,0,0,0.4)', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold' }}>已手動隱藏</div>
                )}
              </div>
              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#333' }}>{item.title}</div>
                <div style={{ color: '#A67B3E', fontWeight: 'bold', fontSize: '14px' }}>{item.price_info || '未定價'}</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                  {Array.isArray(item.tags) && item.tags.slice(0, 3).map((tag, idx) => (
                    <span key={idx} style={{ padding: '2px 8px', background: '#F0ECE7', color: '#7A7269', borderRadius: '12px', fontSize: '12px' }}>#{tag}</span>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', borderTop: '1px solid #EAE6E1' }}>
                <button onClick={() => openEditForm(item)} style={{ flex: 1, padding: '12px', background: 'none', border: 'none', borderRight: '1px solid #EAE6E1', cursor: 'pointer', fontWeight: 'bold', color: '#5D4A3E' }}>編輯</button>
                <button onClick={() => item.id && handleDeleteItem(item.id.toString())} style={{ flex: 1, padding: '12px', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold', color: '#A05C5C' }}>刪除</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}