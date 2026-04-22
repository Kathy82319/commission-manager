import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/Customers.css';

// 定義客戶資料型別
interface Customer {
  id: string;
  nickname: string;
  public_id: string;
  custom_label: string;
  order_count: number;
  short_note: string;
}

export function Customers() {
  const navigate = useNavigate();
  const API_BASE = (import.meta as any).env.VITE_API_BASE_URL || '';
  
  // 狀態管理
  const [activeTab, setActiveTab] = useState<'all' | 'blacklist'>('all');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  // 彈窗狀態
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ 
    nickname: '', 
    public_id: '', 
    label: '一般' 
  });

  // 顯示通知函式
  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  // 1. 取得客戶列表
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

  // 2. 處理行內備註更新 (onBlur)
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
        // 更新本地狀態，避免重新 fetch 整張表
        setCustomers(prev => prev.map(c => c.id === customerId ? { ...c, short_note: content } : c));
      }
    } catch (err) {
      showToast("儲存失敗");
    }
  };

  // 3. 處理手動新增客戶
  const handleCreateCustomer = async () => {
    if (!newCustomer.nickname.trim()) {
      showToast("請輸入客戶暱稱");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nickname: newCustomer.nickname,
          client_user_id: null, // 手動新增預設為外部用戶
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
        setNewCustomer({ nickname: '', public_id: '', label: '一般' });
        fetchCustomers(); // 刷新列表
      } else {
        showToast(result.error || "新增失敗");
      }
    } catch (err) {
      showToast("伺服器連線錯誤");
    }
  };

  // 4. 過濾資料
  const filteredCustomers = customers.filter(c => 
    activeTab === 'blacklist' ? c.custom_label === '黑名單' : c.custom_label !== '黑名單'
  );

  return (
    <div className="customers-container">
      {/* Toast 通知組件 */}
      {toast && (
        <div className="toast-container">
          <div className="toast">✓ {toast}</div>
        </div>
      )}

      <div className="customers-header">
        <h2>客戶與誠信管理</h2>
        <button 
          className="submit-btn" 
          style={{ width: 'auto' }} 
          onClick={() => setIsModalOpen(true)}
        >
          + 手動新增紀錄
        </button>
      </div>

      {/* 分頁標籤 */}
      <div className="tabs-container">
        <button 
          className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          總客戶名單
        </button>
        <button 
          className={`tab-btn ${activeTab === 'blacklist' ? 'active' : ''}`}
          onClick={() => setActiveTab('blacklist')}
        >
          黑名單分頁
        </button>
      </div>

      {/* 資料表格 */}
      <div className="customers-table-wrapper">
        <table className="customers-table">
          <thead>
            <tr>
              <th>暱稱 / 自訂名稱</th>
              <th>平台識別 ID</th>
              <th>目前標籤</th>
              <th>合作次數</th>
              <th>簡短備註 (點擊編輯)</th>
              <th>管理</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px' }}>讀取中...</td></tr>
            ) : filteredCustomers.length > 0 ? (
              filteredCustomers.map((customer) => (
                <tr key={customer.id} onClick={() => navigate(`/artist/customer/${customer.id}`)}>
                  <td style={{ fontWeight: 'bold' }}>{customer.nickname}</td>
                  <td style={{ color: '#64748B', fontFamily: 'monospace' }}>{customer.public_id || '---'}</td>
                  <td>
                    <span className={`tag ${
                      customer.custom_label === 'VIP' ? 'tag-vip' : 
                      customer.custom_label === '黑名單' ? 'tag-blacklisted' : 'tag-normal'
                    }`}>
                      {customer.custom_label}
                    </span>
                  </td>
                  <td>{customer.order_count} 次</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <input 
                      className="inline-note-input"
                      defaultValue={customer.short_note}
                      onBlur={(e) => handleNoteBlur(customer.id, e.target.value)}
                      placeholder="點擊新增備註..."
                    />
                  </td>
                  <td>
                    <button className="tab-btn" style={{ padding: '4px 12px', fontSize: '12px' }}>
                      詳情
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '60px', color: '#94A3B8' }}>
                  {activeTab === 'blacklist' ? "目前沒有黑名單紀錄" : "目前尚無客戶資料"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 新增紀錄彈窗 */}
      {isModalOpen && (
        <div className="sidebar-overlay visible" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setIsModalOpen(false)}>
          <div className="onboarding-card" style={{ maxWidth: '400px', width: '90%', margin: '0' }} onClick={e => e.stopPropagation()}>
            <h3 className="onboarding-title">新增客戶紀錄</h3>
            <p className="onboarding-subtitle">您可以手動紀錄場外交易的對象</p>
            
            <div className="form-section">
              <label className="form-label">客戶暱稱 / 稱呼</label>
              <input 
                className="form-input" 
                value={newCustomer.nickname}
                onChange={e => setNewCustomer({...newCustomer, nickname: e.target.value})}
                placeholder="例如：王小明 (FB)"
              />
            </div>

            <div className="form-section">
              <label className="form-label">平台 ID (若有)</label>
              <input 
                className="form-input" 
                value={newCustomer.public_id}
                onChange={e => setNewCustomer({...newCustomer, public_id: e.target.value})}
                placeholder="User_XXXXX"
              />
            </div>

            <div className="form-section">
              <label className="form-label">初始分類</label>
              <select 
                className="form-input" 
                value={newCustomer.label}
                onChange={e => setNewCustomer({...newCustomer, label: e.target.value})}
              >
                <option value="一般">一般客戶</option>
                <option value="VIP">VIP 優質客戶</option>
                <option value="黑名單">黑名單 (拒接)</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
              <button className="submit-btn" style={{ backgroundColor: '#E2E8F0', color: '#475569' }} onClick={() => setIsModalOpen(false)}>取消</button>
              <button className="submit-btn" onClick={handleCreateCustomer}>確認新增</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}