// src/pages/client/ClientForm.tsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

interface Commission {
  id: string;
  project_name: string;
  client_name: string;
  total_price: number;
  status: string;
  payment_status: string;
  usage_type: string;
  is_rush: string;
  delivery_method: string;
  payment_method: string;
  draw_scope: string;
  char_count: number;
  bg_type: string;
  add_ons: string;
  order_date: string;
}

export function ClientForm() {
  const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [order, setOrder] = useState<Commission | null>(null);
  const [isAgreed, setIsAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

useEffect(() => {
    const fetchOrder = async () => {
      try {
        // 🌟 從瀏覽器保險箱取得身分證
        const currentUserId = localStorage.getItem('user_id') || ''; 

        const res = await fetch(`${API_BASE}/api/commissions/${id}`, {
          // 雙重保險：同時使用 Cookie 和 Header
          credentials: 'include', 
          headers: {
            'Authorization': `Bearer ${currentUserId}`,
            'Content-Type': 'application/json'
          }
        });

        if (res.status === 401) {
          alert('請先登入 LINE 以確認委託內容');
          window.location.href = `${API_BASE}/api/auth/line/login`;
          return;
        }

        const data = await res.json();
        if (data.success) {
          setOrder(data.data);
        } else {
          setErrorMsg(data.error || '找不到這筆委託單，或連結已失效。');
        }
      } catch (err) {
        setErrorMsg('系統連線異常，請稍後再試。');
      }
    };
    if (id) fetchOrder();
  }, [id, API_BASE]);

  const handleSubmit = async () => {
    if (!isAgreed) return alert('請先勾選同意委託協議書。');
    setIsSubmitting(true);
    
    try {
      // 🌟 修改：PATCH 請求也要帶上 credentials: 'include'
      const currentUserId = localStorage.getItem('user_id') || '';
      const res = await fetch(`${API_BASE}/api/commissions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUserId}` },
        credentials: 'include',
        body: JSON.stringify({ status: 'unpaid' })
        
      });
      const data = await res.json();
      
      if (data.success) {
        // 🌟 修改：重新獲取資料也要帶上 credentials: 'include'
        const updatedRes = await fetch(`${API_BASE}/api/commissions/${id}`, {
          credentials: 'include'
        });
        const updatedData = await updatedRes.json();
        if (updatedData.success) setOrder(updatedData.data);
      } else {
        alert('送出失敗：' + data.error);
      }
    } catch (err) {
      alert('連線異常。');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 下方 UI 部分保持不變...
  if (errorMsg) return <div style={centerStyle}>{errorMsg}</div>;
  if (!order) return <div style={centerStyle}>載入委託單資料中...</div>;

  if (order.status === 'cancelled') {
    return (
      <div style={{ backgroundColor: '#FBFBF9', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
        <div style={{ backgroundColor: '#FFFFFF', padding: '40px 20px', borderRadius: '16px', textAlign: 'center', border: '1px solid #EAE6E1', boxShadow: '0 8px 24px rgba(93,74,62,0.04)', maxWidth: '400px', width: '100%' }}>
          <div style={{ color: '#A05C5C', fontSize: '18px', fontWeight: 'bold', marginBottom: '12px' }}>此委託單已作廢或封存</div>
          <div style={{ color: '#7A7269', fontSize: '14px' }}>無法進行後續操作。若有疑問請直接聯繫繪師。</div>
        </div>
      </div>
    );
  }

  const hasAlreadyAgreed = order.status !== 'quote_created';
  const orderDate = new Date(order.order_date);
  const now = new Date();
  const diffDays = Math.ceil(Math.abs(now.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24));
  const isExpiredWarning = diffDays > 14 && !hasAlreadyAgreed;

  return (
    <div style={{ backgroundColor: '#FBFBF9', minHeight: '100vh', padding: '40px 16px', fontFamily: 'sans-serif', display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: '500px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        <div style={{ backgroundColor: '#FFFFFF', padding: '30px 24px', borderRadius: '16px', textAlign: 'center', border: '1px solid #EAE6E1', boxShadow: '0 8px 24px rgba(93,74,62,0.04)' }}>
          <h1 style={{ margin: '0 0 12px 0', fontSize: '22px', color: '#5D4A3E', letterSpacing: '0.5px' }}>委託確認與協議書</h1>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#4A7294', marginBottom: '8px' }}>
            {order.project_name || '未命名委託項目'}
          </div>
          <div style={{ color: '#A0978D', fontSize: '13px', fontFamily: 'monospace' }}>單號：{order.id.split('-')[0]}</div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', padding: '24px', borderRadius: '16px', border: '1px solid #EAE6E1', boxShadow: '0 4px 16px rgba(0,0,0,0.02)' }}>
          <h2 style={{ margin: '0 0 20px 0', fontSize: '16px', color: '#5D4A3E', borderBottom: '1px solid #F0ECE7', paddingBottom: '12px' }}>委託內容明細</h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', fontSize: '14px', lineHeight: '1.5' }}>
            <div style={detailItemStyle}><span style={detailLabelStyle}>委託用途</span><span style={detailValueStyle}>{order.usage_type || '未填寫'}</span></div>
            <div style={detailItemStyle}><span style={detailLabelStyle}>是否急件</span><span style={{ ...detailValueStyle, color: order.is_rush === '是' ? '#A05C5C' : '#5D4A3E' }}>{order.is_rush || '否'}</span></div>
            <div style={detailItemStyle}><span style={detailLabelStyle}>交稿方式</span><span style={detailValueStyle}>{order.delivery_method || '未填寫'}</span></div>
            <div style={detailItemStyle}><span style={detailLabelStyle}>交易方式</span><span style={detailValueStyle}>{order.payment_method || '未填寫'}</span></div>
            <div style={detailItemStyle}><span style={detailLabelStyle}>繪畫範圍</span><span style={detailValueStyle}>{order.draw_scope || '未填寫'}</span></div>
            <div style={detailItemStyle}><span style={detailLabelStyle}>人物數量</span><span style={detailValueStyle}>{order.char_count || 1} 人</span></div>
            <div style={{ ...detailItemStyle, gridColumn: '1 / -1' }}><span style={detailLabelStyle}>背景設定</span><span style={detailValueStyle}>{order.bg_type || '未填寫'}</span></div>
          </div>

          <div style={{ marginTop: '20px', padding: '16px', backgroundColor: '#FBFBF9', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px dashed #DED9D3' }}>
            <span style={{ color: '#7A7269', fontWeight: 'bold', fontSize: '14px' }}>總金額</span>
            <span style={{ color: '#4E7A5A', fontWeight: '900', fontSize: '20px' }}>NT$ {order.total_price.toLocaleString()}</span>
          </div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', padding: '24px', borderRadius: '16px', border: '1px solid #EAE6E1', boxShadow: '0 4px 16px rgba(0,0,0,0.02)' }}>
          <h2 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#5D4A3E', borderBottom: '1px solid #F0ECE7', paddingBottom: '12px' }}>委託協議書</h2>
          
          {isExpiredWarning && (
            <div style={{ backgroundColor: '#FDF4E6', border: '1px solid #A67B3E', color: '#8A602B', padding: '12px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', marginBottom: '16px', lineHeight: '1.5' }}>
              此報價單已建立超過 14 天，同意前請先向繪師確認此報價與排程是否仍然有效。
            </div>
          )}

          <div style={{ backgroundColor: '#FBFBF9', padding: '20px', borderRadius: '12px', fontSize: '14px', color: '#7A7269', lineHeight: '1.9', height: '180px', overflowY: 'auto', border: '1px solid #EAE6E1' }}>
            1. 本委託為客製化商品，確認送出後即代表雙方成立合作關係，不適用七天鑑賞期。<br/>
            2. 繪師保有展示作品作為作品集之權利，若需買斷或延遲公開請於事前提出。<br/>
            3. 完稿後若非繪師方失誤，僅提供協議內約定之微調修改次數。<br/>
            4. 若有延遲交稿情形，繪師將主動告知並依雙方協議處理。<br/>
            5. 確認委託後，請依約定時間內完成款項支付，逾期視同放棄委託。<br/>
            6. 草稿階段退件重畫以三次為限，超出次數需視情況增加費用。<br/>
          </div>

          {!hasAlreadyAgreed ? (
            <div style={{ marginTop: '24px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', color: isAgreed ? '#4E7A5A' : '#7A7269', padding: '16px', backgroundColor: isAgreed ? '#E8F3EB' : '#FFFFFF', border: isAgreed ? '2px solid #4E7A5A' : '1px solid #DED9D3', borderRadius: '12px', transition: 'all 0.2s ease' }}>
                <input type="checkbox" checked={isAgreed} onChange={(e) => setIsAgreed(e.target.checked)} style={{ width: '20px', height: '20px', accentColor: '#4E7A5A' }} />
                我已詳細閱讀上方明細，並同意委託協議。
              </label>
              <button onClick={handleSubmit} disabled={!isAgreed || isSubmitting} style={{ width: '100%', padding: '16px', marginTop: '20px', backgroundColor: isAgreed ? '#5D4A3E' : '#DED9D3', color: '#FFFFFF', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 'bold', cursor: isAgreed ? 'pointer' : 'not-allowed', transition: 'all 0.2s ease', boxShadow: isAgreed ? '0 4px 16px rgba(93,74,62,0.2)' : 'none' }}>
                {isSubmitting ? '處理中...' : '確認無誤，送出委託單'}
              </button>
            </div>
          ) : (
            <div style={{ marginTop: '24px', textAlign: 'center' }}>
              <div style={{ padding: '16px', backgroundColor: '#E8F3EB', color: '#4E7A5A', borderRadius: '12px', fontWeight: 'bold', marginBottom: '20px', border: '1px solid #C8E6C9' }}>
                您已成功同意此委託！狀態已更新。
              </div>
              <button onClick={() => navigate(`/client/order/${order.id}`)} style={{ width: '100%', padding: '16px', backgroundColor: '#4A7294', color: '#FFFFFF', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s ease', boxShadow: '0 4px 16px rgba(74,114,148,0.2)' }}>
                進入委託單管理與工作區
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const centerStyle = { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#A0978D', fontSize: '15px' };
const detailItemStyle = { display: 'flex', flexDirection: 'column' as const };
const detailLabelStyle = { color: '#A0978D', fontSize: '13px', marginBottom: '6px', fontWeight: 'bold' };
const detailValueStyle = { color: '#5D4A3E', fontWeight: 'bold', fontSize: '15px' };