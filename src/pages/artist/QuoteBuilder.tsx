// src/pages/artist/QuoteBuilder.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactQuill from 'react-quill-new'; 
import 'react-quill-new/dist/quill.snow.css'; 
import '../../styles/QuoteBuilder.css'; 

const baseAddOnsList = ['驚喜包', '無償'];

const customQuillModules = {
  toolbar: [
    [{ 'header': [1, 2, 3, false] }], 
    ['bold', 'italic', 'underline', 'strike'], 
    [{ 'color': [] }, { 'background': [] }], 
    [{ 'list': 'ordered'}, { 'list': 'bullet' }], 
    ['clean'] 
  ]
};

export function QuoteBuilder() {
  const navigate = useNavigate();

  const [workflowMode, setWorkflowMode] = useState<'standard' | 'free'>('standard');

  const [formData, setFormData] = useState({
    client_name: '',
    project_name: '',
    usage_type: '非商用',
    is_rush: '否',
    delivery_method: '三階段審閱',
    payment_method: '匯款',
    draw_scope: '半身',
    char_count: 1,
    bg_type: '基本',
    detailed_settings: '',
    total_price: 0
  });

  const [customFields, setCustomFields] = useState({
    usage_type: '',
    payment_method: '',
    draw_scope: '',
    bg_type: '',
  });

  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]); 
  const [customAddOns, setCustomAddOns] = useState<string[]>([]);
  const [newCustomAddOn, setNewCustomAddOn] = useState('');
  
  const [tosContent, setTosContent] = useState('');

  const [quotaInfo, setQuotaInfo] = useState<{ plan_type: string; used_quota: number; max_quota: number } | null>(null);
  const [showDeliveryHelp, setShowDeliveryHelp] = useState(false);

  useEffect(() => {
    const fetchArtistSettings = async () => {
      try {
        const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
        const res = await fetch(`${API_BASE}/api/users/me`, { credentials: 'include' });
        const data = await res.json();
        
        if (data.success && data.data) {
          setQuotaInfo({
            plan_type: data.data.plan_type || 'free',
            used_quota: data.data.used_quota || 0,
            max_quota: data.data.max_quota || 3
          });

          if (data.data.profile_settings) {
            try {
              const parsed = JSON.parse(data.data.profile_settings);
              if (parsed.rules) setTosContent(parsed.rules);
            } catch (e) {}
          }
        }
      } catch (err) {
        console.error("無法讀取設定與額度", err);
      }
    };
    fetchArtistSettings();
  }, []);

  const isQuotaExceeded = quotaInfo !== null && quotaInfo.max_quota !== -1 && quotaInfo.used_quota >= quotaInfo.max_quota;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCustomFieldChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCustomFields(prev => ({ ...prev, [name]: value }));
  };

  const handleAddOnToggle = (item: string) => {
    setSelectedAddOns(prev => 
      prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
    );
  };

  const handleAddCustomOption = () => {
    const trimmed = newCustomAddOn.trim();
    if (trimmed && customAddOns.length < 5 && !baseAddOnsList.includes(trimmed) && !customAddOns.includes(trimmed)) {
      setCustomAddOns([...customAddOns, trimmed]);
      setSelectedAddOns([...selectedAddOns, trimmed]); 
      setNewCustomAddOn('');
    } else if (customAddOns.length >= 5) {
      alert('自訂項目最多只能新增 5 個！');
    }
  };

  const handleSubmit = async () => {
    if (isQuotaExceeded) return alert('建單額度已用盡，請升級方案！');
    if (!formData.client_name.trim()) return alert('請填寫委託人名稱，以利系統辨識！');
    
    if (workflowMode === 'standard') {
        if (formData.usage_type === '其他' && !customFields.usage_type.trim()) return alert('請填寫委託用途');
        if (formData.payment_method === '其他' && !customFields.payment_method.trim()) return alert('請填寫交易方式');
        if (formData.draw_scope === '其他' && !customFields.draw_scope.trim()) return alert('請填寫繪畫範圍');
        if (formData.bg_type === '其他' && !customFields.bg_type.trim()) return alert('請填寫背景');
    }

    const finalAddOnsString = selectedAddOns.join(', ');
    const finalSubmitData = { 
      ...formData, 
      workflow_mode: workflowMode,
      add_ons: finalAddOnsString,
      usage_type: formData.usage_type === '其他' ? customFields.usage_type : formData.usage_type,
      payment_method: formData.payment_method === '其他' ? customFields.payment_method : formData.payment_method,
      draw_scope: formData.draw_scope === '其他' ? customFields.draw_scope : formData.draw_scope,
      bg_type: formData.bg_type === '其他' ? customFields.bg_type : formData.bg_type,
      agreed_tos_snapshot: tosContent 
    };

    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
      const res = await fetch(`${API_BASE}/api/commissions`, {
        method: 'POST', 
        credentials: 'include', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...finalSubmitData,
          total_price: Number(finalSubmitData.total_price)
        })
      });
      
      const data = await res.json();
      if (data.success) {
        const newOrderId = data.id;
        const linkToCopy = `${window.location.origin}/quote/${newOrderId}`;
        try {
          await navigator.clipboard.writeText(linkToCopy);
          alert(`${workflowMode === 'free' ? '自由紀錄單建立成功！' : '委託單建置成功！'}\n專屬連結已自動複製到剪貼簿，為您導向委託單管理。`);
        } catch (err) {
          alert(`${workflowMode === 'free' ? '自由紀錄單建立成功！' : '委託單建置成功！'}\n為您導向委託單管理。`);
        }
        navigate(`/artist/notebook?id=${newOrderId}`);
      } else {
        alert('建置失敗：' + data.error);
      }
    } catch (error) {
      alert('連線失敗，請檢查後端伺服器狀態。');
    }
  };

  return (
    <div className="quote-page">
      
      <div className="quote-header">
        <div>
          <h2 className="quote-header-title">產出新委託單</h2>
          {quotaInfo && (
            <div className={`plan-badge ${quotaInfo.plan_type}`}>
              {quotaInfo.plan_type === 'pro' && '目前方案：專業版 (無限建單額度)'}
              {quotaInfo.plan_type === 'trial' && `目前方案：專業版試用 | 試用期已建立：${quotaInfo.used_quota} / ${quotaInfo.max_quota} 筆`}
              {quotaInfo.plan_type === 'free' && `目前方案：基礎免費版 | 本月已建立：${quotaInfo.used_quota} / ${quotaInfo.max_quota} 筆`}
            </div>
          )}
        </div>

        <div className="mode-toggle-group">
          <button 
            onClick={() => setWorkflowMode('standard')}
            className={`mode-btn ${workflowMode === 'standard' ? 'active' : ''}`}
          >
            標準委託
          </button>
          <button 
            onClick={() => setWorkflowMode('free')}
            className={`mode-btn ${workflowMode === 'free' ? 'active-dark' : ''}`}
          >
            自由紀錄
          </button>
        </div>
      </div>

      {/* 模糊效果僅套用到表單網格容器 */}
      <div className="quote-grid" style={{ 
        filter: isQuotaExceeded ? 'blur(6px)' : 'none',
        pointerEvents: isQuotaExceeded ? 'none' : 'auto',
        opacity: isQuotaExceeded ? 0.7 : 1,
        transition: 'all 0.3s ease'
      }}>
        
        <div className="quote-card">
          <h3 className="quote-card-title">基本資訊設定</h3>
          <div className="form-grid">
            <div className="form-grid-full">
              <label className="form-label">委託人名稱 (FB暱稱/ID等備註)</label>
              <input type="text" name="client_name" value={formData.client_name} onChange={handleChange} className="form-input" placeholder="例如：FB - 王小明" />
            </div>
            
            <div className="form-grid-full">
              <label className="form-label">項目名稱</label>
              <input type="text" name="project_name" value={formData.project_name} onChange={handleChange} className="form-input" placeholder="例如：自創角半身委託" />
            </div>
            
            <div>
              <label className="form-label">總金額設定{workflowMode === 'standard' && <span className="req-star">*</span>}</label>
              <div className="input-with-prefix">
                <span className="input-prefix">$</span>
                <input type="number" name="total_price" value={formData.total_price} onChange={handleChange} min="0" className="form-input" />
              </div>
            </div>
            
            <div>
              <label className="form-label">交易方式</label>
              <div className="flex-input-group">
                <select name="payment_method" value={formData.payment_method} onChange={handleChange} className="form-input">
                  <option value="匯款">匯款</option>
                  <option value="無卡">無卡</option>
                  <option value="超商">超商</option>
                  <option value="其他">其他</option>
                </select>
                {formData.payment_method === '其他' && (
                  <input type="text" name="payment_method" placeholder="說明..." value={customFields.payment_method} onChange={handleCustomFieldChange} className="form-input" />
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="quote-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid #F0ECE7', paddingBottom: '12px' }}>
            <h3 className="quote-card-title" style={{ borderBottom: 'none', paddingBottom: 0 }}>委託規格參數</h3>
            {workflowMode === 'standard' && <span style={{ fontSize: '11px', color: '#A05C5C', fontWeight: 'bold' }}>標註 * 之欄位需經同意方能修改</span>}
          </div>
          
          <div className="form-grid">
            <div>
              <label className="form-label">委託用途{workflowMode === 'standard' && <span className="req-star">*</span>}</label>
              <div className="flex-input-group">
                <select name="usage_type" value={formData.usage_type} onChange={handleChange} className="form-input">
                  <option value="商用">商用</option><option value="非商用">非商用</option><option value="其他">其他</option>
                </select>
                {formData.usage_type === '其他' && (
                  <input type="text" name="usage_type" placeholder="說明..." value={customFields.usage_type} onChange={handleCustomFieldChange} className="form-input" />
                )}
              </div>
            </div>
            
            <div>
              <label className="form-label">是否急件{workflowMode === 'standard' && <span className="req-star">*</span>}</label>
              <select value={formData.is_rush} onChange={(e) => setFormData({...formData, is_rush: e.target.value})} className="form-input">
                <option value="否">否</option><option value="是">是</option>
              </select>
            </div>
            
            <div>
              <label className="form-label">
                交稿方式{workflowMode === 'standard' && <span className="req-star">*</span>}
                {workflowMode === 'standard' && (
                  <span onClick={() => setShowDeliveryHelp(true)} style={{ color: '#4A7294', fontSize: '12px', marginLeft: '6px', cursor: 'pointer', textDecoration: 'underline' }}> [?] </span>
                )}
              </label>
              {workflowMode === 'free' ? (
                <input type="text" name="delivery_method" value={formData.delivery_method} onChange={handleChange} className="form-input" placeholder="例如：雲端硬碟交稿" />
              ) : (
                <select name="delivery_method" value={formData.delivery_method} onChange={handleChange} className="form-input">
                  <option value="三階段審閱">三階段審閱</option><option value="一鍵出圖">一鍵出圖</option>
                </select>
              )}
              
              {showDeliveryHelp && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 99, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                  <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.1)' }} onClick={() => setShowDeliveryHelp(false)} />
                  <div style={{ position: 'relative', width: '100%', maxWidth: '300px', padding: '20px', backgroundColor: '#FFFFFF', border: '1px solid #DED9D3', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', color: '#5D4A3E' }}>
                    <h4 style={{ marginTop: 0, fontSize: '15px' }}>交稿方式說明</h4>
                    <p style={{ fontSize: '13px', lineHeight: '1.6', margin: '8px 0 0 0' }}>三階段模式下，系統會引導委託人進行草稿/線稿/完稿審閱。完稿需經委託人按下「同意稿件」才會結單。</p>
                    <button onClick={() => setShowDeliveryHelp(false)} style={{ marginTop: '16px', width: '100%', padding: '8px', background: '#F4F0EB', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>關閉</button>
                  </div>
                </div>
              )}
            </div>
            
            <div>
              <label className="form-label">人物數量{workflowMode === 'standard' && <span className="req-star">*</span>}</label>
              <input type="number" name="char_count" value={formData.char_count} onChange={handleChange} min="1" className="form-input" />
            </div>
            
            <div>
              <label className="form-label">繪畫範圍{workflowMode === 'standard' && <span className="req-star">*</span>}</label>
              <div className="flex-input-group">
                <select name="draw_scope" value={formData.draw_scope} onChange={handleChange} className="form-input">
                  <option value="頭貼">頭貼</option><option value="半身">半身</option><option value="全身">全身</option><option value="其他">其他</option>
                </select>
                {formData.draw_scope === '其他' && (
                  <input type="text" name="draw_scope" placeholder="說明..." value={customFields.draw_scope} onChange={handleCustomFieldChange} className="form-input" />
                )}
              </div>
            </div>
            
            <div>
              <label className="form-label">背景{workflowMode === 'standard' && <span className="req-star">*</span>}</label>
              <div className="flex-input-group">
                <select name="bg_type" value={formData.bg_type} onChange={handleChange} className="form-input">
                  <option value="無背景">無背景</option><option value="基本">基本</option><option value="複雜">複雜</option><option value="其他">其他</option>
                </select>
                {formData.bg_type === '其他' && (
                  <input type="text" name="bg_type" placeholder="說明..." value={customFields.bg_type} onChange={handleCustomFieldChange} className="form-input" />
                )}
              </div>
            </div>

            <div className="form-grid-full" style={{ marginTop: '8px', paddingTop: '16px', borderTop: '1px dashed #EAE6E1' }}>
              <label className="form-label">快速標籤{workflowMode === 'standard' && <span className="req-star">*</span>}</label>
              <div className="addon-tags-container" style={{ alignItems: 'center' }}>
                {baseAddOnsList.map(item => {
                  const isSelected = selectedAddOns.includes(item);
                  return (
                    <label key={item} className={`addon-tag ${isSelected ? 'selected' : ''}`}>
                      <input type="checkbox" checked={isSelected} onChange={() => handleAddOnToggle(item)} style={{ display: 'none' }} />
                      {isSelected ? '✓ ' : '+ '}{item}
                    </label>
                  );
                })}
                {customAddOns.map((item, index) => {
                  const isSelected = selectedAddOns.includes(item);
                  return (
                    <label key={`custom-${index}`} className={`addon-tag custom ${isSelected ? 'selected' : ''}`}>
                      <input type="checkbox" checked={isSelected} onChange={() => handleAddOnToggle(item)} style={{ display: 'none' }} />
                      {isSelected ? '✓ ' : '+ '}{item}
                    </label>
                  );
                })}
                
                {customAddOns.length < 5 && (
                  <div className="flex-input-group" style={{ marginLeft: '4px' }}>
                    <input type="text" value={newCustomAddOn} onChange={e => setNewCustomAddOn(e.target.value)} 
                      placeholder="自訂標籤..." className="form-input" style={{ width: '120px', padding: '6px 12px', fontSize: '13px' }} 
                      onKeyDown={(e) => { if (e.key === 'Enter') handleAddCustomOption(); }}
                    />
                    <button type="button" onClick={handleAddCustomOption} style={{ padding: '6px 12px', backgroundColor: '#FFFFFF', color: '#7A7269', border: '1px solid #DED9D3', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>
                      + 新增
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="quote-card form-grid-full">
          <h3 className="quote-card-title">協議書內容與備註</h3>

          <div>
            <label className="form-label">
              協議書內容 (自訂)
              <span style={{ color: '#4A7294', fontSize: '11px', fontWeight: 'normal', display: 'block', marginTop: '4px' }}>
                *內容將做為該單的初始協議書快照，之後無法更改*
              </span>
              <span style={{ color: '#4A7294', fontSize: '11px', fontWeight: 'normal', display: 'block', marginTop: '4px' }}>
                *可至個人設定→協議書內容那寫入範本，之後每次會自動代入*
              </span>
            </label>
            <div className="quote-quill-wrapper">
              <ReactQuill theme="snow" value={tosContent} onChange={setTosContent} modules={customQuillModules} />
            </div>
          </div>

          <div>
            <label className="form-label">
              詳細設定 
              {workflowMode === 'standard' && <span style={{ color: '#A0978D', fontSize: '11px', fontWeight: 'normal' }}> (僅繪師註記)</span>}
            </label>
            <textarea name="detailed_settings" value={formData.detailed_settings} onChange={handleChange} className="form-input" style={{ minHeight: '80px', resize: 'vertical' }} placeholder="請輸入角色設定或要求..." />
          </div>

          <div style={{ marginTop: '12px' }}>
            <button onClick={handleSubmit} className="submit-btn">
              確認產出{workflowMode === 'free' ? '自由紀錄單' : '委託單'}
            </button>
          </div>
        </div>
      </div>

      {/* 關鍵點：將額度限制 Modal 移出被模糊的容器之外 */}
      {isQuotaExceeded && (
        <div className="quota-modal-overlay">
          <div className="quota-modal-box">
            <div style={{ fontSize: '56px', marginBottom: '16px' }}>🔒</div>
            <h3 style={{ margin: '0 0 12px 0', color: '#5D4A3E', fontSize: '22px' }}>建單額度已用盡</h3>
            <p style={{ color: '#7A7269', fontSize: '14px', lineHeight: '1.6', marginBottom: '30px' }}>
              {quotaInfo?.plan_type === 'trial' 
                ? '您的專業版試用額度已用完。升級專業版獲得無限建單額度！' 
                : '基礎免費版每月最多建立 3 筆委託。升級以解鎖無限額度！'}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button onClick={() => navigate('/artist/settings')} style={{ padding: '14px', backgroundColor: '#5D4A3E', color: '#FFFFFF', border: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }}>
                前往升級方案
              </button>
              <button onClick={() => navigate('/artist/queue')} style={{ padding: '12px', backgroundColor: 'transparent', color: '#7A7269', border: '1px solid #DED9D3', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
                返回排單表
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}