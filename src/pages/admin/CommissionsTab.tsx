import { useEffect, useState } from 'react';
import { apiClient } from '../../api/client';

export function CommissionsTab() {
  const [dataList, setDataList] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => { fetchListData(); }, [page]);

  const fetchListData = async () => {
    try {
      const res = await apiClient.get(`/api/admin/commissions?page=${page}`);
      setDataList(res.data);
      if (res.pagination) setTotal(res.pagination.total);
    } catch (e) { console.error(e); }
  };

  const statusMap: any = {
    'quote_created': '📑 報價已發出',
    'unpaid': '🔴 待支付',
    'in_progress': '🟡 進行中',
    'awaiting_review': '🔵 待驗收',
    'completed': '🟢 已完成',
    'cancelled': '⚪ 已取消'
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '---';
    const d = new Date(dateStr);
    return `${d.getFullYear()}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  return (
    <div>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', marginBottom: '24px' }}>全站委託總覽</h1>
      <div style={{ backgroundColor: '#FFF', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1000px' }}>
          <thead style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
            <tr>
              <th style={thStyle}>委託 ID / 項目名稱</th>
              <th style={thStyle}>繪師</th>
              <th style={thStyle}>金額 / 狀態</th>
              <th style={thStyle}>委託對象 / 綁定日期</th>
            </tr>
          </thead>
          <tbody>
            {dataList.map((item) => (
              <tr key={item.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                <td style={tdStyle}>
                  <div style={{ fontSize: '11px', color: '#9CA3AF' }}># {item.id}</div>
                  <div style={{ fontWeight: 'bold', color: '#111827' }}>{item.project_name || '未命名項目'}</div>
                  <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>建單: {formatDate(item.order_date)}</div>
                </td>
                <td style={tdStyle}>
                  <div style={{ fontWeight: '600' }}>{item.artist_name}</div>
                  
                  <div style={{ fontSize: '11px', color: '#9CA3AF' }}>UID: {item.artist_public_id || item.artist_id?.slice(0, 8)}</div>
                </td>
                <td style={tdStyle}>
                  <div style={{ fontWeight: 'bold', color: '#2563EB', fontSize: '16px' }}>${item.total_price}</div>
                  <div style={{ fontSize: '12px', marginTop: '6px' }}>{statusMap[item.status] || item.status}</div>
                </td>
                <td style={tdStyle}>
                  {item.client_name ? (
                    <div>
                      <div style={{ fontWeight: '600', color: '#059669' }}>👤 {item.client_name}</div>
                      
                      <div style={{ fontSize: '11px', color: '#9CA3AF', marginBottom: '4px' }}>UID: {item.client_public_id || '未知'}</div>
                      <div style={{ fontSize: '11px', color: '#6B7280' }}>綁定日: {formatDate(item.bind_date)}</div>
                    </div>
                  ) : (
                    <div style={{ color: '#9CA3AF', fontSize: '12px', fontStyle: 'italic' }}>🔘 尚未綁定</div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#6B7280', fontSize: '14px', padding: '0 8px' }}>
        <span>📊 目前結果共 <b style={{ color: '#111827' }}>{total}</b> 筆資料</span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)} style={{ ...btnStyle, opacity: page === 1 ? 0.5 : 1 }}>上一頁</button>
          <div style={{ padding: '8px 16px', backgroundColor: '#FFF', border: '1px solid #E5E7EB', borderRadius: '8px', fontWeight: 'bold', color: '#2563EB' }}>{page}</div>
          <button disabled={dataList.length < 20} onClick={() => setPage(p => p + 1)} style={{ ...btnStyle, opacity: dataList.length < 20 ? 0.5 : 1 }}>下一頁</button>
        </div>
      </div>
    </div>
  );
}

const thStyle = { padding: '16px', fontSize: '13px', color: '#6B7280', fontWeight: 'bold' };
const tdStyle = { padding: '16px', fontSize: '14px', verticalAlign: 'top' as const };
const btnStyle = { padding: '8px 16px', border: '1px solid #E5E7EB', borderRadius: '8px', backgroundColor: '#FFF', cursor: 'pointer', fontWeight: 'bold' };