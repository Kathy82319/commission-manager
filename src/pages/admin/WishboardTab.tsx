// src/pages/admin/WishboardTab.tsx
import { useEffect, useState } from 'react';
import { apiClient } from '../../api/client';
import { KeywordManager } from './components/KeywordManager';

export function WishboardTab() {
  const [dataList, setDataList] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [activeCategory, setActiveCategory] = useState<'request' | 'offer'>('request'); // 🌟 新增：子分頁狀態
  const [activeKeywords, setActiveKeywords] = useState<string[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);

  // 當分頁或分類改變時，重新撈取資料
  useEffect(() => { 
    fetchPosts(); 
  }, [page, activeCategory]);

  const fetchPosts = async () => {
    try {
      // API 路徑加上 category 參數
      const res = await apiClient.get(`/api/admin/wishboard/reported?page=${page}&category=${activeCategory}`);
      setDataList(res.data);
      if (res.pagination) setTotal(res.pagination.total);
    } catch (e) { console.error(e); }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    if (!confirm(`確定要將這篇貼文狀態改為 [${newStatus}] 嗎？`)) return;
    setIsUpdating(true);
    try {
      await apiClient.patch(`/api/admin/wishboard/${id}/status`, { status: newStatus });
      fetchPosts(); // 重新整理清單
    } catch (e) {
      alert('更新失敗');
    } finally {
      setIsUpdating(false);
    }
  };

  // 檢查貼文內容是否觸發關鍵字
  const checkKeywordTrigger = (content: string) => {
    if (!content) return null;
    const hit = activeKeywords.find(k => content.includes(k));
    return hit;
  };

  return (
    <div>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', marginBottom: '24px' }}>✨ 許願池審核與風控</h1>
      
      {/* 關鍵字管理區塊 */}
      <KeywordManager onKeywordsChange={setActiveKeywords} />

      {/* 🌟 子分頁切換按鈕 */}
      <div style={{ display: 'flex', backgroundColor: '#F3F4F6', padding: '4px', borderRadius: '8px', marginBottom: '16px', width: 'fit-content' }}>
        <button 
          onClick={() => { setActiveCategory('request'); setPage(1); }} 
          style={{ ...tabBtnStyle, backgroundColor: activeCategory === 'request' ? '#FFF' : 'transparent', color: activeCategory === 'request' ? '#2563EB' : '#6B7280', boxShadow: activeCategory === 'request' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}
        >
          📢 徵委託列表
        </button>
        <button 
          onClick={() => { setActiveCategory('offer'); setPage(1); }} 
          style={{ ...tabBtnStyle, backgroundColor: activeCategory === 'offer' ? '#FFF' : 'transparent', color: activeCategory === 'offer' ? '#2563EB' : '#6B7280', boxShadow: activeCategory === 'offer' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}
        >
          💼 接委託列表
        </button>
      </div>
      
      <div style={{ backgroundColor: '#FFF', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1000px' }}>
          <thead style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
            <tr>
              <th style={thStyle}>刊登資訊</th>
              <th style={thStyle}>貼文內容與預警</th>
              <th style={thStyle}>檢舉狀況</th>
              <th style={thStyle}>審核操作</th>
            </tr>
          </thead>
          <tbody>
            {dataList.length === 0 ? (
              <tr><td colSpan={4} style={{ textAlign: 'center', padding: '40px', color: '#6B7280' }}>目前沒有貼文資料</td></tr>
            ) : dataList.map((item) => {
              const hitKeyword = checkKeywordTrigger(item.content || '');
              const isHidden = item.status === 'hidden_under_review';
              
              return (
                <tr key={item.id} style={{ borderBottom: '1px solid #F3F4F6', backgroundColor: isHidden ? '#FEF2F2' : 'transparent' }}>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 'bold', color: '#111827' }}>作者: {item.author_name}</div>
                    <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '4px' }}>ID: {item.id.slice(0,8)}...</div>
                    <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>
                      刊登於: {new Date(item.created_at).toLocaleString()}
                    </div>
                  </td>
                  <td style={tdStyle}>
                    {/* 🌟 關鍵字觸發警示 UI */}
                    {hitKeyword && (
                      <div style={{ display: 'inline-block', backgroundColor: '#FEF2F2', color: '#DC2626', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', marginBottom: '8px', border: '1px solid #FCA5A5' }}>
                        ⚠️ 觸發監控關鍵字: {hitKeyword}
                      </div>
                    )}
                    <div style={{ fontSize: '13px', color: '#374151', lineHeight: '1.5', maxHeight: '80px', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                      {/* React 預設會防護 XSS，我們可以直接印出字串 */}
                      {item.content}
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 'bold', color: item.report_count >= 10 ? '#DC2626' : (item.report_count > 0 ? '#D97706' : '#059669') }}>
                      被檢舉次數: {item.report_count}
                    </div>
                    {/* 🌟 顯示最新一筆檢舉原因 */}
                    {item.report_count > 0 && item.latest_report_reason && (
                      <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '6px', backgroundColor: '#F3F4F6', padding: '6px', borderRadius: '6px' }}>
                        <strong>最新原因：</strong><br/>
                        {item.latest_report_reason}
                      </div>
                    )}
                    <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '6px' }}>
                      目前狀態: {isHidden ? '🛑 隱藏審核中' : (item.status === 'open' ? '🟢 顯示中' : '⚪ 已關閉')}
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {/* 🌟 隱藏 / 顯示 操作按鈕 */}
                      {!isHidden ? (
                        <button onClick={() => handleUpdateStatus(item.id, 'hidden_under_review')} disabled={isUpdating} style={{...actionBtnStyle, color: '#DC2626', borderColor: '#FCA5A5', backgroundColor: '#FEF2F2'}}>
                          隱藏貼文
                        </button>
                      ) : (
                        <button onClick={() => handleUpdateStatus(item.id, 'open')} disabled={isUpdating} style={{...actionBtnStyle, color: '#059669', borderColor: '#6EE7B7', backgroundColor: '#ECFDF5'}}>
                          顯示貼文 (駁回檢舉)
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 分頁按鈕 */}
      <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#6B7280', fontSize: '14px', padding: '0 8px' }}>
        <span>📊 目前結果共 <b style={{ color: '#111827' }}>{total}</b> 筆資料</span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)} style={{ ...pageBtnStyle, opacity: page === 1 ? 0.5 : 1 }}>上一頁</button>
          <div style={{ padding: '8px 16px', backgroundColor: '#FFF', border: '1px solid #E5E7EB', borderRadius: '8px', fontWeight: 'bold', color: '#2563EB' }}>{page}</div>
          <button disabled={dataList.length < 20} onClick={() => setPage(p => p + 1)} style={{ ...pageBtnStyle, opacity: dataList.length < 20 ? 0.5 : 1 }}>下一頁</button>
        </div>
      </div>
    </div>
  );
}

// Styles
const thStyle = { padding: '16px', fontSize: '13px', color: '#6B7280', fontWeight: 'bold' };
const tdStyle = { padding: '16px', fontSize: '14px', verticalAlign: 'top' as const };
const actionBtnStyle = { padding: '8px 12px', borderRadius: '6px', border: '1px solid', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', width: '100%', transition: 'all 0.2s' };
const pageBtnStyle = { padding: '8px 16px', border: '1px solid #E5E7EB', borderRadius: '8px', backgroundColor: '#FFF', cursor: 'pointer', fontWeight: 'bold' };
const tabBtnStyle = { padding: '8px 16px', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' };