// src/pages/client/ClientOrders.tsx
import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import DOMPurify from 'dompurify';

interface CommissionDetail {
  id: string; status: string; type_name?: string; project_name: string; client_custom_title?: string;
  total_price: number; draw_scope: string; char_count: number; bg_type: string; add_ons: string;
  detailed_settings: string; agreed_tos_snapshot: string; delivery_method: string; 
  usage_type?: string; is_rush?: string | number;
  pending_changes?: string; latest_message_at?: string; last_read_at_client?: string;
  artist_settings?: string; current_stage: string; workflow_mode: string; order_date: string;
}

interface Submission { id: string; stage: string; file_url: string; version: number; created_at: string; }
interface ActionLog { id: string; actor_role: string; content: string; created_at: string; }

export function ClientOrders() {
  const navigate = useNavigate();
  const location = useLocation();
  const API_BASE = (import.meta as any).env.VITE_API_BASE_URL || '';
  const queryParams = new URLSearchParams(location.search);
  const initialSelectedId = queryParams.get('id');

  const [orders, setOrders] = useState<CommissionDetail[]>([]);
  const [filter, setFilter] = useState<'all' | 'working' | 'completed'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isListLoading, setIsListLoading] = useState(true);

  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId);
  const [activeTab, setActiveTab] = useState<'main' | 'review' | 'history'>('main');
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [logs, setLogs] = useState<ActionLog[]>([]);
  
  const [customTitle, setCustomTitle] = useState('');
  const [savedTitle, setSavedTitle] = useState(''); 
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success'>('idle');
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedId) params.set('id', selectedId);
    navigate(`?${params.toString()}`, { replace: true });
  }, [selectedId, navigate]);

  const fetchOrders = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/commissions`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        const validOrders = data.data.filter((o: CommissionDetail) => o.status !== 'quote_created' && o.status !== 'pending');
        setOrders(validOrders);
        if (initialSelectedId) fetchDetailData(initialSelectedId, validOrders);
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

      if (orderData.latest_message_at) {
        const latestMsgTime = new Date(orderData.latest_message_at).getTime();
        const lastReadTime = orderData.last_read_at_client ? new Date(orderData.last_read_at_client).getTime() : 0;
        setHasNewMessage(latestMsgTime > lastReadTime);
      }

      // 🌟 核心修正：移除這裡原本存在的自動已讀 PATCH 請求，讓通知得以保留。

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
          const agreeTime = new Date(new Date(orderData.order_date).getTime() + 1000).toISOString();
          syntheticLogs.push({ id: 'sys-agree', actor_role: 'client', content: '同意委託協議並簽署合約', created_at: agreeTime });
        }
      }

      const allLogs = [...fetchedLogs, ...syntheticLogs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setSubmissions(fetchedSubmissions);
      setLogs(allLogs);

    } catch (error) {}
  };

  const handleSelect = (orderId: string) => {
    setSelectedId(orderId);
    fetchDetailData(orderId);
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

  const handleDownloadOriginal = async (publicUrl: string) => {
    if (!selectedId) return;
    setIsProcessing(true);
    try {
      const urlObj = new URL(publicUrl);
      const publicPath = urlObj.pathname.substring(1); 
      const privatePath = publicPath.replace('_preview_', '_original_');
      const res = await fetch(`${API_BASE}/api/r2/download-url`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commissionId: selectedId, fileName: privatePath })
      });
      const data = await res.json();
      if (data.success) window.location.href = data.downloadUrl; else alert('無法下載：' + data.error);
    } catch (e) { alert("網路連線錯誤"); } finally { setIsProcessing(false); }
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

  const getStatusDisplay = (status: string, stage: string) => {
    if (status === 'completed') return <span style={{ color: '#1e8e3e', fontWeight: 'bold' }}>✓ 已結案</span>;
    if (status === 'cancelled') return <span style={{ color: '#d93025', fontWeight: 'bold' }}>作廢</span>;
    if (stage.includes('reviewing')) return <span style={{ color: '#e11d48', fontWeight: 'bold' }}>👀 待審閱</span>;
    return <span style={{ color: '#A67B3E', fontWeight: 'bold' }}>✍️ 繪製中</span>;
  };

  const renderClientStageBox = (title: string, stageKey: string, isReviewing: boolean, isPassed: boolean) => {
    const sub = getLatestSubmissions()[stageKey];
    const isFinal = stageKey === 'final';
    let statusText = isPassed ? (isFinal ? '✓ 已同意，合約結案' : '✓ 繪師已推進下一階段') : (isReviewing ? '👀 繪師已交付，請確認' : '⏳ 尚未交付');
    return (
      <div style={{ border: '1px solid #EAE6E1', borderRadius: '12px', overflow: 'hidden', marginBottom: '24px', backgroundColor: '#FFFFFF' }}>
        <div style={{ backgroundColor: isPassed ? '#e6f4ea' : (isReviewing ? '#fce8e6' : '#FBFBF9'), padding: '14px 20px', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '15px', color: '#5D4A3E', borderBottom: '1px solid #EAE6E1' }}>
          <span>{title}</span> <span style={{ color: isPassed ? '#1e8e3e' : (isReviewing ? '#d93025' : '#A0978D') }}>{statusText}</span>
        </div>
        <div style={{ padding: '20px', textAlign: 'center' }}>
          {!sub ? <div style={{ color: '#A0978D', padding: '20px' }}>繪師尚未上傳此階段稿件</div> : (
            <div>
               <div style={{ fontSize: '13px', color: '#A0978D', marginBottom: '12px', textAlign: 'left' }}>最後更新：{new Date(sub.created_at).toLocaleString('zh-TW')} (v{sub.version})</div>
               <div style={{ border: '1px solid #EAE6E1', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#FBFBF9', maxWidth: '350px', margin: '0 auto' }}><img src={sub.file_url} alt="稿件預覽" style={{ width: '100%', maxHeight: '400px', objectFit: 'contain', display: 'block' }} /></div>
               <div style={{ marginTop: '20px', display: 'flex', gap: '12px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                 {isReviewing && !isFinal && (<div style={{ flex: '1 1 100%', fontSize: '13px', color: '#7A7269', fontWeight: 'bold', textAlign: 'right' }}>👀 本階段請過目即可，系統已自動為您標記閱覽，繪師後續將推進至下一階段。</div>)}
                 {isReviewing && isFinal && (
                   <>
                     <div style={{ flex: '1 1 100%', fontSize: '13px', color: '#d93025', fontWeight: 'bold', marginBottom: '8px', textAlign: 'right' }}>⚠️ 同意後將結案並解鎖原檔下載。</div>
                     <button onClick={() => handleReview(stageKey, 'reject')} disabled={isProcessing} style={{ padding: '10px 20px', backgroundColor: '#FFF', color: '#d93025', border: '1px solid #EAE6E1', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>退回修改</button>
                     <button onClick={() => handleReview(stageKey, 'approve')} disabled={isProcessing} style={{ padding: '10px 24px', backgroundColor: '#1e8e3e', color: '#FFF', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>✓ 同意完稿</button>
                   </>
                 )}
                 {isPassed && isFinal && selectedOrder?.status === 'completed' && (<button onClick={() => handleDownloadOriginal(sub.file_url)} disabled={isProcessing} style={{ padding: '14px 24px', width: '100%', backgroundColor: '#5D4A3E', color: '#FFF', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>{isProcessing ? '⏳ 正在獲取安全連結...' : '⬇️ 下載無浮水印原檔 (限時安全連結)'}</button>)}
               </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const tabStyle = (isActive: boolean) => ({ padding: '16px 24px', cursor: 'pointer', borderBottom: isActive ? '3px solid #5D4A3E' : '3px solid transparent', fontWeight: isActive ? 'bold' : 'normal', color: isActive ? '#5D4A3E' : '#A0978D', backgroundColor: 'transparent', borderTop: 'none', borderLeft: 'none', borderRight: 'none', fontSize: '15px', transition: 'all 0.2s ease', outline: 'none' });
  const sectionBoxStyle = { backgroundColor: '#FFFFFF', padding: '24px', borderRadius: '12px', marginBottom: '16px', border: '1px solid #EAE6E1', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' };

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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'sans-serif', backgroundColor: '#FBFBF9' }}>
      
      {/* 🌟 核心修正：加入黃底閃爍動畫 CSS */}
      <style>{`
        @keyframes pulse-yellow {
          0% { box-shadow: 0 0 0 0 rgba(250, 204, 21, 0.7); }
          70% { box-shadow: 0 0 0 10px rgba(250, 204, 21, 0); }
          100% { box-shadow: 0 0 0 0 rgba(250, 204, 21, 0); }
        }
      `}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 32px', backgroundColor: '#FFFFFF', borderBottom: '1px solid #EAE6E1', flexShrink: 0 }}>
        <h1 style={{ margin: 0, fontSize: '20px', color: '#5D4A3E' }}>🎨 我的發包委託管理</h1>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => navigate('/portal')} style={{ padding: '8px 16px', backgroundColor: '#F5EBEB', color: '#5D4A3E', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>切換身分</button>
          <button onClick={() => navigate('/artist/notebook')} style={{ padding: '8px 16px', backgroundColor: '#5D4A3E', color: '#FFF', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>進入繪師後台 →</button>
        </div>
      </div>

      {parsedChanges && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
          <div style={{ backgroundColor: '#FFF', padding: '24px', borderRadius: '16px', maxWidth: '500px', width: '90%', boxShadow: '0 8px 32px rgba(0,0,0,0.24)' }}>
            <h3 style={{ color: '#e11d48', marginTop: 0 }}>⚠️ 繪師提出了規格異動申請</h3>
            <p style={{ color: '#7A7269', fontSize: '14px', marginBottom: '12px' }}>繪師希望調整委託單內容，請確認以下項目：</p>
            <div style={{ backgroundColor: '#FAFAFA', padding: '16px', borderRadius: '12px', fontSize: '14px', color: '#5D4A3E', marginBottom: '24px', maxHeight: '200px', overflowY: 'auto', border: '1px solid #EAE6E1' }}>
              {Object.keys(parsedChanges).map(key => (<div key={key} style={{ marginBottom: '6px' }}><span style={{ fontWeight: 'bold' }}>• {fieldMap[key] || key}：</span><span>{parsedChanges![key]}</span></div>))}
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => handleReviewChange('approve')} style={{ flex: 1, padding: '14px', backgroundColor: '#1e8e3e', color: '#FFF', borderRadius: '12px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>同意並更新合約</button>
              <button onClick={() => handleReviewChange('reject')} style={{ flex: 1, padding: '14px', backgroundColor: '#e11d48', color: '#FFF', borderRadius: '12px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>拒絕修改</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: '24px', gap: '24px', maxWidth: '1400px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        
        {/* 左側列表區 */}
        <div style={{ width: '380px', backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #EAE6E1', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', flexShrink: 0 }}>
          <div style={{ padding: '20px', borderBottom: '1px solid #EAE6E1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 'bold', color: '#5D4A3E', fontSize: '16px' }}>委託單列表</span>
            <select value={filter} onChange={e => setFilter(e.target.value as any)} style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #DED9D3', outline: 'none', color: '#5D4A3E', backgroundColor: '#FBFBF9' }}>
              <option value="all">全部</option><option value="working">進行中</option><option value="completed">已結單</option>
            </select>
          </div>
          <div style={{ padding: '10px 20px', borderBottom: '1px solid #EAE6E1', backgroundColor: '#FAFAFA' }}>
            <input type="text" placeholder="🔍 搜尋暱稱/單號..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #DED9D3', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div style={{ overflowY: 'auto', flex: 1, padding: '10px' }}>
            {isListLoading ? <div style={{ textAlign: 'center', color: '#A0978D', padding: '20px' }}>載入中...</div> : filteredOrders.length === 0 ? <div style={{ textAlign: 'center', padding: '40px 20px', color: '#C4BDB5' }}>沒有符合的委託單</div> : (
              filteredOrders.map(order => {
                const isSelected = selectedId === order.id;
                
                // 🌟 核心修正：在列表項右上角也補上紅色小鈴鐺提醒
                const latestMsgTime = order.latest_message_at ? new Date(order.latest_message_at).getTime() : 0;
                const lastReadTime = order.last_read_at_client ? new Date(order.last_read_at_client).getTime() : 0;
                const hasUnread = latestMsgTime > lastReadTime;
                const hasPending = !!order.pending_changes;
                const showDot = hasUnread || hasPending;

                return (
                  <div key={order.id} onClick={() => handleSelect(order.id)} style={{ position: 'relative', padding: '16px', marginBottom: '8px', borderRadius: '12px', border: isSelected ? '1px solid #DED9D3' : '1px solid transparent', cursor: 'pointer', backgroundColor: isSelected ? '#FDFDFB' : '#FFFFFF', transition: 'all 0.2s ease', opacity: order.status === 'cancelled' ? 0.5 : 1 }}>
                    {showDot && (
                      <div style={{ position: 'absolute', top: '-6px', right: '-6px', backgroundColor: '#e11d48', color: '#FFF', width: '20px', height: '20px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.2)', zIndex: 10 }}>🔔</div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#A0978D', marginBottom: '6px' }}>
                      <span>{new Date(order.order_date).toLocaleDateString()}</span>
                      {(order.is_rush === '是' || order.is_rush === 1 || order.is_rush === '1') && (<span style={{ fontSize: '11px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px', backgroundColor: '#fce8e6', color: '#d93025' }}>🔥 急件</span>)}
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#5D4A3E', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{order.client_custom_title || order.project_name || '未命名項目'}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ fontSize: '12px', color: '#7A7269', fontFamily: 'monospace' }}>單號：{order.id}</span><span style={{ fontWeight: 'bold', color: '#4E7A5A', fontSize: '14px' }}>NT$ {order.total_price}</span></div>
                    <div style={{ marginTop: '8px', fontSize: '12px' }}>{getStatusDisplay(order.status, order.current_stage)}</div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 右側詳情區 */}
        <div style={{ flex: 1, backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #EAE6E1', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {!selectedOrder ? <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#A0978D', fontSize: '16px' }}>請從左側列表選擇一張委託單以檢視詳情</div> : (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              
              <div style={{ padding: '24px 30px', borderBottom: '1px solid #EAE6E1', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', backgroundColor: '#FFFFFF' }}>
                <div>
                  <h2 style={{ margin: '0 0 8px 0', color: '#5D4A3E', fontSize: '24px' }}>{selectedOrder.client_custom_title || selectedOrder.project_name || '未命名項目'}</h2>
                  <div style={{ color: '#7A7269', fontSize: '14px', marginBottom: '4px', fontWeight: 'bold' }}>繪師項目名：{selectedOrder.project_name || '無'}</div>
                  <div style={{ color: '#A0978D', fontSize: '12px', fontFamily: 'monospace' }}>單號：{selectedOrder.id}</div>
                </div>
                
                <button 
                  onClick={() => {
                    // 🌟 核心修正：真正點擊進入聊天室時，才把訊息標記為已讀
                    fetch(`${API_BASE}/api/commissions/${selectedOrder.id}`, {
                      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
                      body: JSON.stringify({ last_read_at_client: new Date().toISOString() })
                    });
                    navigate(`/workspace/${selectedOrder.id}`);
                  }} 
                  style={{ 
                    padding: '10px 20px', backgroundColor: '#4A7294', color: '#FFFFFF', border: 'none', borderRadius: '8px', 
                    fontWeight: 'bold', cursor: 'pointer', fontSize: '14px', transition: 'all 0.3s', 
                    animation: hasNewMessage ? 'pulse-yellow 2s infinite' : 'none' 
                  }}
                >
                  {hasNewMessage ? '🔔 有新訊息！' : '進入聊天室'}
                </button>
              </div>

              <div style={{ display: 'flex', backgroundColor: '#FAFAFA', borderBottom: '1px solid #EAE6E1', padding: '0 24px', gap: '8px' }}>
                <button onClick={() => setActiveTab('main')} style={tabStyle(activeTab === 'main')}>詳細內容</button>
                <button onClick={() => setActiveTab('review')} style={tabStyle(activeTab === 'review')}>稿件審閱</button>
                <button onClick={() => setActiveTab('history')} style={tabStyle(activeTab === 'history')}>歷程紀錄</button>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '30px', backgroundColor: '#FBFBF9' }}>
                {activeTab === 'main' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '800px', margin: '0 auto' }}>
                    <div style={sectionBoxStyle}>
                      <div style={{ marginBottom: '8px' }}>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', color: '#5D4A3E', marginBottom: '8px' }}>自訂委託名稱 (僅您可見)</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input type="text" value={customTitle} onChange={(e) => setCustomTitle(e.target.value)} placeholder="給這張單取個好記的名字..." style={{ flex: 1, padding: '10px', borderRadius: '8px', outline: 'none', border: customTitle === savedTitle && customTitle ? '1px solid #EAE6E1' : '1px solid #DED9D3', backgroundColor: customTitle === savedTitle && customTitle ? '#FAFAFA' : '#FFFFFF' }} />
                          <button onClick={handleSaveTitle} disabled={saveStatus !== 'idle'} style={{ padding: '10px 20px', color: '#FFF', border: 'none', borderRadius: '8px', cursor: saveStatus === 'idle' ? 'pointer' : 'default', fontWeight: 'bold', backgroundColor: saveStatus === 'success' ? '#4E7A5A' : '#5D4A3E', minWidth: '90px' }}>{saveStatus === 'saving' ? '⏳ 儲存中...' : saveStatus === 'success' ? '✅ 成功' : '儲存'}</button>
                        </div>
                      </div>
                    </div>

                    <div style={sectionBoxStyle}>
                      <h3 style={{ fontSize: '16px', color: '#5D4A3E', margin: '0 0 16px 0', borderBottom: '1px solid #EAE6E1', paddingBottom: '12px' }}>委託規格</h3>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', fontSize: '14px', color: '#5D4A3E' }}>
                        <div><strong style={{ color: '#7A7269' }}>委託用途：</strong>{selectedOrder.usage_type || '未提供'}</div>
                        <div><strong style={{ color: '#7A7269' }}>是否急件：</strong>{selectedOrder.is_rush === '是' || selectedOrder.is_rush === '1' || selectedOrder.is_rush === 1 ? '是' : '否'}</div>
                        <div><strong style={{ color: '#7A7269' }}>交稿方式：</strong>{selectedOrder.delivery_method || '未提供'}</div>
                        <div><strong style={{ color: '#7A7269' }}>繪製範圍：</strong>{selectedOrder.draw_scope || '未提供'}</div>
                        <div><strong style={{ color: '#7A7269' }}>人數：</strong>{selectedOrder.char_count || 1} 人</div>
                        <div><strong style={{ color: '#7A7269' }}>背景：</strong>{selectedOrder.bg_type || '未提供'}</div>
                        <div style={{ gridColumn: 'span 2' }}><strong style={{ color: '#7A7269' }}>備註：</strong>{selectedOrder.add_ons || '無'}</div>
                        <div style={{ gridColumn: 'span 2', marginTop: '8px', borderTop: '1px dashed #EAE6E1', paddingTop: '16px', fontSize: '18px', color: '#4E7A5A' }}><strong>總金額：</strong>NT$ {selectedOrder.total_price.toLocaleString()}</div>
                      </div>
                    </div>

                    <div style={sectionBoxStyle}>
                      <h3 style={{ fontSize: '16px', color: '#5D4A3E', margin: '0 0 12px 0', borderBottom: '1px solid #EAE6E1', paddingBottom: '8px' }}>委託協議</h3>
                      <div style={{ fontSize: '14px', color: '#5D4A3E', maxHeight: '300px', overflowY: 'auto', padding: '16px', backgroundColor: '#FAFAFA', borderRadius: '8px', border: '1px solid #EAE6E1', whiteSpace: 'pre-wrap' }}>
                        {finalTosHtml ? (<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(finalTosHtml) }} />) : (<div style={{ color: '#A0978D' }}>無協議紀錄</div>)}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'review' && (
                  <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                    {selectedOrder.delivery_method !== '一鍵出圖' && (
                      <>
                        {renderClientStageBox('階段 1：草稿', 'sketch', selectedOrder.current_stage === 'sketch_reviewing', ['lineart_drawing', 'lineart_reviewing', 'final_drawing', 'final_reviewing', 'completed'].includes(selectedOrder.current_stage))}
                        {renderClientStageBox('階段 2：線稿', 'lineart', selectedOrder.current_stage === 'lineart_reviewing', ['final_drawing', 'final_reviewing', 'completed'].includes(selectedOrder.current_stage))}
                      </>
                    )}
                    {renderClientStageBox('階段 3：完稿交付', 'final', selectedOrder.current_stage === 'final_reviewing', selectedOrder.status === 'completed')}
                  </div>
                )}

                {activeTab === 'history' && (
                   <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                     {logs.length === 0 ? <div style={{ textAlign: 'center', color: '#A0978D', padding: '40px' }}>無歷程紀錄</div> : (
                       <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                         {logs.map(log => (
                           <div key={log.id} style={{ padding: '16px', backgroundColor: '#FFFFFF', borderRadius: '12px', borderLeft: log.actor_role === 'artist' ? '4px solid #4E7A5A' : '4px solid #4A7294', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', border: '1px solid #EAE6E1' }}>
                             <div style={{ fontSize: '12px', color: '#A0978D', marginBottom: '8px' }}>{new Date(log.created_at).toLocaleString('zh-TW')} | {log.actor_role === 'artist' ? '繪師' : '我 (委託人)'}</div>
                             <div style={{ fontSize: '14px', color: '#5D4A3E', lineHeight: '1.5' }}>{log.content}</div>
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