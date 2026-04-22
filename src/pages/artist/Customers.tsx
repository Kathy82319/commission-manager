import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/Customers.css';

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
  const [activeTab, setActiveTab] = useState<'all' | 'blacklist'>('all');
  const [customers, setCustomers] = useState<Customer[]>([]); // 正式使用此狀態
  const [toast, setToast] = useState<string | null>(null);

  // 模擬觸發 Toast 通知
  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  // 1. 實作資料讀取邏輯，解決 useEffect 與 setCustomers 未使用的問題
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const res = await fetch('/api/customers');
        const result = await res.json();
        if (result.success) {
          setCustomers(result.data);
        }
      } catch (err) {
        showToast("無法載入客戶名單");
      }
    };
    fetchCustomers();
  }, []);

  // 2. 修正參數，解決 id 與 newNote 未使用的問題
  const handleNoteBlur = async (customerId: string, content: string) => {
    if (!content) return;
    
    try {
      const res = await fetch(`/api/customers/${customerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ short_note: content })
      });
      const result = await res.json();
      if (result.success) {
        showToast("備註已更新");
      }
    } catch (err) {
      showToast("更新失敗");
    }
  };

  // 3. 根據分頁過濾顯示內容
  const filteredCustomers = customers.filter(c => 
    activeTab === 'blacklist' ? c.custom_label === '黑名單' : c.custom_label !== '黑名單'
  );

  return (
    <div className="customers-container">
      {/* Toast 顯示區 */}
      {toast && (
        <div className="toast-container">
          <div className="toast">✓ {toast}</div>
        </div>
      )}

      <div className="customers-header">
        <h2>客戶與誠信管理</h2>
        <button className="submit-btn" style={{ width: 'auto' }}>+ 新增紀錄</button>
      </div>

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

      <div className="customers-table-wrapper">
        <table className="customers-table">
          <thead>
            <tr>
              <th>暱稱</th>
              <th>平台 ID</th>
              <th>標籤</th>
              <th>合作數量</th>
              <th>簡短備註</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {filteredCustomers.length > 0 ? (
              filteredCustomers.map((customer) => (
                <tr key={customer.id} onClick={() => navigate(`/artist/customer/${customer.id}`)}>
                  <td>{customer.nickname}</td>
                  <td>{customer.public_id || '無 ID'}</td>
                  <td>
                    <span className={`tag ${
                      customer.custom_label === 'VIP' ? 'tag-vip' : 
                      customer.custom_label === '黑名單' ? 'tag-blacklisted' : 'tag-normal'
                    }`}>
                      {customer.custom_label}
                    </span>
                  </td>
                  <td>{customer.order_count}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <input 
                      className="inline-note-input"
                      defaultValue={customer.short_note}
                      onBlur={(e) => handleNoteBlur(customer.id, e.target.value)}
                    />
                  </td>
                  <td>
                    <button className="tab-btn" style={{padding: '4px 8px'}}>編輯詳情</button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#94A3B8' }}>
                  目前沒有客戶資料
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}