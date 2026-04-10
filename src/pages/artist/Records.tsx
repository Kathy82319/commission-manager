import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface Commission {
  id: string;
  order_date: string;
  client_name: string;
  type_name: string;
  total_price: number;
  end_date: string;
  status: string;
}

export function Records() {
  const navigate = useNavigate();
  const [records, setRecords] = useState<Record<string, Commission[]>>({});
  const [totalEarned, setTotalEarned] = useState(0);

  useEffect(() => {
    const fetchRecords = async () => {
      try {
        const res = await fetch('/api/commissions');
        const data = await res.json();
        
        if (data.success) {
          // 1. 過濾出已結案的訂單
          const completedOrders = data.data.filter((c: Commission) => c.status === 'completed');

          // 2. 依照年份-月份分組
          const grouped: Record<string, Commission[]> = {};
          let total = 0;

          completedOrders.forEach((order: Commission) => {
            // 優先使用預計完工日(end_date)，若無則使用建立日期(order_date)來分組
            const date = new Date(order.end_date || order.order_date);
            const monthKey = `${date.getFullYear()}年${String(date.getMonth() + 1).padStart(2, '0')}月`;

            if (!grouped[monthKey]) grouped[monthKey] = [];
            grouped[monthKey].push(order);
            total += order.total_price || 0;
          });

          // 3. 將月份排序 (最新的月份在最上面)
          const sortedGrouped = Object.keys(grouped)
            .sort((a, b) => b.localeCompare(a)) // 字串降序排列
            .reduce((acc, key) => {
              acc[key] = grouped[key];
              return acc;
            }, {} as Record<string, Commission[]>);

          setRecords(sortedGrouped);
          setTotalEarned(total);
        }
      } catch (error) {
        console.error("讀取結案紀錄失敗", error);
      }
    };

    fetchRecords();
  }, []);

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0 }}>結案紀錄</h2>
        <div style={{ backgroundColor: '#e8f5e9', color: '#2e7d32', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold' }}>
          總收益：NT$ {totalEarned.toLocaleString()}
        </div>
      </div>

      {Object.keys(records).length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#999', backgroundColor: '#fff', borderRadius: '8px' }}>
          目前尚無結案紀錄
        </div>
      ) : (
        Object.entries(records).map(([month, orders]) => (
          <div key={month} style={{ marginBottom: '30px' }}>
            <h3 style={{ borderBottom: '2px solid #1976d2', color: '#1976d2', paddingBottom: '8px', marginBottom: '15px' }}>
              {month} <span style={{ fontSize: '14px', color: '#666', fontWeight: 'normal' }}>(共 {orders.length} 筆)</span>
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {orders.map(order => (
                <div
                  key={order.id}
                  onClick={() => navigate(`/workspace/${order.id}?role=artist`)}
                  style={{
                    backgroundColor: '#fff', padding: '15px', borderRadius: '8px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', cursor: 'pointer', borderLeft: '4px solid #9e9e9e'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '4px' }}>
                      {order.type_name} - {order.client_name || '未命名客戶'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#888' }}>
                      單號：{order.id.split('-')[0]}... | 完工日：{new Date(order.end_date || order.order_date).toLocaleDateString()}
                    </div>
                  </div>
                  <div style={{ fontWeight: 'bold', color: '#333' }}>
                    NT$ {order.total_price.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}