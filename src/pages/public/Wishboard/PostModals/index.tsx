// src/pages/public/Wishboard/PostModals/index.tsx
import React, { useState } from 'react';
import { X } from 'lucide-react';
import { ImageUploader } from '../../../../components/ImageUploader';
import { REQ_TAGS, PAY_TAGS } from '../constants';

interface PostModalProps {
  activeTab: 'request' | 'offer' | 'other';
  postForm: any;
  setPostForm: React.Dispatch<React.SetStateAction<any>>;
  isUploading: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onImageUpload: (resultBlobs: { preview: Blob }) => void;
  toggleTag: (tag: string, field: 'tags' | 'payment_methods') => void;
}

export const PostModal: React.FC<PostModalProps> = ({
  activeTab,
  postForm,
  setPostForm,
  isUploading,
  onClose,
  onSubmit,
  onImageUpload,
  toggleTag
}) => {
  const [customTagInput, setCustomTagInput] = useState('');

  const removeCustomTag = (tag: string) => {
    setPostForm((prev: any) => ({
      ...prev,
      tags: prev.tags.filter((t: string) => t !== tag)
    }));
  };

  return (
    <div className="modal-overlay">
      <div className="post-modal" style={{ maxWidth: '800px' }}>
        <div className="modal-header">
          <h2>
            {activeTab === 'request' ? '發布徵委託需求' : 
             activeTab === 'offer' ? '發布接案' : '發布其他'}
          </h2>
          <button type="button" className="close-modal-btn" onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex' }}>
            <X size={24} color="#999" />
          </button>
        </div>
        
        <form onSubmit={onSubmit} className="post-form" style={{ padding: '24px', gap: '20px' }}>
          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
            
            <div className="form-group" style={{ width: '240px', flexShrink: 0 }}>
              <label>範例參考圖 / 價目表 (建議 1MB 內)</label>
              {postForm.ref_image_key ? (
                <div style={{ position: 'relative', width: '100%', height: '320px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #ddd' }}>
                  <img src={postForm.ref_image_key} alt="預覽" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button type="button" onClick={() => setPostForm({...postForm, ref_image_key: ''})} style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', cursor: 'pointer', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={16}/></button>
                </div>
              ) : (
                <div style={{ width: '100%', height: '320px', borderRadius: '8px', overflow: 'hidden' }}>
                  <ImageUploader onUpload={onImageUpload} targetWidth={800} buttonText={isUploading ? "上傳中..." : "選擇圖片"} maxSizeMB={5} />
                </div>
              )}
            </div>

            <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="form-group">
                <label>標題</label>
                <input type="text" placeholder={activeTab === 'offer' ? "例如：接長期立繪、Q版頭貼" : "簡單描述你的需求"} value={postForm.title} onChange={e => setPostForm({...postForm, title: e.target.value})} required style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
              </div>
              
              <div className="form-group">
                <label>{activeTab === 'offer' ? '價格範圍 (起步價~最高)' : '預算範圍'}</label>
                <div className="budget-inputs" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  {/* 🌟 加上 min="0" 防止負數 */}
                  <input type="number" min="0" placeholder="最低" value={postForm.budget_min} onChange={e => setPostForm({...postForm, budget_min: e.target.value})} style={{ width: '110px', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                  <span style={{ color: '#94a3b8', fontWeight: 'bold' }}>~</span>
                  <input type="number" min="0" placeholder="最高" value={postForm.budget_max} onChange={e => setPostForm({...postForm, budget_max: e.target.value})} style={{ width: '110px', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                </div>
              </div>

              <div className="form-group" style={{ width: '100%' }}>
                <label>{activeTab === 'offer' ? '目前排單狀況' : '排單需求'}</label>
                <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap', minHeight: '42px' }}>
                  <label style={{ fontWeight: 'normal', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', whiteSpace: 'nowrap', color: '#475569' }}>
                    <input type="radio" name="schedule" checked={postForm.schedule_type === 'flexible'} onChange={() => setPostForm({...postForm, schedule_type: 'flexible', specific_date: ''})} style={{ width: '18px', height: '18px', margin: 0, cursor: 'pointer' }} /> {activeTab === 'offer' ? '目前空閒可排單' : '可接受排單'}
                  </label>
                  <label style={{ fontWeight: 'normal', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', whiteSpace: 'nowrap', color: '#475569' }}>
                    <input type="radio" name="schedule" checked={postForm.schedule_type === 'fixed'} onChange={() => setPostForm({...postForm, schedule_type: 'fixed'})} style={{ width: '18px', height: '18px', margin: 0, cursor: 'pointer' }} /> {activeTab === 'offer' ? '排單至指定日期：' : '指定完成日期：'}
                  </label>
                  {postForm.schedule_type === 'fixed' && (
                    <input type="date" value={postForm.specific_date} onChange={e => setPostForm({...postForm, specific_date: e.target.value})} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', flexShrink: 0 }} required />
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label>付款方式</label>
            <div className="tag-selector">
              {PAY_TAGS.map(t => (
                <span key={t} className={`selectable-tag ${postForm.payment_methods.includes(t) ? 'selected' : ''}`} onClick={() => toggleTag(t, 'payment_methods')}>{t}</span>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>標籤 (複選)</label>
            <div className="tag-selector">
              {REQ_TAGS.map(t => (
                <span key={t} className={`selectable-tag ${postForm.tags.includes(t) ? 'selected' : ''}`} onClick={() => toggleTag(t, 'tags')}>{t}</span>
              ))}
              {postForm.tags.filter((t: string) => !REQ_TAGS.includes(t)).map((t: string) => (
                <span key={t} className="selectable-tag selected custom-tag" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {t} <X size={12} style={{ cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); removeCustomTag(t); }} />
                </span>
              ))}
              <input type="text" className="inline-tag-input" placeholder="+ 自定義 (按 Enter 加入)" value={customTagInput} onChange={e => setCustomTagInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (customTagInput.trim()) { toggleTag(customTagInput.trim(), 'tags'); setCustomTagInput(''); } } }} style={{ width: '160px', padding: '6px 12px', borderRadius: '20px', border: '1px dashed #aaa' }} />
            </div>
          </div>

          <div className="form-group">
            <label>{activeTab === 'offer' ? '接案詳細說明' : '詳細需求說明'}</label>
            <textarea rows={3} value={postForm.content} onChange={e => setPostForm({...postForm, content: e.target.value})} required style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }}></textarea>
          </div>

          {activeTab === 'offer' && (
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>投單提問模板 <span style={{ fontSize: '12px', color: '#9333ea', fontWeight: 'normal', background: '#f3e8ff', padding: '2px 8px', borderRadius: '12px' }}>案主投遞時必填</span></label>
              <textarea rows={4} value={postForm.question_template} onChange={e => setPostForm({...postForm, question_template: e.target.value})} placeholder="例如：&#10;1. 角色設定與名稱：&#10;2. 委託用途 (自用/商用)：&#10;3. 是否需要加急？&#10;4. 其他備註事項：" style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }}></textarea>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '8px' }}>
            <button type="submit" className="submit-post-btn" disabled={isUploading} style={{ background: '#ff8c00', color: 'white', padding: '12px 28px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px', boxShadow: '0 4px 12px rgba(255, 140, 0, 0.3)' }}>
              {activeTab === 'request' ? '發布許願單' : activeTab === 'offer' ? '發布接案' : '發布'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};