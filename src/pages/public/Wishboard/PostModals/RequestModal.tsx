// src/pages/public/Wishboard/PostModals/RequestModal.tsx
import React, { useState } from 'react';
import { X, Image as ImageIcon } from 'lucide-react';
import { ImageUploader } from '../../../../components/ImageUploader';
import { REQ_TAGS, PAY_TAGS, R2_PUBLIC_URL } from '../constants';
import { apiClient } from '../../../../api/client';

interface RequestModalProps {
  form: any;
  setForm: React.Dispatch<React.SetStateAction<any>>;
  isUploading: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onImageUpload: (resultBlobs: { preview: Blob }) => void;
}

export const RequestModal: React.FC<RequestModalProps> = ({
  form, setForm, isUploading, onClose, onSubmit, onImageUpload
}) => {
  const [customPaymentInput, setCustomPaymentInput] = useState('');
  const [customTagInput, setCustomTagInput] = useState('');

  // OC 連動相關狀態
  const [showOCSelection, setShowOCSelection] = useState(false);
  const [myOCs, setMyOCs] = useState<any[]>([]);
  const [isLoadingOCs, setIsLoadingOCs] = useState(false);

  const toggleTag = (tag: string, field: 'tags' | 'payment_methods') => {
    setForm((prev: any) => {
      let list = prev[field] || [];
      const exclusiveTag = field === 'tags' ? '不限' : '皆可配合';
      
      if (tag === exclusiveTag) {
        list = list.includes(tag) ? [] : [tag];
      } else {
        list = list.includes(tag) 
          ? list.filter((t: string) => t !== tag) 
          : [...list.filter((t: string) => t !== exclusiveTag), tag];
      }
      return { ...prev, [field]: list };
    });
  };

  const removeTag = (tag: string, field: 'tags' | 'payment_methods') => {
    setForm((prev: any) => ({ ...prev, [field]: (prev[field] || []).filter((t: string) => t !== tag) }));
  };

  const getFullUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${R2_PUBLIC_URL}/${url}`;
  };

  const handleTagInput = (value: string, setValue: React.Dispatch<React.SetStateAction<string>>, field: 'tags' | 'payment_methods') => {
    let safeValue = value.replace(/[<>"'&]/g, ''); 
    const trimmed = safeValue.trim().replace(/,/g, '').replace(/，/g, '').replace(/\s+/g, '');
    
    if (trimmed) {
      toggleTag(trimmed, field);
      setValue('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, value: string, setValue: React.Dispatch<React.SetStateAction<string>>, field: 'tags' | 'payment_methods') => {
    if (e.key === 'Enter' || e.key === ',' || e.key === '，' || e.key === ' ') {
      e.preventDefault();
      handleTagInput(value, setValue, field);
    }
  };

  // 載入當前使用者角色列表
  const handleOpenOCSelection = async () => {
    setShowOCSelection(true);
    setIsLoadingOCs(true);
    try {
      const res = await apiClient.get('/api/oc');
      if (res.success) {
        setMyOCs(res.data || []);
      }
    } catch (e) {
      console.error("無法讀取角色卡", e);
    } finally {
      setIsLoadingOCs(false);
    }
  };

  // 綁定選中的 OC 當下資料作為快照
  const handleSelectOC = (oc: any) => {
    // 處理圖片路徑相容
    let processedOC = { ...oc };
    try {
      if (typeof oc.images === 'string') {
        processedOC.images = JSON.parse(oc.images || '[]');
      }
    } catch (e) {}

    setForm((prev: any) => ({
      ...prev,
      oc_snapshot: JSON.stringify(processedOC)
    }));
    setShowOCSelection(false);
  };

  // 移除已綁定的 OC 快照
  const handleRemoveOC = () => {
    setForm((prev: any) => ({
      ...prev,
      oc_snapshot: null
    }));
  };




  return (
    <div className="modal-overlay" style={{ zIndex: 10001 }}>
      <div className="post-modal" style={{ maxWidth: '800px', position: 'relative' }}>
        <div className="modal-header">
          <h2>發布徵委託需求</h2>
          <button type="button" className="close-modal-btn" onClick={onClose}><X size={24} /></button>
        </div>
        
        <form onSubmit={onSubmit} className="post-form">
          <div className="form-row">
            <div className="form-group" style={{ flex: '0 0 240px' }}>
              <label>參考例圖 (最多 1 張，建議 3MB 內)</label>
              {form.ref_image ? (
                <div className="image-preview-box" style={{ height: '240px', width: '100%' }}>
                  <img src={getFullUrl(form.ref_image)} alt="預覽" />
                  <button type="button" className="remove-image-btn" onClick={() => setForm({...form, ref_image: ''})}><X size={14} /></button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
                  <div style={{ height: '240px', border: '2px dashed #cbd5e1', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ImageUploader onUpload={onImageUpload} targetWidth={1000} buttonText={isUploading ? "上傳中..." : "+ 選擇圖片"} maxSizeMB={3} aspectRatio={1} />
                  </div>
                  <span style={{ fontSize: '11px', color: '#64748b', textAlign: 'center', fontWeight: 'bold' }}>建議尺寸：1000x1000 (1:1 正方形)</span>
                </div>
              )}
            </div>

            <div className="form-group" style={{ flex: '1 1 300px', gap: '16px' }}>
              <div className="form-group">
                <label>標題</label>
                <input type="text" placeholder="簡單描述您的委託需求" value={form.title || ''} onChange={e => setForm({...form, title: e.target.value})} required />
              </div>

              <div className="form-group">
                <label>預算範圍 (最低~最高)</label>
                <div className="budget-inputs">
                  <input type="number" min="0" placeholder="最低金額" value={form.budget_min || ''} onChange={e => setForm({...form, budget_min: e.target.value})} />
                  <span className="budget-separator">~</span>
                  <input type="number" min="0" placeholder="最高金額" value={form.budget_max || ''} onChange={e => setForm({...form, budget_max: e.target.value})} />
                </div>
              </div>

              <div className="form-group">
                <label>排單需求</label>
                <div className="radio-group">
                  <label className="radio-label"><input type="radio" checked={form.schedule_type === 'flexible'} onChange={() => setForm({...form, schedule_type: 'flexible', specific_date: ''})} /> 可接受排單</label>
                  <label className="radio-label"><input type="radio" checked={form.schedule_type === 'fixed'} onChange={() => setForm({...form, schedule_type: 'fixed'})} /> 指定交稿日</label>
                  {form.schedule_type === 'fixed' && <input type="date" className="date-input" value={form.specific_date || ''} onChange={e => setForm({...form, specific_date: e.target.value})} required />}
                </div>
              </div>
            </div>
          </div>

{/* 📇 角色設定快照預覽區塊 */}
<div className="form-section" style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
  <label className="section-title" style={{ margin: 0, border: 'none', padding: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
    <span>📇 插入專屬角色設定卡快照 <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 'normal', marginLeft: '6px' }}>(選填，創作者可點擊查看完整設定)</span></span>
    {!form.oc_snapshot && (
      <button type="button" onClick={handleOpenOCSelection} className="save-hint-btn" style={{ margin: 0, padding: '6px 12px', background: '#fff', border: '1px solid #cbd5e1' }}>
        + 選擇角色卡
      </button>
    )}
  </label>

  {form.oc_snapshot && (() => {
    // 當場解析快照，取出大頭貼與基本資料
    let ocData: any = null;
    let ocImageUrl = null;
    try { 
      ocData = JSON.parse(form.oc_snapshot); 
      const imgs = Array.isArray(ocData.images) ? ocData.images : JSON.parse(ocData.images || '[]');
      if (imgs.length > 0) {
        const rawUrl = imgs[0].previewUrl || imgs[0].url || '';
        ocImageUrl = rawUrl.startsWith('http') ? rawUrl : `${R2_PUBLIC_URL}/${rawUrl.replace(/^\//, '')}`;
      }
    } catch (e) {}

    if (!ocData) return null;

    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* 角色大頭貼預覽 */}
          <div style={{ width: '48px', height: '48px', borderRadius: '6px', backgroundColor: '#F4F0EB', overflow: 'hidden', flexShrink: 0, border: '1px solid #e2e8f0' }}>
            {ocImageUrl ? (
              <img src={ocImageUrl} alt="oc-preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1' }}><ImageIcon size={18} /></div>
            )}
          </div>
          {/* 角色文字資訊 */}
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontWeight: 'bold', color: '#5D4A3E', fontSize: '14px' }}>{ocData.name || '未命名角色'}</div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{ocData.gender || '無性別'} {ocData.body_type || ''}</div>
          </div>
        </div>
        {/* 移除按鈕 */}
        <button type="button" onClick={handleRemoveOC} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '2px', fontWeight: 'bold' }}>
          <X size={14} /> 移除快照
        </button>
      </div>
    );
  })()}
</div>

          <div className="form-section">
            <label className="section-title">付款方式 (多選)</label>
            <div className="tag-selector">
              {PAY_TAGS.map(t => <span key={t} className={`selectable-tag ${(form.payment_methods || []).includes(t) ? 'selected' : ''}`} onClick={() => toggleTag(t, 'payment_methods')}>{t}</span>)}
              {(form.payment_methods || []).filter((t: string) => !PAY_TAGS.includes(t) && t !== '皆可配合').map((t: string) => (
                <span key={t} className="selectable-tag selected custom-tag">{t} <X size={12} onClick={(e) => { e.stopPropagation(); removeTag(t, 'payment_methods'); }} /></span>
              ))}
              
              <input 
                type="text" 
                className="compact-tag-input" 
                placeholder="+ 自定義" 
                value={customPaymentInput} 
                onChange={e => setCustomPaymentInput(e.target.value)} 
                onKeyDown={e => handleKeyDown(e, customPaymentInput, setCustomPaymentInput, 'payment_methods')}
                onBlur={() => handleTagInput(customPaymentInput, setCustomPaymentInput, 'payment_methods')}
              />
            </div>
          </div>

          <div className="form-section">
            <label className="section-title">需求標籤 (複選)</label>
            <div className="tag-selector-group">
              <div className="tag-selector">
                {REQ_TAGS.map(t => <span key={t} className={`selectable-tag style ${(form.tags || []).includes(t) ? 'selected' : ''}`} onClick={() => toggleTag(t, 'tags')}>{t}</span>)}
                {(form.tags || []).filter((t: string) => !REQ_TAGS.includes(t)).map((t: string) => (
                  <span key={t} className="selectable-tag style selected custom-tag">{t} <X size={12} onClick={(e) => { e.stopPropagation(); removeTag(t, 'tags'); }} /></span>
                ))}
                
                <input 
                  type="text" 
                  className="compact-tag-input" 
                  placeholder="+ 自定義" 
                  value={customTagInput} 
                  onChange={e => setCustomTagInput(e.target.value)} 
                  onKeyDown={e => handleKeyDown(e, customTagInput, setCustomTagInput, 'tags')}
                  onBlur={() => handleTagInput(customTagInput, setCustomTagInput, 'tags')}
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <label className="section-title">詳細需求說明</label>
            <textarea rows={5} className="detail-textarea" placeholder="請詳細描述您的委託需求、角色設定或特殊要求..." value={form.content || ''} onChange={e => setForm({...form, content: e.target.value})} required></textarea>
          </div>

          <div className="modal-footer">
             <button type="button" className="btn-cancel" onClick={onClose}>取消</button>
             <button type="submit" className="submit-post-btn" disabled={isUploading}>確認發布許願</button>
          </div>
        </form>

        {/* 內嵌彈窗：選擇 OC 角色卡 */}
        {showOCSelection && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(26, 20, 18, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10005, padding: '20px' }}>
            <div style={{ backgroundColor: '#FDFDFB', width: '100%', maxWidth: '460px', borderRadius: '16px', padding: '20px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', position: 'relative' }}>
              <h3 style={{ marginTop: 0, color: '#5D4A3E', borderBottom: '1px solid #EAE6E1', paddingBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '16px' }}>
                選擇要連動的角色卡
                <button type="button" onClick={() => setShowOCSelection(false)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#A0978D' }}>✕</button>
              </h3>

              <div style={{ maxHeight: '45vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
                {isLoadingOCs ? (
                  <div style={{ textAlign: 'center', color: '#A0978D', padding: '20px', fontSize: '14px' }}>讀取您的角色庫中...</div>
                ) : myOCs.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#A0978D', padding: '20px', backgroundColor: '#F4F0EB', borderRadius: '8px', fontSize: '13px' }}>
                    您還沒有建立任何專屬角色卡喔！<br/>請先至「我的角色卡 (OC)」介面建立。
                  </div>
                ) : (
                  myOCs.map(oc => {
                    let imageUrl = null;
                    try {
                      const images = typeof oc.images === 'string' ? JSON.parse(oc.images || '[]') : (oc.images || []);
                      if (images.length > 0) {
                        const rawUrl = images[0].previewUrl || images[0].url || '';
                        imageUrl = rawUrl.startsWith('http') ? rawUrl : `${R2_PUBLIC_URL}/${rawUrl.replace(/^\//, '')}`;
                      }
                    } catch(e) {}

                    return (
                      <div key={oc.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px', border: '1px solid #EAE6E1', borderRadius: '8px', backgroundColor: '#FFF' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                          <div style={{ width: '40px', height: '40px', borderRadius: '6px', backgroundColor: '#F4F0EB', overflow: 'hidden', flexShrink: 0 }}>
                            {imageUrl ? (
                              <img src={imageUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#DED9D3' }}><ImageIcon size={16} /></div>
                            )}
                          </div>
                          <div style={{ overflow: 'hidden', textAlign: 'left' }}>
                            <div style={{ fontWeight: 'bold', color: '#5D4A3E', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{oc.name || '未命名角色'}</div>
                            <div style={{ fontSize: '11px', color: '#A0978D', marginTop: '2px' }}>{oc.gender || '無性別'} {oc.body_type || ''}</div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleSelectOC(oc)}
                          style={{ padding: '6px 12px', backgroundColor: '#8CB369', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}
                        >
                          選擇連動
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};