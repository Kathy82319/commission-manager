import React, { useState, useEffect, useRef } from 'react';
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
  unpaid: { bg: '#F4F0EB', text: '#8A7A7A', label: '尚未付款' },
  partial: { bg: '#FDF4E6', text: '#A67B3E', label: '已收訂金' },
  paid: { bg: '#E8F3EB', text: '#4E7A5A', label: '已收全額' }
};

const INITIAL_STAGES = [
  '尚未開始',
  '構圖中',
  '待委託人確認',  
  '尚未收款'
];

// ==========================================
// 1. 客製化下拉選單組件 (字體放大版)
// ==========================================
function StageDropdown({
  value,
  onChange,
  stages,
  onAdd,
  onDelete
}: {
  value: string;
  onChange: (val: string) => void;
  stages: string[];
  onAdd: (val: string) => void;
  onDelete: (val: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [newVal, setNewVal] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (stage: string) => {
    onChange(stage);
    setIsOpen(false);
  };

  const handleAdd = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const trimmed = newVal.trim();
    if (trimmed) {
      onAdd(trimmed);
      onChange(trimmed); 
      setNewVal('');
      setIsOpen(false);
    }
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative', width: '100%', minWidth: '130px' }}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: '6px 8px', 
          border: isOpen ? '1px solid #A67B3E' : '1px solid #DED9D3',
          borderRadius: '6px',
          backgroundColor: '#FBFBF9',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          minHeight: '28px',
          transition: 'all 0.2s ease',
        }}
      >
        <span style={{ color: value ? '#5D4A3E' : '#A0978D', fontSize: '14px', fontWeight: value ? 'bold' : 'normal', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {value || '選擇...'}
        </span>
        <span style={{ fontSize: '10px', color: '#A0978D', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease', marginLeft: '4px' }}>
          ▼
        </span>
      </div>

      {isOpen && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px',
          backgroundColor: '#FFFFFF', border: '1px solid #EAE6E1', borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)', zIndex: 9999, display: 'flex', flexDirection: 'column', maxHeight: '250px'
        }}>
          <div style={{ overflowY: 'auto', padding: '4px 0' }}>
            {stages.map(stage => (
              <div
                key={stage}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '6px 8px 6px 10px', fontSize: '14px',
                  backgroundColor: value === stage ? '#F4F0EB' : 'transparent',
                }}
                onMouseEnter={e => { if (value !== stage) e.currentTarget.style.backgroundColor = '#FDFDFB'; }}
                onMouseLeave={e => { if (value !== stage) e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                <div style={{ flex: 1, cursor: 'pointer', color: value === stage ? '#5D4A3E' : '#7A7269', fontWeight: value === stage ? 'bold' : 'normal' }} onClick={() => handleSelect(stage)}>
                  {stage}
                </div>
                <button onClick={(e) => { e.stopPropagation(); onDelete(stage); }} style={{ background: 'none', border: 'none', color: '#A05C5C', cursor: 'pointer', padding: '2px 6px', fontSize: '16px', fontWeight: 'bold' }}>×</button>
              </div>
            ))}
          </div>
          <div style={{ padding: '8px', borderTop: '1px solid #EAE6E1', display: 'flex', gap: '4px', backgroundColor: '#FBFBF9' }}>
            <input type="text" placeholder="新增..." value={newVal} onChange={e => setNewVal(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleAdd(e); }} style={{ flex: 1, padding: '6px', border: '1px solid #DED9D3', borderRadius: '4px', fontSize: '14px', outline: 'none' }} />
            <button onClick={handleAdd} disabled={!newVal.trim()} style={{ padding: '6px 12px', backgroundColor: newVal.trim() ? '#5D4A3E' : '#DED9D3', color: '#FFFFFF', border: 'none', borderRadius: '4px', cursor: newVal.trim() ? 'pointer' : 'not-allowed', fontSize: '14px', fontWeight: 'bold' }}>新增</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 2. 主排單表元件
// ==========================================
export function Queue() {
  const navigate = useNavigate();
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  
  const [selectedMonth, setSelectedMonth] = useState<string>('all'); 

  const [stages, setStages] = useState<string[]>(() => {
    const saved = localStorage.getItem('artist_all_stages');
    return saved ? JSON.parse(saved) : INITIAL_STAGES;
  });

  useEffect(() => {
    localStorage.setItem('artist_all_stages', JSON.stringify(stages));
  }, [stages]);

  const fetchQueue = async () => {
    try {
      const res = await fetch('/api/commissions');
      const data = await res.json();
      if (data.success) {
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

  const handleAddStage = (stage: string) => { if (!stages.includes(stage)) setStages(prev => [...prev, stage]); };
  const handleDeleteStage = (stage: string) => { setStages(prev => prev.filter(s => s !== stage)); };

  const availableMonths = Array.from(new Set(commissions.map(c => new Date(c.order_date).toISOString().substring(0, 7)))).sort().reverse();

  const filteredCommissions = commissions.filter(c => {
    if (selectedMonth === 'all') return true;
    return new Date(c.order_date).toISOString().substring(0, 7) === selectedMonth;
  });

  // 字體提升為 15px，維持相同的 padding
  const tdStyle = { padding: '8px 10px', fontSize: '15px', color: '#5D4A3E' }; 

  return (
    <div style={{ padding: '10px 20px', maxWidth: '1200px', margin: '0 auto' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: '0 0 6px 0', color: '#5D4A3E', fontSize: '24px', letterSpacing: '0.5px' }}>工作排單表</h2>
          <div style={{ color: '#A0978D', fontSize: '15px' }}></div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          {isUpdating && <span style={{ backgroundColor: '#FDF4E6', color: '#A67B3E', padding: '4px 10px', borderRadius: '16px', fontSize: '14px', fontWeight: 'bold' }}>儲存中...</span>}
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '15px', color: '#7A7269', fontWeight: 'bold' }}>篩選月份：</span>
            <select 
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #DED9D3', backgroundColor: '#FFFFFF', color: '#5D4A3E', fontSize: '15px', outline: 'none', cursor: 'pointer' }}
            >
              <option value="all">顯示全部未結案</option>
              {availableMonths.map(month => (
                <option key={month} value={month}>{month.replace('-', '年 ')}月</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #EAE6E1', boxShadow: '0 2px 12px rgba(0,0,0,0.03)', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '950px' }}>
          <thead>
            <tr style={{ backgroundColor: '#FBFBF9', borderBottom: '2px solid #EAE6E1', textAlign: 'left', color: '#7A7269', fontSize: '15px' }}>
              <th style={{ padding: '10px', width: '30px', textAlign: 'center' }}>≡</th>
              <th style={{ padding: '10px', width: '90px', fontWeight: 'bold' }}>委託日期</th>
              <th style={{ padding: '10px', width: '160px', fontWeight: 'bold' }}>委託人</th>
              <th style={{ padding: '10px', width: '170px', fontWeight: 'bold' }}>進度狀態</th>
              <th style={{ padding: '10px', width: '140px', fontWeight: 'bold' }}>預計完工</th>
              <th style={{ padding: '10px', width: '110px', fontWeight: 'bold' }}>付款狀態</th>
              <th style={{ padding: '10px', fontWeight: 'bold' }}>備註</th>
              <th style={{ padding: '10px', width: '80px', fontWeight: 'bold', textAlign: 'center' }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {filteredCommissions.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: '#A0978D', fontSize: '15px' }}>這個月份目前沒有排單資料</td></tr>
            ) : (
              filteredCommissions.map((order, index) => {
                const dateStr = new Date(order.order_date).toLocaleDateString(undefined, { month: '2-digit', day: '2-digit' }); 
                const paymentInfo = paymentColors[order.payment_status] || paymentColors['unpaid'];
                const isRush = order.is_rush === '是';

                return (
                  <tr 
                    key={order.id} draggable={activeDragId === order.id} onDragStart={() => setDraggedIndex(index)} onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (draggedIndex === null || draggedIndex === index) return;
                      const newList = [...commissions];
                      const globalIndex = newList.findIndex(c => c.id === filteredCommissions[draggedIndex].id);
                      const targetGlobalIndex = newList.findIndex(c => c.id === order.id);
                      const draggedItem = newList[globalIndex];
                      newList.splice(globalIndex, 1);
                      newList.splice(targetGlobalIndex, 0, draggedItem);
                      setCommissions(newList);
                      setDraggedIndex(null);
                    }}
                    onDragEnd={() => { setDraggedIndex(null); setActiveDragId(null); }}
                    style={{ borderBottom: '1px solid #F0ECE7', backgroundColor: draggedIndex === index ? '#FDFDFB' : '#FFFFFF', transition: 'background-color 0.1s ease' }}
                  >
                    <td onMouseEnter={() => setActiveDragId(order.id)} onMouseLeave={() => setActiveDragId(null)} style={{ ...tdStyle, padding: '8px', cursor: 'grab', color: '#DED9D3', userSelect: 'none', textAlign: 'center' }} title="拖曳以排序">
                      ⠿
                    </td>

                    <td style={{ ...tdStyle, color: '#7A7269', fontFamily: 'monospace' }}>{dateStr}</td>
                    
                    <td style={{ ...tdStyle }}>
                      <div style={{ fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }} title={order.client_name || '外部委託'}>
                        {order.client_name || '外部委託'}
                      </div>
                      <div style={{ fontSize: '12px', color: '#C4BDB5', fontFamily: 'monospace' }}>{order.id.split('-')[1] || order.id}</div>
                    </td>

                    <td style={tdStyle}>
                      <StageDropdown value={order.current_stage || ''} onChange={(newVal) => handleUpdateField(order.id, 'current_stage', newVal)} stages={stages} onAdd={handleAddStage} onDelete={handleDeleteStage} />
                    </td>

                    <td style={tdStyle}>
                      <input 
                        type="date" defaultValue={order.end_date || ''}
                        onBlur={(e) => { if (e.target.value !== order.end_date) handleUpdateField(order.id, 'end_date', e.target.value); }}
                        style={{ padding: '6px 8px', borderRadius: '4px', border: '1px solid #EAE6E1', backgroundColor: 'transparent', color: '#5D4A3E', outline: 'none', fontSize: '14px', width: '100%' }}
                      />
                    </td>

                    <td style={tdStyle}>
                      <select 
                        value={order.payment_status || 'unpaid'}
                        onChange={(e) => handleUpdateField(order.id, 'payment_status', e.target.value)}
                        style={{ padding: '6px 8px', borderRadius: '4px', border: 'none', backgroundColor: paymentInfo.bg, color: paymentInfo.text, fontWeight: 'bold', cursor: 'pointer', outline: 'none', fontSize: '14px', width: '100%' }}
                      >
                        <option value="unpaid">尚未付款</option><option value="partial">已收訂金</option><option value="paid">已收全額</option>
                      </select>
                    </td>

                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {isRush && <span style={{ color: '#A05C5C', fontWeight: 'bold', fontSize: '13px', backgroundColor: '#F5EBEB', padding: '2px 4px', borderRadius: '4px', whiteSpace: 'nowrap' }}>急件</span>}
                        <input 
                          type="text" defaultValue={order.artist_note || ''} placeholder="輸入備註..."
                          onBlur={(e) => { if (e.target.value !== order.artist_note) handleUpdateField(order.id, 'artist_note', e.target.value); }}
                          style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid transparent', backgroundColor: 'transparent', color: '#5D4A3E', outline: 'none', fontSize: '14px' }}
                          onFocus={e => e.currentTarget.style.border = '1px solid #DED9D3'}
                          onMouseLeave={e => e.currentTarget.blur()}
                        />
                      </div>
                    </td>

                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <button 
                          onClick={() => navigate(`/artist/notebook?id=${order.id}`)}
                          style={{ padding: '6px 12px', backgroundColor: '#FBFBF9', color: '#7A7269', border: '1px solid #DED9D3', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', transition: 'all 0.2s', whiteSpace: 'nowrap' }}
                          onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#5D4A3E'; e.currentTarget.style.color = '#FFF'; e.currentTarget.style.borderColor = '#5D4A3E'; }}
                          onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#FBFBF9'; e.currentTarget.style.color = '#7A7269'; e.currentTarget.style.borderColor = '#DED9D3'; }}
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