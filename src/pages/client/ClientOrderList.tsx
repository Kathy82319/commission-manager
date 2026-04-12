import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface Commission {
  id: string;
  order_date?: string;
  type_name: string;
  project_name?: string;
  client_custom_title?: string;
  total_price: number;
  is_rush: string;
  status: string;
  is_external: number;
  pending_changes?: string;
  latest_message_at?: string;
  last_read_at_client?: string;
}

export function ClientOrderList() {
  const navigate = useNavigate();
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await fetch('/api/commissions');
        const data = await res.json();
        if (data.success) {
          // 過濾出屬於該委託人且未作廢的內部單
          const validOrders = data.data.filter(
            (c: Commission) => c.status !== 'cancelled' && c.is_external === 0
          );
          setCommissions(validOrders);
        }
      } catch (error) {
        console.error('取得委託單失敗:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const formatDate = (dateString?: string) => {
    if (!dateString) return '無日期';
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-TW');
  };

  return (
    <div style={{ backgroundColor: '#778ca4', minHeight: '100vh', display: 'flex', justifyContent: 'center', padding: '40px 16px', fontFamily: 'sans-serif' }}>
      <div style={{ width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <h2 style={{ color: '#FFFFFF', margin: 0, fontSize: '24px', fontWeight: 'bold' }}>我的委託單</h2>
        
        {isLoading ? (
          <div style={{ color: '#FFFFFF', textAlign: 'center', padding: '20px' }}>資料載入中...</div>
        ) : commissions.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#556577', padding: '40px 20px', backgroundColor: '#e8ecf3', borderRadius: '16px', border: '1px dashed #d0d8e4' }}>
            目前尚無進行中的委託單
          </div>
        ) : (
          commissions.map(order => {
            const isRush = order.is_rush === '是' || order.is_rush === 'true'; 
            // 🌟 判斷是否有通知
            const hasPending = !!order.pending_changes;
            const latestMsgTime = order.latest_message_at ? new Date(order.latest_message_at).getTime() : 0;
            const lastReadTime = order.last_read_at_client ? new Date(order.last_read_at_client).getTime() : 0;
            const hasNewMsg = latestMsgTime > lastReadTime;
            const hasNotification = hasPending || hasNewMsg;

            return (
              <div 
                key={order.id}
                onClick={() => navigate(`/client/order/${order.id}`)}
                style={{ 
                  backgroundColor: '#e8ecf3', padding: '16px', borderRadius: '12px', 
                  boxShadow: '0 4px 12px rgba(100,120,140,0.08)', 
                  // 有通知時邊框變黃色
                  borderLeft: hasNotification ? '4px solid #facc15' : '4px solid #4A7294', 
                  cursor: 'pointer', transition: 'transform 0.2s',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  position: 'relative' // 🌟 為了放鈴鐺
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
              >
                {/* 🌟 鈴鐺圖示 */}
                {hasNotification && (
                  <div style={{ position: 'absolute', top: '-10px', right: '-10px', backgroundColor: '#e11d48', color: '#FFF', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '14px', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                    🔔
                  </div>
                )}
                
                <div style={{ fontSize: '15px', color: '#475569', lineHeight: '1.8' }}>
                  <div><span style={{ fontWeight: 'bold' }}>訂單日期：</span>{formatDate(order.order_date)}</div>
                  {/* 修正：顯示完整訂單編號 */}
                  <div><span style={{ fontWeight: 'bold' }}>訂單編號：</span>{order.id}</div>
                  <div><span style={{ fontWeight: 'bold' }}>項目名稱：</span>{order.client_custom_title || ''}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                  <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#4A7294' }}>
                    NT$ {order.total_price.toLocaleString()}
                  </span>
                  {isRush && (
                    <span style={{ fontSize: '12px', padding: '4px 8px', borderRadius: '4px', backgroundColor: '#e11d48', color: '#FFFFFF', fontWeight: 'bold' }}>
                      已申請急件
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}