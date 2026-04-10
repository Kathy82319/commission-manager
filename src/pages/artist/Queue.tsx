import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// 更新介面，添加所有必要的屬性
interface Commission {
  id: string;
  client_name: string;
  type_name: string;
  total_price: number;
  is_paid: number;
  status: string;
  is_external: string; 
  artist_note: string;
  start_date?: string | null; 
  end_date?: string | null;
}

const statusMap: Record<string, string> = {
  quote_created: '已建報價單',
  form_submitted: '委託已送出',
  unpaid: '待匯款',
  paid: '排隊中',
  wip_sketch: '草稿繪製',
  wip_coloring: '線稿上色',
  completed: '已結案'
};

export function Queue() {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const navigate = useNavigate();

  const fetchCommissions = async () => {
    const res = await fetch('/api/commissions');
    const data = await res.json();
    if (data.success) setCommissions(data.data);
  };

  useEffect(() => { fetchCommissions(); }, []);

  const handleAddExternal = async () => {
    const clientName = prompt("請輸入外部委託人名稱/暱稱：");
    if (!clientName) return;
    
    const res = await fetch('/api/commissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_external: true, client_name: clientName, total_price: 0, artist_note: '手動新增之外部排單' })
    });
    const data = await res.json();
    if (data.success) fetchCommissions();
  };

  const handleDateChange = async (id: string, field: 'start_date' | 'end_date', value: string) => {
    setCommissions(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
    await fetch(`/api/commissions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value })
    });
  };

  const navigateToNotebook = (id: string) => {
    navigate(`/artist/notebook?id=${id}`);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', backgroundColor: '#fff', minHeight: 'calc(100vh - 100px)', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0 }}>總排單表 (Spreadsheet View)</h2>
        <button onClick={handleAddExternal} style={{ padding: '8px 16px', backgroundColor: '#333', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          ＋ 新增外部私接排單
        </button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: '#f0f2f5', borderBottom: '2px solid #ccc' }}>
              <th style={thStyle}>來源 / 單號</th>
              <th style={thStyle}>委託人</th>
              <th style={thStyle}>項目</th>
              <th style={thStyle}>狀態</th>
              <th style={thStyle}>財務</th>
              <th style={thStyle}>預計開工日</th>
              <th style={thStyle}>預計完工日</th>
              <th style={thStyle}>操作</th>
            </tr>
          </thead>
          <tbody>
            {commissions.map(order => (
              <tr key={order.id} style={{ borderBottom: '1px solid #eee' }} onMouseOver={e => e.currentTarget.style.backgroundColor = '#fafafa'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                <td style={tdStyle}>
                  {order.is_external ? 
                    <span style={{ backgroundColor: '#e0e0e0', padding: '2px 6px', borderRadius: '4px', fontSize: '12px' }}>外部</span> : 
                    <span style={{ backgroundColor: '#e3f2fd', color: '#1976d2', padding: '2px 6px', borderRadius: '4px', fontSize: '12px' }}>系統</span>
                  }
                  <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>{order.id.split('-')[0]}...</div>
                </td>
                <td style={{ ...tdStyle, fontWeight: 'bold' }}>
                  {order.is_external ? (order.artist_note.match(/客戶名稱: (.*)\n/)?.[1] || '未知名稱') : (order.client_name || '尚未綁定')}
                </td>
                <td style={tdStyle}>{order.type_name}</td>
                <td style={tdStyle}>{statusMap[order.status]}</td>
                
                <td style={tdStyle}>
                  ${order.total_price} ({order.is_paid ? <span style={{color:'green'}}>已付</span> : <span style={{color:'red'}}>未付</span>})
                </td>
                <td style={tdStyle}>
                  <input type="date" value={order.start_date || ''} onChange={e => handleDateChange(order.id, 'start_date', e.target.value)} style={dateInputStyle} />
                </td>
                <td style={tdStyle}>
                  <input type="date" value={order.end_date || ''} onChange={e => handleDateChange(order.id, 'end_date', e.target.value)} style={dateInputStyle} />
                </td>
                <td style={tdStyle}>
                  <button onClick={() => navigateToNotebook(order.id)} style={{ padding: '6px 12px', backgroundColor: '#1976d2', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                    查看詳情
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const thStyle = { padding: '12px', color: '#555' };
const tdStyle = { padding: '12px', verticalAlign: 'middle' };
const dateInputStyle = { padding: '4px', border: '1px solid #ddd', borderRadius: '4px', color: '#333' };