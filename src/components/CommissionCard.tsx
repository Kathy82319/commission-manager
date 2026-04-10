// src/components/CommissionCard.tsx
import React from 'react';

interface CommissionCardProps {
  id: string;
  clientName: string;
  totalPrice: number;
  status: string;
  onUpdateStatus: (id: string, newStatus: string) => void; // 接收父層傳遞下來的更新函數
}

export const CommissionCard: React.FC<CommissionCardProps> = ({ 
  id, clientName, totalPrice, status, onUpdateStatus 
}) => {
  
  // 決定下一個狀態的簡單邏輯
  const getNextStatus = (current: string) => {
    if (current === 'pending') return 'sketching';
    if (current === 'sketching') return 'coloring';
    if (current === 'coloring') return 'finished';
    return null;
  };

  const nextStatus = getNextStatus(status);

  return (
    <div style={{
      border: '1px solid #ddd', borderRadius: '8px', padding: '16px',
      marginBottom: '12px', backgroundColor: '#fff',
      boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
    }}>
      <h3 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>{clientName}</h3>
      <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#555' }}>金額：NT$ {totalPrice}</p>
      <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#999' }}>單號：{id}</p>
      
      {/* 如果有下一個狀態，就顯示推進按鈕 */}
      {nextStatus && (
        <button 
          onClick={() => onUpdateStatus(id, nextStatus)}
          style={{
            padding: '6px 12px', backgroundColor: '#007bff', color: 'white',
            border: 'none', borderRadius: '4px', cursor: 'pointer', width: '100%'
          }}
        >
          推進至下一階段 ➔
        </button>
      )}
    </div>
  );
};