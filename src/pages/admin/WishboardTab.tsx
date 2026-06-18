// src/pages/admin/WishboardTab.tsx
import { useEffect, useState } from 'react';
import { apiClient } from '../../api/client';
import { KeywordManager } from './components/KeywordManager';
import { AlertCircle, User, Calendar, MessageSquare, ShieldAlert, Clock, Edit, Inbox, MessageCircle } from 'lucide-react'; 

const formatLocalTime = (dateStr: string) => {
  if (!dateStr) return '未知時間';
  const utcStr = dateStr.includes('Z') ? dateStr : dateStr.replace(' ', 'T') + 'Z';
  return new Date(utcStr).toLocaleString('zh-TW', { hour12: true });
};

const toDatetimeLocal = (dateStr: string) => {
  if (!dateStr) return '';
  const utcStr = dateStr.includes('Z') ? dateStr : dateStr.replace(' ', 'T') + 'Z';
  const d = new Date(utcStr);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

const fromDatetimeLocal = (localStr: string) => {
  const d = new Date(localStr);
  return d.toISOString().replace('T', ' ').slice(0, 19);
};

export function WishboardTab() {
  const [dataList, setDataList] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [activeCategory, setActiveCategory] = useState<'request' | 'offer'>('request');
  const [activeStatus, setActiveStatus] = useState<string>('open');
  const [activeKeywords, setActiveKeywords] = useState<string[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [, setSelectedBulletinId] = useState<string | null>(null);
  const [reportDetails, setReportDetails] = useState<any[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(false);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  useEffect(() => { 
    fetchPosts(); 
  }, [page, activeCategory, activeStatus]);

  const fetchPosts = async () => {
    try {
      const res = await apiClient.get(`/api/admin/wishboard/reported?page=${page}&category=${activeCategory}&status=${activeStatus}`);
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

  const openEditModal = (item: any) => {
    setEditingItem({
      ...item,
      local_expires_at: toDatetimeLocal(item.expires_at)
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    setIsUpdating(true);
    try {
      const dbUtcTime = fromDatetimeLocal(editingItem.local_expires_at);
      await apiClient.patch(`/api/admin/wishboard/${editingItem.id}/status`, { 
        status: editingItem.status,
        expires_at: dbUtcTime
      });
      setIsEditModalOpen(false);
      fetchPosts();
    } catch (e) {
      alert('儲存失敗');
    } finally {
      setIsUpdating(false);
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

      
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid #E5E7EB', paddingBottom: '12px', flexWrap: 'wrap' }}>
        <button 
          onClick={() => { setActiveStatus('open'); setPage(1); }}
          style={{ ...subTabBtnStyle, borderBottom: activeStatus === 'open' ? '2px solid #059669' : '2px solid transparent', color: activeStatus === 'open' ? '#059669' : '#6B7280', fontWeight: activeStatus === 'open' ? 'bold' : 'normal' }}
        >
          🟢 顯示中 (Open)
        </button>
        <button 
          onClick={() => { setActiveStatus('hidden_under_review'); setPage(1); }}
          style={{ ...subTabBtnStyle, borderBottom: activeStatus === 'hidden_under_review' ? '2px solid #DC2626' : '2px solid transparent', color: activeStatus === 'hidden_under_review' ? '#DC2626' : '#6B7280', fontWeight: activeStatus === 'hidden_under_review' ? 'bold' : 'normal' }}
        >
          🛑 檢舉審查中 (Hidden)
        </button>
        <button 
          onClick={() => { setActiveStatus('closed'); setPage(1); }}
          style={{ ...subTabBtnStyle, borderBottom: activeStatus === 'closed' ? '2px solid #4B5563' : '2px solid transparent', color: activeStatus === 'closed' ? '#4B5563' : '#6B7280', fontWeight: activeStatus === 'closed' ? 'bold' : 'normal' }}
        >
          📁 已結案 (Closed)
        </button>
        <button 
          onClick={() => { setActiveStatus('deleted'); setPage(1); }}
          style={{ ...subTabBtnStyle, borderBottom: activeStatus === 'deleted' ? '2px solid #9CA3AF' : '2px solid transparent', color: activeStatus === 'deleted' ? '#9CA3AF' : '#6B7280', fontWeight: activeStatus === 'deleted' ? 'bold' : 'normal' }}
        >
          🗑️ 已刪除 (Deleted)
        </button>
      </div>
      
      <div style={{ backgroundColor: '#FFF', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1100px' }}>
          <thead style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
            <tr>
              <th style={{...thStyle, width: '16%'}}>刊登資訊</th>
              <th style={{...thStyle, width: '36%'}}>貼文詳細內容</th>
              <th style={{...thStyle, width: '12%', textAlign: 'center'}}>總投遞數</th>
              <th style={{...thStyle, width: '12%', textAlign: 'center'}}>轉洽談數</th>
              <th style={{...thStyle, width: '12%'}}>狀態 / 時效</th>
              <th style={{...thStyle, width: '12%'}}>操作</th>
            </tr>
          </thead>
          <tbody>
            {dataList.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#6B7280' }}>此分頁目前沒有任何貼文資料</td></tr>
            ) : dataList.map((item) => {
              const postDetails = parsePostData(item);
              const hitKeyword = checkKeywordTrigger(postDetails.description);
              const isHidden = item.status === 'hidden_under_review';
              const expiresDate = item.expires_at
                ? new Date(item.expires_at.includes('Z') ? item.expires_at : item.expires_at.replace(' ', 'T') + 'Z')
                : null;
              const isExpired = expiresDate ? expiresDate < new Date() : false;
              
              return (
                <tr key={item.id} style={{ borderBottom: '1px solid #F3F4F6', backgroundColor: isHidden ? '#FEF2F2' : 'transparent' }}>
                  
                  
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 'bold', color: '#111827', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <User size={14} /> {item.author_name}
                    </div>
                    <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>@{item.author_public_id || '未知'}</div>
                    <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '6px' }}>
                      發佈: {formatLocalTime(item.created_at)}
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

                  
                  <td style={{ ...tdStyle, textAlign: 'center', verticalAlign: 'middle' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '16px', fontWeight: 'bold', color: '#374151' }}>
                      <Inbox size={16} style={{ color: '#4B5563' }} /> {item.total_inquiry_count || 0} 份
                    </div>
                  </td>

                  
                  <td style={{ ...tdStyle, textAlign: 'center', verticalAlign: 'middle' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '16px', fontWeight: 'bold', color: (item.chat_inquiry_count > 0 ? '#2563EB' : '#6B7280') }}>
                      <MessageCircle size={16} style={{ color: (item.chat_inquiry_count > 0 ? '#3B82F6' : '#9CA3AF') }} /> {item.chat_inquiry_count || 0} 則
                    </div>
                  </td>

                  
                  <td style={tdStyle}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 10px', borderRadius: '99px', fontSize: '11px', fontWeight: 'bold', 
                      backgroundColor: isHidden ? '#FEF2F2' : (isExpired ? '#F3F4F6' : (item.status === 'open' ? '#ECFDF5' : '#F3F4F6')),
                      color: isHidden ? '#DC2626' : (isExpired ? '#6B7280' : (item.status === 'open' ? '#059669' : '#6B7280')),
                      border: `1px solid ${isHidden ? '#FCA5A5' : (isExpired ? '#D1D5DB' : (item.status === 'open' ? '#6EE7B7' : '#D1D5DB'))}`
                    }}>
                      {isHidden ? '🛑 隱藏審核中' : (isExpired ? '⌛ 已到期' : (item.status === 'open' ? '🟢 顯示中' : (item.status === 'closed' ? '⚪ 已關閉' : '⚪ 已刪除')))}
                    </div>
                    
                    <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} /> {formatLocalTime(item.expires_at)}
                    </div>

                    
                    {item.report_count > 0 && (
                      <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px dashed #E5E7EB' }}>
                        <span style={{ fontSize: '12px', color: '#DC2626', fontWeight: 'bold' }}>⚠️ 遭檢舉 {item.report_count} 次</span>
                        <br />
                        <button 
                          onClick={() => openReportModal(item.id)}
                          style={{ background: 'none', border: 'none', color: '#2563EB', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', padding: 0, textDecoration: 'underline', marginTop: '2px' }}
                        >
                          查看檢舉原因
                        </button>
                      </div>
                    )}
                  </td>

                  
                  <td style={{ ...tdStyle, verticalAlign: 'middle' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <button onClick={() => openEditModal(item)} disabled={isUpdating} style={{...actionBtnStyle, color: '#2563EB', borderColor: '#2563EB', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'}}>
                        <Edit size={14} /> 編輯狀態與時間
                      </button>
                      
                      {!isHidden ? (
                        <button onClick={() => handleUpdateStatus(item.id, 'hidden_under_review')} disabled={isUpdating} style={{...actionBtnStyle, color: '#DC2626', borderColor: '#DC2626', backgroundColor: '#FFF'}}>
                          強制隱藏貼文
                        </button>
                      ) : (
                        <button onClick={() => handleUpdateStatus(item.id, 'open')} disabled={isUpdating} style={{...actionBtnStyle, color: '#059669', borderColor: '#059669', backgroundColor: '#FFF'}}>
                          駁回檢舉並恢復
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
                          <Calendar size={12} /> {formatLocalTime(report.created_at)}
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

      
      {isEditModalOpen && editingItem && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }} onClick={() => setIsEditModalOpen(false)}>
          <div style={{ backgroundColor: '#FFF', padding: '24px', borderRadius: '12px', width: '90%', maxWidth: '400px', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E5E7EB', paddingBottom: '16px', marginBottom: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px', color: '#111827' }}>
                <Edit size={20} color="#2563EB" /> 編輯貼文設定
              </h2>
              <button onClick={() => setIsEditModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#6B7280' }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', color: '#374151', marginBottom: '8px' }}>顯示狀態</label>
                <select 
                  value={editingItem.status}
                  onChange={(e) => setEditingItem({...editingItem, status: e.target.value})}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '14px' }}
                >
                  <option value="open">🟢 顯示中 (Open)</option>
                  <option value="hidden_under_review">🛑 隱藏審核中 (Hidden)</option>
                  <option value="closed">⚪ 已關閉 (Closed)</option>
                  <option value="deleted">🗑️ 已刪除 (Deleted)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', color: '#374151', marginBottom: '8px' }}>下架時間</label>
                <input 
                  type="datetime-local" 
                  value={editingItem.local_expires_at}
                  onChange={(e) => setEditingItem({...editingItem, local_expires_at: e.target.value})}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '14px' }}
                />
                <p style={{ fontSize: '12px', color: '#6B7280', marginTop: '6px' }}>
                  前台的倒數計時會直接以此時間為基準進行計算。
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid #E5E7EB', paddingTop: '16px' }}>
              <button onClick={() => setIsEditModalOpen(false)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #D1D5DB', backgroundColor: '#FFF', cursor: 'pointer', fontWeight: 'bold', color: '#374151' }}>取消</button>
              <button onClick={handleSaveEdit} disabled={isUpdating} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', backgroundColor: '#2563EB', cursor: 'pointer', fontWeight: 'bold', color: '#FFF' }}>
                {isUpdating ? '儲存中...' : '確認儲存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const thStyle = { padding: '16px', fontSize: '13px', color: '#6B7280', fontWeight: 'bold', borderBottom: '2px solid #E5E7EB' };
const tdStyle = { padding: '20px 16px', fontSize: '14px', verticalAlign: 'top' as const };
const actionBtnStyle = { padding: '8px 12px', borderRadius: '6px', border: '1px solid', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', width: '100%', transition: 'all 0.2s' };
const pageBtnStyle = { padding: '8px 16px', border: '1px solid #E5E7EB', borderRadius: '8px', backgroundColor: '#FFF', cursor: 'pointer', fontWeight: 'bold' };
const tabBtnStyle = { padding: '8px 16px', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' };
const subTabBtnStyle = { padding: '8px 4px', border: 'none', fontSize: '13px', cursor: 'pointer', backgroundColor: 'transparent', transition: 'all 0.15s', marginRight: '12px' };
const badgeStyle = { fontSize: '12px', padding: '4px 8px', borderRadius: '6px', backgroundColor: '#EEF2FF', color: '#4F46E5', fontWeight: 'bold', border: '1px solid #E0E7FF' };