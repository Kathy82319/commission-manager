// src/pages/public/Wishboard/PostModals/index.tsx
import React, { useState } from 'react';
import { X, Plus, Trash2, HelpCircle, Image as ImageIcon, Save, Download } from 'lucide-react';
import { ImageUploader } from '../../../../components/ImageUploader';
import { 
  REQ_TAGS, 
  PAY_TAGS, 
  STYLE_WARNINGS, 
  LICENSE_TAGS, 
  PAYMENT_TIMING,
  R2_PUBLIC_URL 
} from '../constants';

interface PostModalProps {
  activeTab: 'request' | 'offer' | 'other';
  postForm: any;
  setPostForm: React.Dispatch<React.SetStateAction<any>>;
  isUploading: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onImageUpload: (resultBlobs: { preview: Blob }) => void;
  toggleTag: (tag: string, field: 'tags' | 'payment_methods') => void;
  userShowcase: any[];
  onSaveDraft: () => void;
  onLoadDraft: () => void;
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
  userShowcase,
  onSaveDraft,
  onLoadDraft
}) => {
  const [customTagInput, setCustomTagInput] = useState('');
  const [itemInput, setItemInput] = useState({ name: '', price: '' });
  const [showPortfolioPicker, setShowPortfolioPicker] = useState(false);

  const isOffer = activeTab === 'offer';

  // 移除圖片
  const removeImage = (index: number) => {
    setPostForm((prev: any) => ({
      ...prev,
      ref_images: prev.ref_images.filter((_: any, i: number) => i !== index)
    }));
  };

  // 切換作品集圖片
  const togglePortfolioImage = (imageKey: string) => {
    setPostForm((prev: any) => {
      const exists = prev.ref_images.includes(imageKey);
      if (exists) {
        return { ...prev, ref_images: prev.ref_images.filter((img: string) => img !== imageKey) };
      } else {
        if (prev.ref_images.length >= (isOffer ? 5 : 1)) return prev;
        return { ...prev, ref_images: [...prev.ref_images, imageKey] };
      }
    });
  };

  // 提問模板：新增/修改/刪除 (最多 3 題)
  const addQuestion = () => {
    if (postForm.questions.length >= 3) return;
    setPostForm((prev: any) => ({ ...prev, questions: [...prev.questions, ''] }));
  };

  const updateQuestion = (index: number, value: string) => {
    const newQuestions = [...postForm.questions];
    newQuestions[index] = value;
    setPostForm((prev: any) => ({ ...prev, questions: newQuestions }));
  };

  const removeQuestion = (index: number) => {
    const newQuestions = postForm.questions.filter((_: any, i: number) => i !== index);
    setPostForm((prev: any) => ({ ...prev, questions: newQuestions }));
  };

  // 接案項目：新增/刪除
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

  // 取得完整圖片路徑，防止破圖
  const getFullUrl = (url: string) => {
    if (url.startsWith('http')) return url;
    return `${R2_PUBLIC_URL}/${url}`;
  };

  return (
    <div className="modal-overlay">
      <div className="post-modal">
        <div className="modal-header">
          <h2>{activeTab === 'request' ? '發布徵委託需求' : isOffer ? '發布接委託' : '發布其他'}</h2>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {isOffer && (
              <>
                <button type="button" onClick={onLoadDraft} className="save-hint-btn"><Download size={14} /> 載入預設</button>
                <button type="button" onClick={onSaveDraft} className="save-hint-btn"><Save size={14} /> 設為預設</button>
              </>
            )}
            <button type="button" className="close-modal-btn" onClick={onClose}><X size={24} /></button>
          </div>
        </div>
        
        <form onSubmit={onSubmit} className="post-form">
          
          {/* 圖片管理區 */}
          <div className="form-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="section-title">
                {isOffer ? '作品範例 / 價目表 (最多 5 張)' : '參考例圖 (最多 1 張)'}
              </label>
              {isOffer && userShowcase.length > 0 && (
                <button type="button" onClick={() => setShowPortfolioPicker(!showPortfolioPicker)} className="add-btn-circle">
                  <ImageIcon size={14} /> {showPortfolioPicker ? "關閉作品集" : "從作品集挑選"}
                </button>
              )}
            </div>

            {showPortfolioPicker && (
              <div className="portfolio-picker-grid">
                {userShowcase.map((item: any) => (
                  <div 
                    key={item.id} 
                    className={`portfolio-item ${postForm.ref_images.includes(item.image_key) ? 'selected' : ''}`}
                    onClick={() => togglePortfolioImage(item.image_key)}
                  >
                    <img src={getFullUrl(item.image_key)} alt="Portfolio" />
                    {postForm.ref_images.includes(item.image_key) && <div className="check-overlay"><Plus size={24} /></div>}
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {postForm.ref_images.map((url: string, idx: number) => (
                <div key={idx} className="image-preview-box" style={{ width: '120px', height: '120px' }}>
                  <img src={getFullUrl(url)} alt="預覽" />
                  <button type="button" className="remove-image-btn" onClick={() => removeImage(idx)}><X size={14}/></button>
                </div>
              ))}
              {postForm.ref_images.length < (isOffer ? 5 : 1) && (
                <div style={{ width: '120px', height: '120px', border: '2px dashed #cbd5e1', borderRadius: '8px' }}>
                  <ImageUploader onUpload={onImageUpload} buttonText={isUploading ? "..." : "+ 上傳"} maxSizeMB={3} />
                </div>
              )}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>標題</label>
              <input type="text" placeholder="輸入標題..." value={postForm.title} onChange={e => setPostForm({...postForm, title: e.target.value})} required />
            </div>

            {!isOffer && (
              <div className="form-group">
                <label>預算範圍</label>
                <div className="budget-inputs">
                  <input type="number" min="0" value={postForm.budget_min} onChange={e => setPostForm({...postForm, budget_min: e.target.value})} />
                  <span className="budget-separator">~</span>
                  <input type="number" min="0" value={postForm.budget_max} onChange={e => setPostForm({...postForm, budget_max: e.target.value})} />
                </div>
              </div>
            )}
          </div>

          {/* 接委託專用設定 */}
          {isOffer && (
            <>
              {/* 接案項目 */}
              <div className="form-section">
                <label className="section-title">接案項目與底價 (選填)</label>
                <div className="dynamic-question-row">
                  <input type="text" placeholder="項目 (如：全彩半身)" value={itemInput.name} onChange={e => setItemInput({...itemInput, name: e.target.value})} style={{ flex: 2 }} />
                  <input type="number" placeholder="底價" value={itemInput.price} onChange={e => setItemInput({...itemInput, price: e.target.value})} style={{ flex: 1 }} />
                  <button type="button" onClick={addCommissionItem} className="add-btn-circle"><Plus size={18}/></button>
                </div>
                <div className="item-manage-box">
                  {postForm.commission_items.length === 0 && <p style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center' }}>尚未新增項目</p>}
                  {postForm.commission_items.map((item: any, idx: number) => (
                    <div key={idx} className="item-row">
                      <span>{item.name} (${item.price}~)</span>
                      <button type="button" onClick={() => removeCommissionItem(idx)} style={{ color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer' }}><Trash2 size={16}/></button>
                    </div>
                  ))}
                </div>
              </div>

              {/* 🌟 補回：名額機制與 HelpCircle */}
              <div className="form-section selection-mechanism-box">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label className="section-title" style={{ borderLeft: 'none', paddingLeft: 0, margin: 0 }}>名額機制</label>
                  <div title="先搶先贏則依投單順序額滿為止；選設制則由您挑選。" style={{ cursor: 'help', color: '#d97706' }}>
                    <HelpCircle size={16}/>
                  </div>
                </div>
                <div className="mechanism-radio-group">
                  <label className="radio-label"><input type="radio" checked={postForm.selection_type === 'fcfs'} onChange={() => setPostForm({...postForm, selection_type: 'fcfs'})} /> 先搶先贏</label>
                  <label className="radio-label"><input type="radio" checked={postForm.selection_type === 'curated'} onChange={() => setPostForm({...postForm, selection_type: 'curated'})} /> 繪師選設</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px' }}>上限：</span>
                    <input type="number" min="1" value={postForm.max_slots} onChange={e => setPostForm({...postForm, max_slots: e.target.value})} style={{ width: '60px' }} />
                  </div>
                </div>
                <p style={{ fontSize: '12px', color: '#b45309' }}>
                   {postForm.selection_type === 'curated' ? '💡 案主端將顯示：繪師會選擇適洽設定來接單' : '💡 案主端將顯示：剩餘名額 (滿額自動關閉)'}
                </p>
              </div>

              {/* 🌟 補回：支付時機與說明 */}
              <div className="form-section">
                <label className="section-title">支付時機說明 (僅告知，不涉及實體交易)</label>
                <div className="radio-group">
                  {PAYMENT_TIMING.map(t => (
                    <label key={t.value} className="radio-label">
                      <input type="radio" checked={postForm.payment_timing === t.value} onChange={() => setPostForm({...postForm, payment_timing: t.value})} /> {t.label}
                    </label>
                  ))}
                </div>
                {(postForm.payment_timing === 'deposit' || postForm.payment_timing === 'other') && (
                  <input type="text" placeholder="詳細描述支付時機..." value={postForm.payment_timing_detail} onChange={e => setPostForm({...postForm, payment_timing_detail: e.target.value})} style={{ marginTop: '12px' }} required />
                )}
              </div>

              {/* 提問模板 */}
              <div className="form-section">
                <label className="section-title">提問模板 (讓案主回答，最多 3 題)</label>
                {postForm.questions.map((q: string, idx: number) => (
                  <div key={idx} className="dynamic-question-row">
                    <input 
                      type="text" 
                      placeholder={`題目 ${idx + 1} (如：角色設定 / 用途...)`} 
                      value={q} 
                      onChange={e => updateQuestion(idx, e.target.value)} 
                      style={{ flex: 1 }}
                    />
                    <button type="button" onClick={() => removeQuestion(idx)} style={{ border: 'none', background: 'none', color: '#94a3b8', cursor: 'pointer' }}><Trash2 size={18}/></button>
                  </div>
                ))}
                {postForm.questions.length < 3 && (
                  <button type="button" onClick={addQuestion} className="add-btn-circle" style={{ width: 'fit-content' }}><Plus size={14} /> 新增題目</button>
                )}
              </div>

              {/* 服務條款 */}
              <div className="form-section">
                <label className="section-title">委託服務條款 (TOS)</label>
                <textarea 
                  rows={4} 
                  placeholder="請在此輸入您的委託規則、修改次數說明、版權說明等..." 
                  value={postForm.tos_content} 
                  onChange={e => setPostForm({...postForm, tos_content: e.target.value})}
                ></textarea>
              </div>
            </>
          )}

          {/* 收款方式與標籤設定 */}
          <div className="form-section">
            <label className="section-title">收款方式 (多選)</label>
            <div className="tag-selector">
              {PAY_TAGS.map(t => (
                <span key={t} className={`selectable-tag ${postForm.payment_methods.includes(t) ? 'selected' : ''}`} onClick={() => toggleTag(t, 'payment_methods')}>{t}</span>
              ))}
            </div>
          </div>

          <div className="form-section">
            <label className="section-title">標籤設定</label>
            
            {isOffer && (
              <>
                <div className="tag-selector-group">
                  <span className="label-hint">風格預警 (紅色標籤)</span>
                  <div className="tag-selector">
                    {STYLE_WARNINGS.map(t => (
                      <span key={t} className={`selectable-tag warning ${postForm.tags.includes(t) ? 'selected' : ''}`} onClick={() => toggleTag(t, 'tags')}>{t}</span>
                    ))}
                  </div>
                </div>
                <div className="tag-selector-group">
                  <span className="label-hint">授權/接受範圍 (綠色標籤)</span>
                  <div className="tag-selector">
                    {LICENSE_TAGS.map(t => (
                      <span key={t} className={`selectable-tag license ${postForm.tags.includes(t) ? 'selected' : ''}`} onClick={() => toggleTag(t, 'tags')}>{t}</span>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div className="tag-selector-group">
              <span className="label-hint">風格類型與自定義</span>
              <div className="tag-selector">
                {REQ_TAGS.map(t => (
                  <span key={t} className={`selectable-tag style ${postForm.tags.includes(t) ? 'selected' : ''}`} onClick={() => toggleTag(t, 'tags')}>{t}</span>
                ))}
                
                {/* 顯示自己新增的自定義標籤 */}
                {postForm.tags.filter((t: string) => !REQ_TAGS.includes(t) && !STYLE_WARNINGS.includes(t) && !LICENSE_TAGS.includes(t)).map((t: string) => (
                  <span key={t} className="selectable-tag style selected custom-tag">
                    {t} <X size={12} style={{ cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); toggleTag(t, 'tags'); }} />
                  </span>
                ))}

                {/* 🌟 補回：自定義標籤輸入框 */}
                <input 
                  type="text" 
                  className="compact-tag-input" 
                  placeholder="+ 自定義" 
                  value={customTagInput}
                  onChange={e => setCustomTagInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (customTagInput.trim()) { toggleTag(customTagInput.trim(), 'tags'); setCustomTagInput(''); }
                    }
                  }}
                />
              </div>
            </div>
          </div>

          <div className="form-group" style={{ marginTop: '8px' }}>
            <label className="section-title" style={{ borderLeft: 'none', paddingLeft: 0 }}>詳細內容</label>
            <textarea rows={4} className="detail-textarea" value={postForm.content} onChange={e => setPostForm({...postForm, content: e.target.value})} required></textarea>
          </div>

          <div className="modal-footer">
             <button type="button" className="btn-cancel" onClick={onClose}>取消</button>
             <button type="submit" className="submit-post-btn" disabled={isUploading}>
               確認發布{isOffer ? '接案' : '許願'}
             </button>
          </div>
        </form>
      </div>
    </div>
  );
};