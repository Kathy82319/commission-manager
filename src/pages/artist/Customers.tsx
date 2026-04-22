import { useState, useEffect } from 'react';
import '../../styles/Customers.css';

interface Customer {
  id: string;
  alias_name: string;
  public_id: string;
  custom_label: string;
  order_count: number;
  short_note: string;
  full_note: string;
  platform_name?: string;
  contact_methods?: string; 
}

export function Customers() {
  const API_BASE = (import.meta as any).env.VITE_API_BASE_URL || '';
  
  const [activeTab, setActiveTab] = useState<'all' | 'blacklist'>('all');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  // 
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedCust, setSelectedCust] = useState<Customer | null>(null);

  const [newCust, setNewCust] = useState({ alias_name: '', public_id: '', label: '一般' });

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

  const handleCreate = async () => {
    if (!newCust.alias_name) return showToast("請填寫稱呼");
    const res = await fetch(`${API_BASE}/api/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newCust),
      credentials: 'include'
    });
    if ((await res.json()).success) {
      showToast("新增成功");
      setIsAddModalOpen(false);
      setNewCust({ alias_name: '', public_id: '', label: '一般' });
      fetchCustomers();
    }
  };

  const handleUpdateDetail = async () => {
    if (!selectedCust) return;
    const res = await fetch(`${API_BASE}/api/customers/${selectedCust.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(selectedCust),
      credentials: 'include'
    });
    if ((await res.json()).success) {
      showToast("資料已更新");
      setIsDetailModalOpen(false);
      fetchCustomers();
    }
  };

  const filteredCustomers = customers.filter(c => 
    activeTab === 'blacklist' ? c.custom_label === '黑名單' : true
  );

  return (
    <div className="customers-container">
      {toast && <div className="toast-container"><div className="toast">✓ {toast}</div></div>}

      <header className="customers-header">
        <h2>顧客管理</h2>
        <button className="submit-btn" onClick={() => setIsAddModalOpen(true)}>+ 新增紀錄</button>
      </header>

      <div className="tabs-container">
        <button className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>
          總名單 ({customers.length})
        </button>
        <button className={`tab-btn ${activeTab === 'blacklist' ? 'active' : ''}`} onClick={() => setActiveTab('blacklist')}>
          黑名單 ({customers.filter(c => c.custom_label === '黑名單').length})
        </button>
      </div>

      <div className="customers-table-wrapper">
        <table className="customers-table">
          <thead>
            <tr>
              <th>暱稱 / 自訂稱呼</th>
              <th>平台識別 ID / 社群</th>
              <th>標籤</th>
              <th>合作次數</th>
              <th>簡短備註</th>
              <th style={{ textAlign: 'right' }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px' }}>讀取中...</td></tr>
            ) : filteredCustomers.map(c => (
              <tr key={c.id}>
                <td style={{ fontWeight: '600' }}>{c.alias_name || c.platform_name}</td>
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontFamily: 'monospace', color: '#5D4A3E' }}>{c.public_id || '---'}</span>
                    {c.contact_methods && (
                      <span style={{ fontSize: '11px', color: '#A0978D' }}>{c.contact_methods}</span>
                    )}
                  </div>
                </td>
                <td>
                  <span className={`tag ${c.custom_label === 'VIP' ? 'tag-vip' : c.custom_label === '黑名單' ? 'tag-blacklisted' : 'tag-normal'}`}>
                    {c.custom_label}
                  </span>
                </td>
                <td>{c.order_count} 次</td>
                <td style={{ color: '#8A7E72', fontSize: '13px' }}>{c.short_note || '---'}</td>
                <td style={{ textAlign: 'right' }}>
                  <button className="tab-btn" onClick={() => { setSelectedCust(c); setIsDetailModalOpen(true); }}>詳情編輯</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isAddModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAddModalOpen(false)}>
          <div className="onboarding-card" onClick={e => e.stopPropagation()}>
            <h3 className="onboarding-title">新增顧客</h3>
            <div className="form-section">
              <label className="form-label">稱呼</label>
              <input className="form-input" value={newCust.alias_name} onChange={e => setNewCust({...newCust, alias_name: e.target.value})} />
            </div>
            <div className="form-section">
              <label className="form-label">標籤</label>
              <select className="form-input" value={newCust.label} onChange={e => setNewCust({...newCust, label: e.target.value})}>
                <option value="一般">一般</option>
                <option value="VIP">VIP</option>
                <option value="黑名單">黑名單</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button className="tab-btn" style={{ flex: 1 }} onClick={() => setIsAddModalOpen(false)}>取消</button>
              <button className="submit-btn" style={{ flex: 1 }} onClick={handleCreate}>確認新增</button>
            </div>
          </div>
        </div>
      )}

      {/* 彈窗：詳情編輯 (CRM 核心) */}
      {isDetailModalOpen && selectedCust && (
        <div className="modal-overlay" onClick={() => setIsDetailModalOpen(false)}>
          <div className="onboarding-card" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
            <h3 className="onboarding-title">顧客詳細資料</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-section">
                <label className="form-label">自訂稱呼</label>
                <input className="form-input" value={selectedCust.alias_name} onChange={e => setSelectedCust({...selectedCust, alias_name: e.target.value})} />
              </div>
              <div className="form-section">
                <label className="form-label">目前標籤</label>
                <select className="form-input" value={selectedCust.custom_label} onChange={e => setSelectedCust({...selectedCust, custom_label: e.target.value})}>
                  <option value="一般">一般</option>
                  <option value="VIP">VIP</option>
                  <option value="黑名單">黑名單</option>
                </select>
              </div>
            </div>
            <div className="form-section">
              <label className="form-label">管理備註</label>
              <input className="form-input" value={selectedCust.short_note} onChange={e => setSelectedCust({...selectedCust, short_note: e.target.value})} />
            </div>
            <div className="form-section">
              <label className="form-label">筆記</label>
              <textarea className="form-input" style={{ height: '100px' }} value={selectedCust.full_note} onChange={e => setSelectedCust({...selectedCust, full_note: e.target.value})} />
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button className="tab-btn" style={{ flex: 1 }} onClick={() => setIsDetailModalOpen(false)}>關閉</button>
              <button className="submit-btn" style={{ flex: 1 }} onClick={handleUpdateDetail}>儲存修改</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}