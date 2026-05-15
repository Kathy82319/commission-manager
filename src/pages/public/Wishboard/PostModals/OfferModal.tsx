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

interface OfferModalProps {
  form: any;
  setForm: React.Dispatch<React.SetStateAction<any>>;
  isUploading: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onImageUpload: (resultBlobs: { preview: Blob }) => void;
  userShowcase: any[];
  onSaveDraft: () => void;
  onLoadDraft: () => void;
}

export const OfferModal: React.FC<OfferModalProps> = ({
  form,
  setForm,
  isUploading,
  onClose,
  onSubmit,
  onImageUpload,
  userShowcase,
  onSaveDraft,
  onLoadDraft
}) => {
  const [customTagInput, setCustomTagInput] = useState('');
  const [customWarningInput, setCustomWarningInput] = useState('');
  const [customLicenseInput, setCustomLicenseInput] = useState('');
  const [customPaymentInput, setCustomPaymentInput] = useState('');
  
  const [itemInput, setItemInput] = useState({ name: '', price: '' });
  const [showPortfolioPicker, setShowPortfolioPicker] = useState(false);
  
  const [showMechanismInfo, setShowMechanismInfo] = useState(false);

  const removeImage = (index: number) => {
    setForm((prev: any) => ({
      ...prev,
      ref_images: prev.ref_images.filter((_: any, i: number) => i !== index)
    }));
  };

  const togglePortfolioImage = (imagePath: string) => {
    if (!imagePath) return;
    setForm((prev: any) => {
      const exists = prev.ref_images.includes(imagePath);
      if (exists) {
        return { ...prev, ref_images: prev.ref_images.filter((img: string) => img !== imagePath) };
      } else {
        if (prev.ref_images.length >= 5) return prev; 
        return { ...prev, ref_images: [...prev.ref_images, imagePath] };
      }
    });
  };

  const getFullUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${R2_PUBLIC_URL}/${url}`;
  };

  const toggleTag = (tag: string, field: 'tags' | 'payment_methods') => {
    setForm((prev: any) => {
      let list = prev[field] || [];
      const exclusiveTag = field === 'tags' ? '不限' : '皆可配合';
      
      if (tag === exclusiveTag) {
        if (field === 'tags') {
          list = list.filter((t: string) => STYLE_WARNINGS.includes(t) || LICENSE_TAGS.includes(t) || t.startsWith('[預警]') || t.startsWith('[授權]'));
          list.push(tag);
        } else {
          list = [tag];
        }
      } else {
        if (list.includes(tag)) {
          list = list.filter((t: string) => t !== tag);
        } else {
          list = [...list.filter((t: string) => t !== exclusiveTag), tag];
        }
      }
      return { ...prev, [field]: list };
    });
  };

  const removeTag = (tag: string, field: 'tags' | 'payment_methods') => {
    setForm((prev: any) => ({ ...prev, [field]: (prev[field] || []).filter((t: string) => t !== tag) }));
  };

  const handleTagInput = (
    value: string, 
    setValue: React.Dispatch<React.SetStateAction<string>>, 
    field: 'tags' | 'payment_methods', 
    prefix: string = ''
  ) => {
    let safeValue = value.replace(/[<>"'&]/g, ''); 
    const trimmed = safeValue.trim().replace(/,/g, '').replace(/，/g, '').replace(/\s+/g, ''); 
    
    if (trimmed) {
      toggleTag(prefix + trimmed, field);
      setValue('');
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>, 
    value: string, 
    setValue: React.Dispatch<React.SetStateAction<string>>, 
    field: 'tags' | 'payment_methods', 
    prefix: string = ''
  ) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === '，' || e.key === ' ') {
      e.preventDefault();
      handleTagInput(value, setValue, field, prefix);
    }
  };

  const addQuestion = () => { 
    if (form.questions.length < 3) setForm((prev: any) => ({ ...prev, questions: [...prev.questions, ''] })); 
  };
  const updateQuestion = (index: number, value: string) => { 
    const n = [...form.questions]; n[index] = value; setForm((prev: any) => ({ ...prev, questions: n })); 
  };
  const removeQuestion = (index: number) => { 
    setForm((prev: any) => ({ ...prev, questions: form.questions.filter((_: any, i: number) => i !== index) })); 
  };
  
  const addCommissionItem = () => {
    if (!itemInput.name.trim()) return;
    const safeName = itemInput.name.replace(/[<>"'&]/g, '');
    setForm((prev: any) => ({ ...prev, commission_items: [...prev.commission_items, { name: safeName, price: itemInput.price }] }));
    setItemInput({ name: '', price: '' });
  };
  const removeCommissionItem = (index: number) => { 
    setForm((prev: any) => ({ ...prev, commission_items: prev.commission_items.filter((_: any, i: number) => i !== index) })); 
  };

  return (
    <div className="modal-overlay">
      <div className="post-modal">
        <div className="modal-header">
          <h2>發布接委託</h2>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button type="button" onClick={onLoadDraft} className="save-hint-btn"><Download size={14} /> 載入預設</button>
            <button type="button" onClick={onSaveDraft} className="save-hint-btn"><Save size={14} /> 儲存預設</button>
            <button type="button" className="close-modal-btn" onClick={onClose}><X size={24} /></button>
          </div>
        </div>
        
        <form onSubmit={onSubmit} className="post-form">
          <div className="form-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="section-title">作品範例 / 價目表 (最多 5 張)</label>
              {userShowcase && userShowcase.length > 0 && (
                <button type="button" onClick={() => setShowPortfolioPicker(!showPortfolioPicker)} className="add-btn-circle" style={{ background: '#f1f5f9', color: '#475569' }}>
                  <ImageIcon size={14} /> {showPortfolioPicker ? "隱藏作品集" : "從作品集挑選"}
                </button>
              )}
            </div>

            {showPortfolioPicker && userShowcase && (
              <div className="portfolio-picker-grid" style={{ marginBottom: '12px' }}>
                {userShowcase.filter((item: any) => item && item.cover_url).map((item: any) => (
                  <div key={item.id} className={`portfolio-item ${(form.ref_images || []).includes(item.cover_url) ? 'selected' : ''}`} onClick={() => togglePortfolioImage(item.cover_url)}>
                    <img src={getFullUrl(item.cover_url)} alt={item.title || "Portfolio"} />
                    {(form.ref_images || []).includes(item.cover_url) && <div className="check-overlay"><Plus size={24} /></div>}
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
              {(form.ref_images || []).map((url: string, idx: number) => (
                <div key={idx} className="image-preview-box" style={{ width: '120px', height: '120px', position: 'relative', overflow: 'hidden', borderRadius: '12px', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img src={getFullUrl(url)} alt="預覽" style={{ width: '100%', height: '100%', objectFit: 'contain', zIndex: 1 }} />
                  <div style={{ position: 'absolute', width: '100%', aspectRatio: '1/1', border: '1px dashed #ff8c00', boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.65)', pointerEvents: 'none', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 2 }} />
                  <button type="button" className="remove-image-btn" onClick={() => removeImage(idx)} style={{ zIndex: 10 }}><X size={14}/></button>
                </div>
              ))}
              {(form.ref_images || []).length < 5 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ width: '120px', height: '120px', border: '2px dashed #cbd5e1', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ImageUploader onUpload={onImageUpload} targetWidth={1000} buttonText={isUploading ? "上傳中..." : "+ 上傳圖片"} maxSizeMB={3} />
                  </div>
                  <span style={{ fontSize: '11px', color: '#64748b', whiteSpace: 'nowrap' }}>建議尺寸：1:1 正方形</span>
                  <span style={{ fontSize: '10px', color: '#94a3b8', whiteSpace: 'nowrap' }}>※ 電腦/手機版皆為 1:1 呈現<br/>橘框外暗色處將被裁切</span>
                </div>
              )}
            </div>
          </div>

          <div className="form-section">
            <label className="section-title">委託基本資訊</label>
            <div className="dynamic-question-row" style={{ alignItems: 'flex-start', gap: '20px' }}>
              
              <div className="form-group" style={{ flex: 1, margin: 0 }}>
                <label>標題</label>
                <input 
                  type="text" 
                  placeholder="例如：接立繪、Q版頭貼..." 
                  value={form.title || ''} 
                  onChange={e => setForm({...form, title: e.target.value})} 
                  required 
                  style={{ width: '100%' }}
                />
              </div>

              
              <div className="form-group" style={{ flex: 1, margin: 0 }}>
                <label>目前排單狀況</label>
                <div className="radio-group">
                  <label className="radio-label">
                    <input 
                      type="radio" 
                      checked={form.schedule_type === 'flexible'} 
                      onChange={() => setForm({...form, schedule_type: 'flexible', specific_date: ''})} 
                    /> 目前空閒可排單
                  </label>
                  <label className="radio-label">
                    <input 
                      type="radio" 
                      checked={form.schedule_type === 'fixed'} 
                      onChange={() => setForm({...form, schedule_type: 'fixed'})} 
                    /> 排單至指定日期之後
                  </label>
                  {form.schedule_type === 'fixed' && (
                    <input 
                      type="date" 
                      className="date-input" 
                      value={form.specific_date || ''} 
                      onChange={e => setForm({...form, specific_date: e.target.value})} 
                      required 
                      style={{ width: '100%', marginTop: '8px' }}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="form-section">
            <label className="section-title">接案項目與底價 (選填)</label>
            <div className="dynamic-question-row">
              <input type="text" placeholder="項目名稱 (如：Q版頭貼...)" value={itemInput.name} onChange={e => setItemInput({...itemInput, name: e.target.value})} style={{ flex: 2 }} />
              <input type="number" placeholder="底價" value={itemInput.price} onChange={e => setItemInput({...itemInput, price: e.target.value})} style={{ flex: 1 }} />
              <button type="button" onClick={addCommissionItem} className="add-btn-circle"><Plus size={18}/></button>
            </div>
            <div className="item-manage-box">
              {(form.commission_items || []).length === 0 && <p style={{ fontSize: '13px', color: '#94a3b8', textAlign: 'center', margin: 0 }}>尚未新增接案項目</p>}
              {(form.commission_items || []).map((item: any, idx: number) => (
                <div key={idx} className="item-row">
                  <span style={{ fontWeight: '500', color: '#334155' }}>{item.name} <span style={{ color: '#ff8c00', marginLeft: '8px' }}>${item.price}~</span></span>
                  <button type="button" onClick={() => removeCommissionItem(idx)} style={{ color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><Trash2 size={16}/></button>
                </div>
              ))}
            </div>
          </div>

          <div className="form-section selection-mechanism-box">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label className="section-title" style={{ borderLeft: 'none', paddingLeft: 0, margin: 0 }}>名額與徵集機制</label>
              <div 
                title="點擊查看機制說明" 
                style={{ cursor: 'pointer', color: '#d97706' }} 
                onClick={() => setShowMechanismInfo(!showMechanismInfo)}
              >
                <HelpCircle size={16}/>
              </div>
            </div>
            
            {showMechanismInfo && (
              <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', color: '#92400E', lineHeight: '1.6' }}>
                <strong style={{ display: 'block', marginBottom: '4px' }}>如何選擇機制？</strong>
                <ul style={{ paddingLeft: '20px', margin: 0 }}>
                  <li style={{ marginBottom: '4px' }}><strong>先搶先贏：</strong>適合確認較快的委託，名額一旦收滿將自動停止接收投遞。</li>
                  <li><strong>繪師選設：</strong>適合需要評估角色設定的委託。不採用秒殺機制，沒有投遞的名額限制，只有呈現你預計最終會選擇的稿件數量，您可以慢慢挑選心儀的設定來洽談。</li>
                </ul>
              </div>
            )}

            <div className="mechanism-radio-group">
              <label className="radio-label">
                <input type="radio" checked={form.selection_type === 'fcfs'} onChange={() => setForm({...form, selection_type: 'fcfs'})} /> 
                先搶先贏
              </label>
              <label className="radio-label">
                <input type="radio" checked={form.selection_type === 'curated'} onChange={() => setForm({...form, selection_type: 'curated'})} /> 
                繪師選設
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '10px' }}>
                <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#92400e' }}>預計招收名額：</span>
                <input type="number" min="1" value={form.max_slots || 1} onChange={e => setForm({...form, max_slots: e.target.value})} style={{ width: '80px', padding: '6px 10px', borderRadius: '6px', border: '1px solid #fcd34d' }} />
              </div>
            </div>
            
            <p style={{ fontSize: '13px', color: '#b45309', margin: '8px 0 0 0', fontWeight: '500' }}>
              {form.selection_type === 'curated' 
                ? '💡 許願池將顯示：繪師會選擇設定來接稿，預計招收' 
                : '💡 許願池將顯示：目前已投遞人數 / 預計招收名額，招收名額滿將會自動關閉'}
            </p>
          </div>

          <div className="form-section">
            <label className="section-title">支付時機說明</label>
            <div className="radio-group">
              {PAYMENT_TIMING.map(t => (
                <label key={t.value} className="radio-label">
                  <input type="radio" checked={form.payment_timing === t.value} onChange={() => setForm({...form, payment_timing: t.value})} /> {t.label}
                </label>
              ))}
            </div>
            {(form.payment_timing === 'deposit' || form.payment_timing === 'other') && (
              <input type="text" placeholder="請詳細描述您的收款時機... (例如：草稿確認後收30%訂金)" value={form.payment_timing_detail || ''} onChange={e => setForm({...form, payment_timing_detail: e.target.value})} style={{ marginTop: '12px' }} required />
            )}
            
            <label className="section-title" style={{ marginTop: '16px' }}>收款方式 (多選)</label>
            <div className="tag-selector">
              {PAY_TAGS.map(t => (
                <span key={t} className={`selectable-tag ${(form.payment_methods || []).includes(t) ? 'selected' : ''}`} onClick={() => toggleTag(t, 'payment_methods')}>{t}</span>
              ))}
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
            <label className="section-title">提問模板 (案主投單時需回答，最多 3 題)</label>
            {(form.questions || []).map((q: string, idx: number) => (
              <div key={idx} className="dynamic-question-row">
                <input type="text" placeholder={`請輸入題目 ${idx + 1}`} value={q} onChange={e => updateQuestion(idx, e.target.value)} style={{ flex: 1 }} />
                <button type="button" onClick={() => removeQuestion(idx)} style={{ border: 'none', background: 'none', color: '#94a3b8', cursor: 'pointer', padding: '8px' }}><Trash2 size={18}/></button>
              </div>
            ))}
            {(form.questions || []).length < 3 && <button type="button" onClick={addQuestion} className="add-btn-circle" style={{ width: 'fit-content', marginTop: '4px' }}><Plus size={14} /> 新增題目</button>}
          </div>

          <div className="form-section">
            <label className="section-title">委託服務條款 (TOS)</label>
            <p className="label-hint" style={{ margin: '0 0 8px 0' }}>案主在填寫需求單前，必須先點擊同意此條款，此服務條款會持續顯示在雙方的委託單管理頁中。</p>
            <textarea rows={5} className="detail-textarea" placeholder="請輸入您的版權說明、修改次數限制、禁止項目等..." value={form.tos_content || ''} onChange={e => setForm({...form, tos_content: e.target.value})}></textarea>
          </div>

          <div className="form-section">
            <label className="section-title">標籤與規格</label>
            
            <div className="tag-selector-group">
              <span className="label-hint">風格預警</span>
              <div className="tag-selector">
                {STYLE_WARNINGS.map(t => <span key={t} className={`selectable-tag warning ${(form.tags || []).includes(t) ? 'selected' : ''}`} onClick={() => toggleTag(t, 'tags')}>{t}</span>)}
                {(form.tags || []).filter((t: string) => t.startsWith('[預警]')).map((t: string) => (
                  <span key={t} className="selectable-tag warning selected custom-tag">{t.replace('[預警]', '')} <X size={12} onClick={(e) => { e.stopPropagation(); removeTag(t, 'tags'); }} /></span>
                ))}
                <input 
                  type="text" 
                  className="compact-tag-input" 
                  placeholder="+ 自定義" 
                  value={customWarningInput} 
                  onChange={e => setCustomWarningInput(e.target.value)} 
                  onKeyDown={e => handleKeyDown(e, customWarningInput, setCustomWarningInput, 'tags', '[預警]')}
                  onBlur={() => handleTagInput(customWarningInput, setCustomWarningInput, 'tags', '[預警]')}
                />
              </div>
            </div>

            <div className="tag-selector-group">
              <span className="label-hint">授權 / 接受範圍</span>
              <div className="tag-selector">
                {LICENSE_TAGS.map(t => <span key={t} className={`selectable-tag license ${(form.tags || []).includes(t) ? 'selected' : ''}`} onClick={() => toggleTag(t, 'tags')}>{t}</span>)}
                {(form.tags || []).filter((t: string) => t.startsWith('[授權]')).map((t: string) => (
                  <span key={t} className="selectable-tag license selected custom-tag">{t.replace('[授權]', '')} <X size={12} onClick={(e) => { e.stopPropagation(); removeTag(t, 'tags'); }} /></span>
                ))}
                <input 
                  type="text" 
                  className="compact-tag-input" 
                  placeholder="+ 自定義" 
                  value={customLicenseInput} 
                  onChange={e => setCustomLicenseInput(e.target.value)} 
                  onKeyDown={e => handleKeyDown(e, customLicenseInput, setCustomLicenseInput, 'tags', '[授權]')}
                  onBlur={() => handleTagInput(customLicenseInput, setCustomLicenseInput, 'tags', '[授權]')}
                />
              </div>
            </div>

            <div className="tag-selector-group">
              <span className="label-hint">風格類型與自定義</span>
              <div className="tag-selector">
                {REQ_TAGS.map(t => <span key={t} className={`selectable-tag style ${(form.tags || []).includes(t) ? 'selected' : ''}`} onClick={() => toggleTag(t, 'tags')}>{t}</span>)}
                {(form.tags || []).filter((t: string) => !REQ_TAGS.includes(t) && !STYLE_WARNINGS.includes(t) && !LICENSE_TAGS.includes(t) && !t.startsWith('[預警]') && !t.startsWith('[授權]')).map((t: string) => (
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
            <label className="section-title">詳細接案說明</label>
            <textarea rows={4} className="detail-textarea" placeholder="除了上述設定外，還有其他想補充的細節嗎？" value={form.content || ''} onChange={e => setForm({...form, content: e.target.value})} required></textarea>
          </div>

          <div className="modal-footer">
             <button type="button" className="btn-cancel" onClick={onClose}>取消</button>
             <button type="submit" className="submit-post-btn" disabled={isUploading}>確認發布接案</button>
          </div>
        </form>
      </div>
    </div>
  );
};