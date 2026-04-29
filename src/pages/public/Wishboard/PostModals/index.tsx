// src/pages/public/Wishboard/PostModals/index.tsx
import React, { useState } from 'react';
import { X, Plus, Trash2, HelpCircle, Image as ImageIcon } from 'lucide-react';
import { ImageUploader } from '../../../../components/ImageUploader';
import { REQ_TAGS, PAY_TAGS, STYLE_WARNINGS, LICENSE_TAGS, PAYMENT_TIMING } from '../constants';

interface PostModalProps {
  activeTab: 'request' | 'offer' | 'other';
  postForm: any;
  setPostForm: React.Dispatch<React.SetStateAction<any>>;
  isUploading: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onImageUpload: (resultBlobs: { preview: Blob }) => void;
  toggleTag: (tag: string, field: 'tags' | 'payment_methods') => void;
  userShowcase?: any[];
}

export const PostModal: React.FC<PostModalProps> = ({
  activeTab,
  postForm,
  setPostForm,
  isUploading,
  onClose,
  onSubmit,
  onImageUpload,
  toggleTag,
  userShowcase = []
}) => {
  const [customTagInput, setCustomTagInput] = useState('');
  const [itemInput, setItemInput] = useState({ name: '', price: '' });
  const [showPortfolioPicker, setShowPortfolioPicker] = useState(false);

  const isOffer = activeTab === 'offer';

  // 移除標籤邏輯
  const removeCustomTag = (tag: string) => {
    setPostForm((prev: any) => ({
      ...prev,
      tags: prev.tags.filter((t: string) => t !== tag)
    }));
  };

  // 圖片管理邏輯
  const togglePortfolioImage = (url: string) => {
    setPostForm((prev: any) => {
      const isSelected = prev.ref_images.includes(url);
      if (isSelected) {
        return { ...prev, ref_images: prev.ref_images.filter((img: string) => img !== url) };
      } else {
        if (prev.ref_images.length >= 5) return prev;
        return { ...prev, ref_images: [...prev.ref_images, url] };
      }
    });
  };

  const removeImage = (index: number) => {
    setPostForm((prev: any) => ({
      ...prev,
      ref_images: prev.ref_images.filter((_: any, i: number) => i !== index)
    }));
  };

  // 接案項目邏輯
  const addCommissionItem = () => {
    if (!itemInput.name.trim()) return;
    setPostForm((prev: any) => ({
      ...prev,
      commission_items: [...prev.commission_items, { ...itemInput }]
    }));
    setItemInput({ name: '', price: '' });
  };

  const removeCommissionItem = (index: number) => {
    setPostForm((prev: any) => ({
      ...prev,
      commission_items: prev.commission_items.filter((_: any, i: number) => i !== index)
    }));
  };

  return (
    <div className="modal-overlay">
      <div className="post-modal" style={{ maxWidth: '850px', maxHeight: '95vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <h2>
            {activeTab === 'request' ? '發布徵委託需求' : 
             activeTab === 'offer' ? '發布接委託' : '發布其他'}
          </h2>
          <button type="button" className="close-modal-btn" onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
            <X size={24} color="#999" />
          </button>
        </div>
        
        <form onSubmit={onSubmit} className="post-form" style={{ padding: '24px', gap: '24px' }}>
          
          {/* 圖片管理區 */}
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <label style={{ fontWeight: 'bold' }}>作品範例 / 價目表展示 (最多 5 張，單張 3MB 內)</label>
              {isOffer && userShowcase.length > 0 && (
                <button 
                  type="button" 
                  onClick={() => setShowPortfolioPicker(!showPortfolioPicker)}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', background: '#f3f4f6', border: '1px solid #d1d5db', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer' }}
                >
                  <ImageIcon size={14} /> {showPortfolioPicker ? "關閉作品集" : "從作品集挑選"}
                </button>
              )}
            </div>

            {showPortfolioPicker && (
              <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px', marginBottom: '15px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '8px' }}>
                {userShowcase.map((item) => (
                  <div 
                    key={item.id} 
                    onClick={() => togglePortfolioImage(item.image_key)}
                    style={{ position: 'relative', width: '80px', height: '80px', borderRadius: '6px', overflow: 'hidden', cursor: 'pointer', border: postForm.ref_images.includes(item.image_key) ? '3px solid #9333ea' : '1px solid #ddd' }}
                  >
                    <img src={item.image_key} alt="Portfolio" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    {postForm.ref_images.includes(item.image_key) && (
                      <div style={{ position: 'absolute', top: 0, right: 0, background: '#9333ea', color: 'white', padding: '2px' }}><Plus size={12}/></div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {postForm.ref_images.map((url: string, idx: number) => (
                <div key={idx} style={{ position: 'relative', width: '120px', height: '120px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #eee' }}>
                  <img src={url} alt="範例" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button type="button" onClick={() => removeImage(idx)} style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', cursor: 'pointer', padding: '4px' }}><X size={14}/></button>
                </div>
              ))}
              {postForm.ref_images.length < 5 && (
                <div style={{ width: '120px', height: '120px', border: '2px dashed #cbd5e1', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <ImageUploader onUpload={onImageUpload} targetWidth={1200} buttonText={isUploading ? "..." : "+ 上傳"} maxSizeMB={3} />
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 350px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="form-group">
                <label style={{ fontWeight: 'bold' }}>貼文標題</label>
                <input type="text" placeholder={isOffer ? "例如：接長期立繪、Q版頭貼" : "簡單描述你的需求"} value={postForm.title} onChange={e => setPostForm({...postForm, title: e.target.value})} required style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
              </div>

              {isOffer && (
                <div className="form-group" style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <label style={{ color: '#475569', marginBottom: '12px', display: 'block', fontWeight: 'bold' }}>接案項目與底價 (選填)</label>
                  <div className="item-input-row" style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                    <input type="text" placeholder="項目名稱" value={itemInput.name} onChange={e => setItemInput({...itemInput, name: e.target.value})} style={{ flex: 2, padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                    <input type="number" placeholder="起步價" value={itemInput.price} onChange={e => setItemInput({...itemInput, price: e.target.value})} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                    <button type="button" onClick={addCommissionItem} style={{ padding: '8px 12px', background: '#9333ea', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}><Plus size={18}/></button>
                  </div>
                  <div className="added-items-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {postForm.commission_items.map((item: any, idx: number) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '14px' }}>
                        <span>{item.name} <span style={{ color: '#94a3b8', marginLeft: '8px' }}>${item.price}~</span></span>
                        <button type="button" onClick={() => removeCommissionItem(idx)} style={{ color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer' }}><Trash2 size={16}/></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!isOffer && (
                <div className="form-group">
                  <label style={{ fontWeight: 'bold' }}>預算範圍</label>
                  <div className="budget-inputs" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <input type="number" min="0" placeholder="最低" value={postForm.budget_min} onChange={e => setPostForm({...postForm, budget_min: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                    <span>~</span>
                    <input type="number" min="0" placeholder="最高" value={postForm.budget_max} onChange={e => setPostForm({...postForm, budget_max: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                  </div>
                </div>
              )}

              <div className="form-group">
                <label style={{ fontWeight: 'bold' }}>{isOffer ? '目前排單狀況' : '排單需求'}</label>
                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                  <label style={{ fontWeight: 'normal', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input type="radio" name="schedule" checked={postForm.schedule_type === 'flexible'} onChange={() => setPostForm({...postForm, schedule_type: 'flexible', specific_date: ''})} /> {isOffer ? '目前空閒' : '可接受排單'}
                  </label>
                  <label style={{ fontWeight: 'normal', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input type="radio" name="schedule" checked={postForm.schedule_type === 'fixed'} onChange={() => setPostForm({...postForm, schedule_type: 'fixed'})} /> {isOffer ? '指定日期' : '指定交稿日'}
                  </label>
                  {postForm.schedule_type === 'fixed' && (
                    <input type="date" value={postForm.specific_date} onChange={e => setPostForm({...postForm, specific_date: e.target.value})} style={{ padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1' }} required />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 接委託名額與支付邏輯 */}
          {isOffer && (
            <>
              <div className="form-group" style={{ background: '#fffbeb', padding: '20px', borderRadius: '12px', border: '1px solid #fef3c7' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <label style={{ color: '#92400e', marginBottom: 0, fontWeight: 'bold' }}>名額與徵集機制</label>
                  <div title="先搶先贏則依投單順序額滿為止。" style={{ cursor: 'help', color: '#d97706' }}><HelpCircle size={16}/></div>
                </div>
                <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <label style={{ fontWeight: 'normal', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input type="radio" value="fcfs" checked={postForm.selection_type === 'fcfs'} onChange={() => setPostForm({...postForm, selection_type: 'fcfs'})} /> 先搶先贏
                  </label>
                  <label style={{ fontWeight: 'normal', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input type="radio" value="curated" checked={postForm.selection_type === 'curated'} onChange={() => setPostForm({...postForm, selection_type: 'curated'})} /> 繪師選設
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '14px', color: '#92400e' }}>名額上限：</span>
                    <input type="number" min="1" value={postForm.max_slots} onChange={e => setPostForm({...postForm, max_slots: e.target.value})} style={{ width: '70px', padding: '6px', borderRadius: '6px', border: '1px solid #fcd34d' }} />
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label style={{ fontWeight: 'bold' }}>支付時機說明 (僅告知，不涉及實體交易)</label>
                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginTop: '8px' }}>
                  {PAYMENT_TIMING.map(t => (
                    <label key={t.value} style={{ fontWeight: 'normal', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                      <input type="radio" checked={postForm.payment_timing === t.value} onChange={() => setPostForm({...postForm, payment_timing: t.value})} /> {t.label}
                    </label>
                  ))}
                </div>
                {(postForm.payment_timing === 'deposit' || postForm.payment_timing === 'other') && (
                  <input type="text" placeholder="詳細描述支付時機..." value={postForm.payment_timing_detail} onChange={e => setPostForm({...postForm, payment_timing_detail: e.target.value})} style={{ width: '100%', marginTop: '12px', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} required />
                )}
              </div>
            </>
          )}

          <div className="form-group">
            <label style={{ fontWeight: 'bold' }}>收款方式 (多選)</label>
            <div className="tag-selector">
              {PAY_TAGS.map(t => (
                <span key={t} className={`selectable-tag ${postForm.payment_methods.includes(t) ? 'selected' : ''}`} onClick={() => toggleTag(t, 'payment_methods')}>{t}</span>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label style={{ fontWeight: 'bold' }}>標籤與規格 (複選)</label>
            <div className="tag-selector">
              {isOffer && [...STYLE_WARNINGS, ...LICENSE_TAGS].map(t => (
                <span key={t} className={`selectable-tag ${postForm.tags.includes(t) ? 'selected' : ''}`} onClick={() => toggleTag(t, 'tags')}>{t}</span>
              ))}
              {REQ_TAGS.map(t => (
                <span key={t} className={`selectable-tag ${postForm.tags.includes(t) ? 'selected' : ''}`} onClick={() => toggleTag(t, 'tags')}>{t}</span>
              ))}
              {postForm.tags.filter((t: string) => !REQ_TAGS.includes(t) && !STYLE_WARNINGS.includes(t) && !LICENSE_TAGS.includes(t)).map((t: string) => (
                <span key={t} className="selectable-tag selected custom-tag">
                  {t} <X size={12} style={{ cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); removeCustomTag(t); }} />
                </span>
              ))}
              <input type="text" className="inline-tag-input" placeholder="+ 自定義標籤" value={customTagInput} onChange={e => setCustomTagInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (customTagInput.trim()) { toggleTag(customTagInput.trim(), 'tags'); setCustomTagInput(''); } } }} />
            </div>
          </div>

          <div className="form-group">
            <label style={{ fontWeight: 'bold' }}>詳細說明</label>
            <textarea rows={4} value={postForm.content} onChange={e => setPostForm({...postForm, content: e.target.value})} required style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '8px' }}></textarea>
          </div>

          {isOffer && (
            <div className="form-group">
              <label style={{ fontWeight: 'bold' }}>投單提問模板</label>
              <textarea rows={4} value={postForm.question_template} onChange={e => setPostForm({...postForm, question_template: e.target.value})} placeholder="讓案主填寫的需求單格式..." style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }}></textarea>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '10px' }}>
            <button type="submit" className="submit-post-btn" disabled={isUploading} style={{ background: '#ff8c00', color: 'white', padding: '12px 36px', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}>
              確認發布{isOffer ? '接案' : '許願'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};