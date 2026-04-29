// src/pages/public/Wishboard/InquireModals/index.tsx
import React from 'react';
import { X } from 'lucide-react';
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

  // 內部處理：新增標籤
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

  // 內部處理：移除標籤
  const handleTagRemove = (field: 'specialties' | 'no_gos' | 'payment_methods', tagToRemove: string) => {
    setInquireDraft((prev: any) => {
      const currentTags = prev[field].split(' ').filter((t: string) => t !== tagToRemove);
      return { ...prev, [field]: currentTags.join(' ') };
    });
  };

  const isOffer = selectedBulletin.category === 'offer';

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '650px', maxHeight: '90vh', overflowY: 'auto', background: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
        
        {/* 標頭 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: '15px', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '20px', color: '#333' }}>
            {isOffer ? '填寫委託需求單' : '發送專屬提案卡'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: '50%' }}>
            <X color="#999" />
          </button>
        </div>
        
        {/* 提示文字 */}
        <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '20px', lineHeight: '1.6' }}>
          {isOffer 
            ? '請根據繪師的要求填寫需求，並附上必要的參考圖，這將幫助繪師決定是否接受您的委託。'
            : '與其丟文字履歷，不如直接給案主看您的作品！您可以上傳精美的價目表或排版圖，讓案主一目了然。'
          }
        </p>

        {/* 🌟 繪師提問模板展示（僅接委託） */}
        {isOffer && (
          <div style={{ background: '#f8fafc', borderLeft: '4px solid #9333ea', padding: '12px 16px', borderRadius: '4px', marginBottom: '20px' }}>
            <strong style={{ color: '#9333ea', fontSize: '14px', display: 'block', marginBottom: '8px' }}>繪師提問模板：</strong>
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: '14px', color: '#334155', fontFamily: 'inherit', lineHeight: '1.5' }}>
              {selectedBulletin.question_template || '繪師未設定特定問題，請詳細描述您的委託需求。'}
            </pre>
          </div>
        )}

        {/* 圖片上傳區 */}
        <div className="form-group" style={{ marginBottom: '25px' }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', color: '#334155' }}>
            {isOffer ? '附上參考設定圖 (最多 3 張)' : '附上參考圖 / 價目表 (最多 3 張)'}
          </label>
          <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
            {inquireDraft.images.map((imgUrl: string, idx: number) => (
              <div key={idx} style={{ position: 'relative', width: '120px', height: '120px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                <img src={imgUrl} alt={`附件 ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button 
                  type="button" 
                  onClick={() => setInquireDraft((prev: any) => ({...prev, images: prev.images.filter((_: any, i: number) => i !== idx)}))} 
                  style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', cursor: 'pointer', padding: '4px', display: 'flex' }}
                >
                  <X size={14}/>
                </button>
              </div>
            ))}
            {inquireDraft.images.length < 3 && (
              <div style={{ width: '120px', height: '120px', flexShrink: 0 }}>
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
          /* 案主模式：需求回覆 */
          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px', fontSize: '14px', color: '#334155' }}>
              您的需求內容回覆
            </label>
            <textarea 
              value={inquireDraft.message} 
              onChange={(e) => setInquireDraft({...inquireDraft, message: e.target.value})} 
              rows={8} 
              placeholder="請在此詳細填寫您的需求，並盡量回答繪師在上方提出的問題..."
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', lineHeight: '1.5' }} 
              required
            />
          </div>
        ) : (
          /* 繪師模式：提案卡設定 */
          <>
            <div style={{ borderTop: '1px dashed #e2e8f0', margin: '25px 0' }}></div>
            <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '15px' }}>以下資訊已由您的「接案設定」自動帶入：</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
              <div className="form-group">
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px', fontSize: '13px', color: '#ff8c00' }}>您的舒適圈 / 擅長題材</label>
                <div className="tag-selector" style={{ border: '1px solid #cbd5e1', padding: '6px', borderRadius: '6px', background: '#fff', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {inquireDraft.specialties.split(' ').filter((t: string) => t).map((tag: string, i: number) => (
                    <span key={i} className="selectable-tag selected custom-tag" style={{ margin: 0, padding: '4px 8px', fontSize: '12px', backgroundColor: '#fff5eb', color: '#ff8c00', borderColor: '#ffd2a6' }}>
                      {tag} <X size={12} onClick={() => handleTagRemove('specialties', tag)} style={{ cursor: 'pointer' }} />
                    </span>
                  ))}
                  <input 
                    type="text" 
                    placeholder="+ 項目"
                    value={inquireTagInputs.specialties}
                    onChange={(e) => setInquireTagInputs({...inquireTagInputs, specialties: e.target.value})}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleTagAdd('specialties'); }
                    }}
                    style={{ flex: 1, border: 'none', padding: '4px', fontSize: '12px', outline: 'none', minWidth: '60px' }}
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px', fontSize: '13px', color: '#e65c5c' }}>不擅長 / 雷點</label>
                <div className="tag-selector" style={{ border: '1px solid #cbd5e1', padding: '6px', borderRadius: '6px', background: '#fff', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {inquireDraft.no_gos.split(' ').filter((t: string) => t).map((tag: string, i: number) => (
                    <span key={i} className="selectable-tag selected custom-tag" style={{ margin: 0, padding: '4px 8px', fontSize: '12px', backgroundColor: '#fff0f0', color: '#e65c5c', borderColor: '#f1a9a9' }}>
                      {tag} <X size={12} onClick={() => handleTagRemove('no_gos', tag)} style={{ cursor: 'pointer' }} />
                    </span>
                  ))}
                  <input 
                    type="text" 
                    placeholder="+ 項目"
                    value={inquireTagInputs.no_gos}
                    onChange={(e) => setInquireTagInputs({...inquireTagInputs, no_gos: e.target.value})}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleTagAdd('no_gos'); }
                    }}
                    style={{ flex: 1, border: 'none', padding: '4px', fontSize: '12px', outline: 'none', minWidth: '60px' }}
                  />
                </div>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px', fontSize: '13px', color: '#4E7A5A' }}>接受的付款方式</label>
              <div className="tag-selector" style={{ border: '1px solid #cbd5e1', padding: '6px', borderRadius: '6px', background: '#fff', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {inquireDraft.payment_methods.split(' ').filter((t: string) => t).map((tag: string, i: number) => (
                  <span key={i} className="selectable-tag selected custom-tag" style={{ margin: 0, padding: '4px 8px', fontSize: '12px', backgroundColor: '#f2f5f3', color: '#4e7a5a', borderColor: '#b5c9bc' }}>
                    {tag} <X size={12} onClick={() => handleTagRemove('payment_methods', tag)} style={{ cursor: 'pointer' }} />
                  </span>
                ))}
                <input 
                  type="text" 
                  placeholder="+ 方式"
                  value={inquireTagInputs.payment_methods}
                  onChange={(e) => setInquireTagInputs({...inquireTagInputs, payment_methods: e.target.value})}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleTagAdd('payment_methods'); }
                  }}
                  style={{ flex: 1, border: 'none', padding: '4px', fontSize: '12px', outline: 'none', minWidth: '60px' }}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px', fontSize: '14px', color: '#9333ea' }}>
                初步細節提問單
              </label>
              <textarea 
                value={inquireDraft.question_template} 
                onChange={(e) => setInquireDraft({...inquireDraft, question_template: e.target.value})} 
                rows={4} 
                placeholder={`1. 角色是否有設定圖？\n2. 是否為商用？\n3. 目前手上排單狀況說明...`}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} 
              />
            </div>
          </>
        )}

        {/* 操作按鈕 */}
        <div className="modal-actions" style={{ marginTop: '25px', display: 'flex', gap: '12px', justifyContent: 'flex-end', borderTop: '1px solid #eee', paddingTop: '20px' }}>
          <button onClick={onClose} style={{ padding: '10px 20px', border: '1px solid #cbd5e1', borderRadius: '8px', background: 'white', color: '#64748b', fontWeight: 'bold', cursor: 'pointer' }}>取消</button>
          <button onClick={onSubmit} disabled={inquireUploading} style={{ padding: '10px 24px', border: 'none', borderRadius: '8px', background: '#ff8c00', color: 'white', fontWeight: 'bold', cursor: inquireUploading ? 'not-allowed' : 'pointer', opacity: inquireUploading ? 0.7 : 1 }}>
            {isOffer ? '送出需求單' : '發送專屬提案'}
          </button>
        </div>
      </div>
    </div>
  );
};