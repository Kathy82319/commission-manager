import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface Commission {
  id: string;
  order_date: string;
  client_name: string;
  type_name: string;
  payment_status: string;
  current_stage: string;
  end_date: string;
  artist_note: string;
  is_rush: string;
  status: string;
}

const paymentColors: Record<string, { bg: string; text: string; label: string }> = {
  unpaid: { bg: '#ffebee', text: '#c62828', label: '未付款' },
  partial: { bg: '#fffde7', text: '#fbc02d', label: '已付訂' },
  paid: { bg: '#e8f5e9', text: '#2e7d32', label: '已結清' }
};

const defaultStages = [
  '尚未開始',
  '草稿繪製中',
  '草稿待確認',
  '線稿繪製中',
  '線稿待確認',
  '完稿繪製中',
  '完稿待確認',
  '已結案'
];

export function Queue() {
  const navigate = useNavigate();
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const fetchQueue = async () => {
    try {
      const res = await fetch('/api/commissions');
      const data = await res.json();
      if (data.success) {
        // 過濾掉已結案的訂單，並以日期排序 (舊的在前面)
        const activeOrders = data.data
          .filter((c: Commission) => c.status !== 'completed')
          .sort((a: Commission, b: Commission) => new Date(a.order_date).getTime() - new Date(b.order_date).getTime());
        setCommissions(activeOrders);
      }
    } catch (error) {
      console.error("讀取排單失敗", error);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  // 處理欄位更新 (自動儲存)
  const handleUpdateField = async (id: string, field: keyof Commission, value: string) => {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/commissions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value })
      });
      const data = await res.json();
      if (data.success) {
        // 更新本地狀態以反映變更
        setCommissions(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
      } else {
        alert('更新失敗');
      }
    } catch (error) {
      console.error("更新錯誤", error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0 }}>工作排單表</h2>
        {isUpdating && <span style={{ color: '#666', fontSize: '14px' }}>儲存中...</span>}
      </div>

      <div style={{ backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 1px 4px rgba(0,0,0,0.1)', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f5f5f5', borderBottom: '2px solid #ddd', textAlign: 'left' }}>
              <th style={{ padding: '12px 15px', width: '30px' }}>≡</th> {/* 拖拉把手 */}
              <th style={{ padding: '12px 15px' }}>委託日期</th>
              <th style={{ padding: '12px 15px' }}>委託人與單號</th>
              <th style={{ padding: '12px 15px' }}>目前進度</th>
              <th style={{ padding: '12px 15px' }}>預計完工日</th> {/* 與付款互換 */}
              <th style={{ padding: '12px 15px' }}>付款狀態</th>   {/* 與完工互換 */}
              <th style={{ padding: '12px 15px' }}>備註</th>
              <th style={{ padding: '12px 15px' }}>操作</th>       {/* 新增操作 */}
            </tr>
          </thead>
          <tbody>
            {commissions.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: '#999' }}>目前沒有進行中的排單</td>
              </tr>
            ) : (
              commissions.map((order, index) => {
                const dateStr = new Date(order.order_date).toLocaleDateString();
                const shortId = order.id.split('-')[0];
                const paymentInfo = paymentColors[order.payment_status] || paymentColors['unpaid'];
                const isRush = order.is_rush === '是';

                return (
                  <tr 
                    key={order.id} 
                    draggable
                    onDragStart={() => setDraggedIndex(index)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (draggedIndex === null || draggedIndex === index) return;
                      const newList = [...commissions];
                      const draggedItem = newList[draggedIndex];
                      newList.splice(draggedIndex, 1);
                      newList.splice(index, 0, draggedItem);
                      setCommissions(newList);
                      setDraggedIndex(null);
                      // 注意：此處拖拉僅改變前端顯示，若需永久記錄順序，未來需在資料庫新增順序欄位
                    }}
                    style={{ 
                      borderBottom: '1px solid #eee', 
                      backgroundColor: draggedIndex === index ? '#f0f8ff' : '#fff',
                      transition: 'background-color 0.2s'
                    }}
                  >
                    <td style={{ padding: '12px 15px', cursor: 'grab', color: '#ccc' }}>⠿</td>
                    <td style={{ padding: '12px 15px', color: '#555' }}>{dateStr}</td>
                    
                    <td style={{ padding: '12px 15px' }}>
                      <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{order.client_name || '未命名客戶'}</div>
                      <div style={{ fontSize: '12px', color: '#888' }}>#{shortId}</div>
                    </td>

                    <td style={{ padding: '12px 15px' }}>
                      <input 
                        list="stage-options" defaultValue={order.current_stage || ''}
                        onBlur={(e) => { if (e.target.value !== order.current_stage) handleUpdateField(order.id, 'current_stage', e.target.value); }}
                        style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #ccc' }}
                      />
                      <datalist id="stage-options">
                        {defaultStages.map(stage => (
                          <option key={stage} value={stage} />
                        ))}
                      </datalist>
                    </td>

                    {/* 預計完工日期 */}
                    <td style={{ padding: '12px 15px' }}>
                      <input 
                        type="date" defaultValue={order.end_date || ''}
                        onBlur={(e) => { if (e.target.value !== order.end_date) handleUpdateField(order.id, 'end_date', e.target.value); }}
                        style={{ padding: '6px', borderRadius: '4px', border: '1px solid #ccc' }}
                      />
                    </td>

                    {/* 付款狀態 */}
                    <td style={{ padding: '12px 15px' }}>
                      <select 
                        value={order.payment_status || 'unpaid'}
                        onChange={(e) => handleUpdateField(order.id, 'payment_status', e.target.value)}
                        style={{ padding: '4px 8px', borderRadius: '4px', border: 'none', backgroundColor: paymentInfo.bg, color: paymentInfo.text, fontWeight: 'bold', cursor: 'pointer' }}
                      >
                        <option value="unpaid">未付款</option>
                        <option value="partial">已付訂</option>
                        <option value="paid">已結清</option>
                      </select>
                    </td>

                    <td style={{ padding: '12px 15px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        {isRush && <span style={{ color: '#d32f2f', fontWeight: 'bold' }}>[急件]</span>}
                        <input 
                          type="text" defaultValue={order.artist_note || ''} placeholder="輸入備註"
                          onBlur={(e) => { if (e.target.value !== order.artist_note) handleUpdateField(order.id, 'artist_note', e.target.value); }}
                          style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #ccc', minWidth: '120px' }}
                        />
                      </div>
                    </td>

                    {/* 新增：編輯按鈕 */}
                    <td style={{ padding: '12px 15px' }}>
                      <button 
                        onClick={() => navigate('/artist/notebook')}
                        style={{ padding: '6px 12px', backgroundColor: '#1976d2', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}
                        >
                        管理
                        </button>
                    </td>

                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}