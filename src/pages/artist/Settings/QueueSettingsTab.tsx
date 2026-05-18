// src/pages/artist/Settings/QueueSettingsTab.tsx
import { useState } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

const customQuillModules = {
  toolbar: [
    [{ 'header': [1, 2, 3, false] }], 
    [{ 'size': ['small', false, 'large', 'huge'] }], 
    ['bold', 'italic', 'underline', 'strike', 'blockquote'], 
    [{ 'color': [] }, { 'background': [] }], 
    [{ 'list': 'ordered'}, { 'list': 'bullet' }, { 'align': [] }], 
    ['link', 'clean'] 
  ]
};

export interface QueueSettings {
  enabled: boolean;
  show_client_name: boolean;
  show_client_id: boolean;
  show_project_name: boolean;
  show_artist_note?: boolean; 
  date_column_label?: string; 
  custom_order?: string[]; 
  show_rules?: boolean;
  rules_content?: string;
  last_snapshot_at?: string;
  snapshot_data?: any[];
}

export function QueueSettingsTab({ settings, setSettings }: any) {
  const [isPublishing, setIsPublishing] = useState(false);
  const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || '';

  const qs: QueueSettings = settings.queue_settings || {
    enabled: false,
    show_client_name: true,
    show_client_id: false,
    show_project_name: true,
    show_artist_note: false,
    date_column_label: '預計開始日',
    show_rules: false,
    rules_content: ''
  };

  const update = (field: keyof QueueSettings, val: any) => {
    setSettings({ ...settings, queue_settings: { ...qs, [field]: val } });
  };

  const handlePublishSnapshot = async () => {
    if (!window.confirm('確定要發佈當前的排單表快照到公開頁面嗎？\n(前台將以您目前設定的隱私顯示範圍進行快照)')) return;
    
    setIsPublishing(true);
    try {
      const res = await fetch(`${API_BASE}/api/queue/snapshot`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queue_settings: qs })
      });
      const data = await res.json();
      
      if (data.success) {
        update('last_snapshot_at', data.last_snapshot_at);
        update('snapshot_data', data.snapshot_data);
        alert('✅ 快照發佈成功！公開頁面已更新。');
      } else {
        alert(`發佈失敗：${data.error || '未知錯誤'}`);
      }
    } catch (e) {
      console.error(e);
      alert('網路錯誤，請稍後再試。');
    } finally {
      setIsPublishing(false);
    }
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div style={{ background: '#F4F0EB', padding: '20px', borderRadius: '12px', border: '1px solid #DED9D3' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h4 style={{ margin: 0, color: '#5D4A3E', fontSize: '15px' }}>排單規則說明</h4>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#5D4A3E', fontWeight: 'bold' }}>
                <input 
                  type="checkbox" 
                  checked={qs.show_rules || false} 
                  onChange={e => update('show_rules', e.target.checked)} 
                />
                啟用規則說明
              </label>
            </div>
            
            {qs.show_rules && (
              <div className="custom-quill-wrapper" style={{ backgroundColor: '#FFF', borderRadius: '8px' }}>
                <ReactQuill 
                  theme="snow" 
                  value={qs.rules_content || ''} 
                  onChange={val => update('rules_content', val)} 
                  modules={customQuillModules} 
                />
              </div>
            )}
          </div>

          <div style={{ background: '#F4F0EB', padding: '20px', borderRadius: '12px', border: '1px solid #DED9D3' }}>
            <h4 style={{ marginTop: 0, color: '#5D4A3E', fontSize: '15px', marginBottom: '16px' }}>顯示範圍控制 (隱私設定)</h4>

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
              請勾選您希望在前端公開顯示的欄位，未勾選的欄位在發佈快照時將自動匿名或隱藏處理。
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', color: '#5D4A3E' }}>
                <input type="checkbox" checked={qs.show_client_name} onChange={e => update('show_client_name', e.target.checked)} />
                顯示委託人名稱 <span style={{ color: '#A0978D', fontSize: '12px' }}>(取消勾選將會把委託人名字中段以*字呈現)</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', color: '#5D4A3E' }}>
                <input type="checkbox" checked={qs.show_client_id} onChange={e => update('show_client_id', e.target.checked)} />
                顯示委託人 ID <span style={{ color: '#A0978D', fontSize: '12px' }}>(綁定之User_ID)</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', color: '#5D4A3E' }}>
                <input type="checkbox" checked={qs.show_project_name} onChange={e => update('show_project_name', e.target.checked)} />
                顯示項目名稱 <span style={{ color: '#A0978D', fontSize: '12px' }}>(取消勾選將一律顯示為 "私人委託項目")</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', color: '#5D4A3E' }}>
                <input type="checkbox" checked={qs.show_artist_note || false} onChange={e => update('show_artist_note', e.target.checked)} />
                顯示備註欄位 <span style={{ color: '#A0978D', fontSize: '12px' }}>(預設隱藏，若勾選將公開顯示您在排單表填寫的備註)</span>
              </label>
            </div>
          </div>

          <div style={{ background: '#FDF4E6', padding: '20px', borderRadius: '12px', border: '1px solid #DED9D3' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <h4 style={{ marginTop: 0, color: '#5D4A3E', fontSize: '15px', marginBottom: '8px' }}>發佈排單表快照</h4>
                <p style={{ fontSize: '13px', color: '#7A7269', margin: 0, lineHeight: '1.5' }}>
                  排單表不會即時自動同步。請在整理好訂單後，點擊發佈將目前的排單狀態更新給大眾。<br/>
                  <span style={{ color: '#D97706', fontWeight: 'bold' }}>注意：若您有修改上方的「隱私設定」，請務必先點擊主畫面的「儲存設定」，再點擊發佈快照才會生效。</span>
                </p>
              </div>
              <button 
                onClick={handlePublishSnapshot}
                disabled={isPublishing}
                style={{ backgroundColor: isPublishing ? '#A0978D' : '#5D4A3E', color: '#FFF', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: isPublishing ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}
              >
                {isPublishing ? '發佈中...' : '發佈當前快照'}
              </button>
            </div>

            {qs.last_snapshot_at && (
              <div style={{ marginTop: '20px', borderTop: '1px dashed #DED9D3', paddingTop: '20px' }}>
                <p style={{ fontSize: '13px', color: '#7A7269', marginBottom: '12px', fontWeight: 'bold' }}>
                  最後發佈時間：{new Date(qs.last_snapshot_at).toLocaleString()}
                </p>
                <div 
                  className="snapshot-thumbnail" 
                  style={{ width: '150px', height: '100px', backgroundColor: '#FFF', border: '1px solid #DED9D3', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#A0978D', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}
                  onClick={() => alert("快照預覽功能開發中。您的快照已成功在個人頁面上線！")}
                >
                  <span style={{ fontSize: '24px', marginBottom: '4px' }}>📊</span>
                  <span style={{ fontSize: '12px' }}>共 {qs.snapshot_data?.length || 0} 筆委託</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}