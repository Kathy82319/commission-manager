import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/Customers.css';

interface Customer {
  id: string;
  alias_name: string;
  public_id: string;
  client_user_id?: string;
  custom_label: string;
  order_count: number;
  short_note: string;
  full_note: string;
  platform_name?: string;
  contact_methods?: string; // JSON 字串
}

export function Customers() {
  const navigate = useNavigate();
  const API_BASE = (import.meta as any).env.VITE_API_BASE_URL || '';
  
  const [activeTab, setActiveTab] = useState<'all' | 'blacklist'>('all');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  const [modalMode, setModalMode] = useState<'none' | 'add' | 'view' | 'edit'>('none');
  const [modalTab, setModalTab] = useState<'overview' | 'history'>('overview');
  const [selectedCust, setSelectedCust] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);

  // 🌟 新增：過濾後的建議清單狀態
  const [suggestions, setSuggestions] = useState<Customer[]>([]);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/customers`, { credentials: 'include' });
      const result = await res.json();
      if (result.success) setCustomers(result.data);
    } catch (err) {
      showToast("載入清單失敗");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchCustomers(); }, []);

  const fetchHistory = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/customers/${id}/history`, { credentials: 'include' });
      const result = await res.json();
      if (result.success) setHistory(result.data);
    } catch (err) {
      showToast("無法讀取歷史紀錄");
    }
  };

  // 🌟 修正：輸入邏輯與建議清單過濾 (限制 5 碼)
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // 僅允許數字，且長度限制為 5
    const val = e.target.value.replace(/\D/g, '').slice(0, 5);
    const fullID = `User_${val}`;
    
    // 更新當前選取的 ID
    setSelectedCust({ ...selectedCust, public_id: fullID });

    if (val.length >= 1) {
      // 從已有名單中找尋開頭符合的 (例如輸入 84，找 84448)
      const matches = customers.filter(c => 
        c.public_id && c.public_id.replace('User_', '').startsWith(val)
      );
      setSuggestions(matches);
    } else {
      setSuggestions([]);
    }
  };

  // 🌟 新增：從建議清單點選
  const handleSelectSuggestion = (cust: Customer) => {
    const methods = cust.contact_methods ? (typeof cust.contact_methods === 'string' ? JSON.parse(cust.contact_methods) : cust.contact_methods) : [""];
    setSelectedCust({ ...cust, contact_methods: methods });
    setModalMode('edit'); // 自動轉為編輯模式
    setSuggestions([]); // 關閉清單
    showToast("已帶入現有紀錄");
  };

  const handleSave = async () => {
    if (!selectedCust.alias_name?.trim() && !selectedCust.platform_name) return showToast("請輸入名稱或稱呼");

    const isEdit = modalMode === 'edit';
    const endpoint = isEdit ? `${API_BASE}/api/customers/${selectedCust.id}` : `${API_BASE}/api/customers`;
    const method = isEdit ? 'PATCH' : 'POST';

    try {
      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...selectedCust,
          contact_methods: selectedCust.contact_methods.filter((m: string) => m.trim() !== '')
        }),
        credentials: 'include'
      });
      
      const result = await res.json();
      if (result.success) {
        showToast(isEdit ? "更新成功" : "新增成功");
        setModalMode('none');
        fetchCustomers();
      } else {
        showToast(result.error || "儲存失敗");
      }
    } catch (err) {
      showToast("連連線異常");
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("確定要刪除這筆手動紀錄嗎？刪除後將無法追蹤預警資訊。")) return;
    try {
      const res = await fetch(`${API_BASE}/api/customers/${selectedCust.id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      const result = await res.json();
      if (result.success) {
        showToast("紀錄已刪除");
        setModalMode('none');
        fetchCustomers();
      }
    } catch (err) {
      showToast("刪除失敗");
    }
  };

  const filteredCustomers = customers.filter(c => 
    activeTab === 'blacklist' ? c.custom_label === '黑名單' : true
  );


// 🌟 直接進入編輯模式的函式
  const openEditModal = (cust: Customer) => {
    const methods = cust.contact_methods ? (typeof cust.contact_methods === 'string' ? JSON.parse(cust.contact_methods) : cust.contact_methods) : [""];
    setSelectedCust({ ...cust, contact_methods: methods });
    setModalMode('edit');
  };

  // 點擊行依然可以進入閱覽模式
  const openViewModal = (cust: Customer) => {
    const methods = cust.contact_methods ? (typeof cust.contact_methods === 'string' ? JSON.parse(cust.contact_methods) : cust.contact_methods) : [""];
    setSelectedCust({ ...cust, contact_methods: methods });
    setModalTab('overview');
    setModalMode('view');
  };

  return (
    <div className="crm-container">
      {toast && <div className="crm-toast-container"><div className="crm-toast">✓ {toast}</div></div>}

      <header className="crm-header">
        <h2>顧客管理</h2>
        <button className="crm-submit-btn" onClick={() => {
          setSelectedCust({ alias_name: '', public_id: 'User_', custom_label: '一般', contact_methods: [''], short_note: '', full_note: '', client_user_id: null });
          setModalMode('add');
          setSuggestions([]);
        }}>+ 新增紀錄</button>
      </header>

      <div className="crm-tabs-container">
        <button className={`crm-tab-btn ${activeTab === 'all' ? 'crm-active' : ''}`} onClick={() => setActiveTab('all')}>總名單 ({customers.length})</button>
        <button className={`crm-tab-btn ${activeTab === 'blacklist' ? 'crm-active' : ''}`} onClick={() => setActiveTab('blacklist')}>黑名單 ({customers.filter(c => c.custom_label === '黑名單').length})</button>
      </div>

      <div className="crm-table-wrapper">
        <table className="crm-table">
          <thead>
            <tr>
              <th>暱稱 / 自訂稱呼</th>
              <th>識別 ID + 社群</th>
              <th>標籤</th>
              <th>合作次數</th>
              <th style={{ textAlign: 'right', paddingRight: '20px' }}>操作</th>            
              </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px' }}>讀取中...</td></tr>
            ) : filteredCustomers.map(c => (
              <tr key={c.id} onClick={() => openViewModal(c)} style={{ cursor: 'pointer' }}>
                <td style={{ fontWeight: '600' }}>{c.alias_name || c.platform_name || '未命名'}</td>
                <td>
                  <div className="crm-id-box">
                    <span className="crm-id-tag">{c.public_id || '---'}</span>
                  </div>
                </td>
                <td><span className={`crm-tag crm-tag-${c.custom_label === 'VIP' ? 'vip' : c.custom_label === '黑名單' ? 'blacklisted' : 'normal'}`}>{c.custom_label}</span></td>
                <td>{c.order_count} 次</td>
                <td style={{ textAlign: 'right', paddingRight: '20px' }}>
                  <button className="crm-tab-btn" onClick={(e) => { e.stopPropagation(); openEditModal(c); }}>編輯</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalMode !== 'none' && selectedCust && (
        <div className="crm-modal-overlay" onClick={() => setModalMode('none')}>
          <div className="crm-modal-card" style={{ maxWidth: modalMode === 'view' ? '650px' : '520px' }} onClick={e => e.stopPropagation()}>
            
            {modalMode === 'view' && (
              <div className="crm-tabs-container" style={{ borderBottom: '1px solid #F0ECE7', marginBottom: '20px', paddingBottom: '10px' }}>
                <button className={`crm-tab-btn ${modalTab === 'overview' ? 'crm-active' : ''}`} onClick={() => setModalTab('overview')}>資料閱覽</button>
                <button className={`crm-tab-btn ${modalTab === 'history' ? 'crm-active' : ''}`} onClick={() => { setModalTab('history'); fetchHistory(selectedCust.id); }}>過往紀錄</button>
              </div>
            )}

            <div className="crm-modal-body">
              {modalMode === 'view' ? (
                modalTab === 'overview' ? (
                  <div className="crm-view-mode">
                    {/* 🌟 修正：確保識別 ID 顯示 */}
                    <div className="crm-view-row"><strong>主要稱呼：</strong>{selectedCust.alias_name} {selectedCust.platform_name && <span style={{ fontSize: '13px', color: '#8A7E72' }}>(平台名: {selectedCust.platform_name})</span>}</div>
                    <div className="crm-view-row"><strong>識別 ID：</strong><span style={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#5D4A3E' }}>{selectedCust.public_id || '無識別 ID'}</span></div>
                    <div className="crm-view-row"><strong>標籤分類：</strong><span className={`crm-tag crm-tag-${selectedCust.custom_label === 'VIP' ? 'vip' : selectedCust.custom_label === '黑名單' ? 'blacklisted' : 'normal'}`}>{selectedCust.custom_label}</span></div>
                    <div className="crm-view-row"><strong>社群資訊：</strong>{selectedCust.contact_methods?.join(' / ') || '無紀錄'}</div>
                    <div className="crm-view-row"><strong>詳細筆記：</strong><p style={{ whiteSpace: 'pre-wrap', color: '#64748B', background: '#FDFBFA', padding: '12px', borderRadius: '8px', border: '1px solid #F0ECE7' }}>{selectedCust.full_note || '尚無內容'}</p></div>
                    <div style={{ display: 'flex', gap: '12px', marginTop: '30px', justifyContent: 'flex-end' }}>
                      <button className="crm-tab-btn" onClick={() => setModalMode('none')}>關閉</button>
                      <button className="crm-submit-btn" onClick={() => setModalMode('edit')}>編輯詳情</button>
                    </div>
                  </div>
                ) : (
                  <div className="crm-history-mode">
                    <div className="crm-history-list" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                      {history.length > 0 ? history.map(h => (
                        <div key={h.id} className="crm-history-item" onClick={() => navigate(`/artist/notebook?id=${h.id}`)}>
                          <div><strong>{h.project_name || '未命名'}</strong><br/><small>{h.order_date.substring(0, 10)}</small></div>
                          <div style={{ textAlign: 'right' }}>${h.total_price}<br/><small>{h.status}</small></div>
                        </div>
                      )) : <div style={{ textAlign: 'center', padding: '40px', color: '#A0978D' }}>尚未與此客戶有過委託</div>}
                    </div>
                    <button className="crm-tab-btn" style={{ width: '100%', marginTop: '20px' }} onClick={() => setModalMode('none')}>關閉</button>
                  </div>
                )
              ) : (
                <div className="crm-edit-mode">
                  <h3 style={{ marginBottom: '20px', color: '#5D4A3E' }}>{modalMode === 'add' ? '新增紀錄' : '編輯詳情'}</h3>
                  
                  {/* 🌟 修正：建議選單容器 */}
                  <div className="crm-form-section" style={{ position: 'relative' }}>
                    <label className="crm-form-label">識別 ID (輸入 5 位數字)</label>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span className="crm-id-prefix">User_</span>
                      <input 
                        className="crm-form-input" 
                        style={{ borderRadius: '0 8px 8px 0', borderLeft: 'none' }}
                        placeholder="例如: 84448"
                        value={selectedCust.public_id?.replace('User_', '') || ''}
                        onChange={handleInputChange}
                      />
                    </div>
                    
                    {/* 🌟 建議清單：使用 absolute 定位防止推擠 */}
                    {suggestions.length > 0 && (
                      <div className="crm-suggestions-list">
                        {suggestions.map(s => (
                          <div key={s.id} className="crm-suggestion-item" onClick={() => handleSelectSuggestion(s)}>
                            <strong>{s.public_id}</strong> - {s.alias_name || s.platform_name || '現有客戶'}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="crm-form-section">
                    <label className="crm-form-label">{selectedCust.client_user_id ? '系統名稱 (鎖定)' : '稱呼 / 暱稱'}</label>
                    <input className="crm-form-input" value={selectedCust.alias_name} onChange={e => setSelectedCust({...selectedCust, alias_name: e.target.value})} readOnly={!!selectedCust.client_user_id} />
                  </div>

                  <div className="crm-form-section">
                    <label className="crm-form-label">社群聯絡方式 (上限 3 個)</label>
                    {selectedCust.contact_methods.map((method: string, index: number) => (
                      <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                        <input className="crm-form-input" value={method} onChange={(e) => {
                          const newMethods = [...selectedCust.contact_methods];
                          newMethods[index] = e.target.value;
                          setSelectedCust({...selectedCust, contact_methods: newMethods});
                        }} />
                        {index === selectedCust.contact_methods.length - 1 && selectedCust.contact_methods.length < 3 && (
                          <button className="crm-tab-btn" onClick={() => setSelectedCust({...selectedCust, contact_methods: [...selectedCust.contact_methods, '']})}>+</button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="crm-form-section">
                    <label className="crm-form-label">詳細合作筆記</label>
                    <textarea className="crm-form-input" style={{ height: '80px', resize: 'none' }} value={selectedCust.full_note} onChange={e => setSelectedCust({...selectedCust, full_note: e.target.value})} />
                  </div>

                  <div className="crm-form-section">
                    <label className="crm-form-label">標籤分類</label>
                    <select className="crm-form-input" value={selectedCust.custom_label} onChange={e => setSelectedCust({...selectedCust, custom_label: e.target.value})}>
                      <option value="一般">一般</option>
                      <option value="VIP">VIP</option>
                      <option value="黑名單">黑名單</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '30px' }}>
                    {modalMode === 'edit' && !selectedCust.client_user_id ? (
                      <button className="crm-delete-btn" onClick={handleDelete}>永久刪除此紀錄</button>
                    ) : <div></div>}
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button className="crm-tab-btn" onClick={() => setModalMode('none')}>取消</button>
                      <button className="crm-submit-btn" onClick={handleSave}>儲存資料</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>  
      )}
    </div>
  );
}