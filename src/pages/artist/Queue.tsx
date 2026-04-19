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
<div ref={dropdownRef} className="relative w-full">
<div onClick={() => setIsOpen(!isOpen)} className="p-2 border border-[#DED9D3] rounded-md bg-white cursor-pointer flex justify-between items-center text-sm">
<span className="font-bold text-[#5D4A3E]">{value || '設定狀態'}</span>
<span className="ml-2 text-xs">▼</span>
</div>
{isOpen && (
<div className="absolute top-full left-0 min-w-[200px] bg-white border border-[#EAE6E1] rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.1)] z-[1000] p-2 mt-1">
{stages.map((s: string) => (
<div key={s} className="flex justify-between p-2 border-b border-[#F0ECE7]">
<span onClick={() => { onChange(s); setIsOpen(false); }} className="flex-1 cursor-pointer">{s}</span>
<button onClick={() => onDelete(s)} className="text-[#A05C5C] border-none bg-transparent cursor-pointer">×</button>
</div>
))}
<div className="flex gap-1 mt-2">
<input value={newVal} onChange={e => setNewVal(e.target.value)} placeholder="新標籤" className="flex-1 p-1 border border-[#DDD] rounded outline-none" />
<button onClick={() => { onAdd(newVal); onChange(newVal); setNewVal(''); setIsOpen(false); }} className="px-2 py-1 bg-[#5D4A3E] text-white border-none rounded cursor-pointer">+</button>
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
<div className="p-5 max-w-[1200px] mx-auto">
<div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-5 gap-4">
<h2 className="m-0 text-[#5D4A3E] font-bold text-2xl">工作排單表</h2>
<div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
<input placeholder="🔍 搜尋..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="px-3 py-2 rounded-lg border border-[#DED9D3] flex-1 md:flex-none outline-none" />
<select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="p-2 rounded-lg border border-[#DED9D3] flex-1 md:flex-none outline-none">
<option value="all">全部月份</option>
{Array.from(new Set(commissions.map(c => c.order_date.substring(0, 7)))).map(m => <option key={m} value={m}>{m}</option>)}
</select>
{isUpdating && <span className="text-[#A67B3E] text-[13px] font-bold self-center">儲存中...</span>}
</div>
</div>
<div className="overflow-x-auto w-full">
<table className="w-full border-collapse bg-transparent md:bg-white md:rounded-xl md:overflow-hidden block md:table shadow-none md:shadow-sm">
<thead className="hidden md:table-header-group">
<tr className="bg-[#FBFBF9] text-[#7A7269]">
<th className="p-3 border-b border-[#F0ECE7] text-left font-bold">日期</th>
<th className="p-3 border-b border-[#F0ECE7] text-left font-bold">委託人</th>
<th className="p-3 border-b border-[#F0ECE7] text-left font-bold">狀態</th>
<th className="p-3 border-b border-[#F0ECE7] text-left font-bold">預計完工</th>
<th className="p-3 border-b border-[#F0ECE7] text-left font-bold">付款</th>
<th className="p-3 border-b border-[#F0ECE7] text-left font-bold">備註</th>
<th className="p-3 border-b border-[#F0ECE7] text-left font-bold">管理</th>
</tr>
</thead>
<tbody className="block md:table-row-group">
{filteredCommissions.map(order => (
<tr key={order.id} className="block md:table-row mb-5 border border-[#EAE6E1] md:border-none rounded-xl md:rounded-none p-4 bg-white shadow-sm md:shadow-none">
<td data-label="建單日期" className="flex md:table-cell justify-between items-center py-2 md:p-3 border-none md:border-b md:border-[#F0ECE7] text-sm md:text-base before:content-[attr(data-label)] before:font-bold before:text-[#7A7269] md:before:content-none">
{order.order_date.substring(5, 10)}
</td>
<td data-label="委託人" className="flex md:table-cell justify-between items-center py-2 md:p-3 border-none md:border-b md:border-[#F0ECE7] text-sm md:text-base before:content-[attr(data-label)] before:font-bold before:text-[#7A7269] md:before:content-none">
<div className="text-right md:text-left">
<div className="font-bold">{order.contact_memo || '未命名'}</div>
<div className="text-[11px] text-[#A0978D]">ID: {order.client_public_id || '未綁定'}</div>
</div>
</td>
<td data-label="進度狀態" className="flex md:table-cell justify-between items-center py-2 md:p-3 border-none md:border-b md:border-[#F0ECE7] text-sm md:text-base before:content-[attr(data-label)] before:font-bold before:text-[#7A7269] md:before:content-none">
<div className="w-[140px] md:w-[150px] text-right md:text-left">
<StageDropdown value={order.queue_status} onChange={(v:any) => handleUpdateField(order.id, 'queue_status', v)} stages={stages} onAdd={(v:any) => setStages([...stages, v])} onDelete={(v:any) => setStages(stages.filter(s=>s!==v))} />
</div>
</td>
<td data-label="預計完工" className="flex md:table-cell justify-between items-center py-2 md:p-3 border-none md:border-b md:border-[#F0ECE7] text-sm md:text-base before:content-[attr(data-label)] before:font-bold before:text-[#7A7269] md:before:content-none">
<input type="date" defaultValue={order.end_date} onBlur={e => handleUpdateField(order.id, 'end_date', e.target.value)} className="border border-[#EEE] p-1 w-[130px] rounded bg-transparent outline-none text-right md:text-left" />
</td>
<td data-label="付款狀態" className="flex md:table-cell justify-between items-center py-2 md:p-3 border-none md:border-b md:border-[#F0ECE7] text-sm md:text-base before:content-[attr(data-label)] before:font-bold before:text-[#7A7269] md:before:content-none">
<select value={order.payment_status} onChange={e => handleUpdateField(order.id, 'payment_status', e.target.value)} style={{ background: paymentColors[order.payment_status]?.bg, color: paymentColors[order.payment_status]?.text }} className="p-1 rounded font-bold border-none outline-none cursor-pointer">
<option value="unpaid">未付</option><option value="partial">訂金</option><option value="paid">已付</option>
</select>
</td>
<td data-label="備註" className="flex md:table-cell justify-between items-center py-2 md:p-3 border-none md:border-b md:border-[#F0ECE7] text-sm md:text-base before:content-[attr(data-label)] before:font-bold before:text-[#7A7269] md:before:content-none">
<input defaultValue={order.artist_note} onBlur={e => handleUpdateField(order.id, 'artist_note', e.target.value)} className="w-[120px] md:w-[150px] border-none border-b border-[#EEE] bg-transparent outline-none text-right md:text-left placeholder:text-right md:placeholder:text-left" placeholder="點擊編輯..." />
</td>
<td data-label="操作" className="flex md:table-cell justify-between items-center py-2 md:p-3 border-none md:border-b md:border-[#F0ECE7] text-sm md:text-base before:content-[attr(data-label)] before:font-bold before:text-[#7A7269] md:before:content-none">
<button onClick={() => navigate(`/artist/notebook?id=${order.id}`)} className="px-3 py-1.5 bg-[#5D4A3E] text-white border-none rounded-md cursor-pointer font-bold w-[100px] md:w-full">管理</button>
</td>
</tr>
))}
</tbody>
</table>
</div>
</div>
  );
}