import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const baseAddOnsList = ['驚喜包', '可接受二創', '無償', '可液化', '嚴禁AI修圖'];

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

  const [selectedAddOns, setSelectedAddOns] = useState<string[]>(['嚴禁AI修圖']); 
  const [customAddOns, setCustomAddOns] = useState<string[]>([]);
  const [newCustomAddOn, setNewCustomAddOn] = useState('');

  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [showDeliveryHelp, setShowDeliveryHelp] = useState(false);

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
    };

    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
      const res = await fetch(`${API_BASE}/api/commissions`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalSubmitData)
      });
      
      const data = await res.json();
      if (data.success) {
        alert(workflowMode === 'free' ? '自由紀錄單建立成功！' : '委託單建置成功！');
        navigate('/artist/notebook');
      } else {
        alert('建置失敗：' + data.error);
      }
    } catch (error) {
      alert('連線失敗，請檢查後端伺服器狀態。');
    }
  };

  const getInputStyle = (fieldName: string) => ({
    width: '100%', 
    padding: '10px 14px', 
    border: focusedField === fieldName ? '1px solid #A67B3E' : '1px solid #DED9D3', 
    boxSizing: 'border-box' as const,
    borderRadius: '8px',
    backgroundColor: '#FBFBF9',
    color: '#5D4A3E',
    outline: 'none',
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
    boxShadow: focusedField === fieldName ? '0 0 0 2px rgba(166,123,62,0.1)' : 'none',
    fontSize: '14px' 
  });

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', height: '100%' }}>
      
      <div style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ color: '#5D4A3E', fontSize: '24px', margin: '0 0 6px 0', letterSpacing: '0.5px' }}>產出新委託單</h2>
          <div style={{ color: '#A0978D', fontSize: '14px' }}>
            {workflowMode === 'standard' 
              ? '填寫完畢後，系統將自動產生專屬連結供委託人檢視、同意合約與確認規格。' 
              : '此模式僅供您個人進行進度與檔案紀錄，將關閉客戶審閱鎖定機制與合約功能。'}
          </div>
        </div>

        <div style={{ display: 'flex', backgroundColor: '#EAE6E1', padding: '4px', borderRadius: '12px' }}>
          <button 
            onClick={() => setWorkflowMode('standard')}
            style={{ 
              padding: '8px 20px', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s',
              backgroundColor: workflowMode === 'standard' ? '#FFFFFF' : 'transparent',
              color: workflowMode === 'standard' ? '#5D4A3E' : '#A0978D',
              boxShadow: workflowMode === 'standard' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none'
            }}
          >
            標準委託
          </button>
          <button 
            onClick={() => setWorkflowMode('free')}
            style={{ 
              padding: '8px 20px', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s',
              backgroundColor: workflowMode === 'free' ? '#5D4A3E' : 'transparent',
              color: workflowMode === 'free' ? '#FFFFFF' : '#A0978D',
              boxShadow: workflowMode === 'free' ? '0 2px 8px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            自由紀錄
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' }}>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #EAE6E1', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', color: '#5D4A3E', borderBottom: '1px solid #F0ECE7', paddingBottom: '10px' }}>基本資訊設定</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>委託人名稱 (FB暱稱/ID等備註) <span style={reqStyle}>*</span></label>
                <input type="text" name="client_name" value={formData.client_name} onChange={handleChange} 
                  onFocus={() => setFocusedField('client_name')} onBlur={() => setFocusedField(null)} style={getInputStyle('client_name')} placeholder="例如：FB - 王小明" />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>項目名稱</label>
                <input type="text" name="project_name" value={formData.project_name} onChange={handleChange} 
                  onFocus={() => setFocusedField('project_name')} onBlur={() => setFocusedField(null)} style={getInputStyle('project_name')} placeholder="例如：自創角半身委託" />
              </div>
              <div>
                <label style={labelStyle}>總金額設定</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#A0978D', fontWeight: 'bold' }}>$</span>
                  <input type="number" name="total_price" value={formData.total_price} onChange={handleChange} 
                    onFocus={() => setFocusedField('total_price')} onBlur={() => setFocusedField(null)} style={{...getInputStyle('total_price'), paddingLeft: '28px'}} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>交易方式</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select name="payment_method" value={formData.payment_method} onChange={handleChange} 
                    onFocus={() => setFocusedField('payment_method')} onBlur={() => setFocusedField(null)} style={getInputStyle('payment_method')}>
                    <option value="匯款">匯款</option><option value="無卡">無卡</option><option value="超商">超商</option><option value="LinePay">LinePay</option><option value="其他">其他</option>
                  </select>
                  {formData.payment_method === '其他' && (
                    <input type="text" name="payment_method" placeholder="說明..." value={customFields.payment_method} onChange={handleCustomFieldChange} 
                      onFocus={() => setFocusedField('custom_payment')} onBlur={() => setFocusedField(null)} style={getInputStyle('custom_payment')} />
                  )}
                </div>
              </div>
            </div>
          </div>

          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #EAE6E1', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid #F0ECE7', paddingBottom: '10px', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', color: '#5D4A3E' }}>委託規格參數</h3>
              {workflowMode === 'standard' && (
                <span style={{ fontSize: '12px', color: '#A05C5C', fontWeight: 'bold' }}>標註 * 之欄位需經同意方能修改</span>
              )}
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={labelStyle}>委託用途{workflowMode === 'standard' && <span style={reqStyle}>*</span>}</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select name="usage_type" value={formData.usage_type} onChange={handleChange} 
                    onFocus={() => setFocusedField('usage_type')} onBlur={() => setFocusedField(null)} style={getInputStyle('usage_type')}>
                    <option value="商用">商用</option><option value="非商用">非商用</option><option value="其他">其他</option>
                  </select>
                  {formData.usage_type === '其他' && (
                    <input type="text" name="usage_type" placeholder="說明..." value={customFields.usage_type} onChange={handleCustomFieldChange} 
                      onFocus={() => setFocusedField('custom_usage')} onBlur={() => setFocusedField(null)} style={getInputStyle('custom_usage')} />
                  )}
                </div>
              </div>
              <div>
                <label style={labelStyle}>是否急件{workflowMode === 'standard' && <span style={reqStyle}>*</span>}</label>
<select 
  value={formData.is_rush} 
  onChange={(e) => setFormData({...formData, is_rush: e.target.value})}
  style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ccc' /*套用您原本的樣式*/ }}
>
  <option value="否">否</option>
  <option value="是">是</option>
</select>
              </div>
              
              <div>
                <label style={labelStyle}>
                  交稿方式{workflowMode === 'standard' && <span style={reqStyle}>*</span>}
                  {workflowMode === 'standard' && (
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                      <span onClick={() => setShowDeliveryHelp(true)} style={{ color: '#4A7294', fontSize: '12px', marginLeft: '6px', cursor: 'pointer', fontWeight: 'normal', textDecoration: 'underline' }}> [?] 說明 </span>
                      {showDeliveryHelp && (
                        <>
                          <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setShowDeliveryHelp(false)} />
                          <div style={{ position: 'absolute', bottom: '100%', left: '0', width: '260px', padding: '16px', backgroundColor: '#FFFFFF', border: '1px solid #DED9D3', borderRadius: '8px', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', zIndex: 100, marginBottom: '8px', color: '#5D4A3E' }}>
                            <div style={{ fontWeight: 'bold', marginBottom: '4px', fontSize: '13px' }}>三階段審閱：</div>
                            <div style={{ marginBottom: '8px', fontSize: '12px', lineHeight: '1.5', color: '#7A7269' }}>需上傳草稿、線稿、完稿，且皆須經委託人同意後方可繼續。</div>
                            <div style={{ fontWeight: 'bold', marginBottom: '4px', fontSize: '13px' }}>一鍵出稿：</div>
                            <div style={{ fontSize: '12px', color: '#7A7269' }}>僅需上傳一次最終稿件。</div>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </label>
                {workflowMode === 'free' ? (
                  <input type="text" name="delivery_method" value={formData.delivery_method} onChange={handleChange} 
                    onFocus={() => setFocusedField('delivery_method_free')} onBlur={() => setFocusedField(null)} style={getInputStyle('delivery_method_free')} placeholder="例如：雲端硬碟交稿" />
                ) : (
                  <select name="delivery_method" value={formData.delivery_method} onChange={handleChange} 
                    onFocus={() => setFocusedField('delivery_method')} onBlur={() => setFocusedField(null)} style={getInputStyle('delivery_method')}>
                    <option value="三階段審閱">三階段審閱</option><option value="一鍵出圖">一鍵出圖</option>
                  </select>
                )}
              </div>

              <div>
                <label style={labelStyle}>人物數量{workflowMode === 'standard' && <span style={reqStyle}>*</span>}</label>
                <input type="number" name="char_count" value={formData.char_count} onChange={handleChange} min="1" 
                  onFocus={() => setFocusedField('char_count')} onBlur={() => setFocusedField(null)} style={getInputStyle('char_count')} />
              </div>

              <div>
                <label style={labelStyle}>繪畫範圍{workflowMode === 'standard' && <span style={reqStyle}>*</span>}</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select name="draw_scope" value={formData.draw_scope} onChange={handleChange} 
                    onFocus={() => setFocusedField('draw_scope')} onBlur={() => setFocusedField(null)} style={getInputStyle('draw_scope')}>
                    <option value="頭貼">頭貼</option><option value="半身">半身</option><option value="全身">全身</option><option value="其他">其他</option>
                  </select>
                  {formData.draw_scope === '其他' && (
                    <input type="text" name="draw_scope" placeholder="說明..." value={customFields.draw_scope} onChange={handleCustomFieldChange} 
                      onFocus={() => setFocusedField('custom_draw_scope')} onBlur={() => setFocusedField(null)} style={getInputStyle('custom_draw_scope')} />
                  )}
                </div>
              </div>

              <div>
                <label style={labelStyle}>背景{workflowMode === 'standard' && <span style={reqStyle}>*</span>}</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select name="bg_type" value={formData.bg_type} onChange={handleChange} 
                    onFocus={() => setFocusedField('bg_type')} onBlur={() => setFocusedField(null)} style={getInputStyle('bg_type')}>
                    <option value="無背景">無背景</option><option value="基本">基本</option><option value="複雜">複雜</option><option value="其他">其他</option>
                  </select>
                  {formData.bg_type === '其他' && (
                    <input type="text" name="bg_type" placeholder="說明..." value={customFields.bg_type} onChange={handleCustomFieldChange} 
                      onFocus={() => setFocusedField('custom_bg')} onBlur={() => setFocusedField(null)} style={getInputStyle('custom_bg')} />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #EAE6E1', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', flex: 1 }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', color: '#5D4A3E', borderBottom: '1px solid #F0ECE7', paddingBottom: '10px' }}>附加選項與備註</h3>
            
            <div style={{ marginBottom: '20px', padding: '16px', backgroundColor: '#FDFDFB', borderRadius: '12px', border: '1px solid #F0ECE7' }}>
              <label style={labelStyle}>快速標籤{workflowMode === 'standard' && <span style={reqStyle}>*</span>}</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                {baseAddOnsList.map(item => {
                  const isSelected = selectedAddOns.includes(item);
                  return (
                    <label key={item} style={{ 
                      display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', cursor: 'pointer',
                      padding: '6px 12px', borderRadius: '20px', border: isSelected ? '1px solid #A67B3E' : '1px solid #DED9D3',
                      backgroundColor: isSelected ? '#FDF4E6' : '#FFFFFF', color: isSelected ? '#A67B3E' : '#7A7269',
                      fontWeight: isSelected ? 'bold' : 'normal', transition: 'all 0.2s ease'
                    }}>
                      <input type="checkbox" checked={isSelected} onChange={() => handleAddOnToggle(item)} style={{ display: 'none' }} />
                      {isSelected ? '✓ ' : '+ '}{item}
                    </label>
                  );
                })}
                {customAddOns.map((item, index) => {
                  const isSelected = selectedAddOns.includes(item);
                  return (
                    <label key={`custom-${index}`} style={{ 
                      display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', cursor: 'pointer',
                      padding: '6px 12px', borderRadius: '20px', border: isSelected ? '1px solid #4A7294' : '1px solid #DED9D3',
                      backgroundColor: isSelected ? '#EBF2F7' : '#FFFFFF', color: isSelected ? '#4A7294' : '#7A7269',
                      fontWeight: isSelected ? 'bold' : 'normal', transition: 'all 0.2s ease'
                    }}>
                      <input type="checkbox" checked={isSelected} onChange={() => handleAddOnToggle(item)} style={{ display: 'none' }} />
                      {isSelected ? '✓ ' : '+ '}{item}
                    </label>
                  );
                })}
              </div>
              
              {customAddOns.length < 5 && (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input 
                    type="text" value={newCustomAddOn} onChange={e => setNewCustomAddOn(e.target.value)} 
                    placeholder="自行增加標籤..." style={{...getInputStyle('new_addon'), width: '160px', padding: '8px 12px'}} 
                    onFocus={() => setFocusedField('new_addon')} onBlur={() => setFocusedField(null)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddCustomOption(); }}
                  />
                  <button type="button" onClick={handleAddCustomOption} style={{ padding: '8px 12px', backgroundColor: '#FFFFFF', color: '#7A7269', border: '1px solid #DED9D3', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', transition: 'all 0.2s' }} onMouseEnter={e=>e.currentTarget.style.backgroundColor='#FBFBF9'} onMouseLeave={e=>e.currentTarget.style.backgroundColor='#FFFFFF'}>
                    新增標籤
                  </button>
                  <span style={{ fontSize: '12px', color: '#A0978D' }}>({5 - customAddOns.length})</span>
                </div>
              )}
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <label style={{...labelStyle, marginBottom: '4px'}}>
                詳細設定 
                {workflowMode === 'standard' && <span style={{ color: '#A0978D', fontSize: '12px', fontWeight: 'normal' }}>(僅供繪師註記，委託方不可見)</span>}
              </label>
              <textarea name="detailed_settings" value={formData.detailed_settings} onChange={handleChange} 
                onFocus={() => setFocusedField('detailed_settings')} onBlur={() => setFocusedField(null)}
                style={{ ...getInputStyle('detailed_settings'), flex: 1, minHeight: '120px', resize: 'vertical' }} placeholder="請輸入詳細的角色設定、動作要求或任何參考資料備註..." />
            </div>

            <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #F0ECE7' }}>
              <button onClick={handleSubmit} style={{ width: '100%', padding: '16px', backgroundColor: '#5D4A3E', color: '#FFFFFF', border: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', transition: 'background-color 0.2s, transform 0.1s', boxShadow: '0 4px 12px rgba(93,74,62,0.2)' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'} onMouseDown={e => e.currentTarget.style.transform = 'translateY(0)'}>
                確認產出{workflowMode === 'free' ? '自由紀錄單' : '委託單'}
              </button>
            </div>
            
          </div>
        </div>

      </div>
    </div>
  );
}

const labelStyle = { display: 'block', fontWeight: 'bold', marginBottom: '8px', color: '#5D4A3E', fontSize: '13px' };
const reqStyle = { color: '#A05C5C', marginLeft: '4px', fontSize: '14px' };