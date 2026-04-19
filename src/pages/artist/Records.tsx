// src/pages/artist/Records.tsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import '../../styles/Records.css'; // 🌟 引入標準化樣式

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
    <div className="records-page">
      <div className="records-layout">
        
        {/* 左側選單 / 手機版頂部橫向滑動列 */}
        <aside className="records-sidebar">
          <h2 className="sidebar-title">歷史紀錄</h2>
          
          {sortedYears.length === 0 ? (
            <div style={{ color: '#A0978D', fontSize: '14px' }}>尚無資料</div>
          ) : (
            <div className="year-scroll-wrapper">
              {sortedYears.map(year => (
                <div key={year} className="year-group">
                  {/* 年份標籤 */}
                  <button onClick={() => toggleYear(year)} className="year-toggle-btn">
                    <span 
                      className="year-toggle-icon"
                      style={{ transform: expandedYears.includes(year) ? 'rotate(0deg)' : 'rotate(-90deg)' }}
                    >
                      ▼
                    </span>
                    {year}年
                  </button>
                  
                  {/* 月份選單 */}
                  {expandedYears.includes(year) && (
                    <div className="month-list">
                      {groupedByYear[year].map(month => {
                        const monthKey = `${year}-${month}`;
                        return (
                          <button 
                            key={monthKey} 
                            className={`month-chip ${selectedMonth === monthKey ? 'active' : ''}`} 
                            onClick={() => setSelectedMonth(monthKey)}
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
        </aside>

        {/* 右側內容區 */}
        <div className="records-content-area">
          
          {/* 當月統計摘要 */}
          {selectedMonth && (
            <div className="summary-card">
              <div>
                <h3 className="summary-title">{displaySelectedMonth}</h3>
                <div className="summary-subtitle">結案明細統計</div>
              </div>
              <div>
                <div className="summary-label">本月小計營收</div>
                <div className="summary-amount">NT$ {currentMonthTotal.toLocaleString()}</div>
              </div>
            </div>
          )}

          {/* 紀錄列表 */}
          <div className="record-list-container">
            {currentMonthRecords.length === 0 ? (
              <div className="empty-state">
                該月份尚無結案紀錄。
              </div>
            ) : (
              currentMonthRecords.map(record => (
                <Link key={record.id} to={`/artist/notebook?id=${record.id}&tab=details`} className="record-card">
                  
                  <div className="record-info">
                    <div className="record-header-tags">
                      <span className="status-tag">已結案</span>
                      <span className="date-text">{new Date(record.order_date).toLocaleDateString()}</span>
                    </div>
                    
                    <div className="project-title" title={record.project_name || '未命名委託'}>
                      {record.project_name || '未命名委託'}
                    </div>
                    
                    <div className="client-name">
                      委託人：{record.client_name || '未知'}
                    </div>

                    <div className="record-meta">
                      <span>單號：{record.id.split('-')[1] || record.id}</span>
                      {/* 🌟 使用 CSS 類別取代原本的 Tailwind 'hidden md:inline' */}
                      <span className="desktop-only">編號：{record.client_public_id || '未綁定'}</span>
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