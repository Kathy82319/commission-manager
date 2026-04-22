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
  contact_methods?: string; // 資料庫存的是 JSON 字串
}

export function Customers() {
  const navigate = useNavigate();
  const API_BASE = (import.meta as any).env.VITE_API_BASE_URL || '';
  
  const [activeTab, setActiveTab] = useState<'all' | 'blacklist'>('all');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  // 彈窗狀態機: 'none' | 'add' | 'view' | 'edit'
  const [modalMode, setModalMode] = useState<'none' | 'add' | 'view' | 'edit'>('none');
  const [modalTab, setModalTab] = useState<'overview' | 'history'>('overview');
  const [selectedCust, setSelectedCust] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

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

  // 取得歷史紀錄
  const fetchHistory = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/customers/${id}/history`, { credentials: 'include' });
      const result = await res.json();
      if (result.success) setHistory(result.data);
    } catch (err) {
      showToast("無法讀取歷史紀錄");
    }
  };

  // ID 搜尋與自動代出邏輯
  const handleIDSearch = (idNum: string) => {
    if (!idNum) return;
    setIsSearching(true);
    const fullID = `User_${idNum}`;
    
    // 模擬搜尋感並從現有名單比對
    setTimeout(() => {
      const found = customers.find(c => c.public_id === fullID);
      if (found) {
        const methods = found.contact_methods ? JSON.parse(found.contact_methods) : [""];
        setSelectedCust({ ...found, contact_methods: methods });
        setModalMode('edit'); // 搜到現有的就改為編輯模式
        showToast("已找到現有客戶並自動帶入");
      } else {
        setSelectedCust({ ...selectedCust, public_id: fullID, client_user_id: null });
        showToast("未找到現有客戶，將建立新紀錄");
      }
      setIsSearching(false);
    }, 600);
  };

  // 處理儲存
  const handleSave = async () => {
    // 檢查必填
    if (!selectedCust.alias_name.trim()) return showToast("請輸入名稱或稱呼");

    const isEdit = modalMode === 'edit';
    const endpoint = isEdit ? `${API_BASE}/api/customers/${selectedCust.id}` : `${API_BASE}/api/customers`;
    const method = isEdit ? 'PATCH' : 'POST';

    try {
      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...selectedCust,
          // 過濾空社群欄位
          contact_methods: selectedCust.contact_methods.filter((m: string) => m.trim() !== '')
        }),
        credentials: 'include'
      });
      
      const result = await res.json();
      if (result.success) {
        showToast(isEdit ? "資料更新成功" : "新增成功");
        setModalMode('none');
        fetchCustomers();
      } else {
        showToast(result.error || "儲存失敗");
      }
    } catch (err) {
      showToast("連線異常");
    }
  };

  // 刪除邏輯：僅限手動紀錄 (client_user_id 為空)
  const handleDelete = async () => {
    if (!window.confirm("確定要刪除這筆手動紀錄嗎？刪除後無法復原。")) return;
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
      } else {
        showToast("刪除失敗");
      }
    } catch (err) {
      showToast("API 路由異常，請檢查後端設定");
    }
  };

  const filteredCustomers = customers.filter(c => 
    activeTab === 'blacklist' ? c.custom_label === '黑名單' : true
  );

  const openViewModal = (cust: Customer) => {
    const methods = cust.contact_methods ? JSON.parse(cust.contact_methods) : [""];
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
          setSelectedCust({ alias_name: '', public_id: 'User_', custom_label: '一般', contact_methods: [''], short_note: '', full_note: '' });
          setModalMode('add');
        }}>+ 新增紀錄</button>
      </header>

      <div className="crm-tabs-container">
        <button className={`crm-tab-btn ${activeTab === 'all' ? 'crm-active' : ''}`} onClick={() => setActiveTab('all')}>
          總顧客名單 ({customers.length})
        </button>
        <button className={`crm-tab-btn ${activeTab === 'blacklist' ? 'crm-active' : ''}`} onClick={() => setActiveTab('blacklist')}>
          黑名單封鎖區 ({customers.filter(c => c.custom_label === '黑名單').length})
        </button>
      </div>

      <div className="crm-table-wrapper">
        <table className="crm-table">
          <thead>
            <tr>
              <th>暱稱 / 自訂稱呼</th>
              <th>平台識別 ID / 社群</th>
              <th>標籤</th>
              <th>合作次數</th>
              <th style={{ textAlign: 'right' }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px' }}>數據同步中...</td></tr>
            ) : filteredCustomers.length > 0 ? (
              filteredCustomers.map(c => (
                <tr key={c.id} onClick={() => openViewModal(c)} style={{ cursor: 'pointer' }}>
                  <td style={{ fontWeight: '600' }}>{c.alias_name || c.platform_name}</td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontFamily: 'monospace', color: '#5D4A3E' }}>{c.public_id || '---'}</span>
                      {c.contact_methods && JSON.parse(c.contact_methods)[0] && (
                        <span style={{ fontSize: '11px', color: '#A0978D' }}>{JSON.parse(c.contact_methods)[0]}</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className={`crm-tag crm-tag-${c.custom_label === 'VIP' ? 'vip' : c.custom_label === '黑名單' ? 'blacklisted' : 'normal'}`}>
                      {c.custom_label}
                    </span>
                  </td>
                  <td><span style={{ fontWeight: '500' }}>{c.order_count}</span> 次</td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="crm-tab-btn" onClick={(e) => { e.stopPropagation(); openViewModal(c); }}>詳情</button>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '60px', color: '#A0978D' }}>目前尚無對應資料</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* CRM 綜合彈窗系統 */}
      {modalMode !== 'none' && selectedCust && (
        <div className="crm-modal-overlay" onClick={() => setModalMode('none')}>
          <div className="crm-modal-card" style={{ maxWidth: modalMode === 'view' ? '650px' : '520px' }} onClick={e => e.stopPropagation()}>
            
            {/* 閱覽模式的分頁切換 */}
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
                    <div className="crm-view-row"><strong>主要稱呼：</strong>{selectedCust.alias_name} {selectedCust.platform_name && <span style={{ color: '#A0978D', fontSize: '13px' }}>(平台名: {selectedCust.platform_name})</span>}</div>
                    <div className="crm-view-row"><strong>識別 ID：</strong>{selectedCust.public_id}</div>
                    <div className="crm-view-row"><strong>標籤分類：</strong>
                      <span className={`crm-tag crm-tag-${selectedCust.custom_label === 'VIP' ? 'vip' : selectedCust.custom_label === '黑名單' ? 'blacklisted' : 'normal'}`}>{selectedCust.custom_label}</span>
                    </div>
                    <div className="crm-view-row"><strong>社群資訊：</strong>{selectedCust.contact_methods?.join(' / ') || '無紀錄'}</div>
                    <div className="crm-view-row"><strong>管理筆記：</strong><p style={{ whiteSpace: 'pre-wrap', color: '#64748B', background: '#FDFBFA', padding: '12px', borderRadius: '8px' }}>{selectedCust.full_note || '尚無內容'}</p></div>
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
                          <div>
                            <div style={{ fontWeight: 'bold' }}>{h.project_name || '未命名項目'}</div>
                            <div style={{ fontSize: '12px', color: '#A0978D' }}>單號：{h.id.split('-')[0]} | {h.order_date.substring(0, 10)}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ color: '#5D4A3E', fontWeight: 'bold' }}>${h.total_price}</div>
                            <div style={{ fontSize: '11px', color: '#8A7E72' }}>{h.status}</div>
                          </div>
                        </div>
                      )) : <div style={{ textAlign: 'center', padding: '40px', color: '#A0978D' }}>尚未與此客戶完成過任何委託</div>}
                    </div>
                    <button className="crm-tab-btn" style={{ width: '100%', marginTop: '20px' }} onClick={() => setModalMode('none')}>關閉視窗</button>
                  </div>
                )
              ) : (
                /* 新增與編輯模式的統一表單 */
                <div className="crm-edit-mode">
                  <h3 style={{ marginBottom: '20px', color: '#5D4A3E' }}>{modalMode === 'add' ? '新增客戶紀錄' : '編輯客戶詳情'}</h3>
                  
                  <div className="crm-form-section">
                    <label className="crm-form-label">識別 ID (User_ 數字)</label>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span className="crm-id-prefix">User_</span>
                      <input 
                        className="crm-form-input" 
                        style={{ borderRadius: '0 8px 8px 0', borderLeft: 'none' }}
                        placeholder="輸入數字"
                        defaultValue={selectedCust.public_id?.replace('User_', '')}
                        onBlur={(e) => handleIDSearch(e.target.value)}
                      />
                      <button className="crm-tab-btn" style={{ marginLeft: '8px', minWidth: '80px' }} onClick={() => handleIDSearch(selectedCust.public_id?.replace('User_', ''))}>
                        {isSearching ? "..." : "🔍 搜尋"}
                      </button>
                    </div>
                  </div>

                  <div className="crm-form-section">
                    <label className="crm-form-label">
                      {selectedCust.platform_name ? '平台顯示名稱 (不可改)' : '稱呼 / 暱稱'}
                    </label>
                    {selectedCust.platform_name ? (
                      <>
                        <input className="crm-form-input" value={selectedCust.platform_name} readOnly style={{ background: '#F9F7F5', color: '#A0978D' }} />
                        <label className="crm-form-label" style={{ marginTop: '12px', fontSize: '12px', color: '#8A7E72' }}>自定義稱呼 (方便您辨識)</label>
                        <input className="crm-form-input" value={selectedCust.alias_name} onChange={e => setSelectedCust({...selectedCust, alias_name: e.target.value})} placeholder="例如: 某某的大力贊助人" />
                      </>
                    ) : (
                      <input className="crm-form-input" value={selectedCust.alias_name} onChange={e => setSelectedCust({...selectedCust, alias_name: e.target.value})} placeholder="請輸入對方的稱呼" />
                    )}
                  </div>

                  <div className="crm-form-section">
                    <label className="crm-form-label">社群聯絡方式 (上限 3 個)</label>
                    {selectedCust.contact_methods.map((method: string, index: number) => (
                      <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                        <input 
                          className="crm-form-input" 
                          value={method} 
                          placeholder="例如: Twitter @ID 或 FB 連結"
                          onChange={(e) => {
                            const newMethods = [...selectedCust.contact_methods];
                            newMethods[index] = e.target.value;
                            setSelectedCust({...selectedCust, contact_methods: newMethods});
                          }} 
                        />
                        {index === selectedCust.contact_methods.length - 1 && selectedCust.contact_methods.length < 3 && (
                          <button className="crm-tab-btn" onClick={() => setSelectedCust({...selectedCust, contact_methods: [...selectedCust.contact_methods, '']})}>+</button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="crm-form-section">
                    <label className="crm-form-label">標籤分類</label>
                    <select className="crm-form-input" value={selectedCust.custom_label} onChange={e => setSelectedCust({...selectedCust, custom_label: e.target.value})}>
                      <option value="一般">一般客戶</option>
                      <option value="VIP">VIP 優質大戶</option>
                      <option value="黑名單">黑名單 (拒絕接單)</option>
                    </select>
                  </div>

                  <div className="crm-form-section">
                    <label className="crm-form-label">詳細合作筆記</label>
                    <textarea className="crm-form-input" style={{ height: '80px', resize: 'none' }} value={selectedCust.full_note} onChange={e => setSelectedCust({...selectedCust, full_note: e.target.value})} placeholder="紀錄此人的委託喜好、地雷或合作心得..." />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '30px' }}>
                    {/* 只有非系統用戶的手動紀錄才顯示刪除 */}
                    {modalMode === 'edit' && !selectedCust.client_user_id ? (
                      <button className="crm-delete-btn" onClick={handleDelete}>永久刪除紀錄</button>
                    ) : <div></div>}
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button className="crm-tab-btn" onClick={() => modalMode === 'add' ? setModalMode('none') : setModalMode('view')}>取消</button>
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