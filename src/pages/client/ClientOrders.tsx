// src/pages/client/ClientOrders.tsx
import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import DOMPurify from 'dompurify';
import '../../styles/Notebook.css'; 

interface CommissionDetail {
  id: string; status: string; type_name?: string; project_name: string; client_custom_title?: string;
  total_price: number; draw_scope: string; char_count: number; bg_type: string; add_ons: string;
  detailed_settings: string; agreed_tos_snapshot: string; delivery_method: string; 
  usage_type?: string; is_rush?: string | number;
  pending_changes?: string; latest_message_at?: string; last_read_at_client?: string;
  artist_settings?: string; current_stage: string; workflow_mode: string; order_date: string;
  client_id?: string; 
  origin_source?: string;
}

interface Submission { id: string; stage: string; file_url: string; version: number; created_at: string; }
interface ActionLog { id: string; actor_role: string; content: string; created_at: string; }

// 強健的時間轉換處理
const ensureUTC = (dateStr?: string) => {
  if (!dateStr) return '';
  let str = dateStr.trim();
  if (!str.includes('T')) str = str.replace(' ', 'T');
  if (!str.endsWith('Z') && !str.includes('+')) {
    str += 'Z';
  }
  return str;
};

const formatLocalTime = (dateStr: string) => {
  if (!dateStr) return '';
  return new Date(ensureUTC(dateStr)).toLocaleString('zh-TW', { 
    hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
};

const formatLocalDate = (dateStr: string) => {
  if (!dateStr) return '';
  return new Date(ensureUTC(dateStr)).toLocaleDateString('zh-TW');
};

const parseTime = (dateStr?: string) => {
  if (!dateStr) return 0;
  return new Date(ensureUTC(dateStr)).getTime();
};

const getBulletinSource = (order?: CommissionDetail) => {
  if (!order || !order.origin_source) return null;
  try {
    const parsed = JSON.parse(order.origin_source);
    if (parsed.source_type === 'bulletin') return parsed;
  } catch (e) {
    return null;
  }
  return null;
};

export function ClientOrders() {
  const navigate = useNavigate();
  const location = useLocation();
  const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || '';
  
  const queryParams = new URLSearchParams(location.search);
  const initialSelectedId = queryParams.get('open') || queryParams.get('id');

  const [orders, setOrders] = useState<CommissionDetail[]>([]);
  const [filter, setFilter] = useState<'all' | 'working' | 'completed'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isListLoading, setIsListLoading] = useState(true);

  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId);
  const [activeTab, setActiveTab] = useState<'main' | 'review' | 'history'>('main');
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [logs, setLogs] = useState<ActionLog[]>([]);
  
  const [customTitle, setCustomTitle] = useState('');
  const [, setSavedTitle] = useState(''); 
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success'>('idle');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [isTrajectoryExpanded, setIsTrajectoryExpanded] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedId) params.set('open', selectedId);
    navigate(`?${params.toString()}`, { replace: true });
  }, [selectedId, navigate]);

  const fetchOrders = async () => {
    try {
      const [res, meRes] = await Promise.all([
        fetch(`${API_BASE}/api/commissions`, { credentials: 'include' }),
        fetch(`${API_BASE}/api/users/me`, { credentials: 'include' })
      ]);
      const data = await res.json();
      const meData = await meRes.json();
      const myId = meData.data?.id;

      if (data.success) {
        const validOrders = data.data.filter((o: CommissionDetail) => 
          o.status !== 'quote_created' && 
          o.status !== 'pending' &&
          o.client_id === myId 
        );
        setOrders(validOrders);
        
        if (initialSelectedId) {
          const isValidTarget = validOrders.find((o: CommissionDetail) => o.id === initialSelectedId);
          if (isValidTarget) {
            fetchDetailData(initialSelectedId, validOrders);
          } else {
            setSelectedId(null);
          }
        }
      }
    } catch (e) {} finally { setIsListLoading(false); }
  };

  useEffect(() => { fetchOrders(); }, []);

  const fetchDetailData = async (targetId: string, currentOrders: CommissionDetail[] = orders) => {
    try {
      const detailRes = await fetch(`${API_BASE}/api/commissions/${targetId}`, { credentials: 'include' });
      const detailData = await detailRes.json();
      
      let orderData = currentOrders.find(o => o.id === targetId);
      if (detailData.success) {
        orderData = detailData.data;
        setOrders(prev => prev.map(o => o.id === targetId ? detailData.data : o));
      }

      if (!orderData) return;

      setCustomTitle(orderData.client_custom_title || '');
      setSavedTitle(orderData.client_custom_title || '');
      setIsTrajectoryExpanded(false);

      const [subRes, logRes] = await Promise.all([
        fetch(`${API_BASE}/api/commissions/${targetId}/submissions`, { credentials: 'include' }),
        fetch(`${API_BASE}/api/commissions/${targetId}/logs`, { credentials: 'include' })
      ]);

      const fetchedSubmissions: Submission[] = (await subRes.json()).data || [];
      let fetchedLogs: ActionLog[] = (await logRes.json()).data || [];

      const subStages = fetchedSubmissions.map(s => s.stage);
      const logContents = fetchedLogs.map(l => l.content).join(' | ');
      let needRefetchLogs = false;

      const stagesToCheck = [{ key: 'sketch', name: '草稿' }, { key: 'lineart', name: '線稿' }];

      for (const stage of stagesToCheck) {
        if (subStages.includes(stage.key) && !logContents.includes(`已閱覽 ${stage.name}`)) {
          needRefetchLogs = true;
          try {
            await fetch(`${API_BASE}/api/commissions/${targetId}/review`, {
              method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ stage: stage.key, action: 'read_only' }) 
            });
          } catch(e) {}
        }
      }

      if (needRefetchLogs) {
        const logRes2 = await fetch(`${API_BASE}/api/commissions/${targetId}/logs`, { credentials: 'include' });
        fetchedLogs = (await logRes2.json()).data || [];
      }

      const syntheticLogs: ActionLog[] = [];
      if (orderData.order_date) {
        syntheticLogs.push({ id: 'sys-init', actor_role: 'artist', content: '建立委託單', created_at: orderData.order_date });
        if (orderData.status !== 'quote_created' && orderData.status !== 'pending') {
          const agreeTime = new Date(parseTime(orderData.order_date) + 1000).toISOString();
          syntheticLogs.push({ id: 'sys-agree', actor_role: 'client', content: '同意委託協議並簽署合約', created_at: agreeTime });
        }
      }

      const allLogs = [...fetchedLogs, ...syntheticLogs].sort((a, b) => parseTime(b.created_at) - parseTime(a.created_at));
      
      setSubmissions(fetchedSubmissions);
      setLogs(allLogs);

    } catch (error) {}
  };

  const handleSelect = (orderId: string) => {
    setSelectedId(orderId);
    fetchDetailData(orderId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleReviewChange = async (action: 'approve' | 'reject') => {
    if (!selectedId) return;
    try {
      const res = await fetch(`${API_BASE}/api/commissions/${selectedId}/change-response`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      if ((await res.json()).success) {
        alert(action === 'approve' ? '已同意內容異動' : '已拒絕內容異動');
        fetchOrders(); fetchDetailData(selectedId);
      }
    } catch (error) {}
  };

  const handleSaveTitle = async () => {
    if (!selectedId || saveStatus === 'saving') return;
    setSaveStatus('saving');
    try {
      const res = await fetch(`${API_BASE}/api/commissions/${selectedId}`, {
        method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_custom_title: customTitle })
      });
      if ((await res.json()).success) {
        setSavedTitle(customTitle); setSaveStatus('success'); setTimeout(() => setSaveStatus('idle'), 2000); 
      } else setSaveStatus('idle');
    } catch (error) { setSaveStatus('idle'); }
  };

  const handleReview = async (stageKey: string, action: 'approve' | 'reject') => {
    if (!selectedId) return;
    let comment = '';
    if (action === 'reject') {
      comment = window.prompt("請輸入需要修改的意見：") || '';
      if (!comment.trim()) return alert("必須輸入意見才能退回。");
    } else {
      if (!window.confirm('⚠️ 注意：同意此完稿後將立即結案，並解鎖無浮水印原檔下載。\n\n確定要同意嗎？')) return;
    }
    setIsProcessing(true);
    try {
      const res = await fetch(`${API_BASE}/api/commissions/${selectedId}/review`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: stageKey, action, comment })
      });
      if ((await res.json()).success) { alert("已送出回覆！"); fetchOrders(); fetchDetailData(selectedId); } else alert("操作失敗");
    } catch (e) { alert("發生錯誤"); } finally { setIsProcessing(false); }
  };

  const handleDownloadOriginal = async (fileUrlString: string) => {
    if (!selectedId) return;
    setIsProcessing(true);
    try {
      const parts = fileUrlString.split('|');
      const privatePath = parts.length > 1 ? parts[1] : null;

      if (!privatePath) {
        alert("找不到原檔路徑，可能檔案格式有誤或為舊版檔案。");
        setIsProcessing(false);
        return;
      }

      const res = await fetch(`${API_BASE}/api/r2/download-url`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commissionId: selectedId, fileName: privatePath, bucketType: 'private' })
      });
      const data = await res.json();
      if (data.success) window.location.href = data.downloadUrl; else alert('無法下載：' + data.error);
    } catch (e) { 
      alert("網路連線錯誤"); 
    } finally { 
      setIsProcessing(false); 
    }
  };

  const getLatestSubmissions = () => {
    const latest: Record<string, Submission> = {};
    submissions.forEach(sub => { if (!latest[sub.stage] || sub.version > latest[sub.stage].version) latest[sub.stage] = sub; });
    return latest;
  };

  const selectedOrder = orders.find(o => o.id === selectedId);

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      if (filter === 'completed' && order.status !== 'completed') return false;
      if (filter === 'working' && (order.status === 'completed' || order.status === 'cancelled')) return false;
      if (searchTerm.trim().length >= 2) {
        const term = searchTerm.toLowerCase();
        return ((order.project_name && order.project_name.toLowerCase().includes(term)) || (order.client_custom_title && order.client_custom_title.toLowerCase().includes(term)) || (order.id.toLowerCase().includes(term)));
      }
      return true;
    });
  }, [orders, filter, searchTerm]);

  // 🌟 使用 Notebook.css 的 badge 標籤樣式
  const getStatusDisplay = (status: string, stage: string) => {
    if (status === 'completed') return <span className="card-tag badge-completed">已結案</span>;
    if (status === 'cancelled') return <span className="card-tag badge-cancelled">作廢</span>;
    if (stage.includes('reviewing')) return <span className="card-tag badge-new-msg">待審閱</span>;
    return <span className="card-tag badge-queue">安排中</span>;
  };

  // 🌟 替換為 Notebook.css 的 Stage Box 樣式
  const renderClientStageBox = (title: string, stageKey: string, isReviewing: boolean, isPassed: boolean) => {
    const sub = getLatestSubmissions()[stageKey];
    const isFinal = stageKey === 'final';
    let statusText = isPassed ? (isFinal ? '[完成] 已同意，合約結案' : '[完成] 繪師已推進下一階段') : (isReviewing ? '[等待] 繪師已交付，請過目' : '[尚未交付]');
    
    let headerClass = 'stage-pending';
    if (!sub) headerClass = 'stage-empty';
    else if (isPassed) headerClass = 'stage-passed';
    else if (isReviewing) headerClass = 'stage-reviewing';

    return (
      <div className="stage-box">
        <div className={`stage-box-header ${headerClass}`}>
          <span>{title}</span> <span className="stage-status">{statusText}</span>
        </div>
        <div className="stage-box-content" style={{ textAlign: 'center' }}>
          {!sub ? <div className="stage-loading" style={{ color: '#A0978D' }}>繪師尚未上傳此階段稿件</div> : (
            <div>
               <div style={{ fontSize: '13px', color: '#A0978D', marginBottom: '12px', textAlign: 'left' }}>最後更新：{formatLocalTime(sub.created_at)} (v{sub.version})</div>
               
               <div style={{ border: '1px solid #EAE6E1', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#FBFBF9', maxWidth: '100%', margin: '0 auto', display: 'flex', justifyContent: 'center' }}>
                 <img src={sub.file_url.split('|')[0]} alt="稿件預覽" style={{ width: '100%', maxWidth: '400px', maxHeight: '400px', objectFit: 'contain', display: 'block' }} />
               </div>

               <div style={{ marginTop: '20px', display: 'flex', gap: '12px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                 {isReviewing && !isFinal && (<div style={{ flex: '1 1 100%', fontSize: '13px', color: '#7A7269', fontWeight: 'bold', textAlign: 'right' }}>👀 本階段請過目即可，系統自動為您標記閱覽，繪師後續將推進至下一階段。</div>)}
                 {isReviewing && isFinal && (
                   <>
                     <div className="stage-notice" style={{ flex: '1 1 100%', textAlign: 'center' }}>⚠️ 同意後將結案並解鎖原檔下載。</div>
                     <button onClick={() => handleReview(stageKey, 'reject')} disabled={isProcessing} className="action-btn btn-outline-danger">退回修改</button>
                     <button onClick={() => handleReview(stageKey, 'approve')} disabled={isProcessing} className="action-btn btn-success">✓ 同意完稿</button>
                   </>
                 )}
                 {isPassed && isFinal && selectedOrder?.status === 'completed' && (
                   <button onClick={() => handleDownloadOriginal(sub.file_url)} disabled={isProcessing} className="action-btn btn-primary" style={{ width: '100%', padding: '14px', fontSize: '15px' }}>
                     {isProcessing ? '⏳ 正在獲取安全連結...' : '⬇️ 下載無浮水印原檔 (限時安全連結)'}
                   </button>
                 )}
               </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  let parsedChanges: Record<string, string> | null = null;
  if (selectedOrder?.pending_changes) {
    try {
      const parsed = typeof selectedOrder.pending_changes === 'string' ? JSON.parse(selectedOrder.pending_changes) : selectedOrder.pending_changes;
      if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) parsedChanges = parsed;
    } catch (e) {}
  }

  const fieldMap: Record<string, string> = { usage_type: '委託用途', is_rush: '急件', delivery_method: '交稿方式', total_price: '總金額', draw_scope: '繪畫範圍', char_count: '人物數量', bg_type: '背景設定', add_ons: '附加選項' };

  let finalTosHtml = '';
  if (selectedOrder?.agreed_tos_snapshot) finalTosHtml = selectedOrder.agreed_tos_snapshot;
  else if (selectedOrder?.artist_settings) { try { finalTosHtml = JSON.parse(selectedOrder.artist_settings).rules || ''; } catch(e) {} }

  return (
    <div className="notebook-page">
      {/* ⚠️ 異動申請彈窗 */}
      {parsedChanges && (
        <div className="lightbox-overlay" style={{ alignItems: 'center' }}>
          <div className="section-card" style={{ maxWidth: '500px', width: '90%', zIndex: 100000, position: 'relative' }}>
            <h3 style={{ color: '#A05C5C', marginTop: 0, fontSize: '18px', fontWeight: 'bold' }}>⚠️ 繪師提出了規格異動申請</h3>
            <p style={{ color: '#7A7269', fontSize: '14px', marginBottom: '12px' }}>繪師希望調整委託單內容，請確認以下項目：</p>
            <div style={{ backgroundColor: '#FAFAFA', padding: '16px', borderRadius: '12px', fontSize: '14px', color: '#5D4A3E', marginBottom: '24px', maxHeight: '200px', overflowY: 'auto', border: '1px solid #EAE6E1' }}>
              {Object.keys(parsedChanges).map(key => (<div key={key} style={{ marginBottom: '6px' }}><span style={{ fontWeight: 'bold' }}>• {fieldMap[key] || key}：</span><span>{parsedChanges![key]}</span></div>))}
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => handleReviewChange('reject')} className="action-btn btn-outline-danger">拒絕修改</button>
              <button onClick={() => handleReviewChange('approve')} className="action-btn btn-success">同意並更新合約</button>
            </div>
          </div>
        </div>
      )}

      <div className="notebook-container">
        
        {/* 🌟 左側列表區 (套用 Notebook.css) */}
        <div className={`notebook-sidebar ${selectedId ? 'mobile-hide' : ''}`}>
          <div className="sidebar-header">
            <span className="sidebar-title">委託單列表</span>
            <div className="sidebar-controls">
              <input 
                type="text" 
                className="form-input sidebar-search-input" 
                placeholder="🔍 搜尋暱稱/單號..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
              />
              <select 
                className="form-input sidebar-filter" 
                value={filter} 
                onChange={e => setFilter(e.target.value as any)}
              >
                <option value="all">全部</option>
                <option value="working">進行中</option>
                <option value="completed">已結單</option>
              </select>
            </div>
          </div>

          <div className="sidebar-list-container">
            {isListLoading ? <div className="sidebar-empty">載入中...</div> : filteredOrders.length === 0 ? <div className="sidebar-empty">沒有符合條件的委託單</div> : (
              filteredOrders.map(order => {
                const isSelected = selectedId === order.id;
                const isBulletin = getBulletinSource(order) !== null;

                return (
                  <div key={order.id} onClick={() => handleSelect(order.id)} className={`sidebar-card ${isSelected ? 'selected' : ''} ${order.status === 'cancelled' ? 'cancelled' : ''}`}>
                    <div className="card-meta-row">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span>{formatLocalDate(order.order_date)}</span>
                        {isBulletin && (
                          <span className="card-mode-badge" style={{ backgroundColor: '#8b5cf6', color: '#fff' }}>許願池</span>
                        )}
                      </div>
                      {(order.is_rush === '是' || order.is_rush === 1 || order.is_rush === '1') && (<span className="card-tag badge-new-msg">🔥 急件</span>)}
                    </div>
                    
                    <div className="card-title-row">
                      <span className="card-client-name" title={order.client_custom_title || order.project_name || '未命名項目'}>
                        {order.client_custom_title || order.project_name || '未命名項目'}
                      </span>
                      <span className="card-price">NT$ {order.total_price}</span>
                    </div>
                    
                    <div className="card-info-row">
                      <span style={{ fontFamily: 'monospace' }}>單號：{order.id}</span>
                    </div>

                    <div className="card-tags-row">
                      {getStatusDisplay(order.status, order.current_stage)}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 🌟 右側主內容區 (套用 Notebook.css) */}
        <div className={`notebook-main ${!selectedId ? 'mobile-hide' : ''}`}>
          {!selectedOrder ? <div className="main-empty">請從列表選擇一張委託單以檢視詳情</div> : (
            <div className="main-content-wrapper">
              
              <div className="main-header">
                <div className="main-header-info">
                  <button className="mobile-back-btn" onClick={() => setSelectedId(null)}>⬅ 返回列表</button>
                  <h2 className="main-title">{selectedOrder.client_custom_title || selectedOrder.project_name || '未命名項目'}</h2>
                  
                  <div className="main-subtitle" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    繪師項目名：{selectedOrder.project_name || '無'}
                    {getBulletinSource(selectedOrder) && (
                      <span className="card-mode-badge" style={{ backgroundColor: '#8b5cf6', color: '#fff' }}>來源：許願池</span>
                    )}
                  </div>
                  
                  <div className="main-meta-row">
                    <span>單號：{selectedOrder.id}</span>
                  </div>
                </div>
                
                <div className="main-header-actions">
                  <button 
                    onClick={() => {
                      fetch(`${API_BASE}/api/commissions/${selectedOrder.id}`, {
                        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
                        body: JSON.stringify({ last_read_at_client: new Date().toISOString() })
                      });
                      navigate(`/workspace/${selectedOrder.id}`);
                    }} 
                    className="action-btn btn-primary"
                  >
                    進入聊天室
                  </button>
                </div>
              </div>

              <div className="scroll-tabs">
                <button className={`tab-btn ${activeTab === 'main' ? 'active' : ''}`} onClick={() => setActiveTab('main')}>
                  詳細內容
                </button>
                <button className={`tab-btn ${activeTab === 'review' ? 'active' : ''}`} onClick={() => setActiveTab('review')}>
                  稿件審閱
                </button>
                <button className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
                  歷程紀錄
                </button>
              </div>

              <div className="tab-content-area">
                
                {/* === 詳細內容 Tab === */}
                {activeTab === 'main' && (
                  <div className="tab-details-container" style={{ maxWidth: '800px', margin: '0 auto' }}>
                    
                    {/* 許願池媒合軌跡 */}
                    {getBulletinSource(selectedOrder) && (
                      <div className="section-card" style={{ cursor: 'pointer' }} onClick={() => setIsTrajectoryExpanded(!isTrajectoryExpanded)}>
                        <h3 className="section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #EAE6E1', paddingBottom: '8px', marginBottom: '12px' }}>
                          <span>🔍 許願池媒合軌跡</span>
                          <span style={{ fontSize: '11px', color: '#A0978D', fontWeight: 'normal' }}>
                            {isTrajectoryExpanded ? '▲ 收合軌跡' : '▼ 展開軌跡'}
                          </span>
                        </h3>
                        <div className={isTrajectoryExpanded ? "" : "line-clamp-3"} style={{ fontSize: '13px', color: '#5D4A3E', lineHeight: '1.6' }}>
                          <p style={{ margin: '0 0 10px 0' }}><strong>1. 原始許願內容：</strong><br/>
                            {getBulletinSource(selectedOrder).bulletin_content}
                          </p>
                          <p style={{ margin: '0 0 10px 0' }}><strong>2. 繪師提問單範本：</strong><br/>
                            {getBulletinSource(selectedOrder).artist_initial_snapshot?.question_template || "無提問單"}
                          </p>
                          <p style={{ margin: 0 }}><strong>3. 我的初始回覆：</strong><br/>
                            {getBulletinSource(selectedOrder).client_initial_response || "無回覆內容"}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* 自訂名稱 */}
                    <div className="section-card">
                      <div className="section-header-no-border">
                        <h3 className="section-title">自訂委託名稱 (僅您可見)</h3>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <input type="text" className="form-input" value={customTitle} onChange={(e) => setCustomTitle(e.target.value)} placeholder="給這張單取個好記的名字..." style={{ flex: 1, minWidth: '200px' }} />
                        <button onClick={handleSaveTitle} disabled={saveStatus !== 'idle'} className="action-btn btn-primary" style={{ flex: 'none', width: 'auto' }}>
                          {saveStatus === 'saving' ? '⏳ 儲存中...' : saveStatus === 'success' ? '✅ 成功' : '儲存'}
                        </button>
                      </div>
                    </div>

                    {/* 委託規格 */}
                    <div className="section-card">
                      <h3 className="section-title" style={{ marginBottom: '16px', borderBottom: '1px solid #EAE6E1', paddingBottom: '12px' }}>委託規格</h3>
                      <div className="details-grid">
                        <div className="request-field"><span className="field-label">委託用途：</span><span className="field-value">{selectedOrder.usage_type || '未提供'}</span></div>
                        <div className="request-field"><span className="field-label">是否急件：</span><span className="field-value">{selectedOrder.is_rush === '是' || selectedOrder.is_rush === '1' || selectedOrder.is_rush === 1 ? '是' : '否'}</span></div>
                        <div className="request-field"><span className="field-label">交稿方式：</span><span className="field-value">{selectedOrder.delivery_method || '未提供'}</span></div>
                        <div className="request-field"><span className="field-label">繪製範圍：</span><span className="field-value">{selectedOrder.draw_scope || '未提供'}</span></div>
                        <div className="request-field"><span className="field-label">人數：</span><span className="field-value">{selectedOrder.char_count || 1} 人</span></div>
                        <div className="request-field"><span className="field-label">背景：</span><span className="field-value">{selectedOrder.bg_type || '未提供'}</span></div>
                        <div className="request-field" style={{ gridColumn: '1 / -1' }}><span className="field-label">備註/附加選項：</span><span className="field-value">{selectedOrder.add_ons || '無'}</span></div>
                        <div className="request-field" style={{ gridColumn: '1 / -1', marginTop: '8px', borderTop: '1px dashed #EAE6E1', paddingTop: '16px' }}>
                          <span className="field-label">總金額：</span><span className="field-value" style={{ fontSize: '18px', color: '#4E7A5A', fontWeight: 'bold' }}>NT$ {selectedOrder.total_price.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* 委託協議 */}
                    <div className="section-card">
                      <h3 className="section-title" style={{ marginBottom: '16px', borderBottom: '1px solid #EAE6E1', paddingBottom: '12px' }}>委託協議</h3>
                      <div className="tos-snapshot-wrapper" style={{ margin: 0 }}>
                        <div className="tos-content" style={{ maxHeight: '300px' }}>
                          {finalTosHtml ? (<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(finalTosHtml) }} />) : (<div style={{ color: '#A0978D' }}>無協議紀錄</div>)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* === 稿件審閱 Tab === */}
                {activeTab === 'review' && (
                  <div className="fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
                    {selectedOrder.delivery_method !== '一鍵出圖' && (
                      <>
                        {renderClientStageBox('階段 1：草稿', 'sketch', selectedOrder.current_stage === 'sketch_reviewing', ['lineart_drawing', 'lineart_reviewing', 'final_drawing', 'final_reviewing', 'completed'].includes(selectedOrder.current_stage))}
                        {renderClientStageBox('階段 2：線稿', 'lineart', selectedOrder.current_stage === 'lineart_reviewing', ['final_drawing', 'final_reviewing', 'completed'].includes(selectedOrder.current_stage))}
                      </>
                    )}
                    {renderClientStageBox('階段 3：完稿交付', 'final', selectedOrder.current_stage === 'final_reviewing', selectedOrder.status === 'completed')}
                  </div>
                )}

                {/* === 歷程紀錄 Tab === */}
                {activeTab === 'history' && (
                   <div className="section-card" style={{ maxWidth: '800px', margin: '0 auto' }}>
                     <h3 className="section-title logs-title">歷程紀錄</h3>
                     {logs.length === 0 ? <div className="logs-empty">無歷程紀錄</div> : (
                       <div className="logs-list">
                         {logs.map(log => (
                           <div key={log.id} className={`log-card ${log.actor_role === 'artist' ? 'log-artist' : 'log-client'}`}>
                             <div className="log-meta">
                               {formatLocalTime(log.created_at)} | {log.actor_role === 'artist' ? '繪師' : '我 (委託人)'}
                             </div>
                             <div className="log-content">{log.content}</div>
                           </div>
                         ))}
                       </div>
                     )}
                   </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}