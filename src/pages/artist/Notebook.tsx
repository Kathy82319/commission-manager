// src/pages/artist/Notebook.tsx
import { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import '../../styles/Notebook.css';

import { compressPreviewBlob, getOriginData } from './notebook-components/notebookUtils';
import type { Commission, PaymentRecord, ActionLog, Submission } from './notebook-components/notebookUtils';
import { NotebookSidebar } from './notebook-components/NotebookSidebar';
import { TabDetails } from './notebook-components/TabDetails';
import { TabDelivery } from './notebook-components/TabDelivery';
import { TabLogs } from './notebook-components/TabLogs';
import { TabOC } from './notebook-components/TabOC'; 

export function Notebook() {
  const location = useLocation();
  const navigate = useNavigate(); 
  const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || '';
  const queryParams = new URLSearchParams(location.search);
  const initialSelectedId = queryParams.get('id');
  const initialTab = (queryParams.get('tab') as 'details' | 'delivery' | 'logs' | 'oc' | 'reviews') || 'details';

  const [myId, setMyId] = useState<string>(''); 
  const [isPremium, setIsPremium] = useState<boolean>(false);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const tabs = [
    { id: 'all', label: '全部' },
    { id: 'pending', label: '待確認' },
    { id: 'working', label: '進行中' },
    { id: 'completed', label: '已結單' }
  ];
  const [filter, setFilter] = useState<'all' | 'pending' | 'working' | 'completed'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId);
  const [activeTab, setActiveTab] = useState<'details' | 'delivery' | 'logs' | 'oc' | 'reviews'>(initialTab);

  const [editData, setEditData] = useState<Partial<Commission>>({});
  const [isEditingRequest, setIsEditingRequest] = useState(false);

  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [newPayment, setNewPayment] = useState({ record_date: '', item_name: '', amount: '' });
  
  const [logs, setLogs] = useState<ActionLog[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isUploading, setIsUploading] = useState<string | null>(null);
  const [isTrajectoryExpanded, setIsTrajectoryExpanded] = useState(false);

  // === 新增：評價狀態 ===
  const [commissionReview, setCommissionReview] = useState<any | null>(null);

  // ================= 生命週期與 API (Effects) =================
  useEffect(() => {
    fetch(`${API_BASE}/api/users/me`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => { 
        if (data.success) {
          setMyId(data.data.id); 
          const isPro = data.data.plan_type === 'pro' && (!data.data.pro_expires_at || new Date(data.data.pro_expires_at) > new Date());
          const isTrial = data.data.plan_type === 'trial' && (!data.data.trial_end_at || new Date(data.data.trial_end_at) > new Date());
          setIsPremium(isPro || isTrial);
        }
      })
      .catch(err => console.error("取得使用者身分失敗", err));
  }, [API_BASE]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedId) params.set('id', selectedId);
    params.set('tab', activeTab);
    navigate(`?${params.toString()}`, { replace: true });
  }, [selectedId, activeTab, navigate]);

  const fetchCommissions = async (isInitialLoad = false) => {
    const res = await fetch(`${API_BASE}/api/commissions`, { credentials: 'include' });
    const data = await res.json();
    if (data.success) {
      setCommissions(data.data);
      if (isInitialLoad) {
        const target = initialSelectedId 
          ? data.data.find((c: Commission) => c.id === initialSelectedId)
          : (window.innerWidth >= 1024 && data.data.length > 0 ? data.data[0] : null);

        if (target) {
          setSelectedId(target.id);
          setEditData(target);
          fetchPayments(target.id);
          fetchDeliverables(target.id);
          fetchCommissionReview(target.id);
          
          // 確保從通知點進來時，activeTab 能立刻同步網址上的 reviews 狀態
          const urlTab = queryParams.get('tab') as any;
          if (urlTab === 'reviews') {
            setActiveTab('reviews');
          }
        }
      } else if (!isInitialLoad && selectedId) {
        const target = data.data.find((c: Commission) => c.id === selectedId);
        if (target) setEditData(prev => ({ ...target, ...prev }));
      }
    }
  };

  useEffect(() => { fetchCommissions(true); }, []);

  const evaluatePaymentStatus = async (orderId: string, paymentList: PaymentRecord[], currentOrder: Commission | undefined) => {
    if (!currentOrder) return;
    const totalPaid = paymentList.reduce((sum, p) => sum + p.amount, 0);
    const totalPrice = currentOrder.total_price || 0;
    
    let expectedStatus = 'unpaid';
    if (totalPaid > 0 && totalPaid < totalPrice) expectedStatus = 'partial';
    else if (totalPaid > 0 && totalPaid >= totalPrice) expectedStatus = 'paid';

    if (expectedStatus !== currentOrder.payment_status) {
      try {
        await fetch(`${API_BASE}/api/commissions/${orderId}`, { 
          method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({ payment_status: expectedStatus }) 
        });
        setCommissions(prev => prev.map(c => c.id === orderId ? { ...c, payment_status: expectedStatus } : c));
        setEditData(prev => ({ ...prev, payment_status: expectedStatus }));
      } catch (e) { console.error("自動同步付款狀態失敗", e); }
    }
  };

  const fetchPayments = async (id: string) => {
    const res = await fetch(`${API_BASE}/api/commissions/${id}/payments`, { credentials: 'include' });
    const data = await res.json();
    if (data.success) {
      setPayments(data.data);
      const currentOrder = commissions.find(c => c.id === id);
      if(currentOrder) evaluatePaymentStatus(id, data.data, currentOrder);
    }
  };

  const fetchDeliverables = async (id: string) => {
    const res = await fetch(`${API_BASE}/api/commissions/${id}/deliverables`, { credentials: 'include' });
    const data = await res.json();
    if (data.success) {
      setSubmissions(data.data.submissions || []); 
      
      const fetchedLogs: ActionLog[] = data.data.logs || [];
      const uniqueLogs: ActionLog[] = [];
      const seenLogKeys = new Set<string>();
      for (const log of fetchedLogs) {
        const uniqueKey = `${log.content}_${log.created_at}`;
        if (!seenLogKeys.has(uniqueKey)) {
          seenLogKeys.add(uniqueKey);
          uniqueLogs.push(log);
        }
      }
      setLogs(uniqueLogs);
    }
  };

  // === 獲取單據的評價 ===
  const fetchCommissionReview = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/reviews/artist`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        const rev = data.data.find((r: any) => r.commission_id === id);
        setCommissionReview(rev || null);
      } else {
        setCommissionReview(null);
      }
    } catch (e) {
      setCommissionReview(null);
    }
  };

  // ================= 互動處理與商業邏輯 (Handlers) =================
  const handleSelect = async (order: Commission) => {
    if (selectedId === order.id) return;
    setSelectedId(order.id);
    setEditData(order);
    setIsEditingRequest(false);
    setIsTrajectoryExpanded(false); 
    fetchPayments(order.id);
    fetchDeliverables(order.id);
    fetchCommissionReview(order.id); // 切換單據時拉取評價

    try {
      await fetch(`${API_BASE}/api/commissions/${order.id}`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ last_read_at_artist: new Date().toISOString() })
      });
      fetchCommissions();
    } catch (e) { console.error("更新已讀時間失敗", e); }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveDailyFields = async () => {
    if (!selectedId || !selectedOrder) return;
    const bodyData = selectedOrder.workflow_mode === 'free' 
      ? { ...editData } 
      : { 
          project_name: editData.project_name, 
          payment_method: editData.payment_method, 
          detailed_settings: editData.detailed_settings,
          contact_memo: editData.contact_memo 
        };

    await fetch(`${API_BASE}/api/commissions/${selectedId}`, {
      method: 'PATCH', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyData)
    });
    alert('設定已儲存');
    fetchCommissions();
  };

  const handleStartEditRequest = () => {
    if (selectedOrder) {
      let pendingObj = {};
      if (selectedOrder.pending_changes) {
        try { pendingObj = JSON.parse(selectedOrder.pending_changes); } catch(e) {}
      }
      setEditData({ ...selectedOrder, ...pendingObj });
      setIsEditingRequest(true);
    }
  };

  const handleSubmitRequestFields = async () => {
    if (!selectedId || !selectedOrder) return;
    const changes: Record<string, any> = {};
    const requestFields = ['usage_type', 'is_rush', 'delivery_method', 'draw_scope', 'char_count', 'bg_type', 'add_ons', 'total_price'];
    
    requestFields.forEach(field => {
      const originalValue = selectedOrder[field as keyof Commission];
      const newValue = editData[field as keyof Commission];
      if (newValue !== undefined && newValue !== originalValue) changes[field] = newValue;
    });

    if (Object.keys(changes).length === 0) {
      alert('尚未修改任何欄位，請先修改後再申請。');
      setIsEditingRequest(false); return;
    }

    if (!window.confirm("請確定是否要更改委託單，此異動須經委託人同意方能變更完成")) return;

    const res = await fetch(`${API_BASE}/api/commissions/${selectedId}/change-request`, {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ changes })
    });
    const data = await res.json();
    if (data.success) {
      alert('異動申請已送出！請等待委託方確認。');
      setIsEditingRequest(false);
      fetchCommissions(); fetchDeliverables(selectedId);
    } else alert('送出失敗：' + data.error);
  };

  const handleCancelEditRequest = () => {
    if (selectedOrder) setEditData(selectedOrder);
    setIsEditingRequest(false);
  };

  const handleToggleArchive = async () => {
    if (!selectedId || !selectedOrder) return;
    const isCancelled = selectedOrder.status === 'cancelled';
    const confirmMsg = isCancelled ? '確定要恢復此委託單嗎？' : '確定要將此委託單作廢/封存嗎？';
    if (!window.confirm(confirmMsg)) return;
    
    const res = await fetch(`${API_BASE}/api/commissions/${selectedId}`, {
      method: 'PATCH', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: isCancelled ? 'quote_created' : 'cancelled' })
    });
    
    const data = await res.json();
    if (!data.success) {
      alert(data.message || "操作失敗");
    }
    fetchCommissions();
  };

  const handleForceComplete = async () => {
    if (!selectedId || !selectedOrder) return;
    if (!window.confirm('確定要強制結案嗎？這將會把訂單狀態直接改為已完成。')) return;
    
    const res = await fetch(`${API_BASE}/api/commissions/${selectedId}`, {
      method: 'PATCH', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed' })
    });
    
    const data = await res.json();
    if (!data.success) {
      alert(data.message || "操作失敗");
    }
    fetchCommissions();
  };

  const handlePaymentStatusChange = async (newStatus: string) => {
    if (!selectedId) return;
    await fetch(`${API_BASE}/api/commissions/${selectedId}`, { 
      method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ payment_status: newStatus }) 
    });
    fetchCommissions();
  };

  const handleAddPayment = async () => {
    const amountNum = Number(newPayment.amount);
    if (!selectedId || !newPayment.record_date || !newPayment.item_name || !newPayment.amount) return alert("請填寫完整的記帳資訊喔！");
    if (isNaN(amountNum)) return alert("請輸入有效的金額數值！");

    const res = await fetch(`${API_BASE}/api/commissions/${selectedId}/payments`, { 
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ ...newPayment, amount: amountNum }) 
    });
    const data = await res.json();
    if (data.success) {
      setNewPayment({ record_date: '', item_name: '', amount: '' }); 
      fetchPayments(selectedId);
    } else alert('記帳失敗：' + data.error);
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!selectedId || !window.confirm('確定要刪除此筆財務紀錄嗎？')) return;
    await fetch(`${API_BASE}/api/commissions/${selectedId}/payments/${paymentId}`, { method: 'DELETE', credentials: 'include' });
    fetchPayments(selectedId);
  };

  const copyLink = (id: string) => {
    const msg = "[注意]：此連結具備「綁定」特性。\n\n當委託人點擊並登入後，此訂單將永久綁定該帳號。若綁定錯誤，您將需要刪除並重新建單。\n\n確定要複製連結嗎？";
    if (window.confirm(msg)) {
      const link = `${window.location.origin}/quote/${id}`;
      navigator.clipboard.writeText(link).then(() => alert('專屬連結已複製！請私下傳送給對應的委託人。'));
    }
  };

  const handleR2FileUpload = async (stageKey: string, resultBlobs: { preview: Blob; original?: Blob }) => {
    if (!selectedId) return;
    setIsUploading(stageKey);

    try {
      const lowResPreviewBlob = await compressPreviewBlob(resultBlobs.preview, 800, 0.5);
      const previewType = 'image/jpeg'; 
      
      const ticketRes = await fetch(`${API_BASE}/api/r2/upload-url`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentType: previewType, bucketType: 'public', originalName: `preview_${stageKey}.jpg`, folder: 'commissions' })
      });
      const ticketData = await ticketRes.json();
      if (!ticketData.success) throw new Error(ticketData.error || "無法取得預覽圖上傳通行證");
      
      const pubRes = await fetch(ticketData.uploadUrl, { method: 'PUT', body: lowResPreviewBlob, headers: { 'Content-Type': previewType } });
      if (!pubRes.ok) throw new Error("預覽圖上傳遭伺服器拒絕");

      const publicFinalUrl = `https://pub-1d4bcc7f19324c0d95d7bfdfeb1a69e2.r2.dev/${ticketData.fileName}`;
      let finalUrlToSave = publicFinalUrl; 

      if (stageKey === 'final' && resultBlobs.original) {
        const origType = resultBlobs.original.type || 'application/octet-stream';
        const origName = (resultBlobs.original as File).name || 'final_original.zip';
        
        const privateTicketRes = await fetch(`${API_BASE}/api/r2/upload-url`, {
          method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contentType: origType, bucketType: 'private', originalName: origName, folder: 'commissions' })
        });
        const privateTicketData = await privateTicketRes.json();
        if (!privateTicketData.success) throw new Error(privateTicketData.error || "無法取得原檔上傳通行證");

        const privRes = await fetch(privateTicketData.uploadUrl, { method: 'PUT', body: resultBlobs.original, headers: { 'Content-Type': origType } });
        if (!privRes.ok) throw new Error("原檔上傳遭伺服器拒絕");
        finalUrlToSave = `${publicFinalUrl}|${privateTicketData.fileName}`;
      }

      const submitRes = await fetch(`${API_BASE}/api/commissions/${selectedId}/submit`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: stageKey, file_url: finalUrlToSave })
      });

      if ((await submitRes.json()).success) {
        alert(`${stageKey === 'final' ? '完稿預覽與原檔' : '稿件'}已成功交付！`);
        fetchCommissions(); fetchDeliverables(selectedId);
      }
    } catch (err: any) { alert(err.message || "上傳過程中發生錯誤"); } 
    finally { setIsUploading(null); }
  };

  // ================= 資料格式化與計算 (Computed) =================
  const getPaymentBadge = (payment_status: string) => {
    if (payment_status === 'paid') return { text: '已收全額', className: 'badge-paid' };
    if (payment_status === 'partial') return { text: '已收訂金', className: 'badge-partial' };
    return { text: '尚未付款', className: 'badge-unpaid' };
  };

  const getStatusBadge = (status: string) => {
    if (status === 'completed') return { text: '已結案', className: 'badge-completed' };
    if (status === 'cancelled') return { text: '已作廢', className: 'badge-cancelled' };
    return null;
  };

  const getClientNameDisplay = (order: Commission) => {
    if (order.client_name) return order.contact_memo ? `${order.client_name} (${order.contact_memo})` : order.client_name;
    return order.contact_memo ? order.contact_memo : '(未綁定)';
  };

  const filteredOrders = useMemo(() => {
    return commissions.filter(order => {
      if (myId && order.artist_id !== myId) return false;

      let tabMatch = true;
      if (filter === 'completed') tabMatch = order.status === 'completed';
      else if (filter === 'working') tabMatch = order.status !== 'completed' && order.status !== 'cancelled';
      else if (filter === 'pending') tabMatch = order.status === 'quote_created' || order.status === 'pending' || order.status === 'unpaid';
      if (!tabMatch) return false;

      if (searchTerm.trim().length >= 2) {
        const term = searchTerm.toLowerCase();
        const paymentLabel = getPaymentBadge(order.payment_status).text;
        return (
          (order.client_name && order.client_name.toLowerCase().includes(term)) ||
          (order.contact_memo && order.contact_memo.toLowerCase().includes(term)) || 
          (order.project_name && order.project_name.toLowerCase().includes(term)) ||
          (order.id.toLowerCase().includes(term)) ||
          (order.client_public_id && order.client_public_id.toLowerCase().includes(term)) ||
          (paymentLabel.includes(term))
        );
      }
      return true;
    });
  }, [commissions, filter, searchTerm, myId]);

  const selectedOrder = commissions.find(c => c.id === selectedId);
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const totalUnpaid = selectedOrder ? selectedOrder.total_price - totalPaid : 0;
  const originData = getOriginData(selectedOrder);

  // ================= 畫面渲染 (Render) =================
  return (
    <div className="notebook-page">
      <div className="notebook-container">
        
        <NotebookSidebar 
          filteredOrders={filteredOrders}
          selectedId={selectedId}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          filter={filter}
          setFilter={setFilter}
          tabs={tabs}
          handleSelect={handleSelect}
          getPaymentBadge={getPaymentBadge}
          getStatusBadge={getStatusBadge}
          getClientNameDisplay={getClientNameDisplay}
        />

        <div className={`notebook-main ${!selectedId ? 'mobile-hide' : ''}`}>
          {!selectedOrder ? (
            <div className="main-empty">請由列表選擇委託單以檢視詳情</div> 
          ) : (
            <div className="main-content-wrapper">
              
              <div className="main-header">
                <div className="main-header-info">
                  <button className="mobile-back-btn" onClick={() => setSelectedId(null)}>返回列表</button>
                  <div className="main-title-container" style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <h2 className="main-title" style={{ margin: 0 }}>{getClientNameDisplay(selectedOrder)}</h2>
                    {selectedOrder.client_custom_label === '黑名單' && (
                      <span className="blacklist-alert-tag" onClick={() => navigate(`/artist/customers?id=${selectedOrder.crm_record_id}`)} style={{ cursor: 'pointer', color: '#FF4D4D', padding: '4px 10px', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', border: '1px solid #FF4D4D' }}>
                        查看黑單原因
                      </span>
                    )}
                  </div>
                  <div className="main-subtitle">項目：{selectedOrder.project_name || '未命名項目'}</div>
                  <div className="main-meta-row">
                    <span>單號：{selectedOrder.id}</span>
                    <span>委託人編號：{selectedOrder.client_public_id || '尚未綁定'}</span>
                    {originData ? (
                      <span className="card-mode-badge" style={{ backgroundColor: originData.type === 'showcase_form' ? '#4A7294' : '#8E7E8E', color: '#fff' }}>
                        來源：{originData.type === 'showcase_form' ? '接委託表單' : '許願池'}
                      </span>
                    ) : (
                      <span className={`card-mode-badge ${selectedOrder.workflow_mode === 'free' ? 'mode-free' : 'mode-standard'}`}>
                        {selectedOrder.workflow_mode === 'free' ? '自由紀錄' : '標準委託'}
                      </span>
                    )}
                  </div>
                  {getStatusBadge(selectedOrder.status) && (
                    <div className="main-status-wrapper">
                      <span className={`main-status-badge ${getStatusBadge(selectedOrder.status)!.className}`}>{getStatusBadge(selectedOrder.status)!.text}</span>
                    </div>
                  )}
                </div>
                
                <div className="main-header-actions">
                  
                  {selectedOrder.status !== 'completed' && selectedOrder.status !== 'cancelled' && (
                    <button className="action-btn btn-outline-success" onClick={handleForceComplete}>強制結案</button>
                  )}

                  
                  {selectedOrder.status !== 'completed' && selectedOrder.status !== 'cancelled' ? (
                    <button className="action-btn btn-outline-danger" onClick={handleToggleArchive}>作廢封存</button>
                  ) : (
                    isPremium && selectedOrder.status === 'cancelled' ? (
                      <button className="action-btn btn-outline-success" onClick={handleToggleArchive}>恢復預訂</button>
                    ) : null
                  )}

                  {!selectedOrder.is_external && (
                    <button className="action-btn btn-outline-default" onClick={() => copyLink(selectedOrder.id)}>複製連結</button>
                  )}
                  
                  {selectedOrder.client_id && selectedOrder.client_id !== 'guest' && (
                    <button className="action-btn btn-primary" onClick={() => {
                      const targetUrl = originData?.inquiry_id 
                        ? `/inquiry/workspace/${originData.inquiry_id}` 
                        : `/workspace/${selectedOrder.id}?role=artist`;
                      navigate(targetUrl);
                    }}>進入聊天室</button>
                  )}
                </div>
              </div>

              <div className="scroll-tabs">
                <button className={`tab-btn ${activeTab === 'details' ? 'active' : ''}`} onClick={() => setActiveTab('details')}>委託單細項</button>
                <button className={`tab-btn ${activeTab === 'oc' ? 'active' : ''}`} onClick={() => setActiveTab('oc')}>角色設定 (OC)</button>
                <button className={`tab-btn ${activeTab === 'delivery' ? 'active' : ''}`} onClick={() => setActiveTab('delivery')}>檔案交付</button>
                <button className={`tab-btn ${activeTab === 'logs' ? 'active' : ''}`} onClick={() => setActiveTab('logs')}>歷程紀錄</button>
                <button className={`tab-btn ${activeTab === 'reviews' ? 'active' : ''}`} onClick={() => setActiveTab('reviews')}>客戶評價</button>
              </div>

              <div className="tab-content-area">
                {activeTab === 'details' && (
                  <TabDetails 
                    selectedOrder={selectedOrder} selectedId={selectedId as string}
                    editData={editData} setEditData={setEditData}
                    payments={payments} newPayment={newPayment} setNewPayment={setNewPayment}
                    handleAddPayment={handleAddPayment} handleDeletePayment={handleDeletePayment} handlePaymentStatusChange={handlePaymentStatusChange}
                    totalPaid={totalPaid} totalUnpaid={totalUnpaid}
                    originData={originData}
                    isTrajectoryExpanded={isTrajectoryExpanded} setIsTrajectoryExpanded={setIsTrajectoryExpanded}
                    isEditingRequest={isEditingRequest}
                    handleSaveDailyFields={handleSaveDailyFields} handleStartEditRequest={handleStartEditRequest} handleCancelEditRequest={handleCancelEditRequest} handleSubmitRequestFields={handleSubmitRequestFields}
                  />
                )}
                {activeTab === 'delivery' && (
                  <TabDelivery 
                    selectedOrder={selectedOrder} submissions={submissions} logs={logs} 
                    isUploading={isUploading} handleR2FileUpload={handleR2FileUpload} 
                  />
                )}
                {activeTab === 'logs' && (
                  <TabLogs logs={logs} />
                )}
                
                {activeTab === 'oc' && (
                  <TabOC selectedOrder={selectedOrder} />
                )}

                {/* === 新增：客戶評價分頁內容 === */}
                {activeTab === 'reviews' && (
                  <div className="fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
                    {commissionReview ? (
                      <div className="section-card" style={{ backgroundColor: '#FFF', borderRadius: '12px', padding: '24px', border: '1px solid #EAE6E1' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #EAE6E1', paddingBottom: '12px' }}>
                           <h3 className="section-title" style={{ margin: 0 }}>⭐ 客戶評價</h3>
                           <span style={{ fontSize: '13px', color: '#64748B' }}>{new Date(commissionReview.created_at).toLocaleDateString()}</span>
                        </div>
                        
                        <div style={{ color: '#F59E0B', fontSize: '24px', marginBottom: '16px' }}>
                           {'★'.repeat(commissionReview.rating) + '☆'.repeat(5 - commissionReview.rating)}
                        </div>
                        
                        <div style={{ padding: '16px', backgroundColor: '#F8FAFC', borderRadius: '8px', whiteSpace: 'pre-wrap', color: '#334155', lineHeight: '1.6', fontSize: '14px' }}>
                           {commissionReview.content || '(無文字評價)'}
                        </div>
                        
                        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', flexWrap: 'wrap', gap: '12px' }}>
                           <div style={{ color: '#64748B' }}>
                             由 <strong style={{ color: '#334155' }}>{commissionReview.client_anonymous ? '匿名委託人' : getClientNameDisplay(selectedOrder)}</strong> 提供
                           </div>
                           
                           <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                             {commissionReview.is_public ? (
                               <span style={{ color: '#10B981', fontWeight: 'bold' }}>✓ 已公開至個人頁</span>
                             ) : (
                               <span style={{ color: '#94A3B8' }}>未公開</span>
                             )}
                             <button 
                               onClick={() => navigate('/artist/settings?tab=reviews')} 
                               className="action-btn btn-outline-default" 
                               style={{ padding: '6px 12px', fontSize: '12px' }}
                             >
                               前往管理
                             </button>
                           </div>
                        </div>
                      </div>
                    ) : (
                      <div className="section-card" style={{ textAlign: 'center', padding: '40px 20px', color: '#94A3B8' }}>
                         {selectedOrder?.status === 'completed' 
                           ? '委託人尚未填寫評價，或已超過 3 日評價期限。' 
                           : '此委託單尚未結案，目前無法產生評價。'}
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