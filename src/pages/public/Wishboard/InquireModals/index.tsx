// src/pages/public/Wishboard/InquireModals/index.tsx
import React, { useState, useEffect } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { ImageUploader } from '../../../../components/ImageUploader';
import { R2_PUBLIC_URL } from '../constants'; 

interface InquireModalProps {
  selectedBulletin: any;
  inquireDraft: any;
  setInquireDraft: React.Dispatch<React.SetStateAction<any>>;
  inquireTagInputs: any;
  setInquireTagInputs: React.Dispatch<React.SetStateAction<any>>;
  inquireUploading: boolean;
  onClose: () => void;
  onSubmit: () => void;
  onImageUpload: (resultBlobs: { preview: Blob }) => void;
}

const unescapeHtml = (str: string) => {
  if (!str) return '';
  return str.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#039;/g, "'");
};

const getFullUrl = (url: string) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${R2_PUBLIC_URL}/${url}`;
};

export const InquireModal: React.FC<InquireModalProps> = ({
  selectedBulletin, inquireDraft, setInquireDraft, inquireTagInputs, setInquireTagInputs,
  inquireUploading, onClose, onSubmit, onImageUpload
}) => {
  if (!selectedBulletin) return null;

  const isOffer = selectedBulletin.category === 'offer';

  let parsedContent: any = {};
  try {
    parsedContent = JSON.parse(unescapeHtml(selectedBulletin.content));
  } catch (e) {
    parsedContent = {};
  }
  
  const questions: string[] = parsedContent.questions || [];
  const tosContent: string = parsedContent.tos_content || '';

  const [hasAgreedTOS, setHasAgreedTOS] = useState(tosContent ? false : true);

  // 🌟 修正 1：在元件載入時，直接將預設的空問題綁定到外層狀態
  useEffect(() => {
    if (isOffer && questions.length > 0 && !inquireDraft.answers) {
      setInquireDraft((prev: any) => ({
        ...prev,
        answers: questions.map((q: string) => ({ question: q, answer: '' }))
      }));
    }
  }, [isOffer, questions.length, setInquireDraft]);

  const handleTagAdd = (field: 'specialties' | 'no_gos' | 'payment_methods') => {
    const rawValue = inquireTagInputs[field];
    if (!rawValue) return;

    // 🛡️ 資安防護：過濾危險字元
    const safeValue = rawValue.replace(/[<>"'&]/g, '');
    const value = safeValue.trim().replace(/,/g, '').replace(/，/g, '').replace(/\s+/g, '');

    if (!value) {
      setInquireTagInputs((prev: any) => ({ ...prev, [field]: '' }));
      return;
    }

    setInquireDraft((prev: any) => {
      const currentTags = prev[field] ? prev[field].split(' ').filter((t: string) => t) : [];
      if (currentTags.includes(value)) return prev;
      return { ...prev, [field]: [...currentTags, value].join(' ') };
    });
    setInquireTagInputs((prev: any) => ({ ...prev, [field]: '' }));
  };

  const handleTagRemove = (field: 'specialties' | 'no_gos' | 'payment_methods', tagToRemove: string) => {
    setInquireDraft((prev: any) => {
      const currentTags = prev[field].split(' ').filter((t: string) => t !== tagToRemove);
      return { ...prev, [field]: currentTags.join(' ') };
    });
  };

  const handleAgreeTOS = () => setHasAgreedTOS(true);

  // 🌟 修正 2：不需再做非同步字串組合，直接送出！
  const handleFinalSubmit = () => {
    onSubmit();
  };

  if (isOffer && !hasAgreedTOS) {
    return (
      <div className="modal-overlay">
        <div className="post-modal" style={{ maxWidth: '600px' }}>
          <div className="modal-header">
            <h2>委託服務條款 (TOS)</h2>
            <button className="close-modal-btn" onClick={onClose}><X size={24} /></button>
          </div>
          <div className="post-form">
            <div className="form-section">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#e11d48', fontWeight: 'bold', marginBottom: '12px' }}>
                <AlertTriangle size={20} /> 在填寫委託單前，請詳細閱讀繪師的接案條款
              </div>
              <div style={{ background: '#f1f5f9', padding: '16px', borderRadius: '8px', whiteSpace: 'pre-wrap', maxHeight: '300px', overflowY: 'auto', border: '1px solid #cbd5e1', fontSize: '14px', lineHeight: '1.6' }}>
                {tosContent}
              </div>
            </div>
            <div className="modal-footer" style={{ borderTop: 'none', padding: '0' }}>
              <button className="btn-cancel" onClick={onClose}>拒絕並離開</button>
              <button className="submit-post-btn" onClick={handleAgreeTOS}>我已閱讀並同意</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay">
      <div className="post-modal" style={{ maxWidth: '700px' }}>
        <div className="modal-header">
          <h2>{isOffer ? '填寫委託需求單' : '發送專屬提案卡'}</h2>
          <button className="close-modal-btn" onClick={onClose}><X size={24} /></button>
        </div>
        
        <div className="post-form">
          <p className="label-hint">
            {isOffer 
              ? '請根據繪師的要求填寫需求，這將幫助繪師決定是否接受您的委託。'
              : '與其丟文字履歷，不如直接給案主看您的作品！'}
          </p>

          <div className="form-section">
            <label className="section-title">
              {isOffer ? '附上參考設定圖 (最多 3 張)' : '附上參考圖 / 價目表 (最多 3 張)'}
            </label>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {inquireDraft.images.map((imgUrl: string, idx: number) => (
                <div key={idx} className="image-preview-box" style={{ width: '120px', height: '120px' }}>
                  <img src={getFullUrl(imgUrl)} alt={`附件 ${idx + 1}`} />
                  <button type="button" className="remove-image-btn" onClick={() => setInquireDraft((prev: any) => ({...prev, images: prev.images.filter((_: any, i: number) => i !== idx)}))}>
                    <X size={14}/>
                  </button>
                </div>
              ))}
              {inquireDraft.images.length < 3 && (
                <div style={{ width: '120px', height: '120px', border: '2px dashed #cbd5e1', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ImageUploader onUpload={onImageUpload} targetWidth={1000} buttonText={inquireUploading ? "上傳中..." : "+ 新增附圖"} maxSizeMB={3} />
                </div>
              )}
            </div>
          </div>

          {isOffer ? (
            <>
              {questions.length > 0 ? (
                <div className="form-section">
                  <label className="section-title">需求問卷</label>
                  {questions.map((q, idx) => (
                    <div className="form-group" key={idx} style={{ marginBottom: '12px' }}>
                      <label>{q}</label>
                      <input 
                        type="text" 
                        placeholder="請輸入您的回答..." 
                        value={inquireDraft.answers?.[idx]?.answer || ''} 
                        onChange={(e) => {
                          // 🌟 修正 3：即時將答案寫入外層的 inquireDraft 狀態中
                          const newAns = inquireDraft.answers ? [...inquireDraft.answers] : questions.map(qText => ({ question: qText, answer: '' }));
                          if(newAns[idx]) {
                            newAns[idx].answer = e.target.value;
                          }
                          setInquireDraft((prev: any) => ({ ...prev, answers: newAns }));
                        }} 
                      />
                    </div>
                  ))}
                  <div className="form-group" style={{ marginTop: '16px' }}>
                    <label>其他備註留言</label>
                    <textarea 
                      rows={4} 
                      className="detail-textarea" 
                      placeholder="有什麼需要補充的細節嗎？" 
                      value={inquireDraft.message} 
                      onChange={e => setInquireDraft({...inquireDraft, message: e.target.value})} 
                    />
                  </div>
                </div>
              ) : (
                <div className="form-section">
                  <label className="section-title">您的需求內容回覆</label>
                  <textarea rows={8} className="detail-textarea" placeholder="請在此詳細填寫您的委託需求..." value={inquireDraft.message} onChange={e => setInquireDraft({...inquireDraft, message: e.target.value})} required />
                </div>
              )}
            </>
          ) : (
            <>
              <p className="label-hint" style={{ marginTop: '10px' }}>以下資訊已由您的「接案設定」自動帶入：</p>
              <div className="form-row">
                <div className="form-group">
                  <label style={{ color: '#ff8c00' }}>您的舒適圈 / 擅長題材</label>
                  <div className="tag-selector" style={{ background: 'white', padding: '8px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
                    {inquireDraft.specialties.split(' ').filter((t: string) => t).map((tag: string, i: number) => (
                      <span key={i} className="selectable-tag custom-tag" style={{ background: '#fff5eb', color: '#ff8c00', borderColor: '#ffd2a6' }}>
                        {tag} <X size={12} onClick={() => handleTagRemove('specialties', tag)} style={{ cursor: 'pointer' }} />
                      </span>
                    ))}
                    <input 
                      type="text" 
                      className="compact-tag-input" 
                      placeholder="+ 項目" 
                      value={inquireTagInputs.specialties} 
                      onChange={(e) => setInquireTagInputs({...inquireTagInputs, specialties: e.target.value})} 
                      onKeyDown={(e) => { 
                        if (e.key === 'Enter' || e.key === ',' || e.key === '，' || e.key === ' ') { 
                          e.preventDefault(); 
                          handleTagAdd('specialties'); 
                        } 
                      }} 
                      onBlur={() => handleTagAdd('specialties')}
                      style={{ border: 'none !important', boxShadow: 'none' }} 
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <label style={{ color: '#e11d48' }}>不擅長 / 雷點</label>
                  <div className="tag-selector" style={{ background: 'white', padding: '8px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
                    {inquireDraft.no_gos.split(' ').filter((t: string) => t).map((tag: string, i: number) => (
                      <span key={i} className="selectable-tag custom-tag" style={{ background: '#fff1f2', color: '#e11d48', borderColor: '#fecdd3' }}>
                        {tag} <X size={12} onClick={() => handleTagRemove('no_gos', tag)} style={{ cursor: 'pointer' }} />
                      </span>
                    ))}
                    <input 
                      type="text" 
                      className="compact-tag-input" 
                      placeholder="+ 項目" 
                      value={inquireTagInputs.no_gos} 
                      onChange={(e) => setInquireTagInputs({...inquireTagInputs, no_gos: e.target.value})} 
                      onKeyDown={(e) => { 
                        if (e.key === 'Enter' || e.key === ',' || e.key === '，' || e.key === ' ') { 
                          e.preventDefault(); 
                          handleTagAdd('no_gos'); 
                        } 
                      }} 
                      onBlur={() => handleTagAdd('no_gos')}
                      style={{ border: 'none !important', boxShadow: 'none' }} 
                    />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <label className="section-title">留言訊息</label>
                <textarea rows={4} className="detail-textarea" placeholder="簡單介紹一下自己，讓案主更想選擇你！" value={inquireDraft.message} onChange={e => setInquireDraft({...inquireDraft, message: e.target.value})} />
              </div>
            </>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>取消</button>
          <button className="submit-post-btn" onClick={handleFinalSubmit} disabled={inquireUploading}>
            {isOffer ? '送出需求單' : '發送專屬提案'}
          </button>
        </div>
      </div>
    </div>
  );
};