// src/pages/artist/Notebook.tsx
import { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ImageUploader } from '../../components/ImageUploader'; 
import DOMPurify from 'dompurify'; 
import '../../styles/Notebook.css';

interface Commission {
  id: string; client_name: string; contact_memo: string; project_name: string; order_date: string;
  total_price: number; payment_status: string; status: string; current_stage: string; is_external: number;
  usage_type: string; is_rush: string; delivery_method: string; payment_method: string;
  draw_scope: string; char_count: number; bg_type: string; add_ons: string; detailed_settings: string;
  pending_changes?: string; workflow_mode: string; queue_status: string;
  type_name?: string; latest_message_at?: string; last_read_at_artist?: string;
  client_public_id?: string;
  agreed_tos_snapshot?: string; 
  // 🌟 補上後端透傳的 CRM 資訊
  client_custom_label?: string;
  crm_record_id?: string;
}

interface PaymentRecord { id: string; record_date: string; item_name: string; amount: number; }
interface ActionLog { id: string; created_at: string; actor_role: string; action_type: string; content: string; }
interface Submission { id: string; stage: string; file_url: string; version: number; created_at: string; private_file_key?: string; }

// 🌟 新增：時間格式化輔助函式 (含時分秒)
const formatLocalTime = (dateStr: string) => {
  if (!dateStr) return '';
  const utcStr = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T') + 'Z';
  return new Date(utcStr).toLocaleString('zh-TW', { 
    hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
};

// 🌟 新增：日期格式化輔助函式 (僅日期)
const formatLocalDate = (dateStr: string) => {
  if (!dateStr) return '';
  const utcStr = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T') + 'Z';
  return new Date(utcStr).toLocaleDateString('zh-TW');
};

const parseTime = (dateStr?: string) => {
  if (!dateStr) return 0;
  return new Date(dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T') + 'Z').getTime();
};

async function compressPreviewBlob(originalBlob: Blob, maxWidth = 800, quality = 0.5): Promise<Blob> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = (maxWidth / width) * height;
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(originalBlob); return; }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => { resolve(blob || originalBlob); }, 'image/jpeg', quality);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(originalBlob);
  });
}

export function Notebook() {
  const location = useLocation();
  const navigate = useNavigate(); 
  const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || '';
  const queryParams = new URLSearchParams(location.search);
  const initialSelectedId = queryParams.get('id');
  const initialTab = (queryParams.get('tab') as 'details' | 'delivery' | 'logs') || 'details';

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
  const [activeTab, setActiveTab] = useState<'details' | 'delivery' | 'logs'>(initialTab);

  const [editData, setEditData] = useState<Partial<Commission>>({});
  const [isEditingRequest, setIsEditingRequest] = useState(false);

  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [newPayment, setNewPayment] = useState({ record_date: '', item_name: '', amount: '' });
  
  const [logs, setLogs] = useState<ActionLog[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isUploading, setIsUploading] = useState<string | null>(null);

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
        }
      } else if (!isInitialLoad && selectedId) {
        const target = data.data.find((c: Commission) => c.id === selectedId);
        if (target) setEditData(prev => ({ ...target, ...prev }));
      }
    }
  };

  useEffect(() => { fetchCommissions(true); }, []);

  const fetchPayments = async (id: string) => {
    const res = await fetch(`${API_BASE}/api/commissions/${id}/payments`, { credentials: 'include' });
    const data = await res.json();
    if (data.success) setPayments(data.data);
  };

  const fetchDeliverables = async (id: string) => {
    const res = await fetch(`${API_BASE}/api/commissions/${id}/deliverables`, { credentials: 'include' });
    const data = await res.json();
    if (data.success) {
      setSubmissions(data.data.submissions || []); 
      setLogs(data.data.logs || []);
    }
  };

  const handleSelect = async (order: Commission) => {
    if (selectedId === order.id) return;
    setSelectedId(order.id);
    setEditData(order);
    setIsEditingRequest(false);
    fetchPayments(order.id);
    fetchDeliverables(order.id);

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
      : { project_name: editData.project_name, payment_method: editData.payment_method, detailed_settings: editData.detailed_settings };

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
    
    await fetch(`${API_BASE}/api/commissions/${selectedId}`, {
      method: 'PATCH', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: isCancelled ? 'quote_created' : 'cancelled' })
    });
    fetchCommissions();
  };

  const handleForceComplete = async () => {
    if (!selectedId || !selectedOrder) return;
    if (!window.confirm('確定要強制結案嗎？這將會把訂單狀態直接改為已完成。')) return;
    
    await fetch(`${API_BASE}/api/commissions/${selectedId}`, {
      method: 'PATCH', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed' })
    });
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
    if (isNaN(amountNum) || amountNum <= 0) return alert("請輸入有效的金額！");

    const res = await fetch(`${API_BASE}/api/commissions/${selectedId}/payments`, { 
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ ...newPayment, amount: amountNum }) 
    });
    const data = await res.json();
    if (data.success) {
      setNewPayment({ record_date: '', item_name: '', amount: '' }); fetchPayments(selectedId);
    } else alert('記帳失敗：' + data.error);
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!selectedId || !window.confirm('確定要刪除此筆財務紀錄嗎？')) return;
    await fetch(`${API_BASE}/api/commissions/${selectedId}/payments/${paymentId}`, { method: 'DELETE', credentials: 'include' });
    fetchPayments(selectedId);
  };

  const copyLink = (id: string) => {
    const msg = "⚠️ 注意：此連結具備「綁定」特性。\n\n當委託人點擊並登入後，此訂單將永久綁定該帳號。若綁定錯誤，您將需要刪除並重新建單。\n\n確定要複製連結嗎？";
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

  const getPaymentBadge = (payment_status: string) => {
    if (payment_status === 'paid') return { text: '已收全額', className: 'badge-paid' };
    if (payment_status === 'partial') return { text: '已收訂金', className: 'badge-partial' };
    return { text: '尚未付款', className: 'badge-unpaid' };
  };

  const filteredOrders = useMemo(() => {
    return commissions.filter(order => {
      let tabMatch = true;
      if (filter === 'completed') tabMatch = order.status === 'completed';
      else if (filter === 'working') tabMatch = order.status !== 'completed' && order.status !== 'cancelled';
      else if (filter === 'pending') tabMatch = order.status === 'quote_created' || order.status === 'pending';
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
  }, [commissions, filter, searchTerm]);

  const selectedOrder = commissions.find(c => c.id === selectedId);
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const totalUnpaid = selectedOrder ? selectedOrder.total_price - totalPaid : 0;
  const getDualName = (order: Commission) => `${order.contact_memo || '未知'} (${order.client_name ? `暱稱: ${order.client_name}` : '未綁定'})`;
  
  const getStatusBadge = (status: string) => {
    if (status === 'completed') return { text: '已結案', className: 'badge-completed' };
    if (status === 'cancelled') return { text: '已作廢', className: 'badge-cancelled' };
    return null;
  };

  const isStageActuallyReviewed = (stageNameCH: string) => {
    return logs.some(log => log.actor_role === 'client' && (log.content.includes(`已閱覽 ${stageNameCH}`) || log.content.includes(`檢視 ${stageNameCH}`) || log.content.includes(`同意 ${stageNameCH}`)));
  };

  const renderStageBox = (title: string, stageKey: string, isReviewing: boolean, isPassed: boolean) => {
    const sub = submissions.find(s => s.stage === stageKey);
    const isFinal = stageKey === 'final';
    const isRejected = selectedOrder?.current_stage === `${stageKey}_drawing` && !!sub;
    const isUnbound = !selectedOrder?.client_public_id;
    const isFreeMode = selectedOrder?.workflow_mode === 'free';
  
    let headerClass = 'stage-pending', statusTag = '等待繪製上傳...';
    
    if (!sub) { headerClass = 'stage-empty'; } 
    else if (isFreeMode) { headerClass = 'stage-passed'; statusTag = '✓ 檔案已上傳 (自由模式)'; } 
    else if (isUnbound) { headerClass = 'stage-unbound'; statusTag = '⚠️ 等待委託人綁定'; } 
    else if (isPassed) { headerClass = 'stage-passed'; statusTag = isFinal ? '✓ 委託人已同意 (原檔已解鎖)' : '✓ 委託人已閱覽'; } 
    else if (isReviewing) { headerClass = 'stage-reviewing'; statusTag = '⏳ 待委託人確認'; } 
    else if (isRejected) { headerClass = 'stage-rejected'; statusTag = '⚠️ 委託人已退回修改'; } 
    else { headerClass = 'stage-passed'; statusTag = '✓ 稿件已上傳 (待閱覽)'; }
  
    return (
      <div className="stage-box">
        <div className={`stage-box-header ${headerClass}`}>
          <span>{title}</span> <span className="stage-status">{statusTag}</span>
        </div>
        <div className="stage-box-content">
          {isFinal && !isFreeMode && <div className="stage-notice">
            💡 上傳說明：系統會自動產生「浮水印預覽圖」供委託人確認。委託人按下同意後，才能下載您上傳的高畫質原檔。
          </div>}
          {isUploading === stageKey ? (
            <div className="stage-loading">檔案處理中，請稍候...</div>
          ) : (
            <ImageUploader 
              onUpload={(blobs) => handleR2FileUpload(stageKey, blobs)}
              withWatermark={!isFreeMode} watermarkText="SAMPLE" existingUrl={sub?.file_url?.split('|')[0]} isFinal={isFinal} 
              metadata={sub ? { version: sub.version, date: formatLocalDate(sub.created_at) } : undefined}
              buttonText={sub ? "重新交付 (覆蓋版本)" : "點擊上傳圖檔"}
            />
          )}
        </div>
      </div>
    );
  };

  const renderRequestField = (label: string, fieldKey: keyof Commission, type: 'text' | 'number' | 'select' = 'text', suffix: string = '', options: string[] = []) => {
    if (!selectedOrder) return null;
    const isFreeMode = selectedOrder.workflow_mode === 'free';
    const canDirectEdit = isEditingRequest || isFreeMode;
    let pendingObj: Record<string, any> = {};
    if (selectedOrder.pending_changes && !isFreeMode) { try { pendingObj = JSON.parse(selectedOrder.pending_changes); } catch(e) {} }
    const originalValue = selectedOrder[fieldKey];
    const pendingValue = pendingObj[fieldKey];
    const hasPending = pendingValue !== undefined && pendingValue !== originalValue;

    return (
      <div className="request-field">
        <span className="field-label">{label}</span>
        {canDirectEdit ? (
          type === 'select' ? (
            <select className="form-input" value={(editData[fieldKey] as string) || ''} onChange={e => setEditData({...editData, [fieldKey]: e.target.value})}>
              <option value="">請選擇</option>{options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          ) : (
            <input className="form-input" type={type} value={editData[fieldKey] || ''} onChange={e => setEditData({...editData, [fieldKey]: type === 'number' ? Number(e.target.value) : e.target.value})} />
          )
        ) : (
          <div className="field-display">
            {hasPending ? (
              <div>
                <span className="field-strikethrough">{originalValue}{suffix}</span>
                <span className="field-pending">待異動：{pendingValue}{suffix}</span>
              </div>
            ) : (<span className="field-value">{originalValue || '-'}{suffix}</span>)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="notebook-page">
      <div className="notebook-container">
        
          <div className={`notebook-sidebar ${selectedId ? 'mobile-hide' : ''}`}>
          <div className="sidebar-header">
            <span className="sidebar-title">委託單列表</span>
            <div className="sidebar-controls">
              <input type="text" className="form-input sidebar-search-input" placeholder="🔍 搜尋暱稱/單號..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              <select className="form-input sidebar-filter" value={filter} onChange={e => setFilter(e.target.value as any)}>
                {tabs.map(tab => <option key={tab.id} value={tab.id}>{tab.label}</option>)}
              </select>
            </div>
          </div>


          <div className="sidebar-list-container">
            {filteredOrders.map(order => {
              const payBadge = getPaymentBadge(order.payment_status);
              const statusBadge = getStatusBadge(order.status);
              const dateStr = formatLocalDate(order.order_date); // 🌟 使用修正後的日期顯示
              const isSelected = selectedId === order.id;
              const hasNewMsg = parseTime(order.latest_message_at) > parseTime(order.last_read_at_artist);
              
              return (
                <div key={order.id} onClick={() => handleSelect(order)} className={`sidebar-card ${isSelected ? 'selected' : ''} ${order.status === 'cancelled' ? 'cancelled' : ''}`}>
                  <div className="card-meta-row">
                    <span>{dateStr}</span>
                    {/* 列表新增黑名單標籤 */}
                    {order.client_custom_label === '黑名單' && (
                      <span className="card-mode-badge mode-blacklist">黑名單</span>
                    )}
                   
                  </div>
                  <div className="card-title-row">
                    <span className="card-client-name" title={getDualName(order)}>{getDualName(order)}</span>
                    <span className="card-price">NT$ {order.total_price}</span>
                  </div>
                  <div className="card-project-row">
                    <span className="card-project-name">項目：{order.project_name || order.type_name || '未命名項目'}</span>
                  </div>
                  <div className="card-info-row">
                    <span>單號：{order.id.split('-')[1] || order.id}</span>
                    <span>委託人：{order.client_public_id || '未綁定'}</span>
                    
                  </div>
                  <div className="card-tags-row">
                    <span className={`card-tag ${payBadge.className}`}>{payBadge.text}</span>
                    {statusBadge && <span className={`card-tag ${statusBadge.className}`}>{statusBadge.text}</span>}
                    {order.queue_status && <span className="card-tag badge-queue">{order.queue_status}</span>}
                    {hasNewMsg && <span className="card-tag badge-new-msg">☆新訊息</span>}
                  </div>
                </div>
              );
            })}
            {filteredOrders.length === 0 && <div className="sidebar-empty">沒有符合條件的委託單</div>}
          </div>
        </div>

        <div className={`notebook-main ${!selectedId ? 'mobile-hide' : ''}`}>
          {!selectedOrder ? (
            <div className="main-empty">請由列表選擇委託單以檢視詳情</div> 
          ) : (
            <div className="main-content-wrapper">
              
              <div className="main-header">
                <div className="main-header-info">
                  
                  <button className="mobile-back-btn" onClick={() => setSelectedId(null)}>
                    ⬅ 返回列表
                  </button>

                  <div className="main-title-container" style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <h2 className="main-title" style={{ margin: 0 }}>{getDualName(selectedOrder)}</h2>
                    {selectedOrder.client_custom_label === '黑名單' && (
                      <span 
                        className="blacklist-alert-tag" 
                        onClick={() => navigate(`/artist/customers?id=${selectedOrder.crm_record_id}`)}
                        style={{ cursor: 'pointer', color: '#FF4D4D', padding: '4px 10px', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', border: '1px solid #FF4D4D' }}
                      >
                        查看黑單原因
                      </span>
                    )}
                  </div>

                  <div className="main-subtitle">項目：{selectedOrder.project_name || '未命名項目'}</div>
                  <div className="main-meta-row">
                    <span>日期：{formatLocalDate(selectedOrder.order_date)}</span> {/* 🌟 修正後的日期顯示 */}
                    <span>單號：{selectedOrder.id}</span>
                    <span>委託人編號：{selectedOrder.client_public_id || '尚未綁定'}</span>
                      <span className={`card-mode-badge ${selectedOrder.workflow_mode === 'free' ? 'mode-free' : 'mode-standard'}`}>
                      {selectedOrder.workflow_mode === 'free' ? '自由紀錄' : '標準委託'}
                    </span>
                  </div>
                  {getStatusBadge(selectedOrder.status) && (
                    <div className="main-status-wrapper">
                      <span className={`main-status-badge ${getStatusBadge(selectedOrder.status)!.className}`}>
                        {getStatusBadge(selectedOrder.status)!.text}
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="main-header-actions">
                  {selectedOrder.status !== 'completed' && selectedOrder.status !== 'cancelled' && (
                    <button className="action-btn btn-outline-success" onClick={handleForceComplete}>強制結案</button>
                  )}
                  <button className={`action-btn ${selectedOrder.status === 'cancelled' ? 'btn-outline-success' : 'btn-outline-danger'}`} onClick={handleToggleArchive}>
                    {selectedOrder.status === 'cancelled' ? '恢復預訂' : '作廢封存'}
                  </button>
                  {!selectedOrder.is_external && (
                    <button className="action-btn btn-outline-default" onClick={() => copyLink(selectedOrder.id)}>複製連結</button>
                  )}
                  <button className="action-btn btn-primary" onClick={() => navigate(`/workspace/${selectedOrder.id}?role=artist`)}>進入聊天室</button>
                </div>
              </div>

              <div className="scroll-tabs">
                <button className={`tab-btn ${activeTab === 'details' ? 'active' : ''}`} onClick={() => setActiveTab('details')}>委託單細項</button>
                <button className={`tab-btn ${activeTab === 'delivery' ? 'active' : ''}`} onClick={() => setActiveTab('delivery')}>檔案交付</button>
                <button className={`tab-btn ${activeTab === 'logs' ? 'active' : ''}`} onClick={() => setActiveTab('logs')}>歷程紀錄</button>
              </div>

              <div className="tab-content-area">
                
                {activeTab === 'details' && (
                  <div className="tab-details-container">
                    
                    <div className="section-card">
                      <div className="section-header">
                        <h3 className="section-title">財務與收款狀態</h3>
                        <div className="payment-status-wrapper">
                          <span className="payment-status-label">帳務狀態：</span>
                          <select className="form-input select-status" value={selectedOrder.payment_status || 'unpaid'} onChange={(e) => handlePaymentStatusChange(e.target.value)}>
                            <option value="unpaid">未收款</option><option value="partial">已收訂金</option><option value="paid">已收款</option>
                          </select>
                        </div>
                      </div>

                      <div className="payment-inputs">
                        <input type="date" className="form-input" value={newPayment.record_date} onChange={e => setNewPayment({...newPayment, record_date: e.target.value})} />
                        <input type="text" className="form-input" placeholder="項目 (如: 訂金)" value={newPayment.item_name} onChange={e => setNewPayment({...newPayment, item_name: e.target.value})} />
                        <input type="number" className="form-input" placeholder="金額" value={newPayment.amount} onChange={e => setNewPayment({...newPayment, amount: e.target.value})} />
                        <button className="action-btn btn-primary btn-add-payment" onClick={handleAddPayment}>+ 記帳</button>
                      </div>

                      <div className="table-responsive">
                        <table className="custom-table">
                          <tbody>
                            {payments.length === 0 && <tr><td colSpan={4} className="table-empty">尚無記帳紀錄</td></tr>}
                            {payments.map(p => (
                              <tr key={p.id} className="table-row">
                                <td className="col-date">{p.record_date}</td>
                                <td className="col-item">{p.item_name}</td>
                                <td className="col-amount">+ NT$ {p.amount}</td>
                                <td style={{ textAlign: 'right' }}><button className="btn-delete" onClick={() => handleDeletePayment(p.id)}>刪除</button></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="payment-summary">
                        <div className="summary-item">總金額：<span className="summary-val total">${selectedOrder.total_price}</span></div>
                        <div className="summary-item">已收款：<span className="summary-val paid">${totalPaid}</span></div>
                        <div className="summary-item">未付款：<span className="summary-val unpaid">${totalUnpaid > 0 ? totalUnpaid : 0}</span></div>
                      </div>
                    </div>

                    <div className="section-card">
                      <div className="section-header-no-border">
                        <h3 className="section-title">委託單細項</h3>
                        <div className="mode-badges">
                          {isEditingRequest && <span className="badge-edit-mode">異動編輯模式</span>}
                          {selectedOrder.workflow_mode === 'free' && <span className="badge-free-mode">自由紀錄模式</span>}
                        </div>
                      </div>
                      
                      <div className="details-grid">
                        {renderRequestField('項目名稱 (繪師自訂)：', 'project_name')}
                        {renderRequestField('交易方式 (繪師自訂)：', 'payment_method')}
                        {renderRequestField('委託用途：', 'usage_type')}
                        {renderRequestField('是否急件：', 'is_rush', 'select', '', ['否', '是'])}
                        {renderRequestField('交稿方式：', 'delivery_method')}
                        {renderRequestField('總金額：', 'total_price', 'number')}
                        {renderRequestField('繪畫範圍：', 'draw_scope')}
                        {renderRequestField('人物數量：', 'char_count', 'number', ' 人')}
                        {renderRequestField('背景設定：', 'bg_type')}
                        {renderRequestField('附加選項：', 'add_ons')}
                      </div>

                      <div className="detailed-settings-wrapper">
                        <span className="field-label">詳細設定：(委託方不可見)</span>
                        <textarea className="form-input textarea-large" value={editData.detailed_settings || ''} onChange={e => setEditData({...editData, detailed_settings: e.target.value})} />
                      </div>

                      <div className="tos-snapshot-wrapper">
                        <span className="field-label">
                          專屬協議書快照 <span className="label-note">(不可修改)</span>
                        </span>
                        <div className="tos-content"
                          dangerouslySetInnerHTML={{ __html: selectedOrder.agreed_tos_snapshot ? DOMPurify.sanitize(selectedOrder.agreed_tos_snapshot) : '<span style="color:#A0978D">未設定或舊版訂單</span>' }} 
                        />
                      </div>

                      <div className="details-actions">
                        {selectedOrder.workflow_mode === 'free' ? (
                          <button className="action-btn btn-primary btn-save" onClick={handleSaveDailyFields}>儲存設定</button>
                        ) : isEditingRequest ? (
                          <>
                            <button className="action-btn btn-outline-default" onClick={handleCancelEditRequest}>取消編輯</button>
                            <button className="action-btn btn-danger" onClick={handleSubmitRequestFields}>確認送出異動</button>
                          </>
                        ) : (
                          <>
                            <button className="action-btn btn-outline-default" onClick={handleStartEditRequest}>委託單異動</button>
                            <button className="action-btn btn-primary btn-save" onClick={handleSaveDailyFields}>日常儲存</button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'delivery' && (
                  <div className="fade-in">
                    <div className="delivery-hint-wrapper">
                      <span className="hint-text">🌟提示：上傳後系統會自動進行壓縮與壓製浮水印...</span>
                    </div>
                    {renderStageBox('階段 1：草稿 (Sketch)', 'sketch', selectedOrder.current_stage === 'sketch_reviewing', isStageActuallyReviewed('草稿'))}
                    {renderStageBox('階段 2：線稿 (Lineart)', 'lineart', selectedOrder.current_stage === 'lineart_reviewing', isStageActuallyReviewed('線稿'))}
                    {renderStageBox('階段 3：完稿 (Final Preview)', 'final', selectedOrder.current_stage === 'final_reviewing', selectedOrder.status === 'completed')}
                  </div>
                )}

                {activeTab === 'logs' && (
                  <div className="section-card">
                    <h3 className="section-title logs-title">決策與操作追蹤紀錄</h3>
                    
                    {logs.length === 0 ? (
                      <div className="logs-empty">尚未有紀錄</div>
                    ) : (
                      <div className="logs-list">
                        {logs.map(log => (
                          <div key={log.id} className={`log-card ${log.actor_role === 'artist' ? 'log-artist' : 'log-client'}`}>
                            <div className="log-meta">
                              {/* 🌟 修正點：使用 formatLocalTime 強制顯示台灣在地時間 */}
                              {formatLocalTime(log.created_at)} | {log.actor_role === 'artist' ? '繪師' : '委託人'}
                            </div>
                            <div className="log-content">
                              {log.content}
                            </div>
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