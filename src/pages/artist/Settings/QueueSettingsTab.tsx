// src/pages/artist/Settings/QueueSettingsTab.tsx
import { useState } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { X } from 'lucide-react';

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

const getMaskedName = (name: string) => {
  if (!name) return '匿名委託';
  const len = name.length;
  if (len <= 1) return name;
  if (len === 2) return name[0] + '*';
  return name[0] + '*'.repeat(len - 2) + name[len - 1];
};

export function QueueSettingsTab({ settings, setSettings }: any) {
  const [isPublishing, setIsPublishing] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewData, setPreviewData] = useState<any[] | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'preview' | 'view'>('preview'); 
  
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

  const handleOpenPreview = async () => {
    setIsLoadingPreview(true);
    try {
      const res = await fetch(`${API_BASE}/api/commissions`, { credentials: 'include' });
      const data = await res.json();
      
      if (data.success) {
        let liveList = data.data.filter((c: any) => c.status !== 'completed' && c.status !== 'cancelled');
        const customOrder = qs.custom_order || [];
        
        if (customOrder.length > 0) {
          liveList.sort((a: any, b: any) => {
            const idxA = customOrder.indexOf(a.id);
            const idxB = customOrder.indexOf(b.id);
            const timeA = new Date(a.order_date || 0).getTime();
            const timeB = new Date(b.order_date || 0).getTime();
            if (idxA === -1 && idxB === -1) return timeA - timeB;
            if (idxA === -1) return 1;
            if (idxB === -1) return -1;
            return idxA - idxB;
          });
        } else {
          liveList.sort((a: any, b: any) => new Date(a.order_date || 0).getTime() - new Date(b.order_date || 0).getTime());
        }

        const previewMasked = liveList.map((order: any) => ({
          id: order.id,
          queue_status: order.queue_status || '處理中',
          end_date: order.end_date, 
          order_date: order.order_date,
          contact_memo: qs.show_client_name ? (order.contact_memo || '匿名委託') : getMaskedName(order.contact_memo),
          client_public_id: qs.show_client_id ? order.client_public_id : null,
          project_name: qs.show_project_name ? (order.project_name || '私人委託項目') : '私人委託項目',
          artist_note: qs.show_artist_note ? order.artist_note : null,
        }));

        setPreviewData(previewMasked);
        setModalMode('preview');
        setIsModalOpen(true);
      } else {
        alert("無法獲取排單資料進行預覽。");
      }
    } catch (e) {
      console.error(e);
      alert("網路錯誤，無法產生預覽。");
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleConfirmPublish = async () => {
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
        setIsModalOpen(false);
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

  const handleViewPublishedSnapshot = () => {
    setPreviewData(qs.snapshot_data || []);
    setModalMode('view');
    setIsModalOpen(true);
  };

  const renderQueueTable = (data: any[], isThumbnail = false) => {
    if (!data || data.length === 0) {
      return <div style={{ padding: '20px', textAlign: 'center', color: '#7A7269' }}>目前沒有進行中的排單資料</div>;
    }
    return (
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: isThumbnail ? '14px' : '15px', color: '#5D4A3E', background: '#FFF' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #DED9D3', background: '#F4F0EB' }}>
            <th style={{ padding: '12px' }}>委託人</th>
            <th style={{ padding: '12px' }}>項目名稱</th>
            <th style={{ padding: '12px' }}>當前進度</th>
            <th style={{ padding: '12px' }}>{qs.date_column_label || '預計開始日'}</th>
            {qs.show_artist_note && <th style={{ padding: '12px' }}>備註</th>}
          </tr>
        </thead>
        <tbody>
          {data.map((order, idx) => (
            <tr key={order.id || idx} style={{ borderBottom: '1px solid #E5E0DA' }}>
              <td style={{ padding: '12px' }}>
                <div style={{ fontWeight: 'bold' }}>{order.contact_memo || '匿名委託'}</div>
                {order.client_public_id && <div style={{ fontSize: '12px', opacity: 0.7 }}>{order.client_public_id}</div>}
              </td>
              <td style={{ padding: '12px' }}>{order.project_name || '私人委託項目'}</td>
              <td style={{ padding: '12px' }}><span style={{ padding: '4px 8px', background: '#E8F3EB', color: '#4E7A5A', borderRadius: '4px', fontSize: '13px' }}>{order.queue_status || '處理中'}</span></td>
              <td style={{ padding: '12px', opacity: 0.8 }}>{order.end_date ? order.end_date.substring(5).replace('-', '/') : '未定'}</td>
              {qs.show_artist_note && <td style={{ padding: '12px', opacity: 0.8 }}>{order.artist_note || '-'}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    );
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
                onClick={handleOpenPreview}
                disabled={isLoadingPreview}
                style={{ backgroundColor: isLoadingPreview ? '#A0978D' : '#5D4A3E', color: '#FFF', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: isLoadingPreview ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
              >
                {isLoadingPreview ? '產生預覽中...' : '預覽並發佈快照'}
              </button>
            </div>

            
            {qs.last_snapshot_at && qs.snapshot_data && (
              <div style={{ marginTop: '24px', borderTop: '1px dashed #DED9D3', paddingTop: '20px' }}>
                <p style={{ fontSize: '13px', color: '#7A7269', marginBottom: '12px', fontWeight: 'bold' }}>
                  最後發佈時間：{new Date(qs.last_snapshot_at).toLocaleString()}
                </p>
                <div style={{ display: 'inline-block' }}>
                  
                  <div 
                    onClick={handleViewPublishedSnapshot}
                    style={{ position: 'relative', width: '280px', height: '160px', overflow: 'hidden', border: '2px solid #DED9D3', borderRadius: '8px', cursor: 'pointer', background: '#FFF', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}
                    title="點擊放大觀看已發佈的排單表"
                  >
                    <div style={{ transform: 'scale(0.35)', transformOrigin: 'top left', width: '800px', pointerEvents: 'none' }}>
                      {renderQueueTable(qs.snapshot_data, true)}
                    </div>
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(255,255,255,0.9), transparent)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: '12px' }}>
                      <span style={{ background: 'rgba(0,0,0,0.6)', color: '#FFF', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>🔍 點擊放大預覽</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      
      {isModalOpen && previewData && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 10000, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', overflowY: 'auto', padding: '5vh 20px' }} onClick={() => !isPublishing && setIsModalOpen(false)}>
          <div style={{ width: '100%', maxWidth: '900px', background: '#FDF4E6', padding: '24px', borderRadius: '12px', position: 'relative', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #DED9D3', paddingBottom: '16px', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, color: '#5D4A3E', fontSize: '20px' }}>
                {modalMode === 'preview' ? '即將發佈的排單表預覽' : '已發佈的排單表快照'}
              </h2>
              <button disabled={isPublishing} onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: isPublishing ? 'not-allowed' : 'pointer', color: '#5D4A3E' }}>
                <X size={28} />
              </button>
            </div>

            {modalMode === 'preview' && (
              <div style={{ marginBottom: '20px', padding: '12px', background: '#FEF3C7', color: '#92400E', borderRadius: '8px', fontSize: '14px', border: '1px solid #F59E0B' }}>
                <strong>預覽確認：</strong> 請確認下方資料的隱藏狀態是否正確。點擊確認發佈後，此快照將公開顯示於您的個人頁面。
              </div>
            )}

            <div style={{ overflowX: 'auto', background: '#FFF', borderRadius: '8px', border: '1px solid #DED9D3' }}>
              {renderQueueTable(previewData)}
            </div>

            {modalMode === 'preview' && (
              <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  disabled={isPublishing}
                  style={{ padding: '10px 20px', borderRadius: '6px', border: '1px solid #DED9D3', background: '#FFF', color: '#5D4A3E', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  取消
                </button>
                <button 
                  onClick={handleConfirmPublish}
                  disabled={isPublishing}
                  style={{ padding: '10px 24px', borderRadius: '6px', border: 'none', background: '#8CB369', color: '#FFF', fontWeight: 'bold', cursor: isPublishing ? 'not-allowed' : 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                >
                  {isPublishing ? '發佈中...' : '確認發佈'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}