// src/pages/public/Wishboard/InquireModals/index.tsx
import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { ImageUploader } from '../../../../components/ImageUploader';

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

export const InquireModal: React.FC<InquireModalProps> = ({
  selectedBulletin,
  inquireDraft,
  setInquireDraft,
  inquireTagInputs,
  setInquireTagInputs,
  inquireUploading,
  onClose,
  onSubmit,
  onImageUpload
}) => {
  if (!selectedBulletin) return null;

  const isOffer = selectedBulletin.category === 'offer';

  // 🌟 解析 JSON 獲取提問清單與條款
  let parsedContent: any = {};
  try {
    parsedContent = JSON.parse(selectedBulletin.content);
  } catch (e) {
    parsedContent = {};
  }
  
  const questions: string[] = parsedContent.questions || [];
  const tosContent: string = parsedContent.tos_content || '';

  // 狀態：是否已同意條款 (如果沒有條款，直接視為已同意)
  const [hasAgreedTOS, setHasAgreedTOS] = useState(tosContent ? false : true);
  
  // 狀態：記錄多個問題的答案
  const [answers, setAnswers] = useState<string[]>(Array(questions.length).fill(''));

  // 內部處理：新增標籤 (僅繪師投單用)
  const handleTagAdd = (field: 'specialties' | 'no_gos' | 'payment_methods') => {
    const value = inquireTagInputs[field].trim();
    if (!value) return;

    setInquireDraft((prev: any) => {
      const currentTags = prev[field] ? prev[field].split(' ').filter((t: string) => t) : [];
      if (currentTags.includes(value)) return prev;
      return { ...prev, [field]: [...currentTags, value].join(' ') };
    });
    setInquireTagInputs((prev: any) => ({ ...prev, [field]: '' }));
  };

  // 內部處理：移除標籤 (僅繪師投單用)
  const handleTagRemove = (field: 'specialties' | 'no_gos' | 'payment_methods', tagToRemove: string) => {
    setInquireDraft((prev: any) => {
      const currentTags = prev[field].split(' ').filter((t: string) => t !== tagToRemove);
      return { ...prev, [field]: currentTags.join(' ') };
    });
  };

  const handleAgreeTOS = () => {
    setHasAgreedTOS(true);
  };

  const handleFinalSubmit = () => {
    // 若為接委託且有設定問題，組合 Q&A 放入 message 中
    if (isOffer && questions.length > 0) {
      const qaString = questions.map((q, idx) => `【${q}】\n${answers[idx] || '未填寫'}`).join('\n\n');
      const finalMessage = qaString + (inquireDraft.message ? `\n\n【其他備註】\n${inquireDraft.message}` : '');
      
      // 因為 setInquireDraft 屬於異步操作，為了確保傳送時帶有最新資料
      // 在實作上，如果需要立刻送出，可以考慮在 onSubmit() 函式中一併處理
      // 這裡我們先用簡單的狀態更新
      setInquireDraft((prev: any) => ({ ...prev, message: finalMessage }));
    }
    
    // 延遲一點點時間讓 state 更新後再 submit
    setTimeout(() => {
      onSubmit();
    }, 100);
  };

  // 🌟 畫面 A：閱讀條款畫面 (如果繪師有設定條款且案主尚未同意)
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

  // 🌟 畫面 B：正式填寫表單畫面
  return (
    <div className="modal-overlay">
      <div className="post-modal" style={{ maxWidth: '700px' }}>
        
        {/* 標頭 */}
        <div className="modal-header">
          <h2>{isOffer ? '填寫委託需求單' : '發送專屬提案卡'}</h2>
          <button className="close-modal-btn" onClick={onClose}><X size={24} /></button>
        </div>
        
        <div className="post-form">
          {/* 提示文字 */}
          <p className="label-hint">
            {isOffer 
              ? '請根據繪師的要求填寫需求，並附上必要的參考圖，這將幫助繪師決定是否接受您的委託。'
              : '與其丟文字履歷，不如直接給案主看您的作品！您可以上傳精美的價目表或排版圖，讓案主一目了然。'
            }
          </p>

          {/* 圖片上傳區 */}
          <div className="form-section">
            <label className="section-title">
              {isOffer ? '附上參考設定圖 (最多 3 張)' : '附上參考圖 / 價目表 (最多 3 張)'}
            </label>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {inquireDraft.images.map((imgUrl: string, idx: number) => (
                <div key={idx} className="image-preview-box" style={{ width: '120px', height: '120px' }}>
                  <img src={imgUrl} alt={`附件 ${idx + 1}`} />
                  <button 
                    type="button" 
                    className="remove-image-btn"
                    onClick={() => setInquireDraft((prev: any) => ({...prev, images: prev.images.filter((_: any, i: number) => i !== idx)}))} 
                  >
                    <X size={14}/>
                  </button>
                </div>
              ))}
              {inquireDraft.images.length < 3 && (
                <div style={{ width: '120px', height: '120px', border: '2px dashed #cbd5e1', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ImageUploader 
                    onUpload={onImageUpload} 
                    targetWidth={1000} 
                    buttonText={inquireUploading ? "上傳中..." : "+ 新增附圖"} 
                    maxSizeMB={3} 
                  />
                </div>
              )}
            </div>
          </div>

          {/* 內容輸入區 */}
          {isOffer ? (
            /* 🌟 案主模式：動態需求回覆 */
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
                        value={answers[idx]} 
                        onChange={(e) => {
                          const newAns = [...answers];
                          newAns[idx] = e.target.value;
                          setAnswers(newAns);
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
                  <textarea 
                    rows={8} 
                    className="detail-textarea"
                    placeholder="請在此詳細填寫您的委託需求..."
                    value={inquireDraft.message} 
                    onChange={e => setInquireDraft({...inquireDraft, message: e.target.value})} 
                    required
                  />
                </div>
              )}
            </>
          ) : (
            /* 🎨 繪師模式：提案卡設定 */
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
                        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleTagAdd('specialties'); }
                      }}
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
                        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleTagAdd('no_gos'); }
                      }}
                      style={{ border: 'none !important', boxShadow: 'none' }}
                    />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <label className="section-title">留言訊息</label>
                <textarea 
                  rows={4} 
                  className="detail-textarea"
                  placeholder="簡單介紹一下自己，讓案主更想選擇你！"
                  value={inquireDraft.message} 
                  onChange={e => setInquireDraft({...inquireDraft, message: e.target.value})} 
                />
              </div>
            </>
          )}
        </div>

        {/* 操作按鈕 */}
        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>取消</button>
          <button 
            className="submit-post-btn" 
            onClick={handleFinalSubmit} 
            disabled={inquireUploading}
          >
            {isOffer ? '送出需求單' : '發送專屬提案'}
          </button>
        </div>
      </div>
    </div>
  );
};