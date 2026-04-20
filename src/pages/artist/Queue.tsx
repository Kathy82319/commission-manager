// src/pages/artist/Queue.tsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { GripVertical } from 'lucide-react';
import '../../styles/Queue.css';

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

function StageDropdown({ value, onChange, stages, onAdd, onDelete, onToggle }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const [newVal, setNewVal] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    function handleClick(e: MouseEvent) { 
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        onToggle(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onToggle]);

  const toggleOpen = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    onToggle(nextState);
  };

  return (
    <div ref={dropdownRef} className="dropdown-container">
      <div onClick={toggleOpen} className="dropdown-button">
        <span className="dropdown-text">{value || '設定狀態'}</span>
        <span className="dropdown-arrow">▼</span>
      </div>
      {isOpen && (
        <div className="dropdown-menu">
          {stages.map((s: string) => (
            <div key={s} className="dropdown-item">
              <span onClick={() => { onChange(s); setIsOpen(false); onToggle(false); }} className="dropdown-item-text">{s}</span>
              <button onClick={() => onDelete(s)} className="dropdown-item-delete">×</button>
            </div>
          ))}
          <div className="dropdown-add-container">
            <input value={newVal} onChange={e => setNewVal(e.target.value)} placeholder="新標籤" className="dropdown-add-input" />
            <button onClick={() => { onAdd(newVal); onChange(newVal); setNewVal(''); setIsOpen(false); onToggle(false); }} className="dropdown-add-button">+</button>
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
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  
  // 核心：追蹤哪個選單被打開，用來動態提升該行的 z-index
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  useEffect(() => { localStorage.setItem('artist_all_stages', JSON.stringify(stages)); }, [stages]);
  
  const fetchQueue = async () => {
    const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/commissions`, { credentials: 'include' });
    const data = await res.json();
    if (data.success) {
      let list = data.data.filter((c: any) => c.status !== 'completed' && c.status !== 'cancelled');
      const savedOrder = JSON.parse(localStorage.getItem('queue_order_list') || '[]');
      if (savedOrder.length > 0) {
        list.sort((a: any, b: any) => {
          const idxA = savedOrder.indexOf(a.id);
          const idxB = savedOrder.indexOf(b.id);
          if (idxA === -1 && idxB === -1) return new Date(a.order_date).getTime() - new Date(b.order_date).getTime();
          if (idxA === -1) return 1;
          if (idxB === -1) return -1;
          return idxA - idxB;
        });
      } else {
        list.sort((a: any, b: any) => new Date(a.order_date).getTime() - new Date(b.order_date).getTime());
      }
      setCommissions(list);
    }
  };
  
  useEffect(() => { fetchQueue(); }, []);

  useEffect(() => {
    if (commissions.length > 0) {
      const orderIds = commissions.map(c => c.id);
      localStorage.setItem('queue_order_list', JSON.stringify(orderIds));
    }
  }, [commissions]);
  
  const handleUpdateField = async (id: string, field: string, value: string) => {
    setIsUpdating(true);
    await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/commissions/${id}`, {
      method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value })
    });
    setCommissions(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
    setIsUpdating(false);
  };
  
  const handleDragStart = (idx: number) => setDraggedIdx(idx);

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === idx) return;
    const newCommissions = [...commissions];
    const draggedItem = newCommissions[draggedIdx];
    newCommissions.splice(draggedIdx, 1);
    newCommissions.splice(idx, 0, draggedItem);
    setDraggedIdx(idx);
    setCommissions(newCommissions);
  };

  const filteredCommissions = commissions.filter(c => {
    if (selectedMonth !== 'all' && !c.order_date.startsWith(selectedMonth)) return false;
    const term = searchTerm.toLowerCase();
    return (
      c.client_name?.toLowerCase().includes(term) || 
      c.contact_memo?.toLowerCase().includes(term) || 
      c.project_name?.toLowerCase().includes(term) ||
      c.id.includes(term)
    );
  });

  return (
    <div className="queue-container">
      <div className="queue-header">
        <h2 className="queue-title queue-title-desktop">工作排單表</h2>
        <div className="queue-controls">
          <h2 className="queue-title queue-title-mobile">工作排單表</h2>
          <input placeholder="🔍 搜尋項目/暱稱/單號..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="queue-search" />
          <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="queue-select">
            <option value="all">全部月份</option>
            {Array.from(new Set(commissions.map(c => c.order_date.substring(0, 7)))).map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          {isUpdating && <span className="updating-hint">儲存中...</span>}
        </div>
      </div>
      <div className="queue-table-wrapper">
        <table className="queue-table">
          <thead>
            <tr>
              <th style={{ width: '100px' }}>日期</th>
              <th>委託人資訊</th>
              <th style={{ width: '150px' }}>當前進度</th>
              <th style={{ width: '140px' }}>預計完工</th>
              <th style={{ width: '120px' }}>付款進度</th>
              <th style={{ width: '180px' }}>備註欄位</th>
              <th style={{ width: '100px' }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {filteredCommissions.map((order, idx) => (
              <tr 
                key={order.id}
                onDragOver={(e) => handleDragOver(e, idx)}
                // 🌟 當選單開啟時，提升該行 z-index 避免穿透
                className={`${draggedIdx === idx ? 'dragging' : ''} ${openDropdownId === order.id ? 'active-row' : ''}`}
              >
                <td data-label="日期">
                  <div className="cell-content cell-date">
                    <div 
                      draggable 
                      onDragStart={() => handleDragStart(idx)}
                      onDragEnd={() => setDraggedIdx(null)}
                      className="drag-handle desktop-only"
                    >
                      <GripVertical size={16} />
                    </div>
                    <span>{order.order_date.substring(5, 10)}</span>
                  </div>
                </td>
                <td data-label="委託人資訊">
                  {/* 🌟 委託人資訊維持你設定的三行排版，不動！ */}
                  <div className="cell-content-client">
                    <div className="client-name-row">
                      <strong>委託人：</strong>{order.contact_memo || '未命名'} 
                      <span className="client-sub-text">({order.client_name || '無暱稱'})</span>
                    </div>
                    <div className="project-name-row">
                      <strong>項目：</strong>{order.project_name || order.type_name || '未命名項目'}
                    </div>
                    <div className="order-id-row">
                      {order.client_public_id || '未綁定'} (單號：{order.id.split('-')[1] || order.id})
                    </div>
                  </div>
                </td>
                <td data-label="當前進度">
                  <div className="cell-content cell-status">
                    {/* 🌟 浮空標籤：絕對定位，不佔用空間 */}
                    <div className="workflow-badge-wrapper">
                      <span className={`workflow-badge ${order.workflow_mode === 'free' ? 'free' : 'standard'}`}>
                        {order.workflow_mode === 'free' ? '自由記錄' : '標準委託'}
                      </span>
                    </div>
                    <StageDropdown 
                      value={order.queue_status} 
                      onChange={(v:any) => handleUpdateField(order.id, 'queue_status', v)} 
                      stages={stages} 
                      onAdd={(v:any) => setStages([...stages, v])} 
                      onDelete={(v:any) => setStages(stages.filter(s=>s!==v))}
                      onToggle={(isOpen: boolean) => setOpenDropdownId(isOpen ? order.id : null)}
                    />
                  </div>
                </td>
                <td data-label="預計完工">
                  <div className="cell-content cell-date-input">
                    <input type="date" defaultValue={order.end_date} onBlur={e => handleUpdateField(order.id, 'end_date', e.target.value)} className="date-input" />
                  </div>
                </td>
                <td data-label="付款進度">
                  <div className="cell-content cell-payment">
                    <select value={order.payment_status} onChange={e => handleUpdateField(order.id, 'payment_status', e.target.value)} style={{ background: paymentColors[order.payment_status]?.bg, color: paymentColors[order.payment_status]?.text }} className="payment-select">
                      <option value="unpaid">未付</option><option value="partial">訂金</option><option value="paid">已付</option>
                    </select>
                  </div>
                </td>
                <td data-label="備註欄位">
                  <div className="cell-content cell-note">
                    {order.is_rush === '是' && <span className="rush-badge desktop-only-badge">急單</span>}
                    <input defaultValue={order.artist_note} onBlur={e => handleUpdateField(order.id, 'artist_note', e.target.value)} className="note-input" placeholder="點擊編輯..." />
                  </div>
                </td>
                <td data-label="操作管理">
                  <div className="cell-content cell-manage">
                    <button onClick={() => navigate(`/artist/notebook?id=${order.id}`)} className="manage-button">管理</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}