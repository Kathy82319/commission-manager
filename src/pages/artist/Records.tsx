import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export function Records() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 記錄選取的月份，格式為 '2024-04'
  const [selectedMonth, setSelectedMonth] = useState<string>(''); 
  // 記錄哪些年份被展開
  const [expandedYears, setExpandedYears] = useState<string[]>([]);

  useEffect(() => {
    const fetchRecords = async () => {
      try {
        const res = await fetch('/api/commissions'); 
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
  }, []);

  // 1. 萃取並整理年份與月份結構
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

  // 年份由大到小排序
  const sortedYears = Object.keys(groupedByYear).sort((a, b) => Number(b) - Number(a));
  // 每個年份內的月份也由大到小排序
  sortedYears.forEach(y => groupedByYear[y].sort((a, b) => Number(b) - Number(a)));

  // 展開/收合年份的切換功能
  const toggleYear = (year: string) => {
    setExpandedYears(prev => 
      prev.includes(year) ? prev.filter(y => y !== year) : [...prev, year]
    );
  };

  // 2. 篩選出當前所選月份的訂單
  const currentMonthRecords = records.filter(r => {
    if (!selectedMonth) return false;
    const d = new Date(r.order_date);
    const year = d.getFullYear().toString();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    return `${year}-${month}` === selectedMonth;
  });

  // 3. 計算當月總計金額
  const currentMonthTotal = currentMonthRecords.reduce((sum, r) => sum + (r.total_price || 0), 0);

  // 顯示用的當前月份字串
  const displaySelectedMonth = selectedMonth 
    ? `${selectedMonth.split('-')[0]}年 ${parseInt(selectedMonth.split('-')[1], 10)}月` 
    : '';

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>資料載入中...</div>;

  return (
    <div style={{ padding: '20px', maxWidth: '1100px', margin: '0 auto', display: 'flex', gap: '40px', alignItems: 'flex-start' }}>
      
      {/* 左側：年份與月份手風琴選單 */}
      <div style={{ width: '220px', display: 'flex', flexDirection: 'column', gap: '15px', position: 'sticky', top: '20px' }}>
        <h2 style={{ fontSize: '20px', color: '#333', marginBottom: '5px' }}>
          歷史紀錄
        </h2>
        
        {sortedYears.length === 0 ? (
          <div style={{ color: '#999', fontSize: '14px', padding: '10px 0', borderTop: '2px solid #333' }}>尚無結案紀錄</div>
        ) : (
          <div style={{ borderTop: '2px solid #333', paddingTop: '15px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {sortedYears.map(year => (
              <div key={year} style={{ display: 'flex', flexDirection: 'column' }}>
                
                {/* 年份標題 */}
                <button
                  onClick={() => toggleYear(year)}
                  style={{
                    background: 'none', border: 'none', textAlign: 'left',
                    padding: '0 0 8px 0', fontSize: '18px', fontWeight: 'bold', color: '#333',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                  }}
                >
                  <span style={{ fontSize: '12px', display: 'inline-block', transition: 'transform 0.2s', transform: expandedYears.includes(year) ? 'rotate(0deg)' : 'rotate(-90deg)' }}>
                    ▼
                  </span>
                  {year}年
                </button>
                
                {/* 虛線分隔線 */}
                <div style={{ borderBottom: '1px dashed #ccc', marginBottom: '10px' }}></div>
                
                {/* 該年份底下的月份 */}
                {expandedYears.includes(year) && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingLeft: '18px' }}>
                    {groupedByYear[year].map(month => {
                      const monthKey = `${year}-${month}`;
                      const isActive = selectedMonth === monthKey;
                      return (
                        <button
                          key={monthKey}
                          onClick={() => setSelectedMonth(monthKey)}
                          style={{
                            padding: '10px 16px', textAlign: 'left', border: 'none', borderRadius: '8px',
                            backgroundColor: isActive ? '#333' : 'transparent',
                            color: isActive ? '#fff' : '#666',
                            fontWeight: isActive ? 'bold' : 'normal', cursor: 'pointer', fontSize: '15px',
                            transition: 'all 0.2s ease'
                          }}
                        >
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
      </div>

      {/* 右側：結案清單與小計 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {selectedMonth && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', backgroundColor: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #eee', boxShadow: '0 2px 12px rgba(0,0,0,0.03)' }}>
            <h3 style={{ margin: 0, fontSize: '22px', color: '#333' }}>
              {displaySelectedMonth} 結案明細
            </h3>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '14px', color: '#777', marginBottom: '6px', fontWeight: 'bold' }}>本月小計金額</div>
              <div style={{ fontSize: '28px', fontWeight: '900', color: '#2e7d32' }}>
                NT$ {currentMonthTotal.toLocaleString()}
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {currentMonthRecords.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#999', backgroundColor: '#fafafa', borderRadius: '12px', border: '1px dashed #ddd' }}>
              這個月沒有結案的委託單喔！
            </div>
          ) : (
            currentMonthRecords.map(record => (
              <Link
                key={record.id}
                to={`/artist/notebook?id=${record.id}&tab=details`} // 【修正】直接將訂單 ID 寫入網址
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '24px',
                  backgroundColor: '#fff',
                  borderRadius: '12px',
                  border: '1px solid #eee',
                  textDecoration: 'none',
                  color: 'inherit',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.06)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <span style={{ backgroundColor: '#e8f5e9', color: '#2e7d32', padding: '4px 10px', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold' }}>
                      已結案
                    </span>
                    <span style={{ fontSize: '14px', color: '#888', fontWeight: '500' }}>
                      {new Date(record.order_date).toLocaleDateString()}
                    </span>
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#222' }}>
                    {record.project_name || '未命名委託'}
                  </div>
                  <div style={{ fontSize: '14px', color: '#666' }}>
                    委託人：{record.client_name || '未知'}
                  </div>
                </div>
                
                <div style={{ fontSize: '22px', fontWeight: '900', color: '#1976d2' }}>
                  NT$ {(record.total_price || 0).toLocaleString()}
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}