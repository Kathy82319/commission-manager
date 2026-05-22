import React, { useState } from 'react';
import { X, Plus, Trash2, HelpCircle, Download, Save, Image as ImageIcon } from 'lucide-react';

// 若專案無 @/ 路徑配置，請將此行改為相對路徑（例如：'../components/ImageUploader'）
// @ts-ignore
import ImageUploader from '@/components/ImageUploader';

// 宣告 process 避免 TypeScript 報錯 (找不到名稱 process)
declare var process: any;

// 靜態常數定義
const PAYMENT_TIMING = [
  { value: 'front_full', label: '全額前付' },
  { value: 'back_full', label: '完稿後付' },
  { value: 'deposit', label: '階段式收取訂金/尾款' },
  { value: 'other', label: '其他 (請於下方說明)' }
];

const PAY_TAGS = ['銀行轉帳', '匯款', '綠界科技', 'PayPal', 'LINE Pay', '皆可配合'];
const STYLE_WARNINGS = ['流血/暴力', 'R18/純愛', 'R18G/獵奇', '老人/肌肉/福瑞', '爭議政治話題', '全齡向'];
const LICENSE_TAGS = ['買斷/商業非獨佔', '僅限非商業用途', '允許二次改作', '禁止二次改作', '需標註原作者出處'];
const REQ_TAGS = ['純文字通靈', '精細設定圖', '部分草圖即可', '只接大頭貼', '只接立繪', '排單制', '急件可議'];

interface ShowcaseFormBuilderProps {
  form: any;
  setForm: React.Dispatch<React.SetStateAction<any>>;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  userShowcase?: any[];
  onSaveDraft: () => void;
  onLoadDraft: () => void;
}

export default function ShowcaseFormBuilder({
  form,
  setForm,
  onSubmit,
  onClose,
  userShowcase = [],
  onSaveDraft,
  onLoadDraft
}: ShowcaseFormBuilderProps) {
  
  // 內部 UI 互動狀態
  const [isUploading, setIsUploading] = useState(false);
  const [showPortfolioPicker, setShowPortfolioPicker] = useState(false);
  const [showMechanismInfo, setShowMechanismInfo] = useState(false);
  const [itemInput, setItemInput] = useState({ name: '', price: '' });
  
  // 自定義標籤輸入暫存
  const [customPaymentInput, setCustomPaymentInput] = useState('');
  const [customWarningInput, setCustomWarningInput] = useState('');
  const [customLicenseInput, setCustomLicenseInput] = useState('');
  const [customTagInput, setCustomTagInput] = useState('');

  // 輔助函式：處理圖片網址開頭
  const getFullUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `${process.env.NEXT_PUBLIC_API_URL || ''}${url}`;
  };

  // 1. 圖片上傳回呼
  const onImageUpload = (url: string) => {
    setIsUploading(true);
    setForm((prev: any) => {
      const currentImages = prev.ref_images || [];
      if (currentImages.length >= 5) {
        alert("最多只能上傳 5 張作品範例圖片喔！");
        setIsUploading(false);
        return prev;
      }
      setIsUploading(false);
      return {
        ...prev,
        ref_images: [...currentImages, url]
      };
    });
  };

  // 2. 移除指定圖片
  const removeImage = (indexToRemove: number) => {
    setForm((prev: any) => ({
      ...prev,
      ref_images: (prev.ref_images || []).filter((_: any, idx: number) => idx !== indexToRemove)
    }));
  };

  // 3. 作品集快速切換 勾選/取消
  const togglePortfolioImage = (url: string) => {
    setForm((prev: any) => {
      const currentImages = prev.ref_images || [];
      if (currentImages.includes(url)) {
        return {
          ...prev,
          ref_images: currentImages.filter((img: string) => img !== url)
        };
      } else {
        if (currentImages.length >= 5) {
          alert("最多只能選擇 5 張作品範例圖片喔！");
          return prev;
        }
        return {
          ...prev,
          ref_images: [...currentImages, url]
        };
      }
    });
  };

  // 4. 接案項目管理
  const addCommissionItem = () => {
    if (!itemInput.name || !itemInput.price) {
      alert("請輸入項目名稱與底價");
      return;
    }
    const newItem = { name: itemInput.name, price: Number(itemInput.price) };
    setForm((prev: any) => ({
      ...prev,
      commission_items: [...(prev.commission_items || []), newItem]
    }));
    setItemInput({ name: '', price: '' });
  };

  const removeCommissionItem = (indexToRemove: number) => {
    setForm((prev: any) => ({
      ...prev,
      commission_items: (prev.commission_items || []).filter((_: any, idx: number) => idx !== indexToRemove)
    }));
  };

  // 5. 提問模板管理
  const addQuestion = () => {
    const currentQs = form.questions || [];
    if (currentQs.length >= 3) return;
    setForm((prev: any) => ({
      ...prev,
      questions: [...currentQs, '']
    }));
  };

  const updateQuestion = (index: number, val: string) => {
    setForm((prev: any) => {
      const updated = [...(prev.questions || [])];
      updated[index] = val;
      return { ...prev, questions: updated };
    });
  };

  const removeQuestion = (indexToRemove: number) => {
    setForm((prev: any) => ({
      ...prev,
      questions: (prev.questions || []).filter((_: any, idx: number) => idx !== indexToRemove)
    }));
  };

  // 6. 標籤多選管理（含自定義群組）
  const toggleTag = (tag: string, field: 'tags' | 'payment_methods') => {
    setForm((prev: any) => {
      const currentArr = prev[field] || [];
      if (currentArr.includes(tag)) {
        return { ...prev, [field]: currentArr.filter((t: string) => t !== tag) };
      } else {
        return { ...prev, [field]: [...currentArr, tag] };
      }
    });
  };

  const removeTag = (tag: string, field: 'tags' | 'payment_methods') => {
    setForm((prev: any) => ({
      ...prev,
      [field]: (prev[field] || []).filter((t: string) => t !== tag)
    }));
  };

  const handleTagInput = (value: string, setter: (v: string) => void, field: 'tags' | 'payment_methods', prefix = '') => {
    const trimmed = value.trim();
    if (!trimmed) return;
    const finalTag = prefix ? `${prefix}${trimmed}` : trimmed;
    
    setForm((prev: any) => {
      const currentArr = prev[field] || [];
      if (currentArr.includes(finalTag)) return prev;
      return { ...prev, [field]: [...currentArr, finalTag] };
    });
    setter('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, value: string, setter: (v: string) => void, field: 'tags' | 'payment_methods', prefix = '') => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleTagInput(value, setter, field, prefix);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="post-modal split-layout-modal">
        
        {/* 固定頂部 Header */}
        <div className="modal-header">
          <h2>發布接委託</h2>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button type="button" onClick={onLoadDraft} className="save-hint-btn">
              <Download size={14} /> 載入預設
            </button>
            <button type="button" className="close-modal-btn" onClick={onClose}>
              <X size={24} />
            </button>
          </div>
        </div>
        
        {/* 主要表單區域：切分為左右雙欄結構 */}
        <form onSubmit={onSubmit} className="post-form modal-content-split">
          
          {/* ================= 左側固定區：圖片與作品集 ================= */}
          <div className="modal-left-side">
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <label className="section-title" style={{ margin: 0 }}>
                  作品範例 / 價目表 ({form.ref_images?.length || 0}/5)
                </label>
                {userShowcase && userShowcase.length > 0 && (
                  <button 
                    type="button" 
                    onClick={() => setShowPortfolioPicker(!showPortfolioPicker)} 
                    className="add-btn-circle" 
                    style={{ background: '#f1f5f9', color: '#475569', padding: '4px 10px', borderRadius: '20px', fontSize: '12px' }}
                  >
                    <ImageIcon size={14} /> {showPortfolioPicker ? "隱藏作品集" : "自作品集挑選"}
                  </button>
                )}
              </div>

              {/* 圖片預覽與上傳區：九宮格網格 */}
              <div className="image-grid-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px' }}>
                {(form.ref_images || []).map((url: string, idx: number) => (
                  <div key={idx} className="image-preview-box" style={{ width: '100%', aspectRatio: '1', position: 'relative', borderRadius: '8px', overflow: 'visible' }}>
                    <img src={getFullUrl(url)} alt="預覽" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} />
                    {idx === 0 && (
                      <span className="main-cover-badge" style={{ position: 'absolute', bottom: '4px', left: '4px', background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: '10px', padding: '2px 6px', borderRadius: '4px' }}>
                        主封面
                      </span>
                    )}
                    <button 
                      type="button" 
                      className="remove-image-btn" 
                      onClick={() => removeImage(idx)}
                      style={{ position: 'absolute', top: '-4px', right: '-4px', background: '#ef4444', color: 'white', borderRadius: '50%', padding: '2px', border: '1px solid white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <X size={12}/>
                    </button>
                  </div>
                ))}
                
                {(form.ref_images || []).length < 5 && (
                  <div style={{ width: '100%', aspectRatio: '1', border: '2px dashed #cbd5e1', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: '#fff' }}>
                    <ImageUploader onUpload={onImageUpload} targetWidth={1000} buttonText={isUploading ? "..." : "+ 上傳"} maxSizeMB={3} aspectRatio={1} />
                  </div>
                )}
              </div>

              {/* 作品集快速挑選器 */}
              {showPortfolioPicker && userShowcase && (
                <div className="portfolio-picker-section" style={{ flex: 1, overflowY: 'auto', marginTop: '4px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
                  <span style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '8px' }}>點擊圖片快速加入 / 移除：</span>
                  <div className="portfolio-picker-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                    {userShowcase.filter((item: any) => item && item.cover_url).map((item: any) => {
                      const isSelected = (form.ref_images || []).includes(item.cover_url);
                      return (
                        <div 
                          key={item.id} 
                          className={`portfolio-item ${isSelected ? 'selected' : ''}`} 
                          onClick={() => togglePortfolioImage(item.cover_url)} 
                          style={{ aspectRatio: '1', position: 'relative', cursor: 'pointer', borderRadius: '8px', overflow: 'hidden', border: isSelected ? '2px solid #3b82f6' : '1px solid #e2e8f0' }}
                        >
                          <img src={getFullUrl(item.cover_url)} alt={item.title || "Portfolio"} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          {isSelected && (
                            <div className="check-overlay" style={{ position: 'absolute', inset: 0, background: 'rgba(59, 130, 246, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                              <Plus size={20} style={{ transform: 'rotate(45deg)' }} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              <div style={{ marginTop: 'auto', paddingTop: '12px', fontSize: '11px', color: '#64748b', lineHeight: '1.4' }}>
                💡 提示：建議尺寸 1000x1000 (1:1)。排列在第一張的圖片將會自動作為縮圖主封面。
              </div>
            </div>
          </div>

          {/* ================= 右側滾動區：表單填寫欄位 ================= */}
          <div className="modal-right-side">
            
            {/* 委託基本資訊 */}
            <div className="form-section">
              <label className="section-title">委託基本資訊</label>
              <div className="dynamic-question-row" style={{ alignItems: 'flex-start', gap: '20px' }}>
                <div className="form-group" style={{ flex: 1, margin: 0 }}>
                  <label>委託募集標題</label>
                  <input
                    type="text"
                    placeholder="例如：長期接精細立繪、Q版動態頭貼..."
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

            {/* 接案項目與底價 */}
            <div className="form-section">
              <label className="section-title">接案項目與底價 (選填)</label>
              <div className="dynamic-question-row" style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                <input type="text" placeholder="項目名稱 (如：Q版頭貼...)" value={itemInput.name} onChange={e => setItemInput({...itemInput, name: e.target.value})} style={{ flex: 2 }} />
                <input type="number" placeholder="底價" value={itemInput.price} onChange={e => setItemInput({...itemInput, price: e.target.value})} style={{ flex: 1 }} />
                <button type="button" onClick={addCommissionItem} className="add-btn-circle"><Plus size={18}/></button>
              </div>
              <div className="item-manage-box" style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                {(form.commission_items || []).length === 0 && <p style={{ fontSize: '13px', color: '#94a3b8', textAlign: 'center', margin: 0 }}>尚未新增具體接案項目</p>}
                {(form.commission_items || []).map((item: any, idx: number) => (
                  <div key={idx} className="item-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: idx !== form.commission_items.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                    <span style={{ fontWeight: '500', color: '#334155' }}>{item.name} <span style={{ color: '#ff8c00', marginLeft: '8px' }}>${item.price}~</span></span>
                    <button type="button" onClick={() => removeCommissionItem(idx)} style={{ color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><Trash2 size={16}/></button>
                  </div>
                ))}
              </div>
            </div>

            {/* 詳細接案說明 */}
            <div className="form-section">
              <label className="section-title">詳細接案說明</label>
              <textarea rows={4} className="detail-textarea" placeholder="請詳細描述你的風格特點、不擅長或拒接的設定，以及詳細流程..." value={form.content || ''} onChange={e => setForm({...form, content: e.target.value})} required></textarea>
            </div>              

            {/* 名額與徵集機制 */}
            <div className="form-section selection-mechanism-box">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label className="section-title" style={{ borderLeft: 'none', paddingLeft: 0, margin: 0 }}>名額與徵集機制</label>
                <div title="點擊查看機制說明" style={{ cursor: 'pointer', color: '#d97706', display: 'flex', alignItems: 'center' }} onClick={() => setShowMechanismInfo(!showMechanismInfo)}>
                  <HelpCircle size={16}/>
                </div>
              </div>
              
              {showMechanismInfo && (
                <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', color: '#92400E', lineHeight: '1.6' }}>
                  <strong style={{ display: 'block', marginBottom: '4px' }}>如何選擇機制？</strong>
                  <ul style={{ paddingLeft: '20px', margin: 0 }}>
                    <li style={{ marginBottom: '4px' }}><strong>先搶先贏：</strong>適合確認較快的委託，名額一旦收滿將自動停止接收投遞。</li>
                    <li><strong>繪師選設：</strong>適合需要評估角色設定的委託。不採用秒殺機制，沒有投遞的名額限制，您可以慢慢挑選心儀的設定來洽談。</li>
                  </ul>
                </div>
              )}

              <div className="mechanism-radio-group" style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '8px' }}>
                <label className="radio-label">
                  <input type="radio" checked={form.selection_type === 'fcfs'} onChange={() => setForm({...form, selection_type: 'fcfs'})} /> 先搶先贏
                </label>
                <label className="radio-label">
                  <input type="radio" checked={form.selection_type === 'curated'} onChange={() => setForm({...form, selection_type: 'curated'})} /> 繪師選設
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
                  <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#92400e' }}>預計招收名額：</span>
                  <input type="number" min="1" value={form.max_slots || 1} onChange={e => setForm({...form, max_slots: e.target.value})} style={{ width: '80px', padding: '6px 10px', borderRadius: '6px', border: '1px solid #fcd34d' }} />
                </div>
              </div>
              
              <p style={{ fontSize: '13px', color: '#b45309', margin: '12px 0 0 0', fontWeight: '500' }}>
                {form.selection_type === 'curated'
                  ? '💡 許願池將顯示：繪師會選擇設定來接稿，開放自由投遞，手速不影響機會。'
                  : '💡 許願池將顯示：當前已投遞人數 / 總名額，滿額時系統將自動關閉投單。'}
              </p>
            </div>

            {/* 支付時機說明 */}
            <div className="form-section">
              <label className="section-title">支付時機與收款方式</label>
              <div className="radio-group" style={{ marginBottom: '12px' }}>
                {PAYMENT_TIMING.map(t => (
                  <label key={t.value} className="radio-label">
                    <input type="radio" checked={form.payment_timing === t.value} onChange={() => setForm({...form, payment_timing: t.value})} /> {t.label}
                  </label>
                ))}
              </div>
              {(form.payment_timing === 'deposit' || form.payment_timing === 'other') && (
                <input type="text" placeholder="請詳細描述您的收款時機... (例如：草稿確認後收30%訂金，完稿後收尾款)" value={form.payment_timing_detail || ''} onChange={e => setForm({...form, payment_timing_detail: e.target.value})} style={{ marginTop: '12px', width: '100%', marginBottom: '16px' }} required />
              )}
              
              <span className="label-hint" style={{ display: 'block', margin: '16px 0 8px 0', fontWeight: 'bold' }}>收款方式 (可多選)</span>
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

            {/* 提問模板 */}
            <div className="form-section">
              <label className="section-title">提問模板 (委託人投單時需填寫，最多 3 題)</label>
              {(form.questions || []).map((q: string, idx: number) => (
                <div key={idx} className="dynamic-question-row" style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
                  <input type="text" placeholder={`請輸入自訂問題 ${idx + 1} (例如：角色性格、是否有指定差分...)`} value={q} onChange={e => updateQuestion(idx, e.target.value)} style={{ flex: 1 }} />
                  <button type="button" onClick={() => removeQuestion(idx)} style={{ border: 'none', background: 'none', color: '#94a3b8', cursor: 'pointer', padding: '8px' }}><Trash2 size={18}/></button>
                </div>
              ))}
              {(form.questions || []).length < 3 && (
                <button type="button" onClick={addQuestion} className="add-btn-circle" style={{ width: 'fit-content', marginTop: '4px', padding: '4px 12px', fontSize: '13px' }}>
                  <Plus size={14} /> 新增題目欄位
                </button>
              )}
            </div>

            {/* 委託服務條款 (TOS) */}
            <div className="form-section">
              <label className="section-title">委託服務條款 (TOS)</label>
              <p className="label-hint" style={{ margin: '0 0 8px 0' }}>💡 委託人在填寫需求單前必須先點擊勾選同意此條款，保障雙方權益。</p>
              <textarea rows={5} className="detail-textarea" placeholder="請輸入您的版權使用範圍說明（如：禁止商用、禁止非轉交改作）、修改次數規範等..." value={form.tos_content || ''} onChange={e => setForm({...form, tos_content: e.target.value})}></textarea>
            </div>

            {/* 標籤與規格 */}
            <div className="form-section">
              <label className="section-title">標籤與類別規格</label>
              
              <div className="tag-selector-group" style={{ marginBottom: '16px' }}>
                <span className="label-hint" style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>風格預警 / 接案傾向</span>
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

              <div className="tag-selector-group" style={{ marginBottom: '16px' }}>
                <span className="label-hint" style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>授權範圍 / 接受程度</span>
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
                <span className="label-hint" style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>風格類型與其他自定義標籤</span>
                <div className="tag-selector">
                  {REQ_TAGS.map(t => <span key={t} className={`selectable-tag style ${(form.tags || []).includes(t) ? 'selected' : ''}`} onClick={() => toggleTag(t, 'tags')}>{t}</span>)}
                  {(form.tags || []).filter((t: string) => !REQ_TAGS.includes(t) && !STYLE_WARNINGS.includes(t) && !LICENSE_TAGS.includes(t) && !t.startsWith('[預警]') && !t.startsWith('[授權]')).map((t: string) => (
                    <span key={t} className="selectable-tag style selected custom-tag">{t} <X size={12} onClick={(e) => { e.stopPropagation(); removeTag(t, 'tags'); }} /></span>
                  ))}
                  <input
                    type="text"
                    className="compact-tag-input"
                    placeholder="+ 自定義標籤"
                    value={customTagInput}
                    onChange={e => setCustomTagInput(e.target.value)}
                    onKeyDown={e => handleKeyDown(e, customTagInput, setCustomTagInput, 'tags')}
                    onBlur={() => handleTagInput(customTagInput, setCustomTagInput, 'tags')}
                  />
                </div>
              </div>
            </div>
          </div>
          
          {/* 固定底部 Footer 按鈕區 */}
          <div className="modal-footer">
            <button type="button" className="btn-cancel" onClick={onClose} style={{ marginRight: 'auto' }}>
              關閉
            </button>
            <button type="button" className="btn-cancel" onClick={onSaveDraft} style={{ border: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Save size={16} /> 儲存為預設
            </button>
            <button type="submit" className="submit-post-btn" disabled={isUploading} style={{ marginLeft: '12px' }}>
              {isUploading ? "圖片上傳中..." : "確認發布接案"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}