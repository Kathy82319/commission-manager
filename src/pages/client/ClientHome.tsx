import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface Commission {
  id: string;
  client_name: string;
  type_name: string;
  status: string;
  is_external: number;
}

const statusMap: Record<string, string> = {
  quote_created: '已建報價單', form_submitted: '委託已送出', unpaid: '待匯款',
  paid: '已匯款(排隊)', wip_sketch: '草稿階段', wip_coloring: '線稿階段', completed: '已結案'
};

export function ClientHome() {
  const navigate = useNavigate();
  const [commissions, setCommissions] = useState<Commission[]>([]);

  useEffect(() => {
    // 實務上這裡會加上登入驗證，只抓取該客人的單。MVP 階段我們先過濾掉外部私接單來模擬。
    fetch('/api/commissions')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setCommissions(data.data.filter((c: Commission) => c.is_external === 0));
        }
      });
  }, []);

  return (
    <div style={{ padding: '20px', maxWidth: '480px', margin: '0 auto' }}>
      
      {/* 個人檔案區塊 */}
      <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', marginBottom: '20px' }}>
        <div style={{ width: '80px', height: '80px', backgroundColor: '#e0e0e0', borderRadius: '50%', margin: '0 auto 15px auto', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', color: '#888' }}>
          頭像
        </div>
        <h2 style={{ margin: '0 0 10px 0' }}>王小明 (測試委託人)</h2>
        <p style={{ color: '#666', fontSize: '14px', lineHeight: '1.5', marginBottom: '20px' }}>
          您好，這裡是我的委託專區。期待能收到美麗的圖！
        </p>
        <button style={{ padding: '8px 20px', backgroundColor: '#f0f2f5', color: '#333', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', width: '100%' }}>
          設定自我介紹與簡介
        </button>
      </div>

      {/* 委託單列表區塊 */}
      <h3 style={{ fontSize: '16px', color: '#555', marginBottom: '15px' }}>目前委託單</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {commissions.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#999', padding: '20px' }}>尚無委託單</div>
        ) : (
          commissions.map(order => (
            <div 
              key={order.id} 
              onClick={() => navigate(`/client/order/${order.id}`)}
              style={{ backgroundColor: '#fff', padding: '15px', borderRadius: '8px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', borderLeft: '4px solid #1976d2', cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontWeight: 'bold' }}>{order.type_name}</span>
                <span style={{ fontSize: '12px', backgroundColor: '#e3f2fd', color: '#1976d2', padding: '2px 8px', borderRadius: '4px' }}>
                  {statusMap[order.status]}
                </span>
              </div>
              <div style={{ fontSize: '12px', color: '#888' }}>單號：{order.id.split('-')[0]}...</div>
            </div>
          ))
        )}
      </div>

    </div>
  );
}