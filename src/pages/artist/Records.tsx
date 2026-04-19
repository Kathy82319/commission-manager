// src/pages/artist/Records.tsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export function Records() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 記錄選取的月份，格式為 '2024-04'
  const [selectedMonth, setSelectedMonth] = useState<string>(''); 
  // 記錄哪些年份被展開 (主要用於電腦版)
  const [expandedYears, setExpandedYears] = useState<string[]>([]);

  const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

  useEffect(() => {
    const fetchRecords = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/commissions`, {
          credentials: 'include'
        }); 
        const data = await res.json();
        
        if (data.success || data.data) {
           const orders = data.data || data; 
           
           // 只過濾出已結案的單子
           const completedOrders = orders.filter((o: any) => o.status === 'completed' || o.status === '結案');
           
           // 依照日期排序 (新到舊)
           completedOrders.sort((a: any, b: any) => new Date(b.order_date).getTime() - new Date(a.order_date).getTime());
           
           setRecords(completedOrders);
           
           // 預設選取有資料的最新的月份與年份
           if (completedOrders.length > 0) {
             const firstDate = new Date(completedOrders[0].order_date);
             const firstYear = firstDate.getFullYear().toString();
             const firstMonth = (firstDate.getMonth() + 1).toString().padStart(2, '0');
             
             setSelectedMonth(`${firstYear}-${firstMonth}`);
             setExpandedYears([firstYear]); // 預設展開最新的一年
           }
        }
      } catch (error) {
        console.error("讀取結案紀錄失敗", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecords();
  }, [API_BASE]);

  // 整理年份與月份結構
  const groupedByYear: Record<string, string[]> = {};
  records.forEach(r => {
    const d = new Date(r.order_date);
    const year = d.getFullYear().toString();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    
    if (!groupedByYear[year]) groupedByYear[year] = [];
    if (!groupedByYear[year].includes(month)) {
      groupedByYear[year].push(month);
    }
  });

  const sortedYears = Object.keys(groupedByYear).sort((a, b) => Number(b) - Number(a));
  sortedYears.forEach(y => groupedByYear[y].sort((a, b) => Number(b) - Number(a)));

  const toggleYear = (year: string) => {
    setExpandedYears(prev => 
      prev.includes(year) ? prev.filter(y => y !== year) : [...prev, year]
    );
  };

  // 篩選當前月份
  const currentMonthRecords = records.filter(r => {
    if (!selectedMonth) return false;
    const d = new Date(r.order_date);
    const year = d.getFullYear().toString();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    return `${year}-${month}` === selectedMonth;
  });

  const currentMonthTotal = currentMonthRecords.reduce((sum, r) => sum + (r.total_price || 0), 0);
  const displaySelectedMonth = selectedMonth 
    ? `${selectedMonth.split('-')[0]}年 ${parseInt(selectedMonth.split('-')[1], 10)}月` 
    : '';

  if (loading) return <div style={{ padding: '80px', textAlign: 'center', color: '#A0978D' }}>讀取紀錄中...</div>;

  return (
    <div style={{ padding: '0 16px', maxWidth: '1100px', margin: '0 auto' }}>
      
      <style>{`
        .records-layout { display: flex; flex-direction: column; gap: 24px; padding: 20px 0; }
        .records-sidebar { width: 100%; display: flex; flex-direction: column; gap: 12px; }
        .year-scroll-wrapper { display: flex; overflow-x: auto; gap: 8px; padding-bottom: 10px; scrollbar-width: none; }
        .year-scroll-wrapper::-webkit-scrollbar { display: none; }
        .month-chip { white-space: nowrap; padding: 8px 16px; border-radius: 20px; border: 1px solid #DED9D3; background: #FFF; color: #7A7269; font-size: 14px; cursor: pointer; }
        .month-chip.active { background: #5D4A3E; color: #FFF; border-color: #5D4A3E; font-weight: bold; }
        
        .record-card { display: flex; justify-content: space-between; align-items: center; padding: 20px; background: #FFF; border-radius: 16px; border: 1px solid #EAE6E1; transition: all 0.2s; text-decoration: none; color: inherit; }
        .record-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        .price-text { font-size: 20px; font-weight: 900; color: #4E7A5A; }

        @media (min-width: 768px) {
          .records-layout { flex-direction: row; align-items: flex-start; }
          .records-sidebar { width: 220px; position: sticky; top: 20px; }
          .year-scroll-wrapper { flex-direction: column; overflow-x: visible; border-top: 2px solid #5D4A3E; padding-top: 15px; }
          .month-chip { border: none; border-radius: 8px; text-align: left; }
          .month-chip.active { background: #F4F0EB; color: #5D4A3E; }
        }
      `}</style>

      <div className="records-layout">
        
        {/* 左側選單 (手機版置頂) */}
        <aside className="records-sidebar">
          <h2 style={{ fontSize: '20px', color: '#5D4A3E', margin: '0 0 10px 0' }}>歷史紀錄</h2>
          
          {sortedYears.length === 0 ? (
            <div style={{ color: '#A0978D', fontSize: '14px' }}>尚無資料</div>
          ) : (
            <div className="year-scroll-wrapper">
              {sortedYears.map(year => (
                <div key={year} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {/* 年份標籤 */}
                  <button onClick={() => toggleYear(year)} style={{ background: 'none', border: 'none', textAlign: 'left', padding: '8px 0', fontSize: '16px', fontWeight: 'bold', color: '#5D4A3E', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '10px', transition: 'transform 0.2s', transform: expandedYears.includes(year) ? 'rotate(0deg)' : 'rotate(-90deg)' }}>▼</span>
                    {year}年
                  </button>
                  
                  {/* 月份選單 */}
                  {expandedYears.includes(year) && (
                    <div style={{ display: 'flex', gap: '6px' }} className="md:flex-col md:pl-4">
                      {groupedByYear[year].map(month => {
                        const monthKey = `${year}-${month}`;
                        return (
                          <button key={monthKey} className={`month-chip ${selectedMonth === monthKey ? 'active' : ''}`} onClick={() => setSelectedMonth(monthKey)}>
                            {parseInt(month, 10)}月
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </aside>

        {/* 右側內容區 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* 當月統計摘要 */}
          {selectedMonth && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF', padding: '24px', borderRadius: '16px', border: '1px solid #EAE6E1', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', color: '#5D4A3E' }}>{displaySelectedMonth}</h3>
                <div style={{ fontSize: '13px', color: '#A0978D', marginTop: '4px' }}>結案明細統計</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '12px', color: '#7A7269', fontWeight: 'bold', marginBottom: '2px' }}>本月小計營收</div>
                <div style={{ fontSize: '26px', fontWeight: '900', color: '#4E7A5A' }}>NT$ {currentMonthTotal.toLocaleString()}</div>
              </div>
            </div>
          )}

          {/* 紀錄列表 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {currentMonthRecords.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px', color: '#A0978D', background: '#FBFBF9', borderRadius: '16px', border: '1px dashed #DED9D3' }}>
                該月份尚無結案紀錄。
              </div>
            ) : (
              currentMonthRecords.map(record => (
                <Link key={record.id} to={`/artist/notebook?id=${record.id}&tab=details`} className="record-card">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{ backgroundColor: '#E8F3EB', color: '#4E7A5A', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold' }}>已結案</span>
                      <span style={{ fontSize: '12px', color: '#A0978D' }}>{new Date(record.order_date).toLocaleDateString()}</span>
                    </div>
                    
                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#5D4A3E', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {record.project_name || '未命名委託'}
                    </div>
                    
                    <div style={{ fontSize: '13px', color: '#7A7269' }}>
                      委託人：{record.client_name || '未知'}
                    </div>

                    <div style={{ fontSize: '11px', color: '#C4BDB5', display: 'flex', gap: '12px', marginTop: '2px' }}>
                      <span>單號：{record.id.split('-')[1] || record.id}</span>
                      <span className="hidden md:inline">編號：{record.client_public_id || '未綁定'}</span>
                    </div>
                  </div>
                  
                  <div className="price-text">
                    ${(record.total_price || 0).toLocaleString()}
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}