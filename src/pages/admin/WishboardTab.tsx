// src/pages/admin/WishboardTab.tsx
import { useEffect, useState } from 'react';
import { apiClient } from '../../api/client';
import { KeywordManager } from './components/KeywordManager';
import { AlertCircle, User, Calendar, MessageSquare, ShieldAlert, Clock } from 'lucide-react'; 

export function WishboardTab() {
  const [dataList, setDataList] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [activeCategory, setActiveCategory] = useState<'request' | 'offer'>('request');
  const [activeKeywords, setActiveKeywords] = useState<string[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [, setSelectedBulletinId] = useState<string | null>(null);
  const [reportDetails, setReportDetails] = useState<any[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(false);

  useEffect(() => { 
    fetchPosts(); 
  }, [page, activeCategory]);

  const fetchPosts = async () => {
    try {
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
      fetchPosts(); 
    } catch (e) {
      alert('更新失敗');
    } finally {
      setIsUpdating(false);
    }
  };

  const openReportModal = async (bulletinId: string) => {
    setSelectedBulletinId(bulletinId);
    setIsModalOpen(true);
    setIsLoadingReports(true);
    try {
      const res = await apiClient.get(`/api/admin/wishboard/${bulletinId}/reports`);
      setReportDetails(res.data || []);
    } catch (e) {
      alert('無法讀取檢舉名單');
    } finally {
      setIsLoadingReports(false);
    }
  };

  const checkKeywordTrigger = (content: string) => {
    if (!content) return null;
    const hit = activeKeywords.find(k => content.includes(k));
    return hit;
  };

  const parsePostData = (item: any) => {
    let description = item.content || '無內容';
    let payments = [];
    try {
      const parsedContent = JSON.parse(item.content);
      if (parsedContent.description) description = parsedContent.description;
    } catch {}

    try {
      payments = JSON.parse(item.payment_methods || '[]');
    } catch {}

    return {
      description,
      payments: payments.length > 0 ? payments.join('、') : '未指定',
      budget: item.budget_min === 0 && item.budget_max === 0 ? '依報價討論' : `$${item.budget_min} ~ $${item.budget_max}`,
      schedule: item.schedule_type === 'urgent' ? '🔥 急件' : (item.schedule_type === 'specific' ? '📅 指定日期' : '🕒 時間彈性')
    };
  };

  return (
    <div>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', marginBottom: '24px' }}>✨ 許願池審核與風控</h1>
      
      <KeywordManager onKeywordsChange={setActiveKeywords} />

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
              <th style={{...thStyle, width: '18%'}}>刊登資訊</th>
              <th style={{...thStyle, width: '40%'}}>貼文詳細內容</th>
              <th style={{...thStyle, width: '12%'}}>檢舉次數</th>
              <th style={{...thStyle, width: '15%'}}>目前顯示狀態</th>
              <th style={{...thStyle, width: '15%'}}>審核操作</th>
            </tr>
          </thead>
          <tbody>
            {dataList.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: '#6B7280' }}>目前沒有貼文資料</td></tr>
            ) : dataList.map((item) => {
              const postDetails = parsePostData(item);
              const hitKeyword = checkKeywordTrigger(postDetails.description);
              const isHidden = item.status === 'hidden_under_review';
              const isExpired = new Date(item.expires_at) < new Date();
              
              return (
                <tr key={item.id} style={{ borderBottom: '1px solid #F3F4F6', backgroundColor: isHidden ? '#FEF2F2' : 'transparent' }}>
                  
                  
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 'bold', color: '#111827', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <User size={14} /> {item.author_name}
                    </div>
                    <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>ID: {item.author_public_id || '未知'}</div>
                    <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '6px' }}>
                      發佈: {new Date(item.created_at).toLocaleString()}
                    </div>
                  </td>

                  
                  <td style={{...tdStyle, paddingRight: '24px'}}>
                    {hitKeyword && (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#FEF2F2', color: '#DC2626', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', marginBottom: '8px', border: '1px solid #FCA5A5' }}>
                        <AlertCircle size={14} /> 觸發監控關鍵字: {hitKeyword}
                      </div>
                    )}
                    
                    <div style={{ fontWeight: 'bold', fontSize: '15px', color: '#111827', marginBottom: '8px' }}>
                      {item.title || '無標題'}
                    </div>

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                      <span style={badgeStyle}>💰 {postDetails.budget}</span>
                      <span style={badgeStyle}>⏱️ {postDetails.schedule}</span>
                      <span style={{...badgeStyle, backgroundColor: '#F3F4F6', color: '#4B5563'}}>💳 {postDetails.payments}</span>
                    </div>

                    <div style={{ fontSize: '13px', color: '#374151', lineHeight: '1.6', maxHeight: '100px', overflowY: 'auto', padding: '8px', backgroundColor: '#F9FAFB', borderRadius: '6px', border: '1px solid #E5E7EB' }}>
                      {postDetails.description}
                    </div>
                  </td>

                  
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 'bold', fontSize: '16px', color: item.report_count >= 10 ? '#DC2626' : (item.report_count > 0 ? '#D97706' : '#059669') }}>
                      {item.report_count} 次
                    </div>
                    {item.report_count > 0 && (
                      <button 
                        onClick={() => openReportModal(item.id)}
                        style={{ marginTop: '8px', background: 'none', border: 'none', color: '#2563EB', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
                      >
                        查看檢舉原因
                      </button>
                    )}
                  </td>

                  
                  <td style={tdStyle}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 10px', borderRadius: '99px', fontSize: '12px', fontWeight: 'bold', 
                      backgroundColor: isHidden ? '#FEF2F2' : (isExpired ? '#F3F4F6' : (item.status === 'open' ? '#ECFDF5' : '#F3F4F6')),
                      color: isHidden ? '#DC2626' : (isExpired ? '#6B7280' : (item.status === 'open' ? '#059669' : '#6B7280')),
                      border: `1px solid ${isHidden ? '#FCA5A5' : (isExpired ? '#D1D5DB' : (item.status === 'open' ? '#6EE7B7' : '#D1D5DB'))}`
                    }}>
                      {isHidden ? '🛑 隱藏審核中' : (isExpired ? '⌛ 已到期' : (item.status === 'open' ? '🟢 顯示中' : '⚪ 已關閉'))}
                    </div>
                    
                    <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} /> {new Date(item.expires_at).toLocaleString()}
                    </div>
                  </td>

                  
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {!isHidden ? (
                        <button onClick={() => handleUpdateStatus(item.id, 'hidden_under_review')} disabled={isUpdating} style={{...actionBtnStyle, color: '#DC2626', borderColor: '#DC2626', backgroundColor: '#FFF'}}>
                          強制隱藏貼文
                        </button>
                      ) : (
                        <button onClick={() => handleUpdateStatus(item.id, 'open')} disabled={isUpdating} style={{...actionBtnStyle, color: '#059669', borderColor: '#059669', backgroundColor: '#FFF'}}>
                          顯示 (駁回檢舉)
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

      
      <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#6B7280', fontSize: '14px', padding: '0 8px' }}>
        <span>📊 目前結果共 <b style={{ color: '#111827' }}>{total}</b> 筆資料</span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)} style={{ ...pageBtnStyle, opacity: page === 1 ? 0.5 : 1 }}>上一頁</button>
          <div style={{ padding: '8px 16px', backgroundColor: '#FFF', border: '1px solid #E5E7EB', borderRadius: '8px', fontWeight: 'bold', color: '#2563EB' }}>{page}</div>
          <button disabled={dataList.length < 20} onClick={() => setPage(p => p + 1)} style={{ ...pageBtnStyle, opacity: dataList.length < 20 ? 0.5 : 1 }}>下一頁</button>
        </div>
      </div>

      
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }} onClick={() => setIsModalOpen(false)}>
          <div style={{ backgroundColor: '#FFF', padding: '24px', borderRadius: '12px', width: '90%', maxWidth: '600px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E5E7EB', paddingBottom: '16px', marginBottom: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px', color: '#111827' }}>
                <ShieldAlert size={20} color="#DC2626" /> 檢舉紀錄詳情
              </h2>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#6B7280' }}>✕</button>
            </div>
            
            <div style={{ overflowY: 'auto', flex: 1, paddingRight: '8px' }}>
              {isLoadingReports ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#6B7280' }}>載入中...</div>
              ) : reportDetails.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#6B7280' }}>查無檢舉紀錄</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {reportDetails.map(report => (
                    <div key={report.id} style={{ backgroundColor: '#F9FAFB', padding: '16px', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <div>
                          <div style={{ fontWeight: 'bold', color: '#111827', fontSize: '14px' }}>檢舉人: {report.reporter_name}</div>
                          <div style={{ fontSize: '12px', color: '#6B7280' }}>ID: {report.reporter_public_id} | 角色: {report.reporter_role}</div>
                        </div>
                        <div style={{ fontSize: '12px', color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Calendar size={12} /> {new Date(report.created_at).toLocaleString()}
                        </div>
                      </div>
                      <div style={{ fontSize: '14px', color: '#374151', backgroundColor: '#FFF', padding: '12px', borderRadius: '6px', border: '1px solid #D1D5DB', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                        <MessageSquare size={16} color="#9CA3AF" style={{ marginTop: '2px', flexShrink: 0 }} />
                        <span style={{ lineHeight: '1.5', wordBreak: 'break-word' }}>
                          {report.reason || '無提供原因'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div style={{ marginTop: '24px', textAlign: 'right', borderTop: '1px solid #E5E7EB', paddingTop: '16px' }}>
              <button onClick={() => setIsModalOpen(false)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #D1D5DB', backgroundColor: '#FFF', cursor: 'pointer', fontWeight: 'bold' }}>關閉視窗</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Styles
const thStyle = { padding: '16px', fontSize: '13px', color: '#6B7280', fontWeight: 'bold', borderBottom: '2px solid #E5E7EB' };
const tdStyle = { padding: '20px 16px', fontSize: '14px', verticalAlign: 'top' as const };
const actionBtnStyle = { padding: '8px 12px', borderRadius: '6px', border: '1px solid', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', width: '100%', transition: 'all 0.2s' };
const pageBtnStyle = { padding: '8px 16px', border: '1px solid #E5E7EB', borderRadius: '8px', backgroundColor: '#FFF', cursor: 'pointer', fontWeight: 'bold' };
const tabBtnStyle = { padding: '8px 16px', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' };
const badgeStyle = { fontSize: '12px', padding: '4px 8px', borderRadius: '6px', backgroundColor: '#EEF2FF', color: '#4F46E5', fontWeight: 'bold', border: '1px solid #E0E7FF' };