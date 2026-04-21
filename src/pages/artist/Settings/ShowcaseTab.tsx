import { useState, useEffect, useCallback, useMemo } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { ImageUploader } from '../../../components/ImageUploader';
import type { QuotaInfo } from '../Settings/types';

const customQuillModules = {
  toolbar: [
    [{ 'header': [1, 2, 3, false] }], 
    [{ 'size': ['small', false, 'large', 'huge'] }], 
    ['bold', 'italic', 'underline', 'strike', 'blockquote'], 
    [{ 'color': [] }, { 'background': [] }], 
    [{ 'list': 'ordered'}, { 'list': 'bullet' }, { 'align': [] }], 
    ['link', 'clean'] 
  ]
};

interface ShowcaseItem {
  id?: string;
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
  isReadOnly?: boolean; 
}

export function ShowcaseTab({ onToggleGlobalSave, onToast, quotaInfo, isReadOnly }: ShowcaseTabProps) {
  const [items, setItems] = useState<ShowcaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [tagInput, setTagInput] = useState('');
  
  const [editingItem, setEditingItem] = useState<ShowcaseItem>({
    title: '', cover_url: '', price_info: '', tags: [], description: '', is_active: 1
  });

  const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

  const limit = useMemo(() => {
    if (quotaInfo?.plan_type === 'pro') return 30;
    if (quotaInfo?.plan_type === 'trial') return 10;
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

  const handleCoverUpload = async (resultBlobs: { preview: Blob }) => {
    if (isReadOnly) return; 
    setIsUploading(true);
    try {
      const fileType = resultBlobs.preview.type || 'image/jpeg';
      const ticketRes = await fetch(`${API_BASE}/api/r2/upload-url`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentType: fileType, bucketType: 'public', originalName: 'cover.jpg', folder: 'showcase' }) 
      });
      const ticketData = await ticketRes.json();
      if (!ticketData.success) throw new Error(ticketData.error || "無法取得通行證");
      
      const uploadRes = await fetch(ticketData.uploadUrl, { method: 'PUT', body: resultBlobs.preview, headers: { 'Content-Type': fileType } });
      if (!uploadRes.ok) throw new Error("上傳遭拒絕");

      const finalUrl = `https://pub-1d4bcc7f19324c0d95d7bfdfeb1a69e2.r2.dev/${ticketData.fileName}`;
      setEditingItem(prev => ({ ...prev, cover_url: finalUrl }));
    } catch (err: any) {
      onToast(err.message || "封面圖上傳失敗", "err");
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddTag = () => {
    const trimmed = tagInput.trim();
    if (!trimmed) return;
    if (editingItem.tags.includes(trimmed)) { onToast("此標籤已存在", "err"); return; }
    if (editingItem.tags.length >= 5) { onToast("最多只能設定 5 個標籤", "err"); return; }
    setEditingItem(prev => ({ ...prev, tags: [...prev.tags, trimmed] }));
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setEditingItem(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tagToRemove) }));
  };

  const openNewForm = () => {
    if (isReadOnly) {
      onToast("免費版無法新增項目，請升級專業版以解除限制。", "err");
      return;
    }
    if (items.length >= limit) {
      onToast(`已達到當前方案的展示上限 (${limit} 個)`, "err");
      return;
    }
    setEditingItem({ title: '', cover_url: '', price_info: '', tags: [], description: '', is_active: 1 });
    setIsFormOpen(true);
  };

  const openEditForm = (item: ShowcaseItem) => {
    if (isReadOnly) {
      onToast("免費版無法編輯現有項目。", "err");
      return;
    }
    setEditingItem(item);
    setIsFormOpen(true);
  };

  const handleSaveItem = async () => {
    if (isReadOnly) {
      onToast("目前為唯讀模式，無法儲存變更。", "err");
      return;
    }
    if (!editingItem.title || !editingItem.cover_url) {
      onToast("請填寫品名並上傳封面圖", "err");
      return;
    }

    const url = editingItem.id ? `${API_BASE}/api/showcase/${editingItem.id}` : `${API_BASE}/api/showcase`;
    const method = editingItem.id ? 'PATCH' : 'POST';

    try {
      const res = await fetch(url, {
        method, credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingItem)
      });
      const data = await res.json();
      if (data.success) {
        onToast("項目儲存成功", "ok");
        setIsFormOpen(false);
        fetchItems();
      } else {
        onToast("儲存失敗: " + data.error, "err");
      }
    } catch (error) {
      onToast("系統連線發生錯誤", "err");
    }
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

  if (isFormOpen) {
    return (
      <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #EAE6E1', paddingBottom: '16px' }}>
          <h3 style={{ margin: 0 }}>{editingItem.id ? '編輯項目' : '新增 徵稿/販售項目'}</h3>
          <button onClick={() => setIsFormOpen(false)} style={{ padding: '8px 16px', background: '#FAFAFA', border: '1px solid #DED9D3', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>返回列表</button>
        </div>

        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label className="form-label">項目封面圖 (必填)</label>
              <div style={{ backgroundColor: '#FAFAFA', padding: '16px', borderRadius: '12px', border: '1px dashed #DED9D3' }}>
                {editingItem.cover_url && (
                  <div style={{ marginBottom: '16px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #EAE6E1' }}>
                    <img src={editingItem.cover_url} alt="Cover" style={{ width: '100%', display: 'block' }} />
                  </div>
                )}
                {!isReadOnly && (
                  <ImageUploader onUpload={handleCoverUpload} targetWidth={800} withWatermark={false} buttonText={isUploading ? "上傳中..." : (editingItem.cover_url ? "更換封面圖" : "上傳封面圖")} maxSizeMB={3} />
                )}
              </div>
            </div>

            <div>
              <label className="form-label">展示狀態</label>
              <select className="form-input" value={editingItem.is_active} onChange={e => setEditingItem({...editingItem, is_active: Number(e.target.value)})}>
                <option value={1}>🟢 公開顯示</option>
                <option value={0}>🔴 隱藏下架</option>
              </select>
            </div>
          </div>

          <div style={{ flex: '2 1 400px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ flex: 2 }}>
                <label className="form-label">品名標題 (必填)</label>
                <input className="form-input" value={editingItem.title} onChange={e => setEditingItem({...editingItem, title: e.target.value})} placeholder="例如：精緻半身立繪" />
              </div>
              <div style={{ flex: 1 }}>
                <label className="form-label">金額顯示</label>
                <input className="form-input" value={editingItem.price_info} onChange={e => setEditingItem({...editingItem, price_info: e.target.value})} placeholder="例如：NT$ 1500 起" />
              </div>
            </div>

            <div>
              <label className="form-label">作品標籤 (最多 5 個)</label>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                {editingItem.tags.map(tag => (
                  <span key={tag} style={{ padding: '6px 12px', background: '#E8F3EB', color: '#4E7A5A', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    #{tag}
                    <button onClick={() => handleRemoveTag(tag)} style={{ background: 'none', border: 'none', color: '#A05C5C', cursor: 'pointer', padding: 0, fontSize: '14px', lineHeight: 1 }}>×</button>
                  </span>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input className="form-input" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())} placeholder="輸入標籤..." disabled={editingItem.tags.length >= 5} />
                <button onClick={handleAddTag} disabled={editingItem.tags.length >= 5} style={{ padding: '0 20px', background: '#5D4A3E', color: '#FFF', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', whiteSpace: 'nowrap' }}>新增</button>
              </div>
            </div>

            <div>
              <label className="form-label">詳細內容介紹</label>
              <div className="custom-quill-wrapper" style={{ minHeight: '300px' }}>
                <ReactQuill theme="snow" value={editingItem.description} onChange={v => setEditingItem({...editingItem, description: v})} modules={customQuillModules} />
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '24px', borderTop: '1px solid #EAE6E1' }}>
          <button onClick={handleSaveItem} style={{ padding: '12px 32px', background: '#4E7A5A', color: '#FFF', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px' }}>
            儲存項目資料
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>
          徵稿/販售區管理 
          <span style={{ fontSize: '13px', color: '#A0978D', marginLeft: '12px', fontWeight: 'normal' }}>
            ({items.length} / {limit})
          </span>
        </h3>
        {/* 唯讀模式下隱藏新增按鈕 */}
        {!isReadOnly && (
          <button onClick={openNewForm} style={{ padding: '10px 20px', background: items.length >= limit ? '#C4BDB5' : '#5D4A3E', color: '#FFF', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
            + 新增項目
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#A0978D' }}>載入中...</div>
      ) : items.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', background: '#FAFAFA', border: '2px dashed #DED9D3', borderRadius: '12px', color: '#7A7269' }}>
          目前尚未新增任何項目。
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
          {items.map(item => (
            <div key={item.id} style={{ border: '1px solid #EAE6E1', borderRadius: '12px', overflow: 'hidden', background: '#FFF', display: 'flex', flexDirection: 'column' }}>
              <div style={{ height: '180px', background: '#F4F0EB', position: 'relative' }}>
                <img src={item.cover_url} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                {!item.is_active && (
                  <div style={{ position: 'absolute', top: '8px', left: '8px', background: 'rgba(0,0,0,0.6)', color: '#FFF', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>已隱藏</div>
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
                {/* 唯讀模式下隱藏編輯按鈕，僅保留刪除 */}
                {!isReadOnly && (
                  <button onClick={() => openEditForm(item)} style={{ flex: 1, padding: '12px', background: 'none', border: 'none', borderRight: '1px solid #EAE6E1', cursor: 'pointer', fontWeight: 'bold', color: '#5D4A3E', transition: 'background 0.2s' }}>編輯</button>
                )}
                <button onClick={() => item.id && handleDeleteItem(item.id.toString())} style={{ flex: 1, padding: '12px', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold', color: '#A05C5C', transition: 'background 0.2s' }}>刪除</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}