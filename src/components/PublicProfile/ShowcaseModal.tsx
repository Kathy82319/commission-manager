// src/components/PublicProfile/ShowcaseModal.tsx
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import './styles/ShowcaseModal.css';

const decodeHTML = (html?: string) => {
  if (!html || typeof html !== 'string') return '';
  const txt = document.createElement("textarea");
  txt.innerHTML = html;
  return txt.value;
};

const parseImages = (coverUrl?: string, imagesArr?: string[]): string[] => {
  if (imagesArr && imagesArr.length > 0) return imagesArr;
  if (!coverUrl) return [];
  try {
    if (coverUrl.startsWith('[')) {
      const parsed = JSON.parse(coverUrl);
      return Array.isArray(parsed) ? parsed : [coverUrl];
    }
  } catch (e) {}
  return [coverUrl];
};

interface ShowcaseModalProps {
  selectedShowcase: any;
  artist: any;
  settings: any;
  isLoggedIn: boolean;
  onClose: () => void;
}

export function ShowcaseModal({ selectedShowcase, artist, settings, isLoggedIn, onClose }: ShowcaseModalProps) {
  const navigate = useNavigate();
  const [modalMode, setModalMode] = useState<'view' | 'form1' | 'form2'>('view');
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imgIdx, setImgIdx] = useState(0);

  const images = useMemo(
    () => parseImages(selectedShowcase?.cover_url, selectedShowcase?.images),
    [selectedShowcase]
  );
  const hasMultiImg = images.length > 1;

  const parsedSchema: any[] = useMemo(() => {
    if (!selectedShowcase || !selectedShowcase.form_schema) return [];
    try { return JSON.parse(selectedShowcase.form_schema); } catch (e) { return []; }
  }, [selectedShowcase]);

  const hasForm = parsedSchema.length > 0;
  const isFull = (selectedShowcase?.max_orders || 0) > 0 && (selectedShowcase?.current_orders_count || 0) >= (selectedShowcase?.max_orders || 0);

  const tosContent = useMemo(() => {
    if (selectedShowcase?.tos_content) return selectedShowcase.tos_content;
    if (!settings) return "繪師尚未提供專屬協議說明。";
    return settings.terms_of_service || settings.rules || "繪師尚未提供專屬協議說明。";
  }, [settings, selectedShowcase]);

  const handleOpenCommission = () => {
    if (!isLoggedIn && selectedShowcase?.allow_guest !== 1) {
      alert("此項目僅開放給平台會員委託，請先登入或註冊！");
      navigate('/portal', { state: { returnTo: window.location.pathname + window.location.search } });
      return;
    }
    if (isFull) { alert("此項目目前已滿單暫停收件囉！"); return; }
    setModalMode('form1');
    setFormData({});
    setAgreedToTerms(false);
  };

  const handleInputChange = (fieldId: string, value: any) =>
    setFormData(prev => ({ ...prev, [fieldId]: value }));

  const handleCheckboxChange = (fieldId: string, option: string, isChecked: boolean) => {
    setFormData(prev => {
      const currentArr = (prev[fieldId] || []) as string[];
      if (isChecked) return { ...prev, [fieldId]: [...currentArr, option] };
      return { ...prev, [fieldId]: currentArr.filter(o => o !== option) };
    });
  };

  const handleNextStep = () => {
    for (const field of parsedSchema) {
      if (field.required) {
        const val = formData[field.id];
        if (val === undefined || val === null || (typeof val === 'string' && val.trim() === '') || (Array.isArray(val) && val.length === 0)) {
          alert(`請填寫必填欄位：${field.label}`);
          return;
        }
      }
    }
    setModalMode('form2');
  };

  const handleSubmitOrder = async () => {
    if (!agreedToTerms) return alert("請先同意繪師協議");
    setIsSubmitting(true);
    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
      const formattedAnswers = parsedSchema.map(field => ({
        question: field.label,
        answer: formData[field.id] || (field.type === 'checkbox' ? [] : '')
      }));
      const payload = {
        showcase_id: selectedShowcase.id,
        artist_id: artist.id,
        form_answers: JSON.stringify(formattedAnswers),
        tos_snapshot: tosContent
      };
      const res = await fetch(`${API_BASE}/api/direct-inquiries`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        if (isLoggedIn) {
          alert("委託申請已成功送出！請至「我的委託」查看進度，等待繪師確認。");
          navigate('/client/orders');
        } else {
          alert("訪客委託申請已成功送出！\n繪師將會透過您留下的聯絡方式與您聯繫，感謝您的委託。");
        }
        onClose();
      } else {
        if (data.error === "UNAUTHORIZED" || res.status === 401) {
          alert("登入逾時或權限不足，請重新登入！");
          navigate('/portal', { state: { returnTo: window.location.pathname + window.location.search } });
        } else {
          alert(data.error || "送出失敗，請稍後再試");
        }
      }
    } catch (err) {
      alert("網路連線錯誤，送出失敗");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderDynamicField = (field: any) => {
    const value = formData[field.id] || '';
    return (
      <div key={field.id} style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', fontWeight: 'bold', color: '#5D4A3E', marginBottom: '8px', fontSize: '14px' }}>
          {field.label} {field.required && <span style={{ color: '#A05C5C' }}>*</span>}
        </label>
        {field.type === 'text' && <input type="text" className="form-input" style={{ width: '100%' }} value={value} onChange={e => handleInputChange(field.id, e.target.value)} placeholder="請輸入..." />}
        {field.type === 'textarea' && <textarea className="form-input" style={{ width: '100%', minHeight: '80px', resize: 'vertical' }} value={value} onChange={e => handleInputChange(field.id, e.target.value)} placeholder="請詳細描述..." />}
        {field.type === 'date' && <input type="date" className="form-input" value={value} onChange={e => handleInputChange(field.id, e.target.value)} />}
        {field.type === 'select' && (
          <select className="form-input" style={{ width: '100%' }} value={value} onChange={e => handleInputChange(field.id, e.target.value)}>
            <option value="">請選擇...</option>
            {field.options?.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        )}
        {field.type === 'radio' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {field.options?.map((opt: string) => (
              <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: '#5D4A3E' }}>
                <input type="radio" name={field.id} value={opt} checked={value === opt} onChange={e => handleInputChange(field.id, e.target.value)} /> {opt}
              </label>
            ))}
          </div>
        )}
        {field.type === 'checkbox' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {field.options?.map((opt: string) => {
              const isChecked = (formData[field.id] || []).includes(opt);
              return (
                <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: '#5D4A3E' }}>
                  <input type="checkbox" checked={isChecked} onChange={e => handleCheckboxChange(field.id, opt, e.target.checked)} /> {opt}
                </label>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="lightbox-overlay showcase-modal-overlay" onClick={onClose}>
      <button className="lightbox-close" onClick={onClose}><X size={32}/></button>

      <div className="showcase-content-box" onClick={e => e.stopPropagation()}>
        {modalMode === 'view' && (
          <>
            
            <div className="showcase-cover" style={{ position: 'relative', overflow: 'hidden' }}>
              {images.length > 0 ? (
                <>
                  <img
                    src={images[imgIdx]}
                    alt={selectedShowcase.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />

                  
                  {hasMultiImg && (
                    <>
                      <button
                        onClick={e => { e.stopPropagation(); setImgIdx(i => (i - 1 + images.length) % images.length); }}
                        style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(0,0,0,0.5)', color: '#FFF', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}
                      ><ChevronLeft size={18} /></button>
                      <button
                        onClick={e => { e.stopPropagation(); setImgIdx(i => (i + 1) % images.length); }}
                        style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(0,0,0,0.5)', color: '#FFF', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}
                      ><ChevronRight size={18} /></button>
                    </>
                  )}

                  
                  {hasMultiImg && (
                    <div style={{ position: 'absolute', bottom: '10px', left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: '6px', zIndex: 2 }}>
                      {images.map((_, i) => (
                        <button
                          key={i}
                          onClick={e => { e.stopPropagation(); setImgIdx(i); }}
                          style={{ width: '7px', height: '7px', borderRadius: '50%', border: 'none', padding: 0, cursor: 'pointer', background: i === imgIdx ? '#FFF' : 'rgba(255,255,255,0.45)', transition: 'background 0.15s, transform 0.15s', transform: i === imgIdx ? 'scale(1.3)' : 'scale(1)' }}
                        />
                      ))}
                    </div>
                  )}

                  
                  {hasMultiImg && (
                    <div style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(0,0,0,0.5)', color: '#FFF', fontSize: '12px', fontWeight: 'bold', padding: '3px 8px', borderRadius: '12px', zIndex: 2 }}>
                      {imgIdx + 1} / {images.length}
                    </div>
                  )}
                </>
              ) : (
                <div style={{ width: '100%', height: '100%', background: '#F4F0EB', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#A0978D' }}>
                  尚無圖片
                </div>
              )}
            </div>

            
            <div className="showcase-details" style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <div className="showcase-header">
                <h2>{selectedShowcase.title}</h2>
                {selectedShowcase.price_info && <div className="modal-price">${selectedShowcase.price_info}</div>}
              </div>

              {(selectedShowcase.max_orders || 0) > 0 && selectedShowcase.show_quota === 1 && (
                <div style={{ background: '#FEF2F2', color: '#EF4444', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', display: 'inline-block', marginBottom: '12px' }}>
                  🔥 限量接單：目前剩餘 {(selectedShowcase.max_orders || 0) - (selectedShowcase.current_orders_count || 0)} 個名額
                </div>
              )}

              {Array.isArray(selectedShowcase.tags) && selectedShowcase.tags.length > 0 && (
                <div className="modal-tags">
                  {selectedShowcase.tags.map((tag: string) => <span key={tag} className="tag-chip">#{tag}</span>)}
                </div>
              )}

              <div className="description-scroll-area" style={{ flex: 1 }}>
                <div className="rich-text-content description" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(decodeHTML(selectedShowcase.description)) }} />
              </div>

              {hasForm && (
                <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #EAE6E1' }}>
                  <button
                    onClick={handleOpenCommission}
                    disabled={isFull}
                    style={{ width: '100%', padding: '14px', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', backgroundColor: isFull ? '#C4BDB5' : '#4E7A5A', color: '#FFF', cursor: isFull ? 'not-allowed' : 'pointer' }}
                  >
                    {isFull ? '🛑 已滿單 / 暫停收件' : '我要委託'}
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {modalMode === 'form1' && (
          <div className="showcase-details" style={{ width: '100%', maxWidth: '100%', padding: '30px', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <h2 style={{ borderBottom: '1px solid #EAE6E1', paddingBottom: '16px', marginBottom: '20px', color: '#5D4A3E', fontSize: '20px' }}>
              📝 填寫委託需求 - {selectedShowcase.title}
            </h2>
            <div className="custom-scrollbar" style={{ overflowY: 'auto', flex: 1, paddingRight: '10px', minHeight: 0 }}>
              {!isLoggedIn && selectedShowcase.allow_guest === 1 && (
                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '16px', borderRadius: '8px', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ fontSize: '14px', color: '#475569', lineHeight: '1.6' }}>
                    💡 <strong>您目前為訪客身分</strong><br/>提交表單後，繪師將透過您留下的聯絡方式與您聯繫。<br/>若註冊帳號，可直接在站上與繪師對話並追蹤進度喔！
                  </div>
                  <div>
                    <button onClick={() => navigate('/portal', { state: { returnTo: window.location.pathname + window.location.search } })} style={{ background: '#4A7294', color: '#FFF', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}>前往登入 / 註冊帳號</button>
                  </div>
                </div>
              )}
              {parsedSchema.length > 0 ? parsedSchema.map(renderDynamicField) : (
                <div style={{ color: '#7A7269', fontSize: '15px', lineHeight: '1.6', textAlign: 'center', padding: '40px 0' }}>
                  此項目沒有特別指定的客製化問題。<br/>若無其他特殊要求，請直接點擊「下一步」確認協議。
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #EAE6E1' }}>
              <button onClick={() => setModalMode('view')} style={{ flex: 1, padding: '14px', background: '#FAFAFA', border: '1px solid #DED9D3', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', color: '#5D4A3E', fontSize: '15px' }}>取消</button>
              <button onClick={handleNextStep} style={{ flex: 2, padding: '14px', background: '#5D4A3E', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px' }}>下一步：確認協議</button>
            </div>
          </div>
        )}

        {modalMode === 'form2' && (
          <div className="showcase-details" style={{ width: '100%', maxWidth: '100%', padding: '30px', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <h2 style={{ borderBottom: '1px solid #EAE6E1', paddingBottom: '16px', marginBottom: '20px', color: '#5D4A3E', fontSize: '20px' }}>📄 確認繪師協議 (TOS)</h2>
            <div className="custom-scrollbar" style={{ overflowY: 'auto', flex: 1, paddingRight: '10px', minHeight: 0 }}>
              <div style={{ backgroundColor: '#FDFDFB', border: '1px solid #EAE6E1', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
                <div style={{ fontSize: '14px', color: '#7A7269', lineHeight: '1.7', whiteSpace: 'pre-wrap' }} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(tosContent) }} />
              </div>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', padding: '16px', backgroundColor: '#FBFBF9', borderRadius: '8px', border: '1px solid #DED9D3' }}>
                <input type="checkbox" checked={agreedToTerms} onChange={e => setAgreedToTerms(e.target.checked)} style={{ width: '20px', height: '20px', marginTop: '2px', cursor: 'pointer' }} />
                <span style={{ fontSize: '15px', color: '#5D4A3E', fontWeight: 'bold', lineHeight: '1.5' }}>我已詳細閱讀並同意上述繪師協議，承諾遵守交易規範。</span>
              </label>
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #EAE6E1' }}>
              <button onClick={() => setModalMode('form1')} style={{ flex: 1, padding: '14px', background: '#FAFAFA', border: '1px solid #DED9D3', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', color: '#5D4A3E', fontSize: '15px' }}>返回修改</button>
              <button onClick={handleSubmitOrder} disabled={!agreedToTerms || isSubmitting} style={{ flex: 2, padding: '14px', background: '#4E7A5A', color: 'white', border: 'none', borderRadius: '8px', cursor: (!agreedToTerms || isSubmitting) ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '15px', opacity: (!agreedToTerms || isSubmitting) ? 0.6 : 1 }}>
                {isSubmitting ? '送出中...' : '正式送出委託申請'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}