// src/pages/admin/WishboardTab.tsx
import { useEffect, useState } from 'react';
import { apiClient } from '../../api/client';
import { KeywordManager } from './components/KeywordManager';

export function WishboardTab() {
  const [dataList, setDataList] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [activeKeywords, setActiveKeywords] = useState<string[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => { fetchReportedPosts(); }, [page]);

  const fetchReportedPosts = async () => {
    try {
      const res = await apiClient.get(`/api/admin/wishboard/reported?page=${page}`);
      setDataList(res.data);
      if (res.pagination) setTotal(res.pagination.total);
    } catch (e) { console.error(e); }
  };

  const handleUpdateStatus = async (id: number, newStatus: string) => {
    if (!confirm(`確定要將這篇貼文狀態改為 [${newStatus}] 嗎？`)) return;
    setIsUpdating(true);
    try {
      await apiClient.patch(`/api/admin/wishboard/${id}/status`, { status: newStatus });
      fetchReportedPosts(); // 重新整理清單
    } catch (e) {
      alert('更新失敗');
    } finally {
      setIsUpdating(false);
    }
  };

  const checkKeywordTrigger = (content: string) => {
    if (!content) return null;
    const hit = activeKeywords.find(k => content.includes(k));
    return hit;
  };

  return (
    <div>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', marginBottom: '24px' }}>許願池審核與風控</h1>
      
      {/* 關鍵字管理區塊 */}
      <KeywordManager onKeywordsChange={setActiveKeywords} />

      <h3 style={{ fontSize: '18px', color: '#111827', marginBottom: '16px' }}>🚨 待審核 / 被檢舉貼文隊列</h3>
      
      <div style={{ backgroundColor: '#FFF', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1000px' }}>
          <thead style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
            <tr>
              <th style={thStyle}>貼文資訊</th>
              <th style={thStyle}>內容預覽與預警</th>
              <th style={thStyle}>檢舉狀況</th>
              <th style={thStyle}>審核操作</th>
            </tr>
          </thead>
          <tbody>
            {dataList.length === 0 ? (
              <tr><td colSpan={4} style={{ textAlign: 'center', padding: '40px', color: '#6B7280' }}>目前沒有待審核的貼文 🎉</td></tr>
            ) : dataList.map((item) => {
              const hitKeyword = checkKeywordTrigger(item.content || '');
              
              return (
                <tr key={item.id} style={{ borderBottom: '1px solid #F3F4F6', backgroundColor: item.status === 'hidden_under_review' ? '#FEF2F2' : 'transparent' }}>
                  <td style={tdStyle}>
                    <div style={{ fontSize: '11px', color: '#9CA3AF' }}>貼文 ID: {item.id}</div>
                    <div style={{ fontWeight: 'bold', color: '#111827', marginTop: '4px' }}>
                      {item.type === 'request' ? '📢 徵委託' : '💼 接委託'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>作者: {item.author_name}</div>
                    <div style={{ fontSize: '11px', color: '#9CA3AF' }}>{new Date(item.created_at).toLocaleString()}</div>
                  </td>
                  <td style={tdStyle}>
                    {hitKeyword && (
                      <div style={{ display: 'inline-block', backgroundColor: '#FEF2F2', color: '#DC2626', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', marginBottom: '8px' }}>
                        ⚠️ 觸發監控關鍵字: {hitKeyword}
                      </div>
                    )}
                    <div style={{ fontSize: '13px', color: '#374151', lineHeight: '1.5', maxHeight: '80px', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                      {item.content}
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 'bold', color: item.report_count >= 10 ? '#DC2626' : '#D97706' }}>
                      累積檢舉: {item.report_count} 次
                    </div>
                    <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>
                      目前狀態: {item.status === 'hidden_under_review' ? '🛑 已自動隱藏' : '🟢 顯示中'}
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {item.status !== 'hidden_under_review' ? (
                        <button onClick={() => handleUpdateStatus(item.id, 'hidden_under_review')} disabled={isUpdating} style={{...btnStyle, color: '#DC2626', borderColor: '#FCA5A5', backgroundColor: '#FEF2F2'}}>
                          強制隱藏貼文
                        </button>
                      ) : (
                        <button onClick={() => handleUpdateStatus(item.id, 'active')} disabled={isUpdating} style={{...btnStyle, color: '#059669', borderColor: '#6EE7B7', backgroundColor: '#ECFDF5'}}>
                          駁回檢舉 (恢復顯示)
                        </button>
                      )}
                      {/* 未來可擴充：跳轉到 UsersTab 直接把作者停權 */}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 分頁 */}
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

const thStyle = { padding: '16px', fontSize: '13px', color: '#6B7280', fontWeight: 'bold' };
const tdStyle = { padding: '16px', fontSize: '14px', verticalAlign: 'top' as const };
const btnStyle = { padding: '8px 12px', borderRadius: '6px', border: '1px solid', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', width: '100%' };
const pageBtnStyle = { padding: '8px 16px', border: '1px solid #E5E7EB', borderRadius: '8px', backgroundColor: '#FFF', cursor: 'pointer', fontWeight: 'bold' };