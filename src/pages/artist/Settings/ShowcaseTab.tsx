// src/pages/artist/Settings/ShowcaseTab.tsx
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

// 🌟 新增：表單欄位的型別定義
export interface FormFieldSchema {
  id: string;
  type: 'text' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'date';
  label: string;
  required: boolean;
  options?: string[]; // 供單選、下拉、多選使用的選項
}

interface ShowcaseItem {
  id?: string;
  title: string;
  cover_url: string;
  price_info: string;
  tags: string[]; 
  description: string;
  is_active: number;
  form_schema?: string; // 🌟 新增此欄位
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
  
  // 🌟 新增：用於管理正在編輯的表單結構
  const [formFields, setFormFields] = useState<FormFieldSchema[]>([]);

  const [editingItem, setEditingItem] = useState<ShowcaseItem>({
    title: '', cover_url: '', price_info: '', tags: [], description: '', is_active: 1, form_schema: '[]'
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
    setEditingItem({ title: '', cover_url: '', price_info: '', tags: [], description: '', is_active: 1, form_schema: '[]' });
    setFormFields([]); // 重置表單欄位
    setIsFormOpen(true);
  };

  const openEditForm = (item: ShowcaseItem) => {
    setEditingItem(item);
    // 🌟 解析已儲存的表單結構
    try {
      setFormFields(item.form_schema ? JSON.parse(item.form_schema) : []);
    } catch (e) { setFormFields([]); }
    setIsFormOpen(true);
  };

  const handleSaveItem = async () => {
    if (!editingItem.id && items.length >= limit) {
      onToast("已達此版本上限", "err");
      return;
    }
    if (!editingItem.title || !editingItem.cover_url) {
      onToast("請填寫品名並上傳封面圖", "err");
      return;
    }

    // 🌟 檢查表單欄位是否有空標題
    if (formFields.some(f => !f.label.trim())) {
      onToast("客製化表單有未命名的問題，請檢查", "err");
      return;
    }

    const url = editingItem.id ? `${API_BASE}/api/showcase/${editingItem.id}` : `${API_BASE}/api/showcase`;
    const method = editingItem.id ? 'PATCH' : 'POST';

    const payload = {
      ...editingItem,
      tags: JSON.stringify(editingItem.tags),
      form_schema: JSON.stringify(formFields) // 🌟 將編輯好的表單結構打包
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
      } else {
        onToast(data.error || "儲存失敗", "err");
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

  // 🌟 表單建置器輔助函式
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

  if (isFormOpen) {
    return (
      <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #EAE6E1', paddingBottom: '16px' }}>
          <h3 style={{ margin: 0 }}>{editingItem.id ? '編輯項目' : '新增 販售項目'}</h3>
          <button onClick={() => setIsFormOpen(false)} style={{ padding: '8px 16px', background: '#FAFAFA', border: '1px solid #DED9D3', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>返回列表</button>
        </div>

        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
          {/* 左側：基本設定與封面 */}
          <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label className="form-label">項目封面圖 (必填)</label>
              <div style={{ backgroundColor: '#FAFAFA', padding: '16px', borderRadius: '12px', border: '1px dashed #DED9D3' }}>
                {editingItem.cover_url && (
                  <div style={{ marginBottom: '16px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #EAE6E1' }}>
                    <img src={editingItem.cover_url} alt="Cover" style={{ width: '100%', display: 'block' }} />
                  </div>
                )}
                <ImageUploader onUpload={handleCoverUpload} targetWidth={800} withWatermark={false} buttonText={isUploading ? "上傳中..." : (editingItem.cover_url ? "更換封面圖" : "上傳封面圖")} maxSizeMB={3} />
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

          {/* 右側：標題、標籤、介紹與表單建置器 */}
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
              <div className="custom-quill-wrapper" style={{ minHeight: '200px' }}>
                <ReactQuill theme="snow" value={editingItem.description} onChange={v => setEditingItem({...editingItem, description: v})} modules={customQuillModules} />
              </div>
            </div>

            {/* 🌟 客製化表單建置器區塊 */}
            <div style={{ marginTop: '16px', borderTop: '1px dashed #DED9D3', paddingTop: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <label className="form-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  📋 專屬客製化表單 
                  <span style={{ fontSize: '12px', color: '#7A7269', fontWeight: 'normal' }}>(委託人點擊「我要委託」時需填寫的問題)</span>
                </label>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                {formFields.map((field, index) => (
                  <div key={field.id} style={{ background: '#FBFBF9', border: '1px solid #EAE6E1', borderRadius: '8px', padding: '16px', position: 'relative' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <input className="form-input" value={field.label} onChange={e => updateFormField(field.id, { label: e.target.value })} placeholder={`問題 ${index + 1} (例如: 角色外觀設定)`} style={{ fontWeight: 'bold' }} />
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

                    {/* 選擇題的選項設定 */}
                    {['radio', 'checkbox', 'select'].includes(field.type) && (
                      <div style={{ marginTop: '12px', paddingLeft: '12px', borderLeft: '2px solid #DED9D3' }}>
                        <div style={{ fontSize: '12px', color: '#7A7269', marginBottom: '8px' }}>設定選項 (用半形逗號 , 分隔)：</div>
                        <input 
                          className="form-input" 
                          value={field.options?.join(', ') || ''} 
                          onChange={e => updateFormField(field.id, { options: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} 
                          placeholder="例如：選項A, 選項B, 選項C" 
                        />
                      </div>
                    )}
                  </div>
                ))}

                {formFields.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '24px', background: '#FAFAFA', borderRadius: '8px', color: '#A0978D', fontSize: '14px', border: '1px dashed #DED9D3' }}>
                    尚未設定專屬表單，委託人將只需填寫基本需求。<br/>點擊下方按鈕開始加入自訂問題。
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button onClick={() => addFormField('text')} style={{ padding: '6px 12px', background: '#FFFFFF', border: '1px solid #DED9D3', borderRadius: '20px', fontSize: '12px', cursor: 'pointer', color: '#5D4A3E' }}>+ 簡答題</button>
                <button onClick={() => addFormField('textarea')} style={{ padding: '6px 12px', background: '#FFFFFF', border: '1px solid #DED9D3', borderRadius: '20px', fontSize: '12px', cursor: 'pointer', color: '#5D4A3E' }}>+ 詳答題</button>
                <button onClick={() => addFormField('radio')} style={{ padding: '6px 12px', background: '#FFFFFF', border: '1px solid #DED9D3', borderRadius: '20px', fontSize: '12px', cursor: 'pointer', color: '#5D4A3E' }}>+ 單選題</button>
                <button onClick={() => addFormField('checkbox')} style={{ padding: '6px 12px', background: '#FFFFFF', border: '1px solid #DED9D3', borderRadius: '20px', fontSize: '12px', cursor: 'pointer', color: '#5D4A3E' }}>+ 多選題</button>
                <button onClick={() => addFormField('date')} style={{ padding: '6px 12px', background: '#FFFFFF', border: '1px solid #DED9D3', borderRadius: '20px', fontSize: '12px', cursor: 'pointer', color: '#5D4A3E' }}>+ 日期</button>
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
      {/* ... (展示列表區塊保持原樣不變) ... */}
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