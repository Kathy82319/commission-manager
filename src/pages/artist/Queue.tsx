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
  unpaid: { bg: '#ffebee', text: '#c62828', label: '未付款' },
  partial: { bg: '#fffde7', text: '#fbc02d', label: '已付訂' },
  paid: { bg: '#e8f5e9', text: '#2e7d32', label: '已結清' }
};

// 將原本的 defaultStages 改為初始值常數
const INITIAL_STAGES = [
  '尚未開始',
  '構圖中',
  '待委託人確認',  
  '尚未收款'
];

// ==========================================
// 1. 客製化下拉選單組件 (統一選項管理版)
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
      onChange(trimmed); // 新增後自動選取
      setNewVal('');
      setIsOpen(false);
    }
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative', width: '100%', minWidth: '160px' }}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: '6px 10px',
          border: '1px solid #ccc',
          borderRadius: '4px',
          backgroundColor: '#fff',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          minHeight: '32px'
        }}
      >
        <span style={{ color: value ? '#333' : '#999', fontSize: '13px', fontWeight: value ? '500' : 'normal' }}>
          {value || '選擇或新增...'}
        </span>
        <span style={{ 
          fontSize: '10px', color: '#666', 
          transform: isOpen ? 'rotate(180deg)' : 'none', 
          transition: 'transform 0.2s ease' 
        }}>
          ▼
        </span>
      </div>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          marginTop: '4px',
          backgroundColor: '#fff',
          border: '1px solid #ddd',
          borderRadius: '6px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '300px',
        }}>
          <div style={{ overflowY: 'auto', padding: '6px 0' }}>
            {stages.length === 0 && (
              <div style={{ padding: '8px 12px', color: '#999', fontSize: '12px', textAlign: 'center' }}>
                目前沒有任何選項，請在下方新增
              </div>
            )}
            
            {/* 統一渲染所有選項，並附帶刪除按鈕 */}
            {stages.map(stage => (
              <div
                key={stage}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '4px 8px 4px 12px',
                  fontSize: '13px',
                  backgroundColor: value === stage ? '#e3f2fd' : 'transparent',
                }}
                onMouseEnter={e => { if (value !== stage) e.currentTarget.style.backgroundColor = '#f5f5f5'; }}
                onMouseLeave={e => { if (value !== stage) e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                <div
                  style={{ flex: 1, cursor: 'pointer', padding: '4px 0', color: value === stage ? '#1976d2' : '#333', fontWeight: value === stage ? 'bold' : 'normal' }}
                  onClick={() => handleSelect(stage)}
                >
                  {stage}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(stage);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#d32f2f',
                    cursor: 'pointer',
                    padding: '4px 8px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    borderRadius: '4px',
                  }}
                  title="刪除此選項"
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#ffebee'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          <div style={{
            padding: '10px 8px',
            borderTop: '1px solid #ddd',
            display: 'flex',
            gap: '6px',
            backgroundColor: '#fafafa',
            borderBottomLeftRadius: '6px',
            borderBottomRightRadius: '6px'
          }}>
            <input
              type="text"
              placeholder="新增自訂選項..."
              value={newVal}
              onChange={e => setNewVal(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAdd(e); }}
              style={{
                flex: 1,
                padding: '6px 8px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '13px',
                width: '100%'
              }}
            />
            <button
              onClick={handleAdd}
              disabled={!newVal.trim()}
              style={{
                padding: '6px 12px',
                backgroundColor: newVal.trim() ? '#1976d2' : '#ccc',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: newVal.trim() ? 'pointer' : 'not-allowed',
                fontSize: '13px',
                fontWeight: 'bold',
                transition: 'background-color 0.2s'
              }}
            >
              新增
            </button>
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

  // 初始化統一選項狀態
  const [stages, setStages] = useState<string[]>(() => {
    // 為了避免和上一版的快取衝突，這裡換一個新的 key name
    const saved = localStorage.getItem('artist_all_stages');
    // 如果是第一次載入 (saved 為空)，就載入 INITIAL_STAGES
    return saved ? JSON.parse(saved) : INITIAL_STAGES;
  });

  // 當選項有任何改變(新增或刪除)時，自動更新至 LocalStorage
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

  const handleAddStage = (stage: string) => {
    if (!stages.includes(stage)) {
      setStages(prev => [...prev, stage]);
    }
  };

  const handleDeleteStage = (stage: string) => {
    setStages(prev => prev.filter(s => s !== stage));
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0 }}>工作排單表</h2>
        {isUpdating && <span style={{ color: '#666', fontSize: '14px' }}>儲存中...</span>}
      </div>

      <div style={{ backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f5f5f5', borderBottom: '2px solid #ddd', textAlign: 'left' }}>
              <th style={{ padding: '12px 15px', width: '30px' }}>≡</th>
              <th style={{ padding: '12px 15px' }}>委託日期</th>
              <th style={{ padding: '12px 15px' }}>委託人與單號</th>
              <th style={{ padding: '12px 15px', width: '200px' }}>目前進度</th>
              <th style={{ padding: '12px 15px' }}>預計完工日</th>
              <th style={{ padding: '12px 15px' }}>付款狀態</th>
              <th style={{ padding: '12px 15px' }}>備註</th>
              <th style={{ padding: '12px 15px' }}>操作</th>
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
                const paymentInfo = paymentColors[order.payment_status] || paymentColors['unpaid'];
                const isRush = order.is_rush === '是';

                return (
                  <tr 
                    key={order.id} 
                    draggable={activeDragId === order.id}
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
                    }}
                    onDragEnd={() => {
                      setDraggedIndex(null);
                      setActiveDragId(null);
                    }}
                    style={{ 
                      borderBottom: '1px solid #eee', 
                      backgroundColor: draggedIndex === index ? '#f0f8ff' : '#fff',
                      transition: 'background-color 0.2s'
                    }}
                  >
                    <td 
                      onMouseEnter={() => setActiveDragId(order.id)}
                      onMouseLeave={() => setActiveDragId(null)}
                      style={{ padding: '12px 15px', cursor: 'grab', color: '#ccc', userSelect: 'none' }}
                    >
                      ⠿
                    </td>

                    <td style={{ padding: '12px 15px', color: '#555' }}>{dateStr}</td>
                    
                    <td style={{ padding: '12px 15px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 'bold', color: '#333' }}>
                          {order.client_name || '外部委託'}
                        </span>
                        <span style={{ fontSize: '10px', color: '#a0a0a0', fontFamily: 'monospace', marginTop: '2px' }}>
                          {order.id}
                        </span>
                      </div>
                    </td>

                    {/* 傳入統一管理的 stages 狀態 */}
                    <td style={{ padding: '12px 15px' }}>
                      <StageDropdown 
                        value={order.current_stage || ''}
                        onChange={(newVal) => handleUpdateField(order.id, 'current_stage', newVal)}
                        stages={stages}
                        onAdd={handleAddStage}
                        onDelete={handleDeleteStage}
                      />
                    </td>

                    <td style={{ padding: '12px 15px' }}>
                      <input 
                        type="date" defaultValue={order.end_date || ''}
                        onBlur={(e) => { if (e.target.value !== order.end_date) handleUpdateField(order.id, 'end_date', e.target.value); }}
                        style={{ padding: '6px', borderRadius: '4px', border: '1px solid #ccc' }}
                      />
                    </td>

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

                    <td style={{ padding: '12px 15px' }}>
                      <button 
                          onClick={() => navigate(`/artist/notebook?id=${order.id}`)}
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