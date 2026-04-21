import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { QuotaInfo } from './types';

interface ShowcaseItem {
  id?: number;
  title: string;
  cover_url: string;
  price_info: string;
  tags: string[];
  description: string;
  is_active: number;
}

interface ShowcaseTabProps {
  onToggleGlobalSave: (hide: boolean) => void;
  onToast: (msg: string, type: 'ok' | 'err') => void;
  quotaInfo: QuotaInfo | null;
}

export function ShowcaseTab({ onToggleGlobalSave, onToast, quotaInfo }: ShowcaseTabProps) {
  const [items, setItems] = useState<ShowcaseItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ShowcaseItem | null>(null);
  
  const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

  // 1. 計算上限
  const limit = useMemo(() => {
    if (quotaInfo?.plan_type === 'pro') return 30;
    if (quotaInfo?.plan_type === 'trial') return 10;
    return 0; 
  }, [quotaInfo]);

  // 2. 取得列表資料 (增加健壯的 JSON 解析邏輯)
  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/showcase`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        // 資安與資料清洗：確保 tags 絕對是陣列，防止後端回傳格式異常導致崩潰
        const safeItems = (data.data || []).map((item: any) => {
          let parsedTags: string[] = [];
          try {
            if (Array.isArray(item.tags)) {
              parsedTags = item.tags;
            } else if (typeof item.tags === 'string') {
              // 嘗試解析 JSON 字串
              const p = JSON.parse(item.tags);
              parsedTags = Array.isArray(p) ? p : [];
            }
          } catch (e) {
            console.error("解析標籤失敗", item.tags);
            parsedTags = [];
          }
          return { ...item, tags: parsedTags };
        });
        setItems(safeItems);
      }
    } catch (error) {
      onToast('讀取資料失敗', 'err');
    } finally {
      setIsLoading(false);
    }
  }, [API_BASE, onToast]);

  // 3. 全域按鈕連動
  useEffect(() => {
    onToggleGlobalSave(isFormOpen);
    return () => onToggleGlobalSave(false);
  }, [isFormOpen, onToggleGlobalSave]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const openNewForm = () => {
    if (items.length >= limit) {
      onToast(`已達到目前方案的展示上限 (${limit} 個)，請升級專業版以解鎖更多。`, 'err');
      return;
    }
    setEditingItem({ 
      title: '', 
      cover_url: '', 
      price_info: '', 
      tags: [], 
      description: '', 
      is_active: 1 
    });
    setIsFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    const method = editingItem.id ? 'PATCH' : 'POST';
    const url = editingItem.id 
      ? `${API_BASE}/api/showcase/${editingItem.id}` 
      : `${API_BASE}/api/showcase`;

    try {
      const res = await fetch(url, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingItem)
      });
      const data = await res.json();
      if (data.success) {
        onToast(editingItem.id ? '項目更新成功' : '項目新增成功', 'ok');
        setIsFormOpen(false);
        fetchItems();
      } else {
        onToast(data.error || '儲存失敗', 'err');
      }
    } catch (error) {
      onToast('系統發生錯誤', 'err');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('確定要刪除此項目嗎？')) return;
    try {
      const res = await fetch(`${API_BASE}/api/showcase/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        onToast('項目已刪除', 'ok');
        fetchItems();
      }
    } catch (error) {
      onToast('刪除失敗', 'err');
    }
  };

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>
          徵稿/販售區管理 
          <span style={{ fontSize: '13px', color: '#A0978D', marginLeft: '12px', fontWeight: 'normal' }}>
            ({items.length} / {limit})
          </span>
        </h3>
        <button 
          onClick={openNewForm} 
          style={{ 
            padding: '10px 20px', 
            background: items.length >= limit ? '#C4BDB5' : '#5D4A3E',
            color: '#FFF', 
            border: 'none', 
            borderRadius: '8px', 
            cursor: items.length >= limit ? 'not-allowed' : 'pointer', 
            fontWeight: 'bold' 
          }}
          disabled={items.length >= limit}
        >
          + 新增項目
        </button>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#A0978D' }}>載入中...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
          {items.map(item => (
            <div key={item.id} style={{ border: '1px solid #EAE6E1', borderRadius: '12px', overflow: 'hidden', backgroundColor: '#FFF', display: 'flex', flexDirection: 'column' }}>
              <div style={{ height: '160px', backgroundColor: '#F4F0EB', backgroundImage: `url(${item.cover_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
              <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <h4 style={{ margin: '0', fontSize: '16px' }}>{item.title}</h4>
                <p style={{ color: '#A67B3E', fontWeight: 'bold', margin: '0' }}>{item.price_info || '未定價'}</p>
                
                {/* 修復點：增加 Array.isArray 檢查，確保不崩潰 */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: 'auto', paddingTop: '8px' }}>
                  {Array.isArray(item.tags) && item.tags.slice(0, 3).map((tag, idx) => (
                    <span key={idx} style={{ padding: '2px 8px', background: '#F0ECE7', color: '#7A7269', borderRadius: '12px', fontSize: '12px' }}>#{tag}</span>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <button 
                    onClick={() => { setEditingItem(item); setIsFormOpen(true); }}
                    style={{ flex: 1, padding: '8px', border: '1px solid #5D4A3E', background: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', color: '#5D4A3E' }}
                  >
                    編輯
                  </button>
                  <button 
                    onClick={() => item.id && handleDelete(item.id)}
                    style={{ padding: '8px', border: '1px solid #A05C5C', color: '#A05C5C', background: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    刪除
                  </button>
                </div>
              </div>
            </div>
          ))}
          {items.length === 0 && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px', color: '#A0978D', backgroundColor: '#FBFBF9', borderRadius: '12px', border: '2px dashed #EAE6E1' }}>
              目前尚無項目，點擊右上方按鈕新增。
            </div>
          )}
        </div>
      )}

      {/* 表單 Modal */}
      {isFormOpen && editingItem && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#FFF', padding: '32px', borderRadius: '16px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h4 style={{ marginTop: 0 }}>{editingItem.id ? '編輯 徵稿/販售項目' : '新增 徵稿/販售項目'}</h4>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>項目名稱</label>
                <input 
                  type="text" 
                  value={editingItem.title} 
                  onChange={e => setEditingItem({...editingItem, title: e.target.value})}
                  required 
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #EAE6E1', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>封面圖片網址</label>
                <input 
                  type="text" 
                  value={editingItem.cover_url} 
                  onChange={e => setEditingItem({...editingItem, cover_url: e.target.value})}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #EAE6E1', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>價格資訊 (例如: NT. 500 起)</label>
                <input 
                  type="text" 
                  value={editingItem.price_info} 
                  onChange={e => setEditingItem({...editingItem, price_info: e.target.value})}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #EAE6E1', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>項目介紹</label>
                <textarea 
                  value={editingItem.description} 
                  onChange={e => setEditingItem({...editingItem, description: e.target.value})}
                  rows={4}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #EAE6E1', resize: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button type="button" onClick={() => setIsFormOpen(false)} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #EAE6E1', background: 'none', cursor: 'pointer' }}>取消</button>
                <button type="submit" style={{ flex: 1, padding: '12px', borderRadius: '8px', border: 'none', background: '#5D4A3E', color: '#FFF', fontWeight: 'bold', cursor: 'pointer' }}>儲存項目資料</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}