// src/pages/artist/Queue.tsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

interface Commission {
  id: string; order_date: string; client_name: string; contact_memo: string; project_name: string;
  type_name: string; payment_status: string; end_date: string; artist_note: string; is_rush: string;
  status: string; workflow_mode: string; 
  queue_status: string;
  latest_message_at?: string;
  last_read_at_artist?: string;
  client_public_id?: string;
}

const paymentColors: Record<string, { bg: string; text: string; label: string }> = {
  unpaid: { bg: '#F4F0EB', text: '#8A7A7A', label: '尚未付款' },
  partial: { bg: '#FDF4E6', text: '#A67B3E', label: '已收訂金' },
  paid: { bg: '#E8F3EB', text: '#4E7A5A', label: '已收全額' }
};

const INITIAL_STAGES = ['尚未開始', '構圖中', '待委託人確認', '尚未收款'];

function StageDropdown({ value, onChange, stages, onAdd, onDelete }: any) {
const [isOpen, setIsOpen] = useState(false);
const [newVal, setNewVal] = useState('');
const dropdownRef = useRef<HTMLDivElement>(null);
useEffect(() => {
function handleClick(e: MouseEvent) { if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setIsOpen(false); }
document.addEventListener('mousedown', handleClick);
return () => document.removeEventListener('mousedown', handleClick);
}, []);
return (
<div ref={dropdownRef} style={{ position: 'relative', width: '100%' }}>
<div onClick={() => setIsOpen(!isOpen)} style={{ padding: '8px', border: '1px solid #DED9D3', borderRadius: '6px', backgroundColor: '#FFF', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
<span style={{ fontWeight: 'bold', color: '#5D4A3E' }}>{value || '設定狀態'}</span>
<span>▼</span>
</div>
{isOpen && (
<div style={{ position: 'absolute', top: '100%', left: 0, minWidth: '200px', backgroundColor: '#FFF', border: '1px solid #EAE6E1', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 1000, padding: '8px' }}>
{stages.map((s: string) => (
<div key={s} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', borderBottom: '1px solid #F0ECE7' }}>
<span onClick={() => { onChange(s); setIsOpen(false); }} style={{ flex: 1, cursor: 'pointer' }}>{s}</span>
<button onClick={() => onDelete(s)} style={{ color: '#A05C5C', border: 'none', background: 'none', cursor: 'pointer' }}>×</button>
</div>
))}
<div style={{ display: 'flex', gap: '4px', marginTop: '8px' }}>
<input value={newVal} onChange={e => setNewVal(e.target.value)} placeholder="新標籤" style={{ flex: 1, padding: '4px', border: '1px solid #DDD' }} />
<button onClick={() => { onAdd(newVal); onChange(newVal); setNewVal(''); setIsOpen(false); }} style={{ padding: '4px 8px', background: '#5D4A3E', color: '#FFF', border: 'none', borderRadius: '4px' }}>+</button>
</div>
</div>
)}
</div>
);
}

export function Queue() {
  const navigate = useNavigate();
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [stages, setStages] = useState<string[]>(() => JSON.parse(localStorage.getItem('artist_all_stages') || JSON.stringify(INITIAL_STAGES)));
  useEffect(() => { localStorage.setItem('artist_all_stages', JSON.stringify(stages)); }, [stages]);
  
  const fetchQueue = async () => {
    const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/commissions`, { credentials: 'include' });
    const data = await res.json();
    if (data.success) {
      setCommissions(data.data.filter((c: any) => c.status !== 'completed' && c.status !== 'cancelled')
      .sort((a: any, b: any) => new Date(a.order_date).getTime() - new Date(b.order_date).getTime()));
    }
  };
  
  useEffect(() => { fetchQueue(); }, []);
  
  const handleUpdateField = async (id: string, field: string, value: string) => {
    setIsUpdating(true);
    await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/commissions/${id}`, {
      method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value })
    });
    setCommissions(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
    setIsUpdating(false);
  };
  
  const filteredCommissions = commissions.filter(c => {
    if (selectedMonth !== 'all' && !c.order_date.startsWith(selectedMonth)) return false;
    const term = searchTerm.toLowerCase();
    return c.client_name?.toLowerCase().includes(term) || c.contact_memo?.toLowerCase().includes(term) || c.id.includes(term);
  });


  return (
<div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
<style>{`
.queue-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 16px; }
.queue-controls { display: flex; gap: 12px; flex-wrap: wrap; width: 100%; }
/* 🌟 RWD Table to Card Transformation */
@media (max-width: 768px) {
.queue-table thead { display: none; }
.queue-table, .queue-table tbody, .queue-table tr, .queue-table td { display: block; width: 100%; }
.queue-table tr { margin-bottom: 20px; border: 1px solid #EAE6E1; borderRadius: 12px; padding: 16px; background: #FFF; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
.queue-table td { padding: 8px 0; border: none; display: flex; justify-content: space-between; align-items: center; font-size: 14px; }
.queue-table td::before { content: attr(data-label); fontWeight: bold; color: #7A7269; }
.queue-controls input, .queue-controls select { flex: 1; }
}
@media (min-width: 769px) {
.queue-controls { width: auto; }
.queue-table { width: 100%; border-collapse: collapse; background: #FFF; borderRadius: 12px; overflow: hidden; }
.queue-table th, .queue-table td { padding: 12px; border-bottom: 1px solid #F0ECE7; text-align: left; }
}
`}</style>
<div className="queue-header">
<h2 style={{ margin: 0, color: '#5D4A3E' }}>工作排單表</h2>
<div className="queue-controls">
<input placeholder="🔍 搜尋..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #DED9D3' }} />
<select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} style={{ padding: '8px', borderRadius: '8px', border: '1px solid #DED9D3' }}>
<option value="all">全部月份</option>
{Array.from(new Set(commissions.map(c => c.order_date.substring(0, 7)))).map(m => <option key={m} value={m}>{m}</option>)}
</select>
{isUpdating && <span style={{ color: '#A67B3E', fontSize: '13px', fontWeight: 'bold' }}>儲存中...</span>}
</div>
</div>
<div style={{ overflowX: 'auto' }}>
<table className="queue-table">
<thead>
<tr style={{ backgroundColor: '#FBFBF9', color: '#7A7269' }}>
<th>日期</th><th>委託人</th><th>狀態</th><th>預計完工</th><th>付款</th><th>備註</th><th>管理</th>
</tr>
</thead>
<tbody>
{filteredCommissions.map(order => (
<tr key={order.id}>
<td data-label="建單日期">{order.order_date.substring(5, 10)}</td>
<td data-label="委託人">
<div style={{ fontWeight: 'bold' }}>{order.contact_memo || '未命名'}</div>
<div style={{ fontSize: '11px', color: '#A0978D' }}>ID: {order.client_public_id || '未綁定'}</div>
</td>
<td data-label="進度狀態">
<StageDropdown value={order.queue_status} onChange={(v:any) => handleUpdateField(order.id, 'queue_status', v)} stages={stages} onAdd={(v:any) => setStages([...stages, v])} onDelete={(v:any) => setStages(stages.filter(s=>s!==v))} />
</td>
<td data-label="預計完工">
<input type="date" defaultValue={order.end_date} onBlur={e => handleUpdateField(order.id, 'end_date', e.target.value)} style={{ border: '1px solid #EEE', padding: '4px', width: '120px' }} />
</td>
<td data-label="付款狀態">
<select value={order.payment_status} onChange={e => handleUpdateField(order.id, 'payment_status', e.target.value)} style={{ padding: '4px', borderRadius: '4px', background: paymentColors[order.payment_status]?.bg, color: paymentColors[order.payment_status]?.text, border: 'none', fontWeight: 'bold' }}>
<option value="unpaid">未付</option><option value="partial">訂金</option><option value="paid">已付</option>
</select>
</td>
<td data-label="備註">
<input defaultValue={order.artist_note} onBlur={e => handleUpdateField(order.id, 'artist_note', e.target.value)} style={{ width: '100%', border: 'none', borderBottom: '1px solid #EEE' }} placeholder="點擊編輯..." />
</td>
<td data-label="操作">
<button onClick={() => navigate(`/artist/notebook?id=${order.id}`)} style={{ padding: '6px 12px', background: '#5D4A3E', color: '#FFF', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', width: '100%' }}>管理</button>
</td>
</tr>
))}
</tbody>
</table>
</div>
</div>
);
}