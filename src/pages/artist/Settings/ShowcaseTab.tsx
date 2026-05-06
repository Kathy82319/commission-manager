// src/pages/artist/Settings/ShowcaseTab.tsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { ImageUploader } from '../../../components/ImageUploader';
import type { QuotaInfo } from '../Settings/types';
import DOMPurify from 'dompurify';

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

export interface FormFieldSchema {
  id: string;
  type: 'text' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'date';
  label: string;
  required: boolean;
  options?: string[]; 
}

interface ShowcaseItem {
  id?: string;
  title: string;
  cover_url: string;
  price_info: string;
  tags: string[]; 
  description: string;
  is_active: number;
  form_schema?: string;
  // 🌟 新增欄位
  allow_guest: number;
  max_orders: number;
  show_quota: number;
  tos_content: string;
  current_orders_count?: number; // 後端回傳目前的單量
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
  
  const [formFields, setFormFields] = useState<FormFieldSchema[]>([]);

  const [editingItem, setEditingItem] = useState<ShowcaseItem>({
    title: '', cover_url: '', price_info: '', tags: [], description: '', is_active: 1, form_schema: '[]',
    allow_guest: 0, max_orders: 0, show_quota: 1, tos_content: '', current_orders_count: 0
  });

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
            if (Array.isArray(item.tags)) parsedTags = item.tags;
            else if (typeof item.tags === 'string') {
              const p = JSON.parse(item.tags);
              parsedTags = Array.isArray(p) ? p : [];
            }
          } catch (e) { parsedTags = []; }
          
          return { 
            ...item, 
            tags: parsedTags,
            allow_guest: item.allow_guest || 0,
            max_orders: item.max_orders || 0,
            show_quota: item.show_quota ?? 1,
            tos_content: item.tos_content || '',
            current_orders_count: item.current_orders_count || 0
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

  const handleCoverUpload = async (resultBlobs: { preview: Blob }) => {
    if (isReadOnly) return; 
    setIsUploading(true);
    try {
      const fileType = resultBlobs.preview.type || 'image/jpeg';
      const fileExt = fileType.split('/')[1] || 'jpg';
      const ticketRes = await fetch(`${API_BASE}/api/r2/upload-url`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentType: fileType, bucketType: 'public', originalName: `cover.${fileExt}`, folder: 'showcase' }) 
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
    if (items.length >= limit) {
      onToast("已達此版本上限", "err");
      return;
    }
    setEditingItem({ 
      title: '', cover_url: '', price_info: '', tags: [], description: '', is_active: 1, form_schema: '[]',
      allow_guest: 0, max_orders: 0, show_quota: 1, tos_content: '', current_orders_count: 0 
    });
    setFormFields([]);
    setIsFormOpen(true);
  };

  const openEditForm = (item: ShowcaseItem) => {
    setEditingItem(item);
    try {
      setFormFields(item.form_schema ? JSON.parse(item.form_schema) : []);
    } catch (e) { setFormFields([]); }
    setIsFormOpen(true);
  };

  // 🌟 一鍵帶入全域協議書
  const handleImportGlobalTOS = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/users/me`, { credentials: 'include' });
      const data = await res.json();
      if (data.success && data.data?.profile_settings) {
        const settings = typeof data.data.profile_settings === 'string' ? JSON.parse(data.data.profile_settings) : data.data.profile_settings;
        const globalTOS = settings.rules || settings.terms_of_service || '';
        if (globalTOS) {
          setEditingItem(prev => ({ ...prev, tos_content: globalTOS }));
          onToast("✅ 已成功帶入全域協議書", "ok");
        } else {
          onToast("您尚未在「內容管理 > 協議書範本」中設定內容", "err");
        }
      }
    } catch (e) {
      onToast("帶入失敗，請檢查網路連線", "err");
    }
  };

  // 🌟 一鍵重置歷史訂單數
  const handleResetOrdersCount = async () => {
    if (!editingItem.id) return onToast("請先儲存項目後再重置", "err");
    if (!window.confirm("確定要重新計算接單數量嗎？(不影響筆記本中的既有訂單)")) return;
    try {
      await fetch(`${API_BASE}/api/showcase/${editingItem.id}/reset-orders`, { method: 'POST', credentials: 'include' });
      setEditingItem(prev => ({ ...prev, current_orders_count: 0 }));
      onToast("已重新計算接單數量", "ok");
      fetchItems();
    } catch (e) {
      onToast("重置失敗", "err");
    }
  };

  const handleSaveItem = async () => {
    if (!editingItem.id && items.length >= limit) {
      onToast("已達此版本上限", "err"); return;
    }
    if (!editingItem.title || !editingItem.cover_url) {
      onToast("請填寫品名並上傳封面圖", "err"); return;
    }
    if (formFields.some(f => !f.label.trim())) {
      onToast("客製化表單有未命名的問題，請檢查", "err"); return;
    }

    const url = editingItem.id ? `${API_BASE}/api/showcase/${editingItem.id}` : `${API_BASE}/api/showcase`;
    const method = editingItem.id ? 'PATCH' : 'POST';

    const payload = {
      ...editingItem,
      tags: JSON.stringify(editingItem.tags),
      form_schema: JSON.stringify(formFields)
    };

    try {
      const res = await fetch(url, {
        method, credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload) 
      });
      const data = await res.json();
      if (data.success) {
        onToast("項目儲存成功", "ok");
        setIsFormOpen(false);
        fetchItems();
      } else onToast(data.error || "儲存失敗", "err");
    } catch (error) { onToast("系統連線發生錯誤", "err"); }
  };

  const handleDeleteItem = async (id: string) => {
    if (!window.confirm("確定要刪除此項目嗎？刪除後無法恢復。")) return;
    try {
      const res = await fetch(`${API_BASE}/api/showcase/${id}`, { method: 'DELETE', credentials: 'include' });
      if ((await res.json()).success) { onToast("項目已刪除", "ok"); fetchItems(); }
    } catch (error) { onToast("刪除失敗", "err"); }
  };

  const addFormField = (type: FormFieldSchema['type']) => {
    if (formFields.length >= 15) return onToast("最多只能新增 15 個問題", "err");
    const newField: FormFieldSchema = {
      id: `field_${Date.now()}`, type, label: '', required: false,
      options: ['select', 'radio', 'checkbox'].includes(type) ? ['選項 1'] : undefined
    };
    setFormFields([...formFields, newField]);
  };

  const updateFormField = (id: string, updates: Partial<FormFieldSchema>) => {
    setFormFields(formFields.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const removeFormField = (id: string) => {
    setFormFields(formFields.filter(f => f.id !== id));
  };

  // 🌟 智能防呆：檢查是否有詢問聯絡方式
  const hasContactField = formFields.some(f => /聯絡|信箱|email|ig|line|社群|twitter|x/i.test(f.label));
  const showGuestWarning = editingItem.allow_guest === 1 && !hasContactField && formFields.length > 0;

  if (isFormOpen) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', flexDirection: 'column', backgroundColor: '#FDFDFB' }}>
        
        {/* Header */}
        <div style={{ padding: '16px 24px', background: '#FFFFFF', borderBottom: '1px solid #EAE6E1', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button onClick={() => setIsFormOpen(false)} style={{ background: 'none', border: 'none', color: '#A0978D', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer' }}>✕ 取消並返回</button>
            <h2 style={{ margin: 0, fontSize: '18px', color: '#5D4A3E', fontWeight: 'bold' }}>{editingItem.id ? '✏️ 編輯販售項目' : '✨ 新增販售項目'}</h2>
          </div>
          <button onClick={handleSaveItem} style={{ padding: '10px 24px', background: '#4E7A5A', color: '#FFF', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px', boxShadow: '0 2px 8px rgba(78, 122, 90, 0.2)' }}>
            儲存發布
          </button>
        </div>

        {/* Body (雙欄設計) */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          
          {/* 左側：編輯器 */}
          <div className="custom-scrollbar" style={{ flex: '1', overflowY: 'auto', padding: '30px 40px', background: '#FFFFFF', borderRight: '1px solid #EAE6E1' }}>
            <div style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
              
              {/* Block 1: 基本狀態 */}
              <div style={{ display: 'flex', gap: '20px' }}>
                <div style={{ flex: 1 }}>
                  <label className="form-label" style={{ fontWeight: 'bold', color: '#5D4A3E' }}>項目封面圖 (必填)</label>
                  <div style={{ backgroundColor: '#FBFBF9', padding: '12px', borderRadius: '12px', border: '1px dashed #DED9D3' }}>
                    {editingItem.cover_url && (
                      <img src={editingItem.cover_url} alt="Cover" style={{ width: '100%', height: '160px', objectFit: 'cover', borderRadius: '8px', marginBottom: '12px', border: '1px solid #EAE6E1' }} />
                    )}
                    <ImageUploader onUpload={handleCoverUpload} targetWidth={800} withWatermark={false} buttonText={isUploading ? "上傳中..." : (editingItem.cover_url ? "更換封面圖" : "上傳封面圖")} maxSizeMB={3} />
                  </div>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label className="form-label" style={{ fontWeight: 'bold', color: '#5D4A3E' }}>展示狀態</label>
                    <select className="form-input" value={editingItem.is_active} onChange={e => setEditingItem({...editingItem, is_active: Number(e.target.value)})}>
                      <option value={1}>🟢 公開顯示</option>
                      <option value={0}>🔴 隱藏下架</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label" style={{ fontWeight: 'bold', color: '#5D4A3E' }}>金額顯示</label>
                    <input className="form-input" value={editingItem.price_info} onChange={e => setEditingItem({...editingItem, price_info: e.target.value})} placeholder="例如：NT$ 1500 起" />
                  </div>
                </div>
              </div>

              {/* Block 2: 標題與標籤 */}
              <div>
                <label className="form-label" style={{ fontWeight: 'bold', color: '#5D4A3E' }}>品名標題 (必填)</label>
                <input className="form-input" style={{ fontSize: '16px', padding: '12px' }} value={editingItem.title} onChange={e => setEditingItem({...editingItem, title: e.target.value})} placeholder="例如：精緻半身立繪、遊戲UI設計..." />
                
                <label className="form-label" style={{ fontWeight: 'bold', color: '#5D4A3E', marginTop: '16px' }}>作品標籤 (最多 5 個)</label>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                  {editingItem.tags.map(tag => (
                    <span key={tag} style={{ padding: '6px 12px', background: '#F4F0EB', color: '#A67B3E', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      #{tag} <button onClick={() => handleRemoveTag(tag)} style={{ background: 'none', border: 'none', color: '#A05C5C', cursor: 'pointer', padding: 0 }}>✕</button>
                    </span>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input className="form-input" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())} placeholder="輸入標籤後按 Enter..." disabled={editingItem.tags.length >= 5} />
                  <button onClick={handleAddTag} disabled={editingItem.tags.length >= 5} style={{ padding: '0 20px', background: '#5D4A3E', color: '#FFF', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>新增</button>
                </div>
              </div>

              {/* Block 3: 接單額度控管 (飢餓行銷) */}
              <div style={{ background: '#FDFDFB', border: '1px solid #EAE6E1', borderRadius: '12px', padding: '20px' }}>
                <h4 style={{ margin: '0 0 16px 0', color: '#5D4A3E', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>🔥 接單額度控管 (飢餓行銷)</h4>
                <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <label className="form-label">設定接單上限</label>
                    <input type="number" min="0" className="form-input" value={editingItem.max_orders} onChange={e => setEditingItem({...editingItem, max_orders: Number(e.target.value)})} placeholder="填寫 0 代表無上限" />
                    <span style={{ fontSize: '11px', color: '#A0978D', marginTop: '4px', display: 'block' }}>達標後系統將自動隱藏委託按鈕。填 0 為無限。</span>
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginTop: '28px', fontSize: '13px', color: '#5D4A3E', fontWeight: 'bold' }}>
                      <input type="checkbox" checked={editingItem.show_quota === 1} onChange={e => setEditingItem({...editingItem, show_quota: e.target.checked ? 1 : 0})} disabled={editingItem.max_orders === 0} />
                      公開顯示剩餘名額進度
                    </label>
                  </div>
                </div>
                {editingItem.max_orders > 0 && (
                  <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px dashed #DED9D3', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', color: '#7A7269', fontWeight: 'bold' }}>目前有效單量：{editingItem.current_orders_count || 0} / {editingItem.max_orders}</span>
                    <button onClick={handleResetOrdersCount} style={{ background: '#F4F4F1', color: '#A05C5C', border: '1px solid #DED9D3', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' }}>
                      ↺ 重新計算收件數
                    </button>
                  </div>
                )}
              </div>

              {/* Block 4: 詳細介紹 */}
              <div>
                <label className="form-label" style={{ fontWeight: 'bold', color: '#5D4A3E' }}>品項詳細介紹 (支援圖片與排版)</label>
                <div className="custom-quill-wrapper" style={{ minHeight: '200px' }}>
                  <ReactQuill theme="snow" value={editingItem.description} onChange={v => setEditingItem({...editingItem, description: v})} modules={customQuillModules} />
                </div>
              </div>

              {/* Block 5: 專屬協議書 */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '8px' }}>
                  <label className="form-label" style={{ fontWeight: 'bold', color: '#5D4A3E', margin: 0 }}>📜 專屬委託協議書 (TOS)</label>
                  <button onClick={handleImportGlobalTOS} style={{ background: '#EBF2F7', color: '#4A7294', border: '1px solid #C1D6E8', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' }}>
                    ⬇️ 一鍵帶入預設範本
                  </button>
                </div>
                <span style={{ fontSize: '12px', color: '#A0978D', display: 'block', marginBottom: '12px' }}>若此品項有特殊的授權或退款規範，請填寫於此。委託人必須勾選同意才能送出。</span>
                <div className="custom-quill-wrapper" style={{ minHeight: '150px' }}>
                  <ReactQuill theme="snow" value={editingItem.tos_content} onChange={v => setEditingItem({...editingItem, tos_content: v})} modules={customQuillModules} />
                </div>
              </div>

              {/* Block 6: 表單建置器 & 訪客設定 */}
              <div style={{ background: '#FAFAFA', border: '1px solid #DED9D3', borderRadius: '12px', padding: '24px' }}>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h4 style={{ margin: 0, color: '#5D4A3E', fontSize: '16px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    📋 客製化表單建置器
                  </h4>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', background: '#FFF', padding: '6px 12px', border: '1px solid #EAE6E1', borderRadius: '20px', fontWeight: 'bold', color: '#4A7294' }}>
                    <input type="checkbox" checked={editingItem.allow_guest === 1} onChange={e => setEditingItem({...editingItem, allow_guest: e.target.checked ? 1 : 0})} />
                    開放訪客(免登入)填寫
                  </label>
                </div>

                {showGuestWarning && (
                  <div style={{ background: '#FEF9C3', color: '#B45309', padding: '12px', borderRadius: '8px', border: '1px solid #FEF08A', fontSize: '13px', marginBottom: '16px', display: 'flex', gap: '8px' }}>
                    <span>⚠️</span>
                    <span>您開啟了訪客委託，但表單中似乎沒有詢問「聯絡方式」，這可能會導致您收到單後無法聯繫上對方喔！</span>
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
                  {formFields.map((field, index) => (
                    <div key={field.id} style={{ background: '#FFF', border: '1px solid #EAE6E1', borderRadius: '8px', padding: '16px', position: 'relative', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                        <div style={{ background: '#F4F0EB', color: '#A0978D', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', marginTop: '6px' }}>Q{index+1}</div>
                        <div style={{ flex: 1 }}>
                          <input className="form-input" value={field.label} onChange={e => updateFormField(field.id, { label: e.target.value })} placeholder="輸入您的提問 (例如: 角色設定)" style={{ fontWeight: 'bold' }} />
                        </div>
                        <select className="form-input" value={field.type} onChange={e => updateFormField(field.id, { type: e.target.value as any })} style={{ width: '130px' }}>
                          <option value="text">簡答 (單行)</option>
                          <option value="textarea">詳答 (多行)</option>
                          <option value="radio">單選</option>
                          <option value="checkbox">多選</option>
                          <option value="select">下拉選單</option>
                          <option value="date">日期</option>
                        </select>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: '#5D4A3E', marginTop: '10px' }}>
                          <input type="checkbox" checked={field.required} onChange={e => updateFormField(field.id, { required: e.target.checked })} /> 必填
                        </label>
                        <button onClick={() => removeFormField(field.id)} style={{ background: 'none', border: 'none', color: '#A05C5C', cursor: 'pointer', padding: '8px', marginTop: '2px' }} title="刪除問題">🗑️</button>
                      </div>

                      {['radio', 'checkbox', 'select'].includes(field.type) && (
                        <div style={{ marginTop: '12px', paddingLeft: '44px' }}>
                          <input 
                            className="form-input" 
                            style={{ background: '#FAFAFA' }}
                            value={field.options?.join(', ') || ''} 
                            onChange={e => updateFormField(field.id, { options: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} 
                            placeholder="設定選項 (用半形逗號 , 分隔) 例如：選項A, 選項B" 
                          />
                        </div>
                      )}
                    </div>
                  ))}

                  {formFields.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '32px', background: '#FFF', borderRadius: '8px', color: '#A0978D', fontSize: '14px', border: '1px dashed #DED9D3' }}>
                      尚未設定專屬表單，委託人將只需填寫基本聯絡資訊。<br/>點擊下方按鈕開始加入客製化問題。
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                  <button onClick={() => addFormField('text')} style={{ padding: '8px 16px', background: '#FFF', border: '1px solid #DED9D3', borderRadius: '20px', fontSize: '13px', cursor: 'pointer', color: '#5D4A3E', fontWeight: 'bold' }}>+ 簡答題</button>
                  <button onClick={() => addFormField('textarea')} style={{ padding: '8px 16px', background: '#FFF', border: '1px solid #DED9D3', borderRadius: '20px', fontSize: '13px', cursor: 'pointer', color: '#5D4A3E', fontWeight: 'bold' }}>+ 詳答題</button>
                  <button onClick={() => addFormField('radio')} style={{ padding: '8px 16px', background: '#FFF', border: '1px solid #DED9D3', borderRadius: '20px', fontSize: '13px', cursor: 'pointer', color: '#5D4A3E', fontWeight: 'bold' }}>+ 單選題</button>
                  <button onClick={() => addFormField('checkbox')} style={{ padding: '8px 16px', background: '#FFF', border: '1px solid #DED9D3', borderRadius: '20px', fontSize: '13px', cursor: 'pointer', color: '#5D4A3E', fontWeight: 'bold' }}>+ 多選題</button>
                </div>
              </div>
              
            </div>
          </div>

          {/* 右側：即時預覽 (Live Preview) */}
          <div className="custom-scrollbar" style={{ flex: '1', background: '#F4F0EB', padding: '40px', overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ width: '100%', maxWidth: '450px', background: '#FFF', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', border: '1px solid #EAE6E1' }}>
              
              {/* Preview Header */}
              <div style={{ background: '#5D4A3E', color: '#FFF', padding: '12px', textAlign: 'center', fontSize: '13px', fontWeight: 'bold' }}>
                👁️ 委託人視角預覽
              </div>

              {/* Preview Content */}
              <div style={{ padding: '24px' }}>
                {editingItem.cover_url ? (
                  <img src={editingItem.cover_url} alt="Cover" style={{ width: '100%', height: '180px', objectFit: 'cover', borderRadius: '8px', marginBottom: '16px' }} />
                ) : (
                  <div style={{ width: '100%', height: '180px', background: '#F4F4F1', borderRadius: '8px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#A0978D' }}>尚未上傳封面</div>
                )}
                
                <h2 style={{ margin: '0 0 8px 0', color: '#333', fontSize: '22px', fontWeight: 'bold' }}>{editingItem.title || '未命名項目'}</h2>
                <div style={{ color: '#A67B3E', fontWeight: 'bold', fontSize: '16px', marginBottom: '16px' }}>{editingItem.price_info || '價格未定'}</div>
                
                {editingItem.max_orders > 0 && editingItem.show_quota === 1 && (
                  <div style={{ background: '#FEF2F2', color: '#EF4444', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', display: 'inline-block', marginBottom: '16px' }}>
                    🔥 限量接單：目前剩餘 {editingItem.max_orders - (editingItem.current_orders_count || 0)} 個名額
                  </div>
                )}

                {editingItem.allow_guest === 1 && formFields.length > 0 && (
                  <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '12px', color: '#64748B' }}>
                    💡 <strong>您目前為訪客身分</strong><br/>填寫表單後，繪師將透過您留下的聯絡方式與您聯繫。若註冊帳號可解鎖完整進度追蹤功能。
                  </div>
                )}

                <div style={{ borderTop: '1px solid #EAE6E1', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {formFields.map((field, idx) => (
                    <div key={idx}>
                      <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#5D4A3E', marginBottom: '8px' }}>
                        {field.label || `未命名問題 ${idx+1}`} {field.required && <span style={{ color: '#E11D48' }}>*</span>}
                      </div>
                      {field.type === 'text' && <input className="form-input" disabled placeholder="單行文字輸入..." />}
                      {field.type === 'textarea' && <textarea className="form-input" disabled placeholder="多行文字輸入..." rows={3} />}
                      {field.type === 'select' && <select className="form-input" disabled><option>選擇選項...</option></select>}
                      {['radio', 'checkbox'].includes(field.type) && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {(field.options?.length ? field.options : ['選項預覽']).map((opt, i) => (
                            <label key={i} style={{ fontSize: '13px', color: '#7A7269', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <input type={field.type} disabled /> {opt}
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                  {formFields.length === 0 && (
                    <div style={{ color: '#A0978D', fontSize: '13px', textAlign: 'center', fontStyle: 'italic', padding: '20px 0' }}>無自訂表單，純作品展示</div>
                  )}
                </div>

                {editingItem.tos_content && (
                  <div style={{ marginTop: '24px', borderTop: '1px solid #EAE6E1', paddingTop: '20px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#5D4A3E', marginBottom: '8px' }}>📜 委託協議書</div>
                    <div style={{ height: '80px', overflow: 'hidden', background: '#FAFAFA', border: '1px solid #EAE6E1', borderRadius: '6px', padding: '8px', fontSize: '12px', color: '#A0978D', position: 'relative' }}>
                      <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(editingItem.tos_content) }} />
                      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '40px', background: 'linear-gradient(transparent, #FAFAFA)' }} />
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#5D4A3E', marginTop: '8px', fontWeight: 'bold' }}>
                      <input type="checkbox" disabled /> 我已閱讀並同意上述協議
                    </label>
                  </div>
                )}

                {formFields.length > 0 && (
                  <button disabled style={{ width: '100%', padding: '12px', background: '#5D4A3E', color: '#FFF', border: 'none', borderRadius: '8px', fontWeight: 'bold', marginTop: '24px', opacity: 0.7 }}>
                    正式送出委託申請
                  </button>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    );
  }

  // 列表頁面
  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {!isFormOpen && (
        <div style={{ padding: '16px', background: '#FDF4E6', border: '1px solid #F5E6D3', borderRadius: '12px', color: '#A67B3E', fontSize: '14px', fontWeight: 'bold' }}>
          {quotaInfo?.plan_type === 'free' 
            ? `📢 目前您的方案僅公開前 6 項項目。 (目前數量: ${items.length} / 配額: ${limit})`
            : `📢 您的項目將在個人分頁完整公開展示。 (目前數量: ${items.length} / 配額: ${limit})`
          }
        </div>
      )}

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
          {items.map((item, index) => {
            const isFull = item.max_orders > 0 && (item.current_orders_count || 0) >= item.max_orders;

            return (
              <div key={item.id} style={{ border: '1px solid #EAE6E1', borderRadius: '12px', overflow: 'hidden', background: '#FFF', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                
                {/* 左上角公開狀態 */}
                {(quotaInfo?.plan_type === 'free' ? index < 6 : index < limit) && (
                  <div style={{ position: 'absolute', top: '10px', left: '10px', background: '#4E7A5A', color: '#FFF', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold', zIndex: 2 }}>
                    公開展示中
                  </div>
                )}

                {/* 右上角滿單狀態 */}
                {isFull && (
                  <div style={{ position: 'absolute', top: '10px', right: '10px', background: '#EF4444', color: '#FFF', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold', zIndex: 2, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    🛑 已滿單
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