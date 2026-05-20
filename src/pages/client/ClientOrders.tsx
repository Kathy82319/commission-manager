// src/pages/client/ClientOrders.tsx
import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom'; 
import DOMPurify from 'dompurify';
import '../../styles/Notebook.css'; 

import { OCDetailCard } from '../../components/OC/OCDetailCard';
import type { OCCardData } from '../../components/OC/OCDetailCard';

interface CommissionDetail {
  id: string; status: string; type_name?: string; project_name: string; client_custom_title?: string;
  total_price: number; draw_scope: string; char_count: number; bg_type: string; add_ons: string;
  agreed_memo?: string;
  detailed_settings: string; agreed_tos_snapshot: string; delivery_method: string; 
  usage_type?: string; is_rush?: string | number;
  pending_changes?: string; latest_message_at?: string; last_read_at_client?: string;
  artist_settings?: string; current_stage: string; workflow_mode: string; order_date: string;
  client_id?: string; 
  artist_id?: string;
  artist_public_id?: string; 
  origin_source?: string;
  oc_snapshot?: string; 
}

interface Submission { id: string; stage: string; file_url: string; version: number; created_at: string; }
interface ActionLog { id: string; actor_role: string; content: string; created_at: string; }

const unescapeHtml = (str: any) => {
  if (typeof str !== 'string') return str;
  if (!str) return '';
  return str.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#039;/g, "'");
};

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

const getOriginData = (currentOrder?: CommissionDetail | null) => {
  if (!currentOrder || !currentOrder.origin_source) return null;
  try {
    const parsed = JSON.parse(unescapeHtml(currentOrder.origin_source));
    if (!parsed) return null;

    if (parsed.source_type === 'showcase_form') {
      return {
        type: 'showcase_form',
        title: parsed.showcase_title || '客製化委託單',
        answers: Array.isArray(parsed.form_answers) ? parsed.form_answers : [],
        inquiry_id: parsed.inquiry_id,
        ...parsed
      };
    }

    if (parsed.source_type === 'bulletin') {
      const isOffer = parsed.bulletin_category === 'offer';
      const rawSnapshot = parsed.client_initial_response || parsed.artist_initial_snapshot || parsed.artist_snapshot || '{}';
      const parsedSnapshot = typeof rawSnapshot === 'string' ? JSON.parse(rawSnapshot) : rawSnapshot;
      
      let description = parsed.description || parsed.bulletin_content || '';
      try {
        const parsedContent = JSON.parse(unescapeHtml(parsed.bulletin_content));
        if (parsedContent.description) description = parsedContent.description;
        else if (parsedContent.content) description = parsedContent.content;
      } catch (e) {}

      return {
        type: 'bulletin',
        description,
        isOffer,
        inquiry_id: parsed.inquiry_id,
        parsedSnapshot: typeof parsedSnapshot === 'object' ? parsedSnapshot : { message: parsedSnapshot },
        ...parsed
      };
    }
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

  const [blacklistedIds, setBlacklistedIds] = useState<string[]>([]);

  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId);
  const [activeTab, setActiveTab] = useState<'main' | 'oc' | 'review' | 'history'>('main');
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [logs, setLogs] = useState<ActionLog[]>([]);
  
  const [customTitle, setCustomTitle] = useState('');
  const [, setSavedTitle] = useState(''); 
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success'>('idle');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [isTrajectoryExpanded, setIsTrajectoryExpanded] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  // === 評價功能相關狀態 ===
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewForm, setReviewForm] = useState({ content: '', client_anonymous: false });

  useEffect(() => {
    const currentId = queryParams.get('id') || queryParams.get('open');
    if (currentId && currentId !== selectedId) {
      handleSelect(currentId);
      const tab = queryParams.get('tab');
      if (tab === 'review' || tab === 'history' || tab === 'oc') {
        setActiveTab(tab);
      }
    }
  }, [location.search]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedId) params.set('id', selectedId);
    if (activeTab !== 'main') params.set('tab', activeTab);
    navigate(`?${params.toString()}`, { replace: true });
  }, [selectedId, activeTab, navigate]);

  const fetchOrders = async () => {
    try {
      const [res, meRes, relRes] = await Promise.all([
        fetch(`${API_BASE}/api/commissions`, { credentials: 'include' }),
        fetch(`${API_BASE}/api/users/me`, { credentials: 'include' }),
        fetch(`${API_BASE}/api/relations`, { credentials: 'include' })
      ]);
      
      const data = await res.json();
      const meData = await meRes.json();
      const myId = meData.data?.id;

      if (relRes.ok) {
        const relData = await relRes.json();
        if (relData.success) {
          const bIds = relData.data
            .filter((r: any) => r.relation_type === 'blacklist')
            .map((r: any) => r.target_user_id);
          setBlacklistedIds(bIds);
        }
      }

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
        if (orderData.status !== 'quote_created' && orderData.status !== 'pending') {
          const bindLogIndex = fetchedLogs.findIndex(l => l.content.includes('綁定訂單'));
          
          if (bindLogIndex !== -1) {
            fetchedLogs[bindLogIndex].content = '同意委託協議並簽署合約';
          } else {
            const agreeTime = new Date(parseTime(orderData.order_date) + 1000).toISOString();
            syntheticLogs.push({ id: 'sys-agree', actor_role: 'client', content: '同意委託協議並簽署合約', created_at: agreeTime });
          }
        }
      }

      const allLogs = [...fetchedLogs, ...syntheticLogs].sort((a, b) => parseTime(b.created_at) - parseTime(a.created_at));
      
      const uniqueLogs: ActionLog[] = [];
      const seenLogKeys = new Set<string>();
      for (const log of allLogs) {
        const uniqueKey = `${log.content}_${log.created_at}`;
        if (!seenLogKeys.has(uniqueKey)) {
          seenLogKeys.add(uniqueKey);
          uniqueLogs.push(log);
        }
      }
      
      setSubmissions(fetchedSubmissions);
      setLogs(uniqueLogs);

    } catch (error) {}
  };

  const handleSelect = (orderId: string) => {
    setSelectedId(orderId);
    fetchDetailData(orderId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // === 補回遺失的 handleSaveTitle 函式 ===
  const handleSaveTitle = async () => {
    if (!selectedId || saveStatus === 'saving') return;
    setSaveStatus('saving');
    try {
      const res = await fetch(`${API_BASE}/api/commissions/${selectedId}`, {
        method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_custom_title: customTitle })
      });
      if ((await res.json()).success) {
        setSavedTitle(customTitle); 
        setSaveStatus('success'); 
        setTimeout(() => setSaveStatus('idle'), 2000); 
      } else {
        setSaveStatus('idle');
      }
    } catch (error) { 
      setSaveStatus('idle'); 
    }
  };

  const handleReviewChange = async (action: 'approve' | 'reject') => {
    if (!selectedId) return;
    setIsProcessing(true);
    try {
      const res = await fetch(`${API_BASE}/api/commissions/${selectedId}/change-response`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      if ((await res.json()).success) {
        alert(action === 'approve' ? '已同意內容異動並更新合約！' : '已拒絕內容異動！');
        fetchOrders(); fetchDetailData(selectedId);
      }
    } catch (error) {
      alert("操作發生錯誤，請稍後再試。");
    } finally {
      setIsProcessing(false);
    }
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
      const data = await res.json();
      if (data.success) { 
        alert("已送出回覆！"); 
        await fetchOrders(); 
        await fetchDetailData(selectedId);
        
        // 如果是同意完稿 (結案)，自動跳出評價 Modal
        if (stageKey === 'final' && action === 'approve') {
          setIsReviewModalOpen(true);
        }
      } else alert("操作失敗");
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

  // === 提交評價 API ===
  const handleSubmitReview = async () => {
    if (!selectedId) return;
    
    setIsSubmittingReview(true);
    try {
      const res = await fetch(`${API_BASE}/api/reviews`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commission_id: selectedId,
          content: reviewForm.content,
          client_anonymous: reviewForm.client_anonymous
        })
      });
      const data = await res.json();
      if (data.success) {
        alert('感謝您的評價！繪師已收到您的心意。');
        setIsReviewModalOpen(false);
        fetchDetailData(selectedId); // 重新獲取 logs 以隱藏按鈕
      } else {
        alert(data.error || '評價送出失敗');
      }
    } catch (e) {
      alert('網路錯誤，請稍後再試');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const getLatestSubmissions = () => {
    const latest: Record<string, Submission> = {};
    submissions.forEach(sub => { if (!latest[sub.stage] || sub.version > latest[sub.stage].version) latest[sub.stage] = sub; });
    return latest;
  };

  const selectedOrder = orders.find(o => o.id === selectedId);

  // === 評價按鈕顯示邏輯 (透過分析 Logs) ===
  const hasReviewed = logs.some(l => l.content.includes('委託人已填寫結案評價'));
  const completeLog = logs.find(l => l.content.includes('開啟 3 日評價期'));
  const isWithin3Days = completeLog 
    ? (Date.now() - new Date(ensureUTC(completeLog.created_at)).getTime() < 3 * 24 * 60 * 60 * 1000) 
    : false;
  // 若是舊訂單沒有 completeLog，我們放寬讓後端擋，或者直接不顯示。這裡選擇依賴 completeLog 確保精準。
  const canReview = selectedOrder?.status === 'completed' && !hasReviewed && isWithin3Days;

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
    if (status === 'completed') return <span className="card-tag badge-completed">已結案</span>;
    if (status === 'cancelled') return <span className="card-tag badge-cancelled">作廢</span>;
    if (stage.includes('reviewing')) return <span className="card-tag badge-new-msg">待審閱</span>;
    return <span className="card-tag badge-queue">安排中</span>;
  };

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
               
               
               <div 
                 style={{ border: '1px solid #EAE6E1', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#FBFBF9', maxWidth: '100%', margin: '0 auto', display: 'flex', justifyContent: 'center', cursor: 'zoom-in' }}
                 onClick={() => setZoomedImage(sub.file_url.split('|')[0])}
                 title="點擊放大檢視"
               >
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

  let parsedChanges: Record<string, any> | null = null;
  if (selectedOrder?.pending_changes) {
    try {
      const parsed = typeof selectedOrder.pending_changes === 'string' ? JSON.parse(selectedOrder.pending_changes) : selectedOrder.pending_changes;
      if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) parsedChanges = parsed;
    } catch (e) {}
  }

  const renderDiffValue = (key: string, originalValue: any, formatter?: (val: any) => string) => {
    const displayOriginal = formatter ? formatter(originalValue) : originalValue;

    if (parsedChanges && parsedChanges[key] !== undefined) {
      const displayNew = formatter ? formatter(parsedChanges[key]) : parsedChanges[key];
      return (
        <span className="field-value" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <del style={{ color: '#A0978D', textDecorationThickness: '1.5px' }}>{displayOriginal}</del>
          <span style={{ color: '#A05C5C', fontWeight: 'bold' }}>{displayNew}</span>
          <span style={{ fontSize: '11px', color: '#A05C5C', border: '1px solid #A05C5C', padding: '1px 6px', borderRadius: '4px', backgroundColor: '#FFF5F5', whiteSpace: 'nowrap' }}>異動</span>
        </span>
      );
    }
    return <span className="field-value">{displayOriginal}</span>;
  };

  let finalTosHtml = '';
  if (selectedOrder?.agreed_tos_snapshot) {
    const unescapedTos = unescapeHtml(selectedOrder.agreed_tos_snapshot);
    try {
      const parsed = JSON.parse(unescapedTos);
      if (typeof parsed === 'string') {
        finalTosHtml = parsed;
      } else {
        finalTosHtml = unescapedTos;
      }
    } catch (e) {
      finalTosHtml = unescapedTos;
    }
  } else if (selectedOrder?.artist_settings) {
    try {
      const settings = JSON.parse(unescapeHtml(selectedOrder.artist_settings));
      if (settings.rules) {
        finalTosHtml = settings.rules;
      } else if (settings.terms_of_service) {
        finalTosHtml = settings.terms_of_service;
      }
    } catch(e) {
      console.error("無法解析 artist_settings 作為 TOS", e);
    }
  }

  const originData = getOriginData(selectedOrder);

  return (
    <div className="notebook-page">
      
      {/* === 圖片放大檢視 === */}
      {zoomedImage && createPortal(
        <div 
          onClick={(e) => {
            e.stopPropagation(); 
            setZoomedImage(null);
          }} 
          style={{ 
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
            width: '100vw', height: '100vh', 
            backgroundColor: 'rgba(0, 0, 0, 0.85)', 
            zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', 
            padding: '24px', cursor: 'zoom-out' 
          }}
        >
          <img 
            src={zoomedImage} 
            alt="放大稿件" 
            onClick={(e) => e.stopPropagation()} 
            style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain', borderRadius: '8px', cursor: 'default' }} 
          />
        </div>,
        document.body 
      )}

      {/* === 評價填寫 Modal === */}
      {isReviewModalOpen && createPortal(
        <div 
          style={{ 
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
            backgroundColor: 'rgba(0, 0, 0, 0.6)', 
            zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' 
          }}
        >
          <div style={{ backgroundColor: '#FFF', borderRadius: '12px', width: '100%', maxWidth: '500px', padding: '24px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
            <h2 style={{ marginTop: 0, color: '#334155', borderBottom: '1px solid #E2E8F0', paddingBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              ⭐ 填寫委託評價
            </h2>
            <p style={{ color: '#64748B', fontSize: '14px', marginBottom: '20px' }}>
              感謝您的委託！請撥空為本次合作留下評價，給予繪師鼓勵或建議。<br/>
              <span style={{ color: '#F59E0B' }}>(注意：評價送出後不可修改)</span>
            </p>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', color: '#475569' }}>給繪師的話 / 評價內容</label>
              <textarea 
                value={reviewForm.content}
                onChange={(e) => setReviewForm(prev => ({ ...prev, content: e.target.value }))}
                placeholder="例如：溝通很順暢、出圖速度很快、細節處理得很好..."
                style={{ width: '100%', minHeight: '120px', padding: '12px', border: '1px solid #CBD5E1', borderRadius: '8px', resize: 'vertical' }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#475569' }}>
                <input 
                  type="checkbox"
                  checked={reviewForm.client_anonymous}
                  onChange={(e) => setReviewForm(prev => ({ ...prev, client_anonymous: e.target.checked }))}
                />
                匿名發布 (繪師端與公開頁面將顯示為「匿名委託人」)
              </label>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setIsReviewModalOpen(false)}
                disabled={isSubmittingReview}
                style={{ padding: '10px 16px', background: '#F1F5F9', border: 'none', color: '#475569', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                稍後再說
              </button>
              <button 
                onClick={handleSubmitReview}
                disabled={isSubmittingReview}
                style={{ padding: '10px 20px', background: '#5D4A3E', border: 'none', color: '#FFF', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                {isSubmittingReview ? '送出中...' : '確認送出評價'}
              </button>
            </div>
          </div>
        </div>,
        document.body 
      )}

      <div className="notebook-container">
        
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
                const orderOrigin = getOriginData(order);
                const isBlacklisted = order.artist_id && blacklistedIds.includes(order.artist_id); 

                let hasPendingChange = false;
                try {
                  const pChanges = typeof order.pending_changes === 'string' ? JSON.parse(order.pending_changes) : order.pending_changes;
                  hasPendingChange = !!(pChanges && Object.keys(pChanges).length > 0);
                } catch(e) {}

                return (
                  <div key={order.id} onClick={() => handleSelect(order.id)} className={`sidebar-card ${isSelected ? 'selected' : ''} ${order.status === 'cancelled' ? 'cancelled' : ''}`}>
                    <div className="card-meta-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', flex: 1 }}>
                        <span>{formatLocalDate(order.order_date)}</span>
                        {orderOrigin?.type === 'showcase_form' && (
                          <span className="card-mode-badge" style={{ backgroundColor: '#4A7294', color: '#fff', whiteSpace: 'nowrap' }}>接委託表單</span>
                        )}
                        {orderOrigin?.type === 'bulletin' && (
                          <span className="card-mode-badge" style={{ backgroundColor: '#8E7E8E', color: '#fff', whiteSpace: 'nowrap' }}>許願池</span>
                        )}
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                        {(order.is_rush === '是' || order.is_rush === 1 || order.is_rush === '1') && (
                          <span className="card-tag badge-new-msg" style={{ whiteSpace: 'nowrap' }}>🔥 急件</span>
                        )}
                        {hasPendingChange && (
                          <span className="card-tag" style={{ backgroundColor: '#FFF5F5', color: '#A05C5C', border: '1px solid #FECACA', whiteSpace: 'nowrap' }}>⚠️ 異動確認</span>
                        )}
                      </div>
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
                      
                      {isBlacklisted && (
                        <span className="card-tag" style={{ backgroundColor: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', whiteSpace: 'nowrap' }}>
                          🚫 黑名單繪師
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        
        <div className={`notebook-main ${!selectedId ? 'mobile-hide' : ''}`}>
          {!selectedOrder ? <div className="main-empty">請從列表選擇一張委託單以檢視詳情</div> : (
            <div className="main-content-wrapper">
              
              <div className="main-header">
                <div className="main-header-info">
                  <button className="mobile-back-btn" onClick={() => setSelectedId(null)}>⬅ 返回列表</button>
                  <h2 className="main-title">{selectedOrder.client_custom_title || selectedOrder.project_name || '未命名項目'}</h2>
                  
                  {selectedOrder.artist_id && blacklistedIds.includes(selectedOrder.artist_id) && (
                    <div style={{ display: 'inline-block', padding: '4px 10px', background: '#fef2f2', color: '#ef4444', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', border: '1px solid #fecaca', marginTop: '6px', marginBottom: '6px' }}>
                      ⚠️ 提醒：此繪師已被您列入黑名單
                    </div>
                  )}

                  <div className="main-subtitle" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                      繪師項目名：{selectedOrder.project_name || '無'}
                    </span>
                    {originData && (
                      <span className="card-mode-badge" style={{ backgroundColor: originData.type === 'showcase_form' ? '#4A7294' : '#8E7E8E', color: '#fff', flexShrink: 0 }}>
                        來源：{originData.type === 'showcase_form' ? '接委託表單' : '許願池'}
                      </span>
                    )}
                  </div>
                  
                  <div className="main-meta-row" style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span>單號：{selectedOrder.id}</span>
                    {selectedOrder.artist_id && (
                      <span>
                        繪師：
                        <a 
                          href={`/${selectedOrder.artist_public_id || selectedOrder.artist_id}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{ color: '#4A7294', textDecoration: 'none', fontWeight: 'bold', borderBottom: '1px solid #4A7294' }}
                          title="前往繪師個人專頁"
                        >
                          @{selectedOrder.artist_public_id || selectedOrder.artist_id}
                        </a>
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="main-header-actions">
                  <button 
                    onClick={() => {
                      fetch(`${API_BASE}/api/commissions/${selectedOrder.id}`, {
                        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
                        body: JSON.stringify({ last_read_at_client: new Date().toISOString() })
                      });
                      
                      const targetUrl = originData?.inquiry_id 
                        ? `/inquiry/workspace/${originData.inquiry_id}` 
                        : `/workspace/${selectedOrder.id}`;
                      navigate(targetUrl);
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
                  {parsedChanges && <span style={{ marginLeft: '6px', fontSize: '10px', backgroundColor: '#A05C5C', color: 'white', padding: '2px 6px', borderRadius: '10px' }}>有異動</span>}
                </button>
                <button className={`tab-btn ${activeTab === 'oc' ? 'active' : ''}`} onClick={() => setActiveTab('oc')}>
                  角色設定 (OC)
                </button>
                <button className={`tab-btn ${activeTab === 'review' ? 'active' : ''}`} onClick={() => setActiveTab('review')}>
                  稿件審閱
                </button>
                <button className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
                  歷程紀錄
                </button>
              </div>

              <div className="tab-content-area">
                
                {activeTab === 'main' && (
                  <div className="tab-details-container" style={{ maxWidth: '800px', margin: '0 auto' }}>
                    
                    <div className="section-card">
                      <div className="section-header-no-border">
                        <h3 className="section-title">自訂委託名稱</h3>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <input type="text" className="form-input" value={customTitle} onChange={(e) => setCustomTitle(e.target.value)} placeholder="給這張單取個好記的名字..." style={{ flex: 1, minWidth: '200px' }} />
                        <button onClick={handleSaveTitle} disabled={saveStatus !== 'idle'} className="action-btn btn-primary" style={{ flex: 'none', width: 'auto' }}>
                          {saveStatus === 'saving' ? '⏳ 儲存中...' : saveStatus === 'success' ? '✅ 成功' : '儲存'}
                        </button>
                      </div>
                    </div>

                    {/* === 補填評價按鈕 (顯示於詳細頁最上方) === */}
                    {canReview && (
                      <div style={{ marginBottom: '20px', padding: '16px', backgroundColor: '#FFFBEB', border: '1px solid #F59E0B', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                        <div>
                          <div style={{ color: '#D97706', fontWeight: 'bold', fontSize: '15px' }}>⭐ 委託已順利結案，別忘了填寫評價！</div>
                          <div style={{ color: '#92400E', fontSize: '13px', marginTop: '4px' }}>填寫評價可以給予繪師最直接的鼓勵。評價權限將在結案後 3 天關閉。</div>
                        </div>
                        <button 
                          onClick={() => setIsReviewModalOpen(true)}
                          className="action-btn"
                          style={{ backgroundColor: '#F59E0B', color: '#FFF', border: 'none', padding: '10px 20px', whiteSpace: 'nowrap' }}
                        >
                          馬上填寫評價
                        </button>
                      </div>
                    )}

                    {originData && (
                      <div className="section-card" style={{ backgroundColor: '#FBFBF9' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #EAE6E1', paddingBottom: '8px', marginBottom: '12px' }}>
                          <h3 className="section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                            🔍 初始需求單 / 媒合軌跡
                          </h3>
                        </div>

                        <div className={isTrajectoryExpanded ? "" : "line-clamp-3"} style={{ fontSize: '13px', color: '#5D4A3E', lineHeight: '1.6', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                          
                          {originData.type === 'showcase_form' ? (
                            <div style={{ paddingBottom: '12px', marginBottom: '12px' }}>
                              <strong style={{ color: '#4A7294' }}>【我填寫的客製化表單】</strong><br/>
                              {originData.answers && originData.answers.length > 0 ? originData.answers.map((qa: any, i: number) => (
                                <div key={i} style={{ marginTop: '8px' }}>
                                  <strong style={{ color: '#A67B3E' }}>Q: {qa.question}</strong><br/>
                                  <span style={{ whiteSpace: 'pre-wrap' }}>A: {Array.isArray(qa.answer) ? qa.answer.join(', ') : (qa.answer || '(未填寫)')}</span>
                                </div>
                              )) : (
                                <div style={{ color: '#A0978D', fontStyle: 'italic', marginTop: '8px' }}>未填寫任何客製化問答。</div>
                              )}
                            </div>
                          ) : (
                            <>
                              <div style={{ paddingBottom: '12px', borderBottom: '1px dashed #DED9D3', marginBottom: '12px' }}>
                                <strong style={{ color: '#A67B3E' }}>【{originData.isOffer ? '繪師' : '委託方'}的原始貼文設定】</strong><br/>
                                <span style={{ whiteSpace: 'pre-wrap' }}>{originData.description}</span>
                              </div>

                              <div>
                                <strong style={{ color: '#4A7294' }}>【{originData.isOffer ? '委託方' : '繪師'}的投遞回覆】</strong><br/>
                                
                                {originData.parsedSnapshot?.answers && originData.parsedSnapshot.answers.length > 0 && (
                                  <div style={{ marginTop: '4px', marginBottom: '8px' }}>
                                    {originData.parsedSnapshot.answers.map((ans: any, idx: number) => (
                                      <div key={idx} style={{ marginTop: '8px' }}>
                                        <strong style={{ color: '#A0978D' }}>Q: {unescapeHtml(ans.question)}</strong><br/>
                                        <span style={{ whiteSpace: 'pre-wrap' }}>A: {unescapeHtml(ans.answer) || '(未填寫)'}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {originData.parsedSnapshot?.message && (
                                  <div style={{ marginTop: '8px' }}>
                                    <strong style={{ color: '#A0978D' }}>備註留言：</strong><br/>
                                    <span style={{ whiteSpace: 'pre-wrap' }}>{unescapeHtml(originData.parsedSnapshot.message)}</span>
                                  </div>
                                )}

                                {!originData.isOffer && (originData.parsedSnapshot?.specialties || originData.parsedSnapshot?.no_gos) && (
                                  <div style={{ marginTop: '10px' }}>
                                    {originData.parsedSnapshot?.specialties && <div style={{ color: '#ff8c00', marginBottom: '4px' }}>舒適圈：{unescapeHtml(originData.parsedSnapshot.specialties)}</div>}
                                    {originData.parsedSnapshot?.no_gos && <div style={{ color: '#e11d48' }}>雷點：{unescapeHtml(originData.parsedSnapshot.no_gos)}</div>}
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </div>

                        <button onClick={() => setIsTrajectoryExpanded(!isTrajectoryExpanded)} style={{ background: 'none', border: 'none', color: '#A67B3E', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', marginTop: '12px', padding: '12px 0 0 0', width: '100%', textAlign: 'center', borderTop: '1px dashed #EAE6E1' }}>
                          {isTrajectoryExpanded ? "▲ 收合內容" : "▼ 展開完整內容"}
                        </button>
                      </div>
                    )}

                    <div className="section-card" style={parsedChanges ? { border: '1px solid #FECACA', boxShadow: '0 4px 12px rgba(254, 202, 202, 0.4)' } : {}}>
                      <h3 className="section-title" style={{ marginBottom: '16px', borderBottom: '1px solid #EAE6E1', paddingBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span>委託規格</span>
                        {parsedChanges && <span style={{ color: '#A05C5C', fontSize: '13px', fontWeight: 'bold' }}>⚠️ 含有待確認異動</span>}
                      </h3>
                      
                      <div className="details-grid">
                        <div className="request-field"><span className="field-label">委託用途：</span>{renderDiffValue('usage_type', selectedOrder.usage_type || '未提供')}</div>
                        <div className="request-field"><span className="field-label">是否急件：</span>{renderDiffValue('is_rush', selectedOrder.is_rush, (v) => v === '是' || v === '1' || v === 1 ? '是' : '否')}</div>
                        <div className="request-field"><span className="field-label">交稿方式：</span>{renderDiffValue('delivery_method', selectedOrder.delivery_method || '未提供')}</div>
                        <div className="request-field"><span className="field-label">繪製範圍：</span>{renderDiffValue('draw_scope', selectedOrder.draw_scope || '未提供')}</div>
                        <div className="request-field"><span className="field-label">人數：</span>{renderDiffValue('char_count', selectedOrder.char_count || 1, (v) => `${v} 人`)}</div>
                        <div className="request-field"><span className="field-label">背景：</span>{renderDiffValue('bg_type', selectedOrder.bg_type || '未提供')}</div>
                        <div className="request-field" style={{ gridColumn: '1 / -1' }}><span className="field-label">備註/附加選項：</span>{renderDiffValue('add_ons', selectedOrder.add_ons || '無')}</div>
                        <div className="request-field" style={{ gridColumn: '1 / -1', marginTop: '8px', borderTop: '1px dashed #EAE6E1', paddingTop: '16px' }}>
                          <span className="field-label">總金額：</span>
                          {renderDiffValue('total_price', selectedOrder.total_price, (v) => `NT$ ${Number(v).toLocaleString()}`)}
                        </div>
                      </div>

                      {parsedChanges && (
                        <div style={{ marginTop: '24px', padding: '16px', backgroundColor: '#FFF5F5', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <div style={{ color: '#A05C5C', fontWeight: 'bold', fontSize: '14px' }}>⚠️ 幕後提出了合約規格異動</div>
                          <div style={{ fontSize: '13px', color: '#7A7269' }}>請確認上方的修改內容（灰色刪除線為原內容，紅色粗體為新內容）。確認無誤後請按下同意以更新合約。</div>
                          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                            <button onClick={() => handleReviewChange('reject')} disabled={isProcessing} className="action-btn btn-outline-danger" style={{ padding: '8px 16px', fontSize: '13px' }}>拒絕修改</button>
                            <button onClick={() => handleReviewChange('approve')} disabled={isProcessing} className="action-btn btn-success" style={{ padding: '8px 16px', fontSize: '13px' }}>{isProcessing ? '處理中...' : '同意並更新合約'}</button>
                          </div>
                        </div>
                      )}

                      {selectedOrder.agreed_memo && (
                        <div style={{ backgroundColor: '#FDFDFB', border: '1px solid #EAE6E1', marginTop: '16px', borderRadius: '12px', padding: '16px' }}>
                          <div style={{ color: '#4A7294', fontWeight: 'bold', fontSize: '13px', marginBottom: '8px' }}>📝 最終確認規格 / 備忘錄 (雙方共識)</div>
                          <div style={{ fontSize: '13px', color: '#5D4A3E', lineHeight: '1.6', whiteSpace: 'pre-wrap', padding: '12px', backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #F4F0EB' }}>
                            {selectedOrder.agreed_memo}
                          </div>
                        </div>
                      )}
                    </div>

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

                {activeTab === 'oc' && (
                  <div className="fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
                    {(() => {
                      let ocData: OCCardData | null = null;
                      try {
                        if (selectedOrder?.oc_snapshot) {
                          ocData = JSON.parse(selectedOrder.oc_snapshot);
                        }
                      } catch (e) {
                        console.error("無法解析 OC 資料", e);
                      }

                      if (!ocData) {
                        return (
                          <div style={{ backgroundColor: '#FFF', borderRadius: '12px', padding: '40px', textAlign: 'center', border: '1px dashed #DED9D3', color: '#A0978D' }}>
                            此委託單尚未綁定任何專屬角色設定卡 (OC)。
                          </div>
                        );
                      }

                      return (
                        <div style={{
                          border: '1px solid #EAE6E1',
                          borderRadius: '12px',
                          overflow: 'hidden',
                          boxShadow: '0 4px 20px rgba(0,0,0,0.02)'
                        }}>
                          <OCDetailCard ocData={ocData} />
                        </div>
                      );
                    })()}
                  </div>
                )}

                {activeTab === 'review' && (
                  <div className="fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
                    
                    {/* 若結案則在審閱頁面也顯示提示 */}
                    {canReview && (
                      <div style={{ marginBottom: '24px', padding: '20px', backgroundColor: '#FFFBEB', border: '1px solid #F59E0B', borderRadius: '12px', textAlign: 'center' }}>
                        <div style={{ color: '#D97706', fontWeight: 'bold', fontSize: '16px', marginBottom: '8px' }}>🎉 委託已圓滿結案！</div>
                        <div style={{ color: '#92400E', fontSize: '14px', marginBottom: '16px' }}>滿意這次的合作嗎？快去給繪師留下評價與鼓勵吧。</div>
                        <button 
                          onClick={() => setIsReviewModalOpen(true)}
                          className="action-btn"
                          style={{ backgroundColor: '#F59E0B', color: '#FFF', border: 'none', padding: '12px 24px', fontSize: '15px' }}
                        >
                          ⭐ 立即填寫評價
                        </button>
                      </div>
                    )}

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
                   <div className="section-card" style={{ maxWidth: '800px', margin: '0 auto' }}>
                     <h3 className="section-title logs-title">歷程紀錄</h3>
                     {logs.length === 0 ? <div className="logs-empty">無歷程紀錄</div> : (
                       <div className="logs-list">
                         {logs.map(log => (
                           <div key={log.id} className={`log-card ${log.actor_role === 'artist' ? 'log-artist' : (log.actor_role === 'system' ? 'log-system' : 'log-client')}`}>
                             <div className="log-meta">
                               {formatLocalTime(log.created_at)} | {log.actor_role === 'artist' ? '繪師' : (log.actor_role === 'system' ? '系統' : '我 (委託人)')}
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