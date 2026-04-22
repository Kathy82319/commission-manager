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
      showToast("載入失敗");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchCustomers(); }, []);

  // 取得歷史紀錄
  const fetchHistory = async (id: string) => {
    const res = await fetch(`${API_BASE}/api/customers/${id}/history`, { credentials: 'include' });
    const result = await res.json();
    if (result.success) setHistory(result.data);
  };

  // ID 搜尋與代出邏輯
  const handleIDSearch = (idNum: string) => {
    const fullID = `User_${idNum}`;
    const found = customers.find(c => c.public_id === fullID);
    if (found) {
      // 若找到現有名單，切換為該名單的編輯模式
      const methods = found.contact_methods ? JSON.parse(found.contact_methods) : [""];
      setSelectedCust({ ...found, contact_methods: methods });
      setModalMode('edit');
      showToast("已帶出現有客戶資料");
    } else {
      // 若沒找到，僅更新目前 selectedCust 的 public_id
      setSelectedCust({ ...selectedCust, public_id: fullID, client_user_id: null });
    }
  };

  // 處理儲存 (新增或更新)
  const handleSave = async () => {
    const isEdit = modalMode === 'edit';
    const endpoint = isEdit ? `${API_BASE}/api/customers/${selectedCust.id}` : `${API_BASE}/api/customers`;
    const method = isEdit ? 'PATCH' : 'POST';

    const res = await fetch(endpoint, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(selectedCust),
      credentials: 'include'
    });
    
    if ((await res.json()).success) {
      showToast(isEdit ? "更新成功" : "新增成功");
      setModalMode('none');
      fetchCustomers();
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("確定要刪除此客戶紀錄嗎？此動作無法復原。")) return;
    const res = await fetch(`${API_BASE}/api/customers/${selectedCust.id}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    if ((await res.json()).success) {
      showToast("紀錄已刪除");
      setModalMode('none');
      fetchCustomers();
    }
  };

  const filteredCustomers = customers.filter(c => 
    activeTab === 'blacklist' ? c.custom_label === '黑名單' : true
  );

  const openViewModal = (cust: Customer) => {
    const methods = cust.contact_methods ? JSON.parse(cust.contact_methods) : [];
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
          總名單 ({customers.length})
        </button>
        <button className={`crm-tab-btn ${activeTab === 'blacklist' ? 'crm-active' : ''}`} onClick={() => setActiveTab('blacklist')}>
          黑名單 ({customers.filter(c => c.custom_label === '黑名單').length})
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
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px' }}>載入中...</td></tr>
            ) : filteredCustomers.map(c => (
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
                  <span className={`crm-tag ${c.custom_label === 'VIP' ? 'crm-tag-vip' : c.custom_label === '黑名單' ? 'crm-tag-blacklisted' : 'crm-tag-normal'}`}>
                    {c.custom_label}
                  </span>
                </td>
                <td>{c.order_count} 次</td>
                <td style={{ textAlign: 'right' }}>
                  <button className="crm-tab-btn" onClick={(e) => { e.stopPropagation(); openViewModal(c); }}>查看詳情</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* CRM 綜合彈窗系統 */}
      {modalMode !== 'none' && selectedCust && (
        <div className="crm-modal-overlay" onClick={() => setModalMode('none')}>
          <div className="crm-modal-card" style={{ maxWidth: modalMode === 'view' ? '650px' : '500px' }} onClick={e => e.stopPropagation()}>
            
            {/* 閱覽模式的分頁切換 */}
            {modalMode === 'view' && (
              <div className="crm-tabs-container" style={{ borderBottom: '1px solid #F0ECE7', marginBottom: '20px' }}>
                <button className={`crm-tab-btn ${modalTab === 'overview' ? 'crm-active' : ''}`} onClick={() => setModalTab('overview')}>基本閱覽</button>
                <button className={`crm-tab-btn ${modalTab === 'history' ? 'crm-active' : ''}`} onClick={() => { setModalTab('history'); fetchHistory(selectedCust.id); }}>過往紀錄</button>
              </div>
            )}

            <div className="crm-modal-body">
              {modalMode === 'view' ? (
                modalTab === 'overview' ? (
                  <div className="crm-view-mode">
                    <div className="crm-view-row"><strong>顯示稱呼：</strong>{selectedCust.alias_name} {selectedCust.platform_name && `(平台名稱: ${selectedCust.platform_name})`}</div>
                    <div className="crm-view-row"><strong>識別 ID：</strong>{selectedCust.public_id}</div>
                    <div className="crm-view-row"><strong>標籤分類：</strong>{selectedCust.custom_label}</div>
                    <div className="crm-view-row"><strong>聯絡社群：</strong>{selectedCust.contact_methods?.join(' / ') || '無'}</div>
                    <div className="crm-view-row"><strong>管理筆記：</strong><p style={{ whiteSpace: 'pre-wrap', color: '#64748B' }}>{selectedCust.full_note || '尚無詳細紀錄'}</p></div>
                    <div style={{ display: 'flex', gap: '12px', marginTop: '30px', justifyContent: 'flex-end' }}>
                      <button className="crm-tab-btn" onClick={() => setModalMode('none')}>關閉視窗</button>
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
                            <div style={{ fontSize: '12px', color: '#A0978D' }}>{h.order_date.substring(0, 10)}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ color: '#5D4A3E' }}>${h.total_price}</div>
                            <div style={{ fontSize: '11px' }}>{h.status}</div>
                          </div>
                        </div>
                      )) : <div style={{ textAlign: 'center', padding: '40px', color: '#A0978D' }}>尚無委託紀錄</div>}
                    </div>
                    <button className="crm-tab-btn" style={{ width: '100%', marginTop: '20px' }} onClick={() => setModalMode('none')}>關閉</button>
                  </div>
                )
              ) : (
                /* 新增與編輯模式的統一表單 */
                <div className="crm-edit-mode">
                  <h3 style={{ marginBottom: '20px' }}>{modalMode === 'add' ? '新增紀錄' : '編輯詳情'}</h3>
                  
                  <div className="crm-form-section">
                    <label className="crm-form-label">識別 ID</label>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span style={{ background: '#F4F0EB', padding: '10px', borderRadius: '8px 0 0 8px', border: '1px solid #DED9D3', borderRight: 'none' }}>User_</span>
                      <input 
                        className="crm-form-input" 
                        style={{ borderRadius: '0 8px 8px 0' }}
                        placeholder="請輸入數字"
                        defaultValue={selectedCust.public_id?.replace('User_', '')}
                        onBlur={(e) => handleIDSearch(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="crm-form-section">
                    <label className="crm-form-label">暱稱 / 名稱</label>
                    {selectedCust.platform_name ? (
                      <>
                        <input className="crm-form-input" value={selectedCust.platform_name} readOnly style={{ background: '#F9F7F5', color: '#A0978D' }} />
                        <label className="crm-form-label" style={{ marginTop: '10px', fontSize: '12px' }}>自定義稱呼 (僅您可見)</label>
                        <input className="crm-form-input" value={selectedCust.alias_name} onChange={e => setSelectedCust({...selectedCust, alias_name: e.target.value})} />
                      </>
                    ) : (
                      <input className="crm-form-input" value={selectedCust.alias_name} onChange={e => setSelectedCust({...selectedCust, alias_name: e.target.value})} placeholder="必填" />
                    )}
                  </div>

                  <div className="crm-form-section">
                    <label className="crm-form-label">社群聯絡方式</label>
                    {selectedCust.contact_methods.map((method: string, index: number) => (
                      <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                        <input 
                          className="crm-form-input" 
                          value={method} 
                          onChange={(e) => {
                            const newMethods = [...selectedCust.contact_methods];
                            newMethods[index] = e.target.value;
                            setSelectedCust({...selectedCust, contact_methods: newMethods});
                          }} 
                        />
                        {index === selectedCust.contact_methods.length - 1 && (
                          <button className="crm-tab-btn" onClick={() => setSelectedCust({...selectedCust, contact_methods: [...selectedCust.contact_methods, '']})}>+</button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="crm-form-section">
                    <label className="crm-form-label">管理筆記</label>
                    <textarea className="crm-form-input" style={{ height: '80px', resize: 'none' }} value={selectedCust.full_note} onChange={e => setSelectedCust({...selectedCust, full_note: e.target.value})} />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '30px' }}>
                    {modalMode === 'edit' ? (
                      <button className="crm-delete-btn" onClick={handleDelete}>刪除紀錄</button>
                    ) : <div></div>}
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button className="crm-tab-btn" onClick={() => modalMode === 'add' ? setModalMode('none') : setModalMode('view')}>取消</button>
                      <button className="crm-submit-btn" onClick={handleSave}>儲存變更</button>
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