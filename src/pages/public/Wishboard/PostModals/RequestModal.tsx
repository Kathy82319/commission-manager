// src/pages/public/Wishboard/PostModals/RequestModal.tsx
import React, { useState } from 'react';
import { X } from 'lucide-react';
import { ImageUploader } from '../../../../components/ImageUploader';
import { REQ_TAGS, PAY_TAGS, R2_PUBLIC_URL } from '../constants';

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
  const [customTagInput, setCustomTagInput] = useState('');
  const [customPaymentInput, setCustomPaymentInput] = useState('');

  const toggleTag = (tag: string, field: 'tags' | 'payment_methods') => {
    setForm((prev: any) => {
      let list = prev[field];
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
    setForm((prev: any) => ({ ...prev, [field]: prev[field].filter((t: string) => t !== tag) }));
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

  return (
    <div className="modal-overlay">
      <div className="post-modal" style={{ maxWidth: '800px' }}>
        <div className="modal-header">
          <h2>發布徵委託需求</h2>
          <button type="button" className="close-modal-btn" onClick={onClose}><X size={24} /></button>
        </div>
        
        <form onSubmit={onSubmit} className="post-form">
          <div className="form-row">
            <div className="form-group" style={{ flex: '0 0 240px' }}>
              <label>參考例圖 (最多 1 張，建議 3MB 內)</label>
              {form.ref_image ? (
                <div className="image-preview-box" style={{ height: '240px' }}>
                  <img src={getFullUrl(form.ref_image)} alt="預覽" />
                  <button type="button" className="remove-image-btn" onClick={() => setForm({...form, ref_image: ''})}><X size={14} /></button>
                </div>
              ) : (
                <div style={{ height: '240px', border: '2px dashed #cbd5e1', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ImageUploader onUpload={onImageUpload} targetWidth={800} buttonText={isUploading ? "上傳中..." : "+ 選擇圖片"} maxSizeMB={3} />
                </div>
              )}
            </div>

            <div className="form-group" style={{ flex: '1 1 300px', gap: '16px' }}>
              <div className="form-group">
                <label>標題</label>
                
                <input type="text" placeholder="簡單描述您的委託需求" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required />
              </div>

              <div className="form-group">
                <label>預算範圍 (最低~最高)</label>
                <div className="budget-inputs">
                  <input type="number" min="0" placeholder="最低金額" value={form.budget_min} onChange={e => setForm({...form, budget_min: e.target.value})} />
                  <span className="budget-separator">~</span>
                  <input type="number" min="0" placeholder="最高金額" value={form.budget_max} onChange={e => setForm({...form, budget_max: e.target.value})} />
                </div>
              </div>

              <div className="form-group">
                <label>排單需求</label>
                <div className="radio-group">
                  <label className="radio-label"><input type="radio" checked={form.schedule_type === 'flexible'} onChange={() => setForm({...form, schedule_type: 'flexible', specific_date: ''})} /> 可接受排單</label>
                  <label className="radio-label"><input type="radio" checked={form.schedule_type === 'fixed'} onChange={() => setForm({...form, schedule_type: 'fixed'})} /> 指定交稿日</label>
                  {form.schedule_type === 'fixed' && <input type="date" className="date-input" value={form.specific_date} onChange={e => setForm({...form, specific_date: e.target.value})} required />}
                </div>
              </div>
            </div>
          </div>

          <div className="form-section">
            <label className="section-title">付款方式 (多選)</label>
            <div className="tag-selector">
              {PAY_TAGS.map(t => <span key={t} className={`selectable-tag ${form.payment_methods.includes(t) ? 'selected' : ''}`} onClick={() => toggleTag(t, 'payment_methods')}>{t}</span>)}
              {form.payment_methods.filter((t: string) => !PAY_TAGS.includes(t) && t !== '皆可配合').map((t: string) => (
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
                {REQ_TAGS.map(t => <span key={t} className={`selectable-tag style ${form.tags.includes(t) ? 'selected' : ''}`} onClick={() => toggleTag(t, 'tags')}>{t}</span>)}
                {form.tags.filter((t: string) => !REQ_TAGS.includes(t)).map((t: string) => (
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
            <textarea rows={5} className="detail-textarea" placeholder="請詳細描述您的委託需求、角色設定或特殊要求..." value={form.content} onChange={e => setForm({...form, content: e.target.value})} required></textarea>
          </div>

          <div className="modal-footer">
             <button type="button" className="btn-cancel" onClick={onClose}>取消</button>
             <button type="submit" className="submit-post-btn" disabled={isUploading}>確認發布許願</button>
          </div>
        </form>
      </div>
    </div>
  );
};