// src/pages/client/ClientOrders.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface Commission {
  id: string;
  project_name: string;
  artist_name?: string;
  status: string;
  current_stage: string;
  total_price: number;
  order_date: string;
}

export function ClientOrders() {
  const navigate = useNavigate();
  const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
  const [orders, setOrders] = useState<Commission[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/commissions`, { credentials: 'include' });
        const data = await res.json();
        if (data.success) {
          setOrders(data.data);
        }
      } catch (e) {
        console.error("載入失敗", e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const getStatusDisplay = (status: string, stage: string) => {
    if (status === 'completed') return <span style={{ color: '#4E7A5A', fontWeight: 'bold' }}>✓ 已結案</span>;
    if (status === 'cancelled') return <span style={{ color: '#A05C5C', fontWeight: 'bold' }}>作廢</span>;
    if (stage.includes('reviewing')) return <span style={{ color: '#d93025', fontWeight: 'bold' }}>👀 待您審閱</span>;
    return <span style={{ color: '#A67B3E', fontWeight: 'bold' }}>✍️ 繪製中</span>;
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif' }}>
      
      {/* 導覽列 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', backgroundColor: '#FFF', padding: '16px 24px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
        <h1 style={{ margin: 0, fontSize: '20px', color: '#5D4A3E' }}>🎨 我的委託單</h1>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => navigate('/portal')} style={{ padding: '8px 16px', backgroundColor: '#F5EBEB', color: '#5D4A3E', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
            切換身分
          </button>
          <button onClick={() => navigate('/artist/notebook')} style={{ padding: '8px 16px', backgroundColor: '#5D4A3E', color: '#FFF', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
            進入繪師後台 →
          </button>
        </div>
      </div>

      {/* 列表區塊 */}
      <div style={{ backgroundColor: '#FFF', borderRadius: '16px', overflow: 'hidden', border: '1px solid #EAE6E1' }}>
        {isLoading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#A0978D' }}>載入中...</div>
        ) : orders.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#A0978D' }}>您目前還沒有任何委託單喔！</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {orders.map(order => (
              <div 
                key={order.id} 
                onClick={() => navigate(`/client/order/${order.id}`)}
                style={{ padding: '20px 24px', borderBottom: '1px solid #F0ECE7', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', transition: 'background-color 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#FDFDFB'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#FFF'}
              >
                <div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#5D4A3E', marginBottom: '6px' }}>{order.project_name || '未命名項目'}</div>
                  <div style={{ fontSize: '13px', color: '#7A7269', display: 'flex', gap: '16px' }}>
                    <span>單號：{order.id}</span>
                    <span>日期：{new Date(order.order_date).toLocaleDateString()}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ marginBottom: '6px' }}>{getStatusDisplay(order.status, order.current_stage)}</div>
                  <div style={{ fontSize: '14px', color: '#A0978D', fontWeight: 'bold' }}>NT$ {order.total_price}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}