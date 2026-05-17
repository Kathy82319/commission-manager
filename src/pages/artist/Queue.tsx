// src/pages/artist/Queue.tsx
import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { GripVertical, X, Edit2, Calendar as CalendarIcon, List as ListIcon } from 'lucide-react';
import { QuoteBuilder } from './QuoteBuilder';
import { QueueCalendarView } from './notebook-components/QueueCalendarView';
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
  total_price?: number;
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

const getOriginData = (order?: Commission) => {
  if (!order || !order.origin_source) return null;
  try {
    const parsed = JSON.parse(unescapeHtml(order.origin_source));
    if (!parsed) return null;

    if (parsed.source_type === 'showcase_form') {
      return {
        type: 'showcase_form',
        ...parsed
      };
    }

    if (parsed.source_type === 'bulletin') {
      return {
        type: 'bulletin',
        ...parsed
      };
    }
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

  const toggleOpen = (e: React.MouseEvent) => {
    e.stopPropagation(); 
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
  const [userData, setUserData] = useState<any>({});
  const [fullProfileSettings, setFullProfileSettings] = useState<any>({});
  const [dateColumnLabel, setDateColumnLabel] = useState<string>('預計開始日');
  
  // 🌟 新增：偵測是否為手機版，用於動態切換文字與版型
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [stages, setStages] = useState<string[]>(() => JSON.parse(localStorage.getItem('artist_all_stages') || JSON.stringify(INITIAL_STAGES)));
  
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  const [paidAmounts, setPaidAmounts] = useState<Record<string, number>>({});
  
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);

  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500); 
  };

  useEffect(() => {
    fetch(`${API_BASE}/api/users/me`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => { 
        if (data.success) {
          setMyId(data.data.id); 
          setUserData(data.data); 
          
          try {
            const settings = typeof data.data.profile_settings === 'string' 
              ? JSON.parse(data.data.profile_settings) 
              : (data.data.profile_settings || {});
            
            setFullProfileSettings(settings); 

            if (settings.queue_settings?.date_column_label) {
              setDateColumnLabel(settings.queue_settings.date_column_label);
            }
          } catch (e) {}
        }
      })
      .catch(err => console.error("取得使用者身分失敗", err));
  }, [API_BASE]);

  useEffect(() => { localStorage.setItem('artist_all_stages', JSON.stringify(stages)); }, [stages]);
  
  const handleSaveDateLabel = async (newLabel: string) => {
    const safeLabel = newLabel.trim() || '預計開始日';
    setDateColumnLabel(safeLabel);
    
    setIsSaving(true);
    try {
      const updatedQueueSettings = {
        ...(fullProfileSettings.queue_settings || {}),
        date_column_label: safeLabel
      };
      
      const updatedProfileSettings = {
        ...fullProfileSettings,
        queue_settings: updatedQueueSettings
      };

      await fetch(`${API_BASE}/api/users/me`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...userData,
          profile_settings: JSON.stringify(updatedProfileSettings) 
        })
      });
      
      setFullProfileSettings(updatedProfileSettings);
      showToast('✅ 欄位名稱已儲存');
    } catch (e) {
      console.error("儲存欄位名稱失敗", e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSyncOrderToDB = async (orderIds: string[]) => {
    setIsSaving(true);
    try {
      const updatedQueueSettings = {
        ...(fullProfileSettings.queue_settings || {}),
        custom_order: orderIds
      };
      const updatedProfileSettings = {
        ...fullProfileSettings,
        queue_settings: updatedQueueSettings
      };
      await fetch(`${API_BASE}/api/users/me`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...userData,
          profile_settings: JSON.stringify(updatedProfileSettings) 
        })
      });
      setFullProfileSettings(updatedProfileSettings);
      showToast('✅ 排序已同步至公開頁面');
    } catch (e) {
      console.error("同步排序失敗", e);
    } finally {
      setIsSaving(false);
    }
  };

  const fetchPaymentForOrder = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/commissions/${id}/payments`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        const total = data.data.reduce((sum: number, p: any) => sum + p.amount, 0);
        setPaidAmounts(prev => ({ ...prev, [id]: total }));
        return total;
      }
    } catch (e) {
      console.error("取得帳務明細失敗", e);
    }
    return 0;
  };

  const fetchQueue = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/commissions`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        let list = data.data.filter((c: any) => c.status !== 'completed' && c.status !== 'cancelled');
        
        const dbCustomOrder = fullProfileSettings?.queue_settings?.custom_order;
        const savedOrder = dbCustomOrder && dbCustomOrder.length > 0 
                           ? dbCustomOrder 
                           : JSON.parse(localStorage.getItem('queue_order_list') || '[]');

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
        list.forEach((c: Commission) => fetchPaymentForOrder(c.id));
      }
    } catch (e) {}
  };
  
  useEffect(() => { 
    if (myId) {
      fetchQueue(); 
    }
  }, [myId]); 

  useEffect(() => {
    if (commissions.length > 0) {
      const orderIds = commissions.map(c => c.id);
      localStorage.setItem('queue_order_list', JSON.stringify(orderIds));
    }
  }, [commissions]);
  
  const handleUpdateField = async (id: string, field: string, value: string) => {
    setIsSaving(true);
    try {
      await fetch(`${API_BASE}/api/commissions/${id}`, {
        method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value })
      });
      setCommissions(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
      showToast('✅ 自動儲存成功');  
    } catch (error) {} finally { setIsSaving(false); }
  };

  const handlePaymentChange = async (order: Commission, newStatus: string) => {
    if (newStatus === order.payment_status) return;

    if (newStatus === 'partial') {
      const amountStr = window.prompt('請輸入收到的【訂金金額】\n(系統將自動在委託單為您新增一筆記帳明細)：');
      if (amountStr === null) return; 
      
      const amount = Number(amountStr);
      if (isNaN(amount) || amount <= 0) {
        alert('請輸入有效的金額！');
        return;
      }
      
      setIsSaving(true);
      try {
        const today = new Date().toLocaleDateString('en-CA'); 
        await fetch(`${API_BASE}/api/commissions/${order.id}/payments`, {
          method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ record_date: today, item_name: '訂金', amount })
        });
        await fetch(`${API_BASE}/api/commissions/${order.id}`, {
          method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ payment_status: 'partial' })
        });
        setCommissions(prev => prev.map(c => c.id === order.id ? { ...c, payment_status: 'partial' } : c));
        await fetchPaymentForOrder(order.id);
        showToast('✅ 已自動記帳並儲存狀態');  
      } catch (e) {} finally { setIsSaving(false); }

    } else if (newStatus === 'paid') {
      const currentPaid = paidAmounts[order.id] || 0;
      const totalPrice = order.total_price || 0;
      const remainder = totalPrice - currentPaid;

      setIsSaving(true);
      try {
        if (remainder > 0) {
          const today = new Date().toLocaleDateString('en-CA');
          await fetch(`${API_BASE}/api/commissions/${order.id}/payments`, {
            method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ record_date: today, item_name: '尾款結清', amount: remainder })
          });
        }
        await fetch(`${API_BASE}/api/commissions/${order.id}`, {
          method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ payment_status: 'paid' })
        });
        setCommissions(prev => prev.map(c => c.id === order.id ? { ...c, payment_status: 'paid' } : c));
        await fetchPaymentForOrder(order.id);
        showToast('✅ 尾款已結清並儲存狀態');
      } catch (e) {} finally { setIsSaving(false); }

    } else {
      if (window.confirm('確定要改為「未付款」嗎？\n注意：這不會自動刪除您已建立的記帳明細，若需修改實際金額請至管理頁面處理。')) {
        await handleUpdateField(order.id, 'payment_status', 'unpaid');
      }
    }
  };
  
  const handleDragStart = (id: string) => { setDraggedId(id); };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault(); 
    if (draggedId && draggedId !== targetId && dragOverId !== targetId) {
      setDragOverId(targetId);
    }
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null); setDragOverId(null); return;
    }
    setCommissions(prev => {
      const oldIdx = prev.findIndex(c => c.id === draggedId);
      const newIdx = prev.findIndex(c => c.id === targetId);
      if (oldIdx === -1 || newIdx === -1) return prev;
      const newCommissions = [...prev];
      const [draggedItem] = newCommissions.splice(oldIdx, 1);
      newCommissions.splice(newIdx, 0, draggedItem);
      
      const newOrderIds = newCommissions.map(c => c.id);
      handleSyncOrderToDB(newOrderIds);

      return newCommissions;
    });
    setDraggedId(null); setDragOverId(null);
  };

  const handleDragEnd = () => { setDraggedId(null); setDragOverId(null); };

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

  const getClientNameDisplay = (order: Commission) => {
    if (order.client_name) {
      return order.contact_memo ? `${order.client_name} (${order.contact_memo})` : order.client_name;
    }
    return order.contact_memo ? order.contact_memo : '(未綁定)';
  };

  const planLimits: Record<string, number> = { 'free': 3, 'trial': 20, 'pro': 999999 };
  const currentLimit = planLimits[userData?.plan_type || 'free'] || 3;
  const activeArtistCommissions = commissions.filter(c => c.artist_id === myId);
  const isQuotaFull = activeArtistCommissions.length >= currentLimit;

  return (
    <div className="queue-container">
      <style>{`
        .queue-mobile-col-name { display: none; }
        .dynamic-date-th { min-width: 110px; }
        @media (max-width: 768px) {
          .queue-desktop-col-edit { display: none !important; }
          .queue-mobile-col-name { display: inline-block !important; }
          .dynamic-date-th { min-width: auto !important; width: auto !important; }
        }
      `}</style>

      {toastMsg && (
        <div className="toast-notification">
          {toastMsg}
        </div>
      )}

      <div className="queue-header">
        <h2 className="queue-title">工作排單表</h2>
        <div className="queue-controls">

          <div className="view-mode-toggle" style={{ display: 'flex', backgroundColor: '#F1F5F9', borderRadius: '8px', padding: '4px', gap: '4px' }}>
            {/* 🌟 加上 whiteSpace: nowrap 避免「列表」兩個字變直排 */}
            <button
              onClick={() => setViewMode('list')}
              style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', border: 'none', borderRadius: '4px', background: viewMode === 'list' ? '#FFF' : 'transparent', color: viewMode === 'list' ? '#5D4A3E' : '#94A3B8', fontWeight: 'bold', boxShadow: viewMode === 'list' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none', cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap' }}
            >
              <ListIcon size={16} /> 列表
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', border: 'none', borderRadius: '4px', background: viewMode === 'calendar' ? '#FFF' : 'transparent', color: viewMode === 'calendar' ? '#5D4A3E' : '#94A3B8', fontWeight: 'bold', boxShadow: viewMode === 'calendar' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none', cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap' }}
            >
              <CalendarIcon size={16} /> 日曆
            </button>
          </div>

          {/* 🌟 加上 queue-hide-mobile class 在手機版隱藏搜尋框 */}
          <input placeholder="搜尋項目" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="queue-search queue-hide-mobile" />
          
          <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="queue-select">
            {/* 🌟 手機版文字精簡為「月份」 */}
            <option value="all">{isMobile ? '月份' : '全部月份'}</option>
            {Array.from(new Set(commissions.map(c => c.order_date ? c.order_date.substring(0, 7) : ''))).filter(m => m).map(m => <option key={m} value={m}>{m}</option>)}
          </select>

          <button 
            onClick={() => {
              if (isQuotaFull) {
                alert(`您目前的活躍委託單已達上限 (${currentLimit} 筆)。\n請先將舊訂單結案/取消，或升級專業版以開啟更多活躍工作欄位！`);
                return;
              }
              setIsQuoteModalOpen(true);
            }} 
            className="create-quote-btn" 
            style={{ 
              padding: '8px 12px', 
              background: isQuotaFull ? '#C4BDB5' : '#5D4A3E', 
              color: 'white', 
              border: 'none', 
              borderRadius: '6px', 
              cursor: isQuotaFull ? 'not-allowed' : 'pointer', 
              fontWeight: 'bold',
              whiteSpace: 'nowrap' /* 🌟 防止文字直排 */
            }}
            title={isQuotaFull ? `活躍額度已滿 (${currentLimit}/${currentLimit})` : ''}
          >
            {isQuotaFull ? '🔒 活躍額度已滿' : '+ 建立新委託單'}
          </button>
          {isSaving && <span className="updating-hint queue-hide-mobile">儲存中...</span>}
        </div>
      </div>

      {viewMode === 'list' ? (
        <div className="queue-table-wrapper">
          <table className="queue-table">
            <thead>
              <tr>
                <th>日期</th>
                <th>委託人</th>
                <th>進度</th>
                <th className="dynamic-date-th">
                  <div className="queue-desktop-col-edit" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <input 
                      type="text" 
                      value={dateColumnLabel} 
                      onChange={e => setDateColumnLabel(e.target.value)}
                      onBlur={(e) => handleSaveDateLabel(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.currentTarget.blur();
                        }
                      }}
                      style={{ 
                        background: 'transparent', 
                        border: '1px dashed transparent', 
                        color: 'inherit', 
                        fontWeight: 'bold', 
                        fontSize: 'inherit', 
                        width: '80px',
                        padding: '2px 4px',
                        borderRadius: '4px',
                        cursor: 'text',
                        transition: 'border-color 0.2s, background-color 0.2s'
                      }}
                      onFocus={e => e.target.style.border = '1px dashed #A0978D'}
                      onMouseOver={e => { if(document.activeElement !== e.target) e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)' }}
                      onMouseOut={e => { if(document.activeElement !== e.target) e.currentTarget.style.backgroundColor = 'transparent' }}
                    />
                    <Edit2 size={12} color="#A0978D" style={{ cursor: 'pointer', flexShrink: 0 }} />
                  </div>
                  <span className="queue-mobile-col-name">日期</span>
                </th>
                <th>付款</th>
                <th className="queue-hide-mobile">備註欄位</th>
                <th className="queue-hide-mobile">操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredCommissions.map((order) => {
                const isExpanded = expandedId === order.id;
                
                const originData = getOriginData(order);
                
                const total = order.total_price || 0;
                const paid = paidAmounts[order.id] || 0;
                const hasAmountData = total > 0;
                
                return (
                <tr 
                  key={order.id}
                  onDragOver={(e) => handleDragOver(e, order.id)}
                  onDrop={(e) => handleDrop(e, order.id)}
                  onClick={() => setExpandedId(isExpanded ? null : order.id)}
                  className={`${draggedId === order.id ? 'is-dragging' : ''} ${dragOverId === order.id ? 'drag-over-target' : ''} ${openDropdownId === order.id ? 'active-row' : ''} ${isExpanded ? 'is-expanded' : ''}`}
                >
                  <td data-label="日期">
                    <div className="cell-content cell-date">
                      <div 
                        draggable 
                        onDragStart={() => handleDragStart(order.id)} 
                        onDragEnd={handleDragEnd} 
                        className="drag-handle queue-hide-mobile"
                      >
                        <GripVertical size={16} />
                      </div>
                      <span>{order.order_date ? order.order_date.substring(5, 10).replace('-', '/') : '未定'}</span>
                    </div>
                  </td>
                  <td data-label="委託人資訊">
                    <div className="cell-content-right" style={{ textAlign: 'left', lineHeight: '1.6' }}>
                      <div style={{ fontSize: '14px', color: '#5D4A3E', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 'bold' }}>{getClientNameDisplay(order)}</span>
                        <div className="workflow-badge-wrapper">
                          
                          {originData ? (
                            <span className="bulletin-badge" style={{ backgroundColor: originData.type === 'showcase_form' ? '#4A7294' : '#8E7E8E', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                              {originData.type === 'showcase_form' ? '接委託表單' : '許願池'}
                            </span>
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
                      <div className="cell-content cell-status" onClick={e => e.stopPropagation()}></div>
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
                  <td data-label={dateColumnLabel}>
                    <div className="cell-content cell-date-input">
                      <span className="date-text-display">{order.end_date ? order.end_date.substring(5).replace('-', '/') : '未定'}</span>
                      <input type="date" defaultValue={order.end_date} onClick={e => isExpanded && e.stopPropagation()} onBlur={e => handleUpdateField(order.id, 'end_date', e.target.value)} className="date-input" />
                    </div>
                  </td>
                  <td data-label="付款進度">
                    <div className="cell-content cell-payment" style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start', width: '100%' }}>
                      <select 
                        value={order.payment_status} 
                        onClick={e => isExpanded && e.stopPropagation()} 
                        onChange={e => handlePaymentChange(order, e.target.value)} 
                        style={{ background: paymentColors[order.payment_status]?.bg, color: paymentColors[order.payment_status]?.text, width: '100%' }} 
                        className="payment-select"
                      >
                        <option value="unpaid">未付</option>
                        <option value="partial">訂金</option>
                        <option value="paid">已付</option>
                      </select>
                      {hasAmountData && (
                        <div className="payment-amount-text" style={{ color: '#8A7A7A', whiteSpace: 'nowrap', marginTop: '2px', alignSelf: 'center' }}>
                          ${paid} / ${total}
                        </div>
                      )}
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
      ) : (
        <QueueCalendarView commissions={filteredCommissions} dateColumnLabel={dateColumnLabel} handleUpdateField={handleUpdateField} />
      )}

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