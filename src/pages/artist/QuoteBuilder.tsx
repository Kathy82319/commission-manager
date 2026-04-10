import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const baseAddOnsList = ['驚喜包', '可接受二創', '無償', '可液化', '嚴禁AI修圖'];

export function QuoteBuilder() {
  const navigate = useNavigate();
  // 固定生成一次流水號
  const [orderNo] = useState(() => String(Date.now()).slice(-5));

  const [formData, setFormData] = useState({
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

  // 用來儲存當選擇「其他」時的自訂文字
  const [customFields, setCustomFields] = useState({
    usage_type: '',
    payment_method: '',
    draw_scope: '',
    bg_type: ''
  });

  // 附加選項專用狀態
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>(['嚴禁AI修圖']); 
  const [customAddOns, setCustomAddOns] = useState<string[]>([]);
  const [newCustomAddOn, setNewCustomAddOn] = useState('');

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
    // 驗證「其他」選項不可為空
    if (formData.usage_type === '其他' && !customFields.usage_type.trim()) return alert('請填寫委託用途');
    if (formData.payment_method === '其他' && !customFields.payment_method.trim()) return alert('請填寫交易方式');
    if (formData.draw_scope === '其他' && !customFields.draw_scope.trim()) return alert('請填寫繪畫範圍');
    if (formData.bg_type === '其他' && !customFields.bg_type.trim()) return alert('請填寫背景');

    const finalAddOnsString = selectedAddOns.join(', ');
    
    // 將「其他」的自訂內容覆蓋原本的欄位值
    const finalSubmitData = { 
      ...formData, 
      add_ons: finalAddOnsString,
      usage_type: formData.usage_type === '其他' ? customFields.usage_type : formData.usage_type,
      payment_method: formData.payment_method === '其他' ? customFields.payment_method : formData.payment_method,
      draw_scope: formData.draw_scope === '其他' ? customFields.draw_scope : formData.draw_scope,
      bg_type: formData.bg_type === '其他' ? customFields.bg_type : formData.bg_type,
    };

    const res = await fetch('/api/commissions', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(finalSubmitData)
    });
    
    const data = await res.json();
    if (data.success) {
      alert('委託單建置成功！');
      navigate('/artist/notebook');
    } else {
      alert('建置失敗：' + data.error);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '30px', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #ddd' }}>
      <h2 style={{ borderBottom: '2px solid #333', paddingBottom: '10px', marginBottom: '20px' }}>產出新委託單</h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        <div>
          <label style={labelStyle}>
            項目名稱 <span style={{ color: '#999', fontSize: '12px', fontWeight: 'normal' }}>(訂單編號：#{orderNo})</span>
          </label>
          <input type="text" name="project_name" value={formData.project_name} onChange={handleChange} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>總金額設定</label>
          <input type="number" name="total_price" value={formData.total_price} onChange={handleChange} style={inputStyle} />
        </div>
        
        <div>
          <label style={labelStyle}>委託用途<span style={reqStyle}>*</span></label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <select name="usage_type" value={formData.usage_type} onChange={handleChange} style={inputStyle}>
              <option value="商用">商用</option><option value="非商用">非商用</option><option value="其他">其他</option>
            </select>
            {formData.usage_type === '其他' && (
              <input type="text" name="usage_type" placeholder="請輸入用途..." value={customFields.usage_type} onChange={handleCustomFieldChange} style={inputStyle} />
            )}
          </div>
        </div>
        <div>
          <label style={labelStyle}>是否急件<span style={reqStyle}>*</span></label>
          <select name="is_rush" value={formData.is_rush} onChange={handleChange} style={inputStyle}>
            <option value="否">否</option><option value="是">是</option>
          </select>
        </div>

        <div>
          <label style={labelStyle}>交稿方式<span style={reqStyle}>*</span></label>
          <select name="delivery_method" value={formData.delivery_method} onChange={handleChange} style={inputStyle}>
            <option value="三階段審閱">三階段審閱</option><option value="一鍵出圖">一鍵出圖</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>交易方式<span style={reqStyle}>*</span></label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <select name="payment_method" value={formData.payment_method} onChange={handleChange} style={inputStyle}>
              <option value="匯款">匯款</option><option value="無卡">無卡</option><option value="超商">超商</option><option value="LinePay">LinePay</option><option value="其他">其他</option>
            </select>
            {formData.payment_method === '其他' && (
              <input type="text" name="payment_method" placeholder="請輸入交易方式..." value={customFields.payment_method} onChange={handleCustomFieldChange} style={inputStyle} />
            )}
          </div>
        </div>

        <div>
          <label style={labelStyle}>繪畫範圍<span style={reqStyle}>*</span></label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <select name="draw_scope" value={formData.draw_scope} onChange={handleChange} style={inputStyle}>
              <option value="頭貼">頭貼</option><option value="半身">半身</option><option value="全身">全身</option><option value="其他">其他</option>
            </select>
            {formData.draw_scope === '其他' && (
              <input type="text" name="draw_scope" placeholder="請輸入繪畫範圍..." value={customFields.draw_scope} onChange={handleCustomFieldChange} style={inputStyle} />
            )}
          </div>
        </div>
        <div>
          <label style={labelStyle}>人物數量<span style={reqStyle}>*</span></label>
          <input type="number" name="char_count" value={formData.char_count} onChange={handleChange} min="1" style={inputStyle} />
        </div>

        <div>
          <label style={labelStyle}>背景<span style={reqStyle}>*</span></label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <select name="bg_type" value={formData.bg_type} onChange={handleChange} style={inputStyle}>
              <option value="無背景">無背景</option><option value="基本">基本</option><option value="複雜">複雜</option><option value="其他">其他</option>
            </select>
            {formData.bg_type === '其他' && (
              <input type="text" name="bg_type" placeholder="請輸入背景設定..." value={customFields.bg_type} onChange={handleCustomFieldChange} style={inputStyle} />
            )}
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f9f9f9', borderRadius: '8px', border: '1px solid #eee' }}>
        <label style={labelStyle}>附加選項<span style={reqStyle}>*</span></label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', marginBottom: '15px' }}>
          {baseAddOnsList.map(item => (
            <label key={item} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '14px', cursor: 'pointer' }}>
              <input type="checkbox" checked={selectedAddOns.includes(item)} onChange={() => handleAddOnToggle(item)} />
              {item}
            </label>
          ))}
          {customAddOns.map((item, index) => (
            <label key={`custom-${index}`} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '14px', cursor: 'pointer', color: '#1976d2' }}>
              <input type="checkbox" checked={selectedAddOns.includes(item)} onChange={() => handleAddOnToggle(item)} />
              {item}
            </label>
          ))}
        </div>
        
        {customAddOns.length < 5 && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <input 
              type="text" value={newCustomAddOn} onChange={e => setNewCustomAddOn(e.target.value)} 
              placeholder="自行增加項目..." style={{ ...inputStyle, width: '200px' }} 
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddCustomOption(); }}
            />
            <button type="button" onClick={handleAddCustomOption} style={{ padding: '8px 15px', backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer' }}>
              ＋ 新增選項
            </button>
            <span style={{ fontSize: '12px', color: '#999', alignSelf: 'center' }}>(還可新增 {5 - customAddOns.length} 個)</span>
          </div>
        )}
      </div>

      <div style={{ marginBottom: '25px' }}>
        <label style={labelStyle}>詳細設定</label>
        <textarea name="detailed_settings" value={formData.detailed_settings} onChange={handleChange} style={{ ...inputStyle, height: '120px', resize: 'vertical' }} />
      </div>

      <div style={{ backgroundColor: '#ffff00', padding: '15px', border: '1px solid #ffea00', marginBottom: '20px' }}>
        <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>小提醒：</div>
        <div>以上內容標記<span style={reqStyle}>*</span>一旦送出若需修改需經委託人同意方能修改</div>
        <div>非<span style={reqStyle}>*</span>字標記則僅提供繪師註記用</div>
      </div>

      <button onClick={handleSubmit} style={{ width: '100%', padding: '15px', backgroundColor: '#333', color: '#fff', border: 'none', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }}>
        確定產出委託單
      </button>
    </div>
  );
}

const labelStyle = { display: 'block', fontWeight: 'bold', marginBottom: '8px', color: '#555', fontSize: '14px' };
const inputStyle = { width: '100%', padding: '10px', border: '1px solid #ccc', boxSizing: 'border-box' as const };
const reqStyle = { color: '#d32f2f', marginLeft: '2px' };