// src/pages/artist/CustomerDetail.tsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import '../../styles/Customers.css';

interface Transaction {
  id: string;
  project_name: string;
  total_price: number;
  order_date: string;
  status: string;
}

// 新增 Review 介面
interface Review {
  id: string;
  commission_id: string;
  project_name: string;
  rating: number;
  content: string;
  client_anonymous: number;
  artist_anonymous: number;
  is_public: number;
  created_at: string;
}

interface CustomerData {
  id: string;
  client_user_id?: string; // 加入這個以便撈取評價
  platform_nickname: string;
  public_id: string;
  alias_name: string;
  custom_label: string;
  full_note: string;
  contact_methods: string[];
  transactions: Transaction[];
}

export function CustomerDetail() {
  const { id: customerIdFromParams } = useParams(); // 避免 id 名稱衝突
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'info' | 'history' | 'reviews'>('info');
  const [data, setData] = useState<CustomerData | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]); // 儲存歷史評價
  const [isLoading, setIsLoading] = useState(true);
  const [isReviewsLoading, setIsReviewsLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || '';

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/customers/${customerIdFromParams}`, { credentials: 'include' });
        const result = await res.json();
        if (result.success) {
          const contactMethods = typeof result.data.contact_methods === 'string' 
            ? JSON.parse(result.data.contact_methods) 
            : (result.data.contact_methods || []);
          setData({ ...result.data, contact_methods: contactMethods });
        }
      } catch (err) {
        showToast("資料讀取失敗");
      } finally {
        setIsLoading(false);
      }
    };
    if (customerIdFromParams) fetchData();
  }, [customerIdFromParams, API_BASE]);

  // 當切換到「歷史評價」Tab 時，如果該客戶有綁定系統帳號，則撈取評價
  useEffect(() => {
    if (activeTab === 'reviews' && data?.client_user_id) {
      const fetchReviews = async () => {
        setIsReviewsLoading(true);
        try {
          const res = await fetch(`${API_BASE}/api/customers/${data.client_user_id}/reviews`, { credentials: 'include' });
          const result = await res.json();
          if (result.success) {
            setReviews(result.data || []);
          }
        } catch (err) {
          showToast("評價讀取失敗");
        } finally {
          setIsReviewsLoading(false);
        }
      };
      fetchReviews();
    }
  }, [activeTab, data?.client_user_id, API_BASE]);

  const handleUpdate = async (fields: Partial<CustomerData>) => {
    try {
      const res = await fetch(`${API_BASE}/api/customers/${customerIdFromParams}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields)
      });
      const result = await res.json();
      if (result.success) {
        setData(prev => prev ? { ...prev, ...fields } : null);
        showToast("儲存成功");
      }
    } catch (err) {
      showToast("更新失敗");
    }
  };

  const updateContact = (index: number, value: string) => {
    if (!data) return;
    const newContacts = [...data.contact_methods];
    newContacts[index] = value;
    handleUpdate({ contact_methods: newContacts });
  };

  const renderStars = (rating: number) => {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
  };

  if (isLoading) return <div className="loading-screen">讀取中...</div>;
  if (!data) return <div className="loading-screen">找不到客戶資料</div>;

  return (
    <div className="customers-container">
      {toast && (
        <div className="toast-container">
          <div className="toast">✓ {toast}</div>
        </div>
      )}

      <div className="customers-header">
        <h2>客戶管理中心 (CRM)</h2>
        <button className="tab-btn" onClick={() => navigate('/artist/customers')}>← 返回列表</button>
      </div>

      <div className="tabs-container">
        <button className={`tab-btn ${activeTab === 'info' ? 'active' : ''}`} onClick={() => setActiveTab('info')}>客戶總覽</button>
        <button className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>交易紀錄</button>
        {/* 新增歷史評價 Tab */}
        <button className={`tab-btn ${activeTab === 'reviews' ? 'active' : ''}`} onClick={() => setActiveTab('reviews')}>歷史評價</button>
      </div>

      {activeTab === 'info' && (
        <div className="onboarding-card" style={{ maxWidth: '100%', marginTop: '20px' }}>
          <div className="form-section">
            <label className="form-label">平台識別資訊</label>
            <div style={{ color: '#64748B', fontSize: '14px', marginBottom: '16px' }}>
              原始暱稱：{data.platform_nickname || '外部用戶'} | 平台 ID：{data.public_id || '無'}
            </div>
          </div>

          <div className="form-section">
            <label className="form-label">客戶自訂名稱 (真名/暱稱)</label>
            <input 
              className="form-input" 
              defaultValue={data.alias_name}
              onBlur={(e) => handleUpdate({ alias_name: e.target.value })}
              placeholder="輸入您對此客戶的稱呼..."
            />
          </div>

          <div className="form-section">
            <label className="form-label">分類標籤</label>
            <select 
              className="form-input" 
              value={data.custom_label}
              onChange={(e) => handleUpdate({ custom_label: e.target.value })}
            >
              <option value="一般">一般</option>
              <option value="VIP">VIP</option>
              <option value="黑名單">黑名單</option>
            </select>
          </div>

          <div className="form-section">
            <label className="form-label">聯絡方式 (最多 3 組)</label>
            {[0, 1, 2].map((i) => (
              <input 
                key={i}
                className="form-input" 
                style={{ marginBottom: '8px' }}
                value={data.contact_methods[i] || ''}
                onChange={(e) => {
                  const newContacts = [...data.contact_methods];
                  newContacts[i] = e.target.value;
                  setData({...data, contact_methods: newContacts});
                }}
                onBlur={(e) => updateContact(i, e.target.value)}
                placeholder={`聯絡方式 ${i + 1}`}
              />
            ))}
          </div>

          <div className="form-section">
            <label className="form-label">詳細筆記區</label>
            <textarea 
              className="form-input" 
              style={{ minHeight: '150px', lineHeight: '1.6' }}
              defaultValue={data.full_note}
              onBlur={(e) => handleUpdate({ full_note: e.target.value })}
              placeholder="紀錄細節..."
            />
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="customers-table-wrapper" style={{ marginTop: '20px' }}>
          <table className="customers-table">
            <thead>
              <tr>
                <th>日期</th>
                <th>項目名稱</th>
                <th>金額</th>
                <th>狀態</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {data.transactions?.length > 0 ? (
                data.transactions.map((tx) => (
                  <tr key={tx.id} onClick={() => navigate(`/artist/notebook?id=${tx.id}`)} style={{ cursor: 'pointer' }}>
                    <td>{new Date(tx.order_date).toLocaleDateString()}</td>
                    <td>{tx.project_name || '未命名'}</td>
                    <td>${tx.total_price.toLocaleString()}</td>
                    <td>{tx.status}</td>
                    <td><button className="tab-btn">查看訂單</button></td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: '#94A3B8' }}>
                    尚無交易紀錄
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 新增歷史評價區塊 */}
      {activeTab === 'reviews' && (
        <div style={{ marginTop: '20px' }}>
          {!data.client_user_id ? (
            <div style={{ textAlign: 'center', padding: '40px', background: '#F8FAFC', borderRadius: '8px', color: '#94A3B8' }}>
              此紀錄為未綁定系統帳號的外部客戶，無法使用評價功能。
            </div>
          ) : isReviewsLoading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748B' }}>讀取評價中...</div>
          ) : reviews.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', background: '#F8FAFC', borderRadius: '8px', color: '#94A3B8' }}>
              此客戶尚未給予過評價。
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {reviews.map(review => (
                <div key={review.id} style={{ background: '#FFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '14px', color: '#64748B' }}>
                    <div style={{ fontWeight: 'bold', color: '#334155' }}>
                      專案：{review.project_name || '未命名委託'}
                    </div>
                    <div>
                      {new Date(review.created_at).toLocaleDateString()}
                    </div>
                  </div>

                  <div style={{ color: '#F59E0B', fontSize: '18px', marginBottom: '12px' }}>
                    {renderStars(review.rating)}
                  </div>

                  <div style={{ fontSize: '15px', color: '#334155', lineHeight: '1.6', background: '#F8FAFC', padding: '16px', borderRadius: '8px', marginBottom: '16px', whiteSpace: 'pre-wrap' }}>
                    {review.content || '(無文字評價)'}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed #CBD5E1', paddingTop: '16px' }}>
                    <div style={{ fontSize: '13px', color: '#64748B' }}>
                      狀態：{review.is_public === 1 ? <span style={{ color: '#10B981', fontWeight: 'bold' }}>✓ 已公開至個人頁</span> : '未公開'} 
                      {review.client_anonymous === 1 && <span style={{ marginLeft: '8px', background: '#F1F5F9', padding: '2px 6px', borderRadius: '4px' }}>對方當時要求匿名</span>}
                    </div>
                    
                    <button 
                      className="tab-btn" 
                      onClick={() => navigate(`/artist/notebook?id=${review.commission_id}`)}
                      style={{ fontSize: '13px', padding: '6px 12px' }}
                    >
                      查看對應訂單 →
                    </button>
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}