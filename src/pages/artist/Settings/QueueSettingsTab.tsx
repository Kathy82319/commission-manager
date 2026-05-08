// src/pages/artist/Settings/QueueSettingsTab.tsx

export interface QueueSettings {
  enabled: boolean;
  show_client_name: boolean;
  show_client_id: boolean;
  show_project_name: boolean;
  date_column_label?: string; // 🌟 補回設定欄位
  custom_order?: string[];    // 🌟 確保能承接客製化排序陣列
}

export function QueueSettingsTab({ settings, setSettings }: any) {
  const qs: QueueSettings = settings.queue_settings || {
    enabled: false,
    show_client_name: true,
    show_client_id: false,
    show_project_name: true,
    date_column_label: '預計開始日'
  };

  // 🌟 將 val 型別改為 any，以相容 boolean 與 string 類型的更新
  const update = (field: keyof QueueSettings, val: any) => {
    setSettings({ ...settings, queue_settings: { ...qs, [field]: val } });
  };

  return (
    <div className="rich-text-tab">
      <h3 style={{ marginBottom: '24px', color: '#5D4A3E' }}>工作排單表顯示設定</h3>
      
      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' }}>
          <input 
            type="checkbox" 
            checked={qs.enabled} 
            onChange={e => update('enabled', e.target.checked)} 
            style={{ width: '18px', height: '18px' }} 
          />
          允許在個人公開頁面展示「排單表」
        </label>
      </div>
      
      {qs.enabled && (
        <div style={{ background: '#F4F0EB', padding: '20px', borderRadius: '12px', border: '1px solid #DED9D3' }}>
          <h4 style={{ marginTop: 0, color: '#5D4A3E', fontSize: '15px', marginBottom: '16px' }}>顯示範圍控制 (隱私設定)</h4>

          {/* 🌟 補回從 Queue.tsx 提到的自訂欄位輸入框 */}
          <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <label style={{ fontWeight: 'bold', color: '#5D4A3E', fontSize: '14px' }}>日期欄位顯示名稱：</label>
            <input 
              type="text" 
              value={qs.date_column_label ?? '預計開始日'}
              onChange={e => update('date_column_label', e.target.value)}
              placeholder="例如：預計完工日、開始日"
              style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #DED9D3', fontSize: '14px', flex: 1, maxWidth: '250px' }}
            />
          </div>

          <p style={{ fontSize: '13px', color: '#7A7269', marginBottom: '20px' }}>
            請勾選您希望在前端公開顯示的欄位，未勾選的欄位將自動匿名或隱藏處理。
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', color: '#5D4A3E' }}>
              <input 
                type="checkbox" 
                checked={qs.show_client_name} 
                onChange={e => update('show_client_name', e.target.checked)} 
              />
              顯示委託人名稱 <span style={{ color: '#A0978D', fontSize: '12px' }}>(取消勾選將會把委託人名字中段以*字呈現，例如龍*天)</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', color: '#5D4A3E' }}>
              <input 
                type="checkbox" 
                checked={qs.show_client_id} 
                onChange={e => update('show_client_id', e.target.checked)} 
              />
              顯示委託人 ID <span style={{ color: '#A0978D', fontSize: '12px' }}>(綁定之User_ID)</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', color: '#5D4A3E' }}>
              <input 
                type="checkbox" 
                checked={qs.show_project_name} 
                onChange={e => update('show_project_name', e.target.checked)} 
              />
              顯示項目名稱 <span style={{ color: '#A0978D', fontSize: '12px' }}>(取消勾選將一律顯示為 "私人委託項目")</span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}