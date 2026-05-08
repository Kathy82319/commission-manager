import React, { useState, useEffect } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { ImageUploader } from './ImageUploader';
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

export interface ShowcaseItem {
  id?: string;
  title: string;
  cover_url: string;
  price_info: string;
  tags: string[]; 
  description: string;
  is_active: number;
  form_schema?: string;
  allow_guest: number;
  max_orders: number;
  show_quota: number;
  tos_content: string;
  current_orders_count?: number; 
}

interface ShowcaseFormBuilderProps {
  initialItem: ShowcaseItem;
  onClose: () => void;
  onSaveSuccess: () => void;
  onRefreshList: () => void;
  onToast: (msg: string, type: 'ok' | 'err') => void;
  apiBase: string;
  isReadOnly?: boolean;
}

export function ShowcaseFormBuilder({
  initialItem,
  onClose,
  onSaveSuccess,
  onRefreshList,
  onToast,
  apiBase,
  isReadOnly
}: ShowcaseFormBuilderProps) {
  const [viewMode, setViewMode] = useState<'basic' | 'form'>('basic');
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);

  const [editingItem, setEditingItem] = useState<ShowcaseItem>(initialItem);
  const [formFields, setFormFields] = useState<FormFieldSchema[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  useEffect(() => {
    try {
      const parsed = initialItem.form_schema ? JSON.parse(initialItem.form_schema) : [];
      setFormFields(parsed);
      if (parsed.length > 0) setActiveFieldId(parsed[0].id);
    } catch (e) { 
      setFormFields([]); 
    }
  }, [initialItem]);

  const handleCoverUpload = async (resultBlobs: { preview: Blob }) => {
    if (isReadOnly) return; 
    setIsUploading(true);
    try {
      const fileType = resultBlobs.preview.type || 'image/jpeg';
      const fileExt = fileType.split('/')[1] || 'jpg';
      const ticketRes = await fetch(`${apiBase}/api/r2/upload-url`, {
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

  const handleImportGlobalTOS = async () => {
    try {
      const res = await fetch(`${apiBase}/api/users/me`, { credentials: 'include' });
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

  const handleResetOrdersCount = async () => {
    if (!editingItem.id) return onToast("請先儲存項目後再重置", "err");
    if (!window.confirm("確定要重新計算接單數量嗎？(不影響筆記本中的既有訂單)")) return;
    try {
      await fetch(`${apiBase}/api/showcase/${editingItem.id}/reset-orders`, { method: 'POST', credentials: 'include' });
      setEditingItem(prev => ({ ...prev, current_orders_count: 0 }));
      onToast("已重新計算接單數量", "ok");
      onRefreshList();
    } catch (e) {
      onToast("重置失敗", "err");
    }
  };

  const handleSaveItem = async () => {
    if (!editingItem.title || !editingItem.cover_url) {
      onToast("請填寫品名並上傳封面圖", "err"); return;
    }
    if (formFields.some(f => !f.label.trim())) {
      onToast("客製化表單有未命名的問題，請檢查", "err"); 
      setViewMode('form'); 
      return;
    }

    const url = editingItem.id ? `${apiBase}/api/showcase/${editingItem.id}` : `${apiBase}/api/showcase`;
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
        onSaveSuccess();
      } else {
        onToast(data.error || "儲存失敗", "err");
      }
    } catch (error) { 
      onToast("系統連線發生錯誤", "err"); 
    }
  };

  // ================= 表單建置器輔助函數 =================
  const addFormField = (type: FormFieldSchema['type']) => {
    if (formFields.length >= 15) return onToast("最多只能新增 15 個問題", "err");
    const newField: FormFieldSchema = {
      id: `field_${Date.now()}`, type, label: '', required: false,
      options: ['select', 'radio', 'checkbox'].includes(type) ? ['選項 1'] : undefined
    };
    setFormFields([...formFields, newField]);
    setActiveFieldId(newField.id); 
  };

  const updateFormField = (id: string, updates: Partial<FormFieldSchema>) => {
    setFormFields(formFields.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const removeFormField = (id: string) => {
    setFormFields(formFields.filter(f => f.id !== id));
    if (activeFieldId === id) setActiveFieldId(null);
  };

  const addOption = (fieldId: string) => {
    setFormFields(formFields.map(f => {
      if (f.id === fieldId) {
        const currentOptions = f.options || [];
        return { ...f, options: [...currentOptions, `選項 ${currentOptions.length + 1}`] };
      }
      return f;
    }));
  };

  const updateOption = (fieldId: string, index: number, newValue: string) => {
    setFormFields(formFields.map(f => {
      if (f.id === fieldId && f.options) {
        const newOpts = [...f.options];
        newOpts[index] = newValue;
        return { ...f, options: newOpts };
      }
      return f;
    }));
  };

  const removeOption = (fieldId: string, index: number) => {
    setFormFields(formFields.map(f => {
      if (f.id === fieldId && f.options) {
        const newOpts = f.options.filter((_, i) => i !== index);
        return { ...f, options: newOpts.length ? newOpts : ['選項 1'] }; 
      }
      return f;
    }));
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = 'move';
    if (e.dataTransfer.setDragImage) {
      e.dataTransfer.setDragImage(e.currentTarget as Element, 20, 20);
    }
  };

  const handleDragEnter = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (index !== dragOverIdx) {
      setDragOverIdx(index);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // 必須呼叫 preventDefault 才能觸發 Drop
  };

  const handleDragEnd = () => {
    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  const handleDrop = (e: React.DragEvent, dropIdx: number) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === dropIdx) return;
    
    const newFields = [...formFields];
    const [draggedItem] = newFields.splice(draggedIdx, 1);
    newFields.splice(dropIdx, 0, draggedItem);
    
    setFormFields(newFields);
    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  const hasContactField = formFields.some(f => /聯絡|信箱|email|ig|line|社群|twitter|x/i.test(f.label));
  const showGuestWarning = editingItem.allow_guest === 1 && !hasContactField && formFields.length > 0;

// ================= 視圖 1：基本資料 (清爽版) =================
  if (viewMode === 'basic') {
    return (
      <div className="fade-in" style={{ display: 'flex', flexDirection: 'column' }}>
        
        
        <div style={{ background: '#FFF', border: '1px solid #EAE6E1', borderRadius: '12px', padding: '30px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          
          <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
            
            
            <div style={{ flex: '1 1 300px', maxWidth: '400px' }}>
              <label className="form-label" style={{ fontWeight: 'bold', color: '#5D4A3E' }}>項目封面圖 (必填)</label>
              <div style={{ backgroundColor: '#FBFBF9', padding: '12px', borderRadius: '12px', border: '1px dashed #DED9D3' }}>
                {editingItem.cover_url && (
                  <img src={editingItem.cover_url} alt="Cover" style={{ width: '100%', height: '180px', objectFit: 'cover', borderRadius: '8px', marginBottom: '12px', border: '1px solid #EAE6E1' }} />
                )}
                <ImageUploader onUpload={handleCoverUpload} targetWidth={800} withWatermark={false} buttonText={isUploading ? "上傳中..." : (editingItem.cover_url ? "更換封面圖" : "上傳封面圖")} maxSizeMB={3} />
              </div>
            </div>
            
            
            <div style={{ flex: '2 1 400px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              
              <div>
                <label className="form-label" style={{ fontWeight: 'bold', color: '#5D4A3E' }}>品名標題 (必填)</label>
                <input className="form-input" style={{ fontSize: '16px', padding: '14px', width: '100%' }} value={editingItem.title} onChange={e => setEditingItem({...editingItem, title: e.target.value})} placeholder="例如：精緻半身立繪、遊戲UI設計..." />
              </div>

              
              <div>
                <label className="form-label" style={{ fontWeight: 'bold', color: '#5D4A3E' }}>作品標籤 (最多 5 個)</label>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                  {editingItem.tags.map(tag => (
                    <span key={tag} style={{ padding: '6px 12px', background: '#F4F0EB', color: '#A67B3E', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      #{tag} <button onClick={() => handleRemoveTag(tag)} style={{ background: 'none', border: 'none', color: '#A05C5C', cursor: 'pointer', padding: 0 }}>✕</button>
                    </span>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input className="form-input" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())} placeholder="輸入標籤後按 Enter..." disabled={editingItem.tags.length >= 5} style={{ flex: 1 }} />
                  <button onClick={handleAddTag} disabled={editingItem.tags.length >= 5} style={{ padding: '0 20px', background: '#5D4A3E', color: '#FFF', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>新增</button>
                </div>
              </div>

              
              <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1 }}>
                  <label className="form-label" style={{ fontWeight: 'bold', color: '#5D4A3E' }}>金額顯示</label>
                  <input className="form-input" style={{ padding: '12px', width: '100%' }} value={editingItem.price_info} onChange={e => setEditingItem({...editingItem, price_info: e.target.value})} placeholder="例如：NT$ 1500 起" />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="form-label" style={{ fontWeight: 'bold', color: '#5D4A3E' }}>展示狀態</label>
                  <select className="form-input" style={{ padding: '12px', width: '100%' }} value={editingItem.is_active} onChange={e => setEditingItem({...editingItem, is_active: Number(e.target.value)})}>
                    <option value={1}>🟢 公開顯示</option>
                    <option value={0}>🔴 隱藏下架</option>
                  </select>
                </div>
              </div>

              
              <div style={{ marginTop: '8px', padding: '16px', background: '#FAFAFA', border: '1px dashed #C4BDB5', borderRadius: '8px', textAlign: 'center' }}>
                <span style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: '#7A7269', fontWeight: 'bold' }}>此項目開放接單嗎？</span>
                <button 
                  onClick={() => setViewMode('form')}
                  style={{ padding: '8px 16px', background: '#FFFFFF', color: '#4A7294', border: '1px solid #C1D6E8', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}
                >
                  ⚙️ 制訂委託表單與規則 ➔
                </button>
              </div>

            </div>
          </div>

          
          <div>
            <label className="form-label" style={{ fontWeight: 'bold', color: '#5D4A3E' }}>品項詳細介紹</label>
            <div className="custom-quill-wrapper">
              <ReactQuill theme="snow" value={editingItem.description} onChange={v => setEditingItem({...editingItem, description: v})} modules={customQuillModules} />
            </div>
          </div>

          
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #EAE6E1', paddingTop: '24px', marginTop: '8px' }}>
            <button 
              onClick={onClose} 
              style={{ padding: '12px 24px', background: '#FAFAFA', color: '#7A7269', border: '1px solid #DED9D3', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px' }}
            >
              返回接委託區
            </button>
            <button 
              onClick={handleSaveItem} 
              style={{ padding: '12px 32px', background: '#5D4A3E', color: '#FFF', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px', boxShadow: '0 4px 12px rgba(93, 74, 62, 0.2)' }}
            >
              儲存項目
            </button>
          </div>

        </div>
      </div>
    );
  }

  // ================= 視圖 2：表單建置器 (Google Forms 雙欄體驗) =================
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', flexDirection: 'column', backgroundColor: '#F0ECE7' }}>
      
      
      <div style={{ padding: '16px 24px', background: '#FFFFFF', borderBottom: '1px solid #EAE6E1', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10, boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={() => setViewMode('basic')} style={{ background: '#F4F0EB', border: 'none', color: '#5D4A3E', fontSize: '14px', fontWeight: 'bold', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}>
            🔙 返回基本設定
          </button>
          <h2 style={{ margin: 0, fontSize: '18px', color: '#5D4A3E', fontWeight: 'bold' }}>📋 制訂專屬委託表單 - {editingItem.title || '未命名'}</h2>
        </div>
        <button onClick={handleSaveItem} style={{ padding: '10px 24px', background: '#4E7A5A', color: '#FFF', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px', boxShadow: '0 2px 8px rgba(78, 122, 90, 0.2)' }}>
          完成並儲存
        </button>
      </div>

      
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        
        
        <div className="custom-scrollbar" style={{ flex: '1.2', overflowY: 'auto', padding: '40px', background: '#F4F0EB' }}>
          <div style={{ maxWidth: '750px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            
            <div style={{ background: '#FFFFFF', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: '1px solid #EAE6E1', borderTop: '6px solid #5D4A3E' }}>
              <div style={{ padding: '24px' }}>
                <h3 style={{ margin: '0 0 20px 0', color: '#333', fontSize: '20px' }}>接單規則設定</h3>
                
                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '24px' }}>
                  <div style={{ flex: '1 1 200px' }}>
                    <label className="form-label" style={{ fontWeight: 'bold' }}>接單上限 (0 為無限)</label>
                    <input type="number" min="0" className="form-input" value={editingItem.max_orders} onChange={e => setEditingItem({...editingItem, max_orders: Number(e.target.value)})} />
                  </div>
                  <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: '#5D4A3E', fontWeight: 'bold', marginTop: '16px' }}>
                      <input type="checkbox" checked={editingItem.show_quota === 1} onChange={e => setEditingItem({...editingItem, show_quota: e.target.checked ? 1 : 0})} disabled={editingItem.max_orders === 0} style={{ width: '18px', height: '18px' }} />
                      公開顯示剩餘名額
                    </label>
                  </div>
                </div>

                {editingItem.max_orders > 0 && (
                  <div style={{ background: '#FDFDFB', padding: '16px', borderRadius: '8px', border: '1px solid #EAE6E1', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <span style={{ fontSize: '14px', color: '#5D4A3E', fontWeight: 'bold' }}>目前有效單量：{editingItem.current_orders_count || 0} / {editingItem.max_orders}</span>
                    <button onClick={handleResetOrdersCount} style={{ background: '#FFFFFF', color: '#A05C5C', border: '1px solid #DED9D3', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: 'bold' }}>
                      ↺ 重新計算收件數
                    </button>
                  </div>
                )}

                <div style={{ borderTop: '1px dashed #EAE6E1', paddingTop: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '12px' }}>
                    <label className="form-label" style={{ fontWeight: 'bold', margin: 0, fontSize: '16px' }}>📜 專屬委託協議書 (TOS)</label>
                    <button onClick={handleImportGlobalTOS} style={{ background: '#EBF2F7', color: '#4A7294', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: 'bold' }}>
                      ⬇️ 帶入全域協議書
                    </button>
                  </div>
                  <div className="custom-quill-wrapper" style={{ minHeight: '150px' }}>
                    <ReactQuill theme="snow" value={editingItem.tos_content} onChange={v => setEditingItem({...editingItem, tos_content: v})} modules={customQuillModules} />
                  </div>
                </div>
              </div>
            </div>

            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 8px' }}>
              <h3 style={{ margin: 0, color: '#5D4A3E', fontSize: '20px' }}>問題建置</h3>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', background: '#FFFFFF', padding: '8px 16px', border: '1px solid #EAE6E1', borderRadius: '24px', fontWeight: 'bold', color: '#4A7294', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
                <input type="checkbox" checked={editingItem.allow_guest === 1} onChange={e => setEditingItem({...editingItem, allow_guest: e.target.checked ? 1 : 0})} style={{ width: '16px', height: '16px' }} />
                開放訪客 (免登入) 填寫
              </label>
            </div>

            {showGuestWarning && (
              <div style={{ background: '#FEF9C3', color: '#B45309', padding: '16px', borderRadius: '8px', border: '1px solid #FEF08A', fontSize: '14px', display: 'flex', gap: '8px', fontWeight: 'bold' }}>
                <span>⚠️</span>
                <span>溫馨提示：您開啟了訪客委託，但表單中似乎沒有詢問「聯絡方式」，這可能會導致您收到單後無法聯繫上對方喔！</span>
              </div>
            )}

            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {formFields.map((field, index) => {
                const isActive = activeFieldId === field.id;
                const isDragging = draggedIdx === index;
                const isDragOver = dragOverIdx === index && draggedIdx !== index;
                
                return (
                  <div 
                    key={field.id} 
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragEnter={(e) => handleDragEnter(e, index)}
                    onDragOver={handleDragOver}
                    onDragEnd={handleDragEnd}
                    onDrop={(e) => handleDrop(e, index)}
                    onClick={() => setActiveFieldId(field.id)}
                    style={{ 
                      background: '#FFF', 
                      borderRadius: '12px', 
                      position: 'relative', 
                      boxShadow: isActive ? '0 8px 24px rgba(0,0,0,0.08)' : '0 2px 6px rgba(0,0,0,0.03)',
                      border: '1px solid',
                      borderColor: isActive ? '#FFFFFF' : '#EAE6E1',
                      borderLeft: isActive ? '6px solid #4E7A5A' : '1px solid #EAE6E1',
                      borderTop: isDragOver ? '4px solid #4E7A5A' : '1px solid transparent', 
                      opacity: isDragging ? 0.5 : 1,
                      transition: 'box-shadow 0.2s, border 0.2s',
                      cursor: isActive ? 'default' : 'pointer'
                    }}
                  >
                    
                    <div 
                      style={{ position: 'absolute', top: '12px', right: '12px', padding: '4px 8px', cursor: 'grab', color: '#C4BDB5', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}
                      title="按住拖曳可排序"
                    >
                      <span style={{ transform: 'rotate(90deg)', letterSpacing: '2px', fontWeight: 'bold', fontSize: '16px', userSelect: 'none' }}>|||</span>
                    </div>

                    
                    <div style={{ padding: '32px 24px 24px 24px' }}>
                      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', paddingRight: isActive ? '32px' : '0' }}>
                        
                        <div style={{ flex: 1 }}>
                          {isActive ? (
                            <input 
                              className="form-input" 
                              value={field.label} 
                              onChange={e => updateFormField(field.id, { label: e.target.value })} 
                              placeholder="請輸入問題" 
                              style={{ fontSize: '16px', fontWeight: 'bold', padding: '12px', background: '#F9F9F9', border: 'none', borderBottom: '2px solid #5D4A3E', borderRadius: '4px 4px 0 0' }} 
                            />
                          ) : (
                            <div style={{ fontSize: '16px', fontWeight: 'bold', color: field.label ? '#333' : '#A0978D', marginBottom: '8px' }}>
                              {field.label || `未命名問題 ${index + 1}`} {field.required && <span style={{ color: '#EF4444' }}>*</span>}
                            </div>
                          )}
                        </div>

                        {isActive && (
                          <select 
                            className="form-input" 
                            value={field.type} 
                            onChange={e => updateFormField(field.id, { type: e.target.value as any })} 
                            style={{ width: '160px', fontWeight: 'bold', color: '#5D4A3E' }}
                          >
                            <option value="text">簡答題</option>
                            <option value="textarea">詳答題</option>
                            <option value="radio">單選題</option>
                            <option value="checkbox">核取方塊</option>
                            <option value="select">下拉式選單</option>
                            <option value="date">日期</option>
                          </select>
                        )}
                      </div>

                      
                      <div style={{ marginTop: '20px', paddingLeft: isActive ? '0' : '0' }}>
                        {['text', 'textarea', 'date'].includes(field.type) && (
                          <div style={{ borderBottom: '1px dotted #C4BDB5', width: '50%', paddingBottom: '8px', color: '#A0978D', fontSize: '14px' }}>
                            {field.type === 'text' ? '簡答文字' : field.type === 'textarea' ? '詳答文字' : '年 / 月 / 日'}
                          </div>
                        )}

                        {['radio', 'checkbox', 'select'].includes(field.type) && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {field.options?.map((opt, i) => (
                              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span style={{ color: '#A0978D', fontSize: '18px' }}>
                                  {field.type === 'radio' ? '○' : field.type === 'checkbox' ? '□' : `${i+1}.`}
                                </span>
                                {isActive ? (
                                  <>
                                    <input 
                                      className="form-input" 
                                      value={opt} 
                                      onChange={e => updateOption(field.id, i, e.target.value)}
                                      style={{ border: 'none', borderBottom: '1px solid #EAE6E1', borderRadius: 0, padding: '4px 8px', flex: 1, maxWidth: '400px' }}
                                    />
                                    {field.options!.length > 1 && (
                                      <button onClick={() => removeOption(field.id, i)} style={{ background: 'none', border: 'none', color: '#A0978D', cursor: 'pointer', fontSize: '16px' }}>✕</button>
                                    )}
                                  </>
                                ) : (
                                  <span style={{ color: '#5D4A3E', fontSize: '14px' }}>{opt || `選項 ${i+1}`}</span>
                                )}
                              </div>
                            ))}
                            {isActive && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
                                <span style={{ color: '#A0978D', fontSize: '18px' }}>
                                  {field.type === 'radio' ? '○' : field.type === 'checkbox' ? '□' : '*'}
                                </span>
                                <button onClick={() => addOption(field.id)} style={{ background: 'none', border: 'none', color: '#4A7294', cursor: 'pointer', fontWeight: 'bold', padding: 0 }}>
                                  新增選項
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    
                    {isActive && (
                      <div style={{ borderTop: '1px solid #EAE6E1', padding: '16px 24px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '20px', background: '#FAFAFA', borderRadius: '0 0 12px 12px' }}>
                        <button onClick={() => removeFormField(field.id)} style={{ background: 'none', border: 'none', color: '#7A7269', cursor: 'pointer', fontSize: '18px' }} title="刪除問題">
                          🗑️
                        </button>
                        <div style={{ width: '1px', height: '24px', background: '#DED9D3' }}></div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: '#5D4A3E', fontWeight: 'bold' }}>
                          必填
                          <input type="checkbox" checked={field.required} onChange={e => updateFormField(field.id, { required: e.target.checked })} style={{ width: '16px', height: '16px' }} />
                        </label>
                      </div>
                    )}
                  </div>
                );
              })}

              {formFields.length === 0 && (
                <div style={{ textAlign: 'center', padding: '60px', background: '#FFF', borderRadius: '12px', color: '#A0978D', fontSize: '15px', border: '2px dashed #DED9D3' }}>
                  目前尚未加入任何問題。點擊下方按鈕開始建置專屬表單！
                </div>
              )}
            </div>

            
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center', background: '#FFFFFF', padding: '16px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
              <button onClick={() => addFormField('text')} style={{ padding: '8px 16px', background: '#F4F0EB', border: 'none', borderRadius: '20px', fontSize: '14px', cursor: 'pointer', color: '#5D4A3E', fontWeight: 'bold' }}>+ 簡答題</button>
              <button onClick={() => addFormField('textarea')} style={{ padding: '8px 16px', background: '#F4F0EB', border: 'none', borderRadius: '20px', fontSize: '14px', cursor: 'pointer', color: '#5D4A3E', fontWeight: 'bold' }}>+ 詳答題</button>
              <button onClick={() => addFormField('radio')} style={{ padding: '8px 16px', background: '#F4F0EB', border: 'none', borderRadius: '20px', fontSize: '14px', cursor: 'pointer', color: '#5D4A3E', fontWeight: 'bold' }}>+ 單選題</button>
              <button onClick={() => addFormField('checkbox')} style={{ padding: '8px 16px', background: '#F4F0EB', border: 'none', borderRadius: '20px', fontSize: '14px', cursor: 'pointer', color: '#5D4A3E', fontWeight: 'bold' }}>+ 多選題</button>
              <button onClick={() => addFormField('select')} style={{ padding: '8px 16px', background: '#F4F0EB', border: 'none', borderRadius: '20px', fontSize: '14px', cursor: 'pointer', color: '#5D4A3E', fontWeight: 'bold' }}>+ 下拉選單</button>
            </div>
            
          </div>
        </div>

        
        <div className="custom-scrollbar" style={{ flex: '1', background: '#E6E1DA', padding: '40px', overflowY: 'auto', borderLeft: '1px solid #DED9D3', display: 'block' }}>
          
          <div style={{ width: '100%', maxWidth: '450px', background: '#FFF', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 10px 25px rgba(0,0,0,0.08)', border: '1px solid #EAE6E1', margin: '0 auto' }}>
            
            <div style={{ background: '#5D4A3E', color: '#FFF', padding: '12px', textAlign: 'center', fontSize: '13px', fontWeight: 'bold', letterSpacing: '1px' }}>
              👁️ 委託人視角預覽
            </div>

            <div style={{ padding: '30px' }}>
              {editingItem.cover_url ? (
                <img src={editingItem.cover_url} alt="Cover" style={{ width: '100%', height: '180px', objectFit: 'cover', borderRadius: '8px', marginBottom: '20px' }} />
              ) : (
                <div style={{ width: '100%', height: '180px', background: '#F4F4F1', borderRadius: '8px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#A0978D' }}>尚未上傳封面</div>
              )}
              
              <h2 style={{ margin: '0 0 10px 0', color: '#333', fontSize: '24px', fontWeight: 'bold', lineHeight: '1.4' }}>{editingItem.title || '未命名項目'}</h2>
              <div style={{ color: '#A67B3E', fontWeight: 'bold', fontSize: '18px', marginBottom: '20px' }}>{editingItem.price_info || '價格未定'}</div>
              
              {editingItem.max_orders > 0 && editingItem.show_quota === 1 && (
                <div style={{ background: '#FEF2F2', color: '#EF4444', padding: '8px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', display: 'inline-block', marginBottom: '20px' }}>
                  🔥 限量接單：目前剩餘 {editingItem.max_orders - (editingItem.current_orders_count || 0)} 個名額
                </div>
              )}

              {editingItem.allow_guest === 1 && formFields.length > 0 && (
                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '16px', borderRadius: '8px', marginBottom: '24px', fontSize: '13px', color: '#475569', lineHeight: '1.6' }}>
                  💡 <strong>您目前為訪客身分</strong><br/>填寫表單後，繪師將透過您留下的聯絡方式與您聯繫。
                </div>
              )}

              <div style={{ borderTop: '1px solid #EAE6E1', paddingTop: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {formFields.map((field, idx) => (
                  <div key={idx} style={{ background: activeFieldId === field.id ? '#FAFAFA' : 'transparent', padding: activeFieldId === field.id ? '12px' : '0', borderRadius: '8px', transition: 'all 0.2s' }}>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#5D4A3E', marginBottom: '10px' }}>
                      {field.label || `未命名問題 ${idx+1}`} {field.required && <span style={{ color: '#EF4444', marginLeft: '4px' }}>*</span>}
                    </div>
                    {field.type === 'text' && <input className="form-input" disabled placeholder="您的回答" style={{ background: '#FFF' }} />}
                    {field.type === 'textarea' && <textarea className="form-input" disabled placeholder="您的回答" rows={3} style={{ background: '#FFF' }} />}
                    {field.type === 'select' && <select className="form-input" disabled style={{ background: '#FFF' }}><option>請選擇</option></select>}
                    {field.type === 'date' && <input type="date" className="form-input" disabled style={{ background: '#FFF' }} />}
                    {['radio', 'checkbox'].includes(field.type) && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {(field.options?.length ? field.options : ['選項']).map((opt, i) => (
                          <label key={i} style={{ fontSize: '14px', color: '#5D4A3E', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input type={field.type} disabled style={{ width: '16px', height: '16px' }} /> {opt}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {formFields.length === 0 && (
                  <div style={{ color: '#A0978D', fontSize: '14px', textAlign: 'center', fontStyle: 'italic', padding: '30px 0' }}>純展示模式，無客製化表單</div>
                )}
              </div>

              {editingItem.tos_content && (
                <div style={{ marginTop: '30px', borderTop: '1px solid #EAE6E1', paddingTop: '24px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#5D4A3E', marginBottom: '12px' }}>📜 委託協議書</div>
                  <div style={{ height: '100px', overflow: 'hidden', background: '#FAFAFA', border: '1px solid #EAE6E1', borderRadius: '8px', padding: '12px', fontSize: '13px', color: '#7A7269', position: 'relative' }}>
                    <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(editingItem.tos_content) }} />
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '50px', background: 'linear-gradient(transparent, #FAFAFA)' }} />
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#5D4A3E', marginTop: '12px', fontWeight: 'bold' }}>
                    <input type="checkbox" disabled style={{ width: '16px', height: '16px' }} /> 我已閱讀並同意上述協議
                  </label>
                </div>
              )}

              {formFields.length > 0 && (
                <button disabled style={{ width: '100%', padding: '14px', background: '#5D4A3E', color: '#FFF', border: 'none', borderRadius: '8px', fontWeight: 'bold', marginTop: '30px', fontSize: '15px', opacity: 0.6 }}>
                  送出委託申請
                </button>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}