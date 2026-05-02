// src/pages/artist/Queue.tsx
import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { GripVertical, X } from 'lucide-react';
import { QuoteBuilder } from './QuoteBuilder';
import '../../styles/Queue.css';

interface Commission {
  id: string; order_date: string; client_name: string; contact_memo: string; project_name: string;
  type_name: string; payment_status: string; end_date: string; artist_note: string; is_rush: string;
  status: string; workflow_mode: string; 
  queue_status: string;
  artist_id?: string;
  latest_message_at?: string;
  last_read_at_artist?: string;
  client_public_id?: string;
  client_custom_label?: string;
  crm_record_id?: string;
  origin_source?: string;
}

const paymentColors: Record<string, { bg: string; text: string; label: string }> = {
  unpaid: { bg: '#F4F0EB', text: '#8A7A7A', label: '尚未付款' },
  partial: { bg: '#FDF4E6', text: '#A67B3E', label: '已收訂金' },
  paid: { bg: '#E8F3EB', text: '#4E7A5A', label: '已收全額' }
};

const INITIAL_STAGES = ['尚未開始', '構圖中', '待委託人確認', '尚未收款'];

const unescapeHtml = (str: string) => {
  if (!str) return '';
  return str.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#039;/g, "'");
};

const getBulletinSource = (order?: Commission) => {
  if (!order || !order.origin_source) return null;
  try {
    const parsed = JSON.parse(unescapeHtml(order.origin_source));
    if (parsed.source_type === 'bulletin') return parsed;
  } catch (e) {
    return null;
  }
  return null;
};

const getTime = (dateStr?: string) => {
  if (!dateStr) return 0;
  let str = dateStr.trim();
  if (!str.includes('T')) str = str.replace(' ', 'T');
  if (!str.endsWith('Z') && !str.includes('+')) str += 'Z';
  return new Date(str).getTime();
};

function StageDropdown({ value, onChange, stages, onAdd, onDelete, onToggle, isExpanded }: any) {
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

  const toggleOpen = (e: React.MouseEvent) => {
    // 只有在展開狀態下，點擊按鈕才阻止冒泡，避免點擊選單時收合行
    if (isExpanded) e.stopPropagation(); 
    const nextState = !isOpen;
    setIsOpen(nextState);
    onToggle(nextState);
  };

  return (
    <div ref={dropdownRef} className="dropdown-container" style={{ minWidth: '120px' }}>
      <div onClick={toggleOpen} className="dropdown-button" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', whiteSpace: 'nowrap' }}>
        <span className="dropdown-text" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{value || '設定狀態'}</span>
        <span className="dropdown-arrow" style={{ marginLeft: '8px' }}>▼</span>
      </div>
      {isOpen && (
        <div className="dropdown-menu" onClick={e => e.stopPropagation()}>
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
  const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || '';
  
  const [myId, setMyId] = useState<string>('');
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [stages, setStages] = useState<string[]>(() => JSON.parse(localStorage.getItem('artist_all_stages') || JSON.stringify(INITIAL_STAGES)));
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/api/users/me`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => { if (data.success) setMyId(data.data.id); })
      .catch(err => console.error("取得使用者身分失敗", err));
  }, [API_BASE]);

  useEffect(() => { localStorage.setItem('artist_all_stages', JSON.stringify(stages)); }, [stages]);
  
  const fetchQueue = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/commissions`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        let list = data.data.filter((c: any) => c.status !== 'completed' && c.status !== 'cancelled');
        const savedOrder = JSON.parse(localStorage.getItem('queue_order_list') || '[]');
        if (savedOrder.length > 0) {
          list.sort((a: any, b: any) => {
            const idxA = savedOrder.indexOf(a.id);
            const idxB = savedOrder.indexOf(b.id);
            if (idxA === -1 && idxB === -1) return getTime(a.order_date) - getTime(b.order_date);
            if (idxA === -1) return 1;
            if (idxB === -1) return -1;
            return idxA - idxB;
          });
        } else {
          list.sort((a: any, b: any) => getTime(a.order_date) - getTime(b.order_date));
        }
        setCommissions(list);
      }
    } catch (e) {}
  };
  
  useEffect(() => { fetchQueue(); }, []);

  useEffect(() => {
    if (commissions.length > 0) {
      const orderIds = commissions.map(c => c.id);
      localStorage.setItem('queue_order_list', JSON.stringify(orderIds));
    }
  }, [commissions]);
  
  const handleUpdateField = async (id: string, field: string, value: string) => {
    setIsSaving(true);
    try {
      // 🛡️ [資安提醒]: 後端需驗證當前使用者是否為此單繪師
      await fetch(`${API_BASE}/api/commissions/${id}`, {
        method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value })
      });
      setCommissions(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
    } catch (error) {} finally { setIsSaving(false); }
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

  const filteredCommissions = useMemo(() => {
    return commissions.filter(c => {
      if (myId && c.artist_id !== myId) return false;
      if (selectedMonth !== 'all' && (!c.order_date || !c.order_date.startsWith(selectedMonth))) return false;
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      return (
        (c.client_name && c.client_name.toLowerCase().includes(term)) || 
        (c.contact_memo && c.contact_memo.toLowerCase().includes(term)) || 
        (c.project_name && c.project_name.toLowerCase().includes(term)) ||
        (c.id && c.id.toLowerCase().includes(term)) ||
        (c.client_custom_label && c.client_custom_label.toLowerCase().includes(term))
      );
    });
  }, [commissions, selectedMonth, searchTerm, myId]);

  const getClientNameDisplay = (order: Commission) => order.client_name ? order.client_name : '(未綁定)';

  return (
    <div className="queue-container">
      <div className="queue-header">
        <h2 className="queue-title">工作排單表</h2>
        <div className="queue-controls">
          <input placeholder="搜尋項目/暱稱/單號/標籤..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="queue-search" />
          <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="queue-select">
            <option value="all">全部月份</option>
            {Array.from(new Set(commissions.map(c => c.order_date ? c.order_date.substring(0, 7) : ''))).filter(m => m).map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <button onClick={() => setIsQuoteModalOpen(true)} className="create-quote-btn" style={{ padding: '8px 12px', background: '#5D4A3E', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>+ 建立新委託單</button>
          {isSaving && <span className="updating-hint">儲存中...</span>}
        </div>
      </div>

      <div className="queue-table-wrapper">
        <table className="queue-table">
          <thead>
            <tr>
              <th>日期</th><th>委託人</th><th>進度</th><th>完工</th><th>付款</th><th className="queue-hide-mobile">備註欄位</th><th className="queue-hide-mobile">操作</th>
            </tr>
          </thead>
          <tbody>
            {filteredCommissions.map((order, idx) => {
              const isExpanded = expandedId === order.id;
              const isBulletin = getBulletinSource(order) !== null;
              
              return (
              <tr 
                key={order.id}
                onDragOver={(e) => handleDragOver(e, idx)}
                onClick={() => setExpandedId(isExpanded ? null : order.id)}
                className={`${draggedIdx === idx ? 'dragging' : ''} ${openDropdownId === order.id ? 'active-row' : ''} ${isExpanded ? 'is-expanded' : ''}`}
              >
                <td data-label="日期">
                  <div className="cell-content cell-date">
                    <div draggable onDragStart={() => handleDragStart(idx)} onDragEnd={() => setDraggedIdx(null)} className="drag-handle queue-hide-mobile"><GripVertical size={16} /></div>
                    <span>{order.order_date ? order.order_date.substring(5, 10).replace('-', '/') : '未定'}</span>
                  </div>
                </td>
                <td data-label="委託人資訊">
                  <div className="cell-content-right" style={{ textAlign: 'left', lineHeight: '1.6' }}>
                    <div style={{ fontSize: '14px', color: '#5D4A3E', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 'bold' }}>{getClientNameDisplay(order)}</span>
                      {/* 🌟 標籤包裝器：由 CSS 控制在手機版未展開時隱藏 */}
                      <div className="workflow-badge-wrapper">
                        {isBulletin ? (
                          <span className="bulletin-badge" style={{ backgroundColor: '#8E7E8E', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>許願池</span>
                        ) : (
                          <span className={`workflow-badge ${order.workflow_mode === 'free' ? 'free' : 'standard'}`} style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                            {order.workflow_mode === 'free' ? '自由紀錄' : '標準委託'}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="client-details-extra">
                      <div style={{ fontSize: '13px', color: '#7A7269' }}><strong>項目：</strong>{order.project_name || order.type_name || '未命名項目'}</div>
                      <div style={{ fontSize: '13px', color: '#7A7269' }}><span style={{ color: '#A0978D', marginLeft: '1px', fontSize: '11px', fontFamily: 'monospace' }}>{order.client_public_id ||'未綁定'} (訂單編號：{order.id.split('-')[1] || order.id})</span></div>
                    </div>
                  </div>
                </td>
                <td data-label="當前進度">
                  <div className="cell-content cell-status">
                    <StageDropdown 
                      value={order.queue_status} 
                      isExpanded={isExpanded}
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
                    <span className="date-text-display">{order.end_date ? order.end_date.substring(5).replace('-', '/') : '未定'}</span>
                    <input type="date" defaultValue={order.end_date} onClick={e => isExpanded && e.stopPropagation()} onBlur={e => handleUpdateField(order.id, 'end_date', e.target.value)} className="date-input" />
                  </div>
                </td>
                <td data-label="付款進度">
                  <div className="cell-content cell-payment">
                    <select value={order.payment_status} onClick={e => isExpanded && e.stopPropagation()} onChange={e => handleUpdateField(order.id, 'payment_status', e.target.value)} style={{ background: paymentColors[order.payment_status]?.bg, color: paymentColors[order.payment_status]?.text }} className="payment-select">
                      <option value="unpaid">未付</option><option value="partial">訂金</option><option value="paid">已付</option>
                    </select>
                  </div>
                </td>
                <td data-label="備註欄位">
                  <div className="cell-content cell-note">
                    {order.client_custom_label === '黑名單' && (
                      <span className="queue-blacklist-tag" onClick={(e) => { e.stopPropagation(); navigate(`/artist/customers?id=${order.crm_record_id}`); }} title="點擊查看黑名單原因" style={{ cursor: 'pointer', color: '#FF4D4D', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', border: '1px solid #FF4D4D', marginRight: '6px', flexShrink: 0 }}>黑名單</span>
                    )}
                    {order.is_rush === '是' && <span className="rush-badge">急單</span>}
                    <input defaultValue={order.artist_note} onClick={e => isExpanded && e.stopPropagation()} onBlur={e => handleUpdateField(order.id, 'artist_note', e.target.value)} className="note-input" placeholder="點擊編輯..." />
                  </div>
                </td>
                <td data-label="操作管理">
                  <div className="cell-content cell-manage"><button onClick={(e) => { e.stopPropagation(); navigate(`/artist/notebook?id=${order.id}`); }} className="manage-button">管理</button></div>
                </td>
              </tr>
            )})}
          </tbody>
        </table>
      </div>

      {isQuoteModalOpen && (
        <div className="quote-modal-overlay" onClick={() => setIsQuoteModalOpen(false)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', overflowY: 'auto', padding: '5vh 20px', cursor: 'default' }}>
          <div className="quote-modal-content" onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '800px', background: '#FAFAFA', padding: '24px', borderRadius: '12px', position: 'relative', cursor: 'auto', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
            <button onClick={() => setIsQuoteModalOpen(false)} style={{ position: 'absolute', right: '16px', top: '16px', background: 'none', border: 'none', cursor: 'pointer', color: '#5D4A3E' }}><X size={28}/></button>
            <QuoteBuilder isModal onSuccess={() => { setIsQuoteModalOpen(false); fetchQueue(); }} />
          </div>
        </div>
      )}
    </div>
  );
}