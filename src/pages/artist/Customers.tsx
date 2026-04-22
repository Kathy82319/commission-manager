import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/Customers.css';

interface Customer {
  id: string;
  alias_name: string; 
  public_id: string;
  custom_label: string;
  order_count: number;
  short_note: string;
  platform_name?: string;
}

export function Customers() {
  const navigate = useNavigate();
  const API_BASE = (import.meta as any).env.VITE_API_BASE_URL || '';
  
  const [activeTab, setActiveTab] = useState<'all' | 'blacklist'>('all');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ 
    alias_name: '', 
    public_id: '', 
    label: '一般' 
  });

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/customers`, { credentials: 'include' });
      const result = await res.json();
      if (result.success) {
        setCustomers(result.data);
      } else {
        showToast("資料讀取失敗");
      }
    } catch (err) {
      showToast("連線至伺服器失敗");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleNoteBlur = async (customerId: string, content: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/customers/${customerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ short_note: content }),
        credentials: 'include'
      });
      const result = await res.json();
      if (result.success) {
        showToast("備註已更新");
        setCustomers(prev => prev.map(c => c.id === customerId ? { ...c, short_note: content } : c));
      }
    } catch (err) {
      showToast("儲存失敗");
    }
  };

  const handleCreateCustomer = async () => {
    if (!newCustomer.alias_name.trim()) {
      showToast("請輸入客戶稱呼");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alias_name: newCustomer.alias_name,
          client_user_id: null,
          public_id: newCustomer.public_id,
          custom_label: newCustomer.label,
          short_note: '手動新增紀錄'
        }),
        credentials: 'include'
      });
      const result = await res.json();
      if (result.success) {
        showToast("新增成功");
        setIsModalOpen(false);
        setNewCustomer({ alias_name: '', public_id: '', label: '一般' });
        fetchCustomers();
      } else {
        showToast(result.error || "新增失敗");
      }
    } catch (err) {
      showToast("伺服器連線錯誤");
    }
  };

  const filteredCustomers = customers.filter(c => 
    activeTab === 'blacklist' ? c.custom_label === '黑名單' : c.custom_label !== '黑名單'
  );

  return (
    <div className="customers-container">
      {toast && (
        <div className="toast-container">
          <div className="toast">✓ {toast}</div>
        </div>
      )}

      <header className="customers-header">
        <div>
          <h2>客戶與誠信管理</h2>
          <div style={{ fontSize: '13px', color: '#A0978D', marginTop: '4px' }}>後台數據管理</div>
        </div>
        <button className="submit-btn" onClick={() => setIsModalOpen(true)}>
          + 手動新增紀錄
        </button>
      </header>

      <nav className="tabs-container">
        <button 
          className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`} 
          onClick={() => setActiveTab('all')}
        >
          總客戶名單 ({customers.filter(c => c.custom_label !== '黑名單').length})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'blacklist' ? 'active' : ''}`} 
          onClick={() => setActiveTab('blacklist')}
        >
          黑名單封鎖區 ({customers.filter(c => c.custom_label === '黑名單').length})
        </button>
      </nav>

      <div className="customers-table-wrapper">
        <table className="customers-table">
          <thead>
            <tr>
              <th>暱稱 / 自訂稱呼</th>
              <th>平台識別 ID</th>
              <th>目前標籤</th>
              <th>合作次數</th>
              <th>管理備註</th>
              <th style={{ textAlign: 'right' }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px' }}>數據載入中...</td></tr>
            ) : filteredCustomers.length > 0 ? (
              filteredCustomers.map((customer) => (
                <tr key={customer.id}>
                  <td style={{ fontWeight: '600' }}>{customer.alias_name || customer.platform_name || '未知客戶'}</td>
                  <td style={{ color: '#A0978D', fontFamily: 'monospace', fontSize: '13px' }}>{customer.public_id || '---'}</td>
                  <td>
                    <span className={`tag ${
                      customer.custom_label === 'VIP' ? 'tag-vip' : 
                      customer.custom_label === '黑名單' ? 'tag-blacklisted' : 'tag-normal'
                    }`}>
                      {customer.custom_label}
                    </span>
                  </td>
                  <td><span style={{ fontWeight: '500' }}>{customer.order_count}</span> 次</td>
                  <td onClick={(e) => e.stopPropagation()} style={{ width: '30%' }}>
                    <input 
                      className="inline-note-input"
                      defaultValue={customer.short_note}
                      onBlur={(e) => handleNoteBlur(customer.id, e.target.value)}
                      placeholder="點擊編輯備註..."
                    />
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button 
                      className="tab-btn" 
                      style={{ padding: '4px 12px' }}
                      onClick={() => navigate(`/artist/customer/${customer.id}`)}
                    >
                      詳情
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '80px', color: '#A0978D' }}>{activeTab === 'blacklist' ? "目前名單乾淨，尚無黑名單紀錄" : "目前尚無客戶資料，將從第一筆單據開始累積"}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="onboarding-card" onClick={e => e.stopPropagation()}>
            <h3 className="onboarding-title">新增管理紀錄</h3>
            <p className="onboarding-subtitle">手動紀錄場外交易或預防性封鎖</p>
            
            <div className="form-section">
              <label className="form-label">客戶暱稱 / 自訂稱呼</label>
              <input 
                className="form-input" 
                value={newCustomer.alias_name}
                onChange={e => setNewCustomer({...newCustomer, alias_name: e.target.value})}
                placeholder="例如：王小明 (FB傳訊)"
              />
            </div>

            <div className="form-section">
              <label className="form-label">平台公共 ID (選填)</label>
              <input 
                className="form-input" 
                value={newCustomer.public_id}
                onChange={e => setNewCustomer({...newCustomer, public_id: e.target.value})}
                placeholder="User_XXXXX"
              />
            </div>

            <div className="form-section">
              <label className="form-label">標籤分類</label>
              <select 
                className="form-input" 
                value={newCustomer.label}
                onChange={e => setNewCustomer({...newCustomer, label: e.target.value})}
              >
                <option value="一般">一般客戶</option>
                <option value="VIP">VIP 優質客戶</option>
                <option value="黑名單">黑名單</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
              <button className="tab-btn" style={{ flex: 1 }} onClick={() => setIsModalOpen(false)}>
                取消
              </button>
              <button className="submit-btn" style={{ flex: 2 }} onClick={handleCreateCustomer}>
                確認新增
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}