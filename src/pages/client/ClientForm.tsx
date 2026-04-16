// src/pages/client/ClientForm.tsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DOMPurify from 'dompurify'; 

// 🌟 新增：安全解碼器。用來還原後端因防護而轉碼的 HTML 實體 (如 &lt;p&gt; 轉回 <p>)
const decodeHTML = (html?: string) => {
  if (!html) return '';
  const txt = document.createElement("textarea");
  txt.innerHTML = html;
  return txt.value;
};

interface Commission {
  id: string;
  project_name: string;
  client_name: string;
  client_id?: string;
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
  artist_settings?: string; 
  agreed_tos_snapshot?: string; 
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
        const res = await fetch(`${API_BASE}/api/commissions/${id}`, {
          credentials: 'include', 
          headers: {
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

          // 🌟 修正 Bug 2 (綁定失敗)：靜默自動綁定機制
          // 只要這張單還沒有 client_id，委託人一載入畫面就立刻發送 PATCH 觸發後端綁定！
          if (!data.data.client_id) {
            fetch(`${API_BASE}/api/commissions/${id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ last_read_at_client: new Date().toISOString() })
            });
          }

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
    
    let currentTosSnapshot = order?.agreed_tos_snapshot || '';
    if (!currentTosSnapshot && order?.artist_settings) {
      try {
        // 🌟 確保 JSON.parse 之前先解碼，避免引號被轉義導致崩潰
        currentTosSnapshot = JSON.parse(decodeHTML(order.artist_settings)).rules || '';
      } catch(e) {}
    }

    try {
      const res = await fetch(`${API_BASE}/api/commissions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          status: 'unpaid',
          agreed_tos_snapshot: currentTosSnapshot 
        })
      });
      const data = await res.json();
      
      if (data.success) {
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
      <div style={{ width: '100%', maxWidth: '800px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        <div style={{ backgroundColor: '#FFFFFF', padding: '30px 24px', borderRadius: '16px', textAlign: 'center', border: '1px solid #EAE6E1', boxShadow: '0 8px 24px rgba(93,74,62,0.04)' }}>
          <h1 style={{ margin: '0 0 12px 0', fontSize: '22px', color: '#5D4A3E', letterSpacing: '0.5px' }}>委託確認與協議書</h1>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#4A7294', marginBottom: '8px' }}>
            {order.project_name || '未命名委託項目'}
          </div>
          <div style={{ color: '#A0978D', fontSize: '13px', fontFamily: 'monospace' }}>訂單編號：{order.id}</div>
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
            {order.agreed_tos_snapshot ? (
              // 🌟 修正 Bug 3：解碼後端安全轉碼的文字，再交給 DOMPurify 進行安全渲染
              <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(decodeHTML(order.agreed_tos_snapshot)) }} />
            ) : order.artist_settings ? (
              <div 
                dangerouslySetInnerHTML={{ 
                  __html: (() => {
                    try {
                      const decodedSettings = decodeHTML(order.artist_settings);
                      const rawHtml = JSON.parse(decodedSettings).rules;
                      return rawHtml ? DOMPurify.sanitize(rawHtml) : '繪師尚未設定使用規範。';
                    } catch(e) {
                      return '繪師尚未設定使用規範。';
                    }
                  })()
                }} 
              />
            ) : (
              <>
'繪師尚未設定使用規範。'
              </>
            )}
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