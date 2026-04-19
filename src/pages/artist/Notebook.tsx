// src/pages/artist/Notebook.tsx
import { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ImageUploader } from '../../components/ImageUploader'; 
import DOMPurify from 'dompurify'; 

interface Commission {
  id: string; client_name: string; contact_memo: string; project_name: string; order_date: string;
  total_price: number; payment_status: string; status: string; current_stage: string; is_external: number;
  usage_type: string; is_rush: string; delivery_method: string; payment_method: string;
  draw_scope: string; char_count: number; bg_type: string; add_ons: string; detailed_settings: string;
  pending_changes?: string; workflow_mode: string; queue_status: string;
  type_name?: string; latest_message_at?: string; last_read_at_artist?: string;
  client_public_id?: string;
  agreed_tos_snapshot?: string; 
}

interface PaymentRecord { id: string; record_date: string; item_name: string; amount: number; }
interface ActionLog { id: string; created_at: string; actor_role: string; action_type: string; content: string; }
interface Submission { id: string; stage: string; file_url: string; version: number; created_at: string; private_file_key?: string; }

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
      if (isInitialLoad && initialSelectedId) {
        const target = data.data.find((c: Commission) => c.id === initialSelectedId);
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
    
    // 手機版點擊列表後，自動捲動到內容區
    if (window.innerWidth < 768) {
      window.scrollTo({ top: 420, behavior: 'smooth' });
    }
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
    if (payment_status === 'paid') return { text: '已收全額', color: '#4E7A5A', bg: '#E8F3EB' };
    if (payment_status === 'partial') return { text: '已收訂金', color: '#A67B3E', bg: '#FDF4E6' };
    return { text: '尚未付款', color: '#8A7A7A', bg: '#F4F0EB' };
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
    if (status === 'completed') return { text: '已結案', color: '#4E7A5A', bg: '#E8F3EB' };
    if (status === 'cancelled') return { text: '已作廢', color: '#A05C5C', bg: '#F5EBEB' };
    return null;
  };

  const tabStyle = (isActive: boolean) => ({
    padding: '14px 20px', cursor: 'pointer', borderBottom: isActive ? '3px solid #5D4A3E' : '3px solid transparent',
    fontWeight: isActive ? 'bold' : 'normal', color: isActive ? '#5D4A3E' : '#A0978D', backgroundColor: 'transparent', 
    borderTop: 'none', borderLeft: 'none', borderRight: 'none', fontSize: '15px', transition: 'all 0.2s ease',
    whiteSpace: 'nowrap' as const
  });

  const isStageActuallyReviewed = (stageNameCH: string) => {
    return logs.some(log => log.actor_role === 'client' && (log.content.includes(`已閱覽 ${stageNameCH}`) || log.content.includes(`已同意 ${stageNameCH}`)));
  };

  const renderStageBox = (title: string, stageKey: string, isReviewing: boolean, isPassed: boolean) => {
    const sub = submissions.find(s => s.stage === stageKey);
    const isFinal = stageKey === 'final';
    const isRejected = selectedOrder?.current_stage === `${stageKey}_drawing` && !!sub;
    const isUnbound = !selectedOrder?.client_public_id;
    const isFreeMode = selectedOrder?.workflow_mode === 'free';
  
    let headerBg = '#FCFAF8', statusTag = '', statusColor = '#A0978D';
    
    if (!sub) { statusTag = '等待繪製上傳...'; } 
    else if (isFreeMode) { headerBg = '#E8F3EB'; statusTag = '✓ 檔案已上傳 (自由模式)'; statusColor = '#4E7A5A'; } 
    else if (isUnbound) { headerBg = '#F0ECE7'; statusTag = '⚠️ 等待委託人綁定'; statusColor = '#A05C5C'; } 
    else if (isPassed) { headerBg = '#E8F3EB'; statusTag = isFinal ? '✓ 委託人已同意 (原檔已解鎖)' : '✓ 委託人已閱覽'; statusColor = '#4E7A5A'; } 
    else if (isReviewing) { headerBg = '#FDF4E6'; statusTag = '⏳ 待委託人確認'; statusColor = '#A67B3E'; } 
    else if (isRejected) { headerBg = '#fce8e6'; statusTag = '⚠️ 委託人已退回修改'; statusColor = '#d93025'; } 
    else { headerBg = '#E8F3EB'; statusTag = '✓ 稿件已上傳 (待閱覽)'; statusColor = '#4E7A5A'; }
  
    return (
      <div style={{ border: '1px solid #EAE6E1', borderRadius: '12px', overflow: 'hidden', marginBottom: '24px' }}>
        <div style={{ backgroundColor: headerBg, padding: '14px 20px', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '14px', transition: 'all 0.3s' }}>
          <span>{title}</span> <span style={{ color: statusColor }}>{statusTag}</span>
        </div>
        <div style={{ padding: '20px' }}>
          {isFinal && !isFreeMode && <div style={{ fontSize: '12px', color: '#A05C5C', backgroundColor: '#F5EBEB', padding: '10px', borderRadius: '8px', marginBottom: '15px', fontWeight: 'bold' }}>
            💡 上傳說明：系統會自動產生「浮水印預覽圖」供委託人確認。委託人按下同意後，才能下載您上傳的高畫質原檔。
          </div>}
          {isUploading === stageKey ? (
            <div style={{ textAlign: 'center', padding: '30px', color: '#4A7294', fontWeight: 'bold' }}>檔案處理中，請稍候...</div>
          ) : (
            <ImageUploader 
              onUpload={(blobs) => handleR2FileUpload(stageKey, blobs)}
              withWatermark={!isFreeMode} watermarkText="SAMPLE" existingUrl={sub?.file_url?.split('|')[0]} isFinal={isFinal} 
              metadata={sub ? { version: sub.version, date: new Date(sub.created_at).toLocaleDateString() } : undefined}
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
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ color: '#7A7269', fontWeight: 'bold', marginBottom: '6px', fontSize: '13px' }}>{label}</span>
        {canDirectEdit ? (
          type === 'select' ? (
            <select value={(editData[fieldKey] as string) || ''} onChange={e => setEditData({...editData, [fieldKey]: e.target.value})} style={{ color: '#5D4A3E', border: '1px solid #DED9D3', padding: '10px', borderRadius: '8px', backgroundColor: '#FBFBF9', outline: 'none' }}>
              <option value="">請選擇</option>{options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          ) : (
            <input type={type} value={editData[fieldKey] || ''} onChange={e => setEditData({...editData, [fieldKey]: type === 'number' ? Number(e.target.value) : e.target.value})} style={{ color: '#5D4A3E', border: '1px solid #DED9D3', padding: '10px', borderRadius: '8px', backgroundColor: '#FBFBF9', outline: 'none', width: '100%', boxSizing: 'border-box' }} />
          )
        ) : (
          <div style={{ padding: '10px', backgroundColor: '#FBFBF9', border: '1px solid #EAE6E1', borderRadius: '8px', minHeight: '19px', display: 'flex', alignItems: 'center' }}>
            {hasPending ? (
              <div><span style={{ textDecoration: 'line-through', color: '#C4BDB5', marginRight: '8px' }}>{originalValue}{suffix}</span><span style={{ color: '#A05C5C', fontWeight: 'bold' }}>待異動：{pendingValue}{suffix}</span></div>
            ) : (<span style={{ color: '#5D4A3E' }}>{originalValue || '-'}{suffix}</span>)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ padding: '16px 0' }}>
      {/* 🌟 核心 RWD 樣式定義 */}
      <style>{`
        .notebook-container { display: flex; flex-direction: column; gap: 24px; max-width: 1200px; margin: 0 auto; height: auto; }
        .notebook-sidebar { width: 100%; max-height: 400px; }
        .details-grid { display: grid; grid-template-columns: 1fr; gap: 20px; }
        .payment-inputs { display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px; }
        .table-responsive { overflow-x: auto; -webkit-overflow-scrolling: touch; }
        .scroll-tabs { display: flex; overflow-x: auto; border-bottom: 1px solid #EAE6E1; padding: 0 20px; background-color: #FAFAFA; scrollbar-width: none; }
        .scroll-tabs::-webkit-scrollbar { display: none; }

        @media (min-width: 768px) {
          .notebook-container { flex-direction: row; height: calc(100vh - 80px); }
          .notebook-sidebar { width: 380px; max-height: none; height: 100%; }
          .details-grid { grid-template-columns: 1fr 1fr; }
          .payment-inputs { flex-direction: row; align-items: stretch; }
        }
      `}</style>

      <div className="notebook-container">
        
        {/* 左側清單區 */}
        <div className="notebook-sidebar" style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #EAE6E1', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', flexShrink: 0 }}>
          <div style={{ padding: '20px', borderBottom: '1px solid #EAE6E1', backgroundColor: '#FFFFFF', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <span style={{ fontWeight: 'bold', color: '#5D4A3E', fontSize: '16px' }}>委託單列表</span>
            <select value={filter} onChange={e => setFilter(e.target.value as any)} style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #DED9D3', backgroundColor: '#FBFBF9', color: '#5D4A3E', outline: 'none' }}>
              {tabs.map(tab => <option key={tab.id} value={tab.id}>{tab.label}</option>)}
            </select>
          </div>

          <div style={{ padding: '10px 20px', borderBottom: '1px solid #EAE6E1', backgroundColor: '#FAFAFA' }}>
            <input type="text" placeholder="🔍 搜尋暱稱/單號... (輸入2字元以上)" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #DED9D3', outline: 'none', fontSize: '13px', boxSizing: 'border-box' }} />
          </div>

          <div style={{ overflowY: 'auto', flex: 1, padding: '10px' }}>
            {filteredOrders.map(order => {
              const payBadge = getPaymentBadge(order.payment_status);
              const statusBadge = getStatusBadge(order.status);
              const dateStr = order.order_date ? new Date(order.order_date).toLocaleDateString() : '';
              const isSelected = selectedId === order.id;
              const hasNewMsg = parseTime(order.latest_message_at) > parseTime(order.last_read_at_artist);
              
              return (
                <div key={order.id} onClick={() => handleSelect(order)} style={{ padding: '16px', marginBottom: '8px', borderRadius: '12px', border: isSelected ? '1px solid #DED9D3' : '1px solid transparent', cursor: 'pointer', backgroundColor: isSelected ? '#FDFDFB' : '#FFFFFF', transition: 'all 0.2s ease', opacity: order.status === 'cancelled' ? 0.5 : 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#A0978D', marginBottom: '8px' }}>
                    <span>{dateStr}</span>
                    <span style={{ fontSize: '11px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px', backgroundColor: order.workflow_mode === 'free' ? '#FDF4E6' : '#E8F3EB', color: order.workflow_mode === 'free' ? '#A67B3E' : '#4E7A5A' }}>
                      {order.workflow_mode === 'free' ? '自由紀錄' : '標準委託'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', alignItems: 'center' }}>
                    <span style={{ fontWeight: 'bold', color: '#5D4A3E', fontSize: '15px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '160px' }} title={getDualName(order)}>{getDualName(order)}</span>
                    <span style={{ fontWeight: 'bold', color: '#4E7A5A', fontSize: '15px' }}>NT$ {order.total_price}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#7A7269', marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>項目：{order.project_name || order.type_name || '未命名項目'}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#A0978D', marginBottom: '10px', display: 'flex', justifyContent: 'space-between' }}>
                    <span>單號：{order.id.split('-')[1] || order.id}</span>
                    <span>委託人：{order.client_public_id || '未綁定'}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', fontSize: '11px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ backgroundColor: payBadge.bg, color: payBadge.color, padding: '4px 8px', borderRadius: '6px', fontWeight: 'bold' }}>{payBadge.text}</span>
                    {statusBadge && <span style={{ backgroundColor: statusBadge.bg, color: statusBadge.color, padding: '4px 8px', borderRadius: '6px', fontWeight: 'bold' }}>{statusBadge.text}</span>}
                    {order.queue_status && <span style={{ backgroundColor: '#F0ECE7', color: '#5D4A3E', padding: '4px 8px', borderRadius: '6px', fontWeight: 'bold' }}>{order.queue_status}</span>}
                    {hasNewMsg && <span style={{ backgroundColor: '#F5EBEB', color: '#A05C5C', padding: '4px 8px', borderRadius: '6px', fontWeight: 'bold' }}>☆新訊息</span>}
                  </div>
                </div>
              );
            })}
            {filteredOrders.length === 0 && <div style={{ textAlign: 'center', padding: '40px 20px', color: '#C4BDB5' }}>沒有符合條件的委託單</div>}
          </div>
        </div>

        {/* 右側詳情區 */}
        <div style={{ flex: 1, backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #EAE6E1', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0, height: '100%' }}>
          {!selectedOrder ? <div style={{ padding: '60px', textAlign: 'center', color: '#C4BDB5', fontSize: '15px' }}>請由列表選擇委託單以檢視詳情</div> : (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              
              <div style={{ padding: '24px 20px', borderBottom: '1px solid #EAE6E1', display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'space-between', alignItems: 'flex-start', backgroundColor: '#FFFFFF' }}>
                <div style={{ flex: '1 1 250px' }}>
                  <h2 style={{ margin: '0 0 6px 0', color: '#5D4A3E', fontSize: '20px' }}>{getDualName(selectedOrder)}</h2>
                  <div style={{ color: '#7A7269', fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>項目：{selectedOrder.project_name || '未命名項目'}</div>
                  <div style={{ color: '#A0978D', fontSize: '12px', fontFamily: 'monospace', marginBottom: '8px', display: 'flex', flexWrap: 'wrap', gap: '8px 16px' }}>
                    <span>日期：{selectedOrder.order_date ? new Date(selectedOrder.order_date).toLocaleDateString() : '未知'}</span>
                    <span>單號：{selectedOrder.id}</span>
                    <span>委託人編號：{selectedOrder.client_public_id || '尚未綁定'}</span>
                  </div>
                  {getStatusBadge(selectedOrder.status) && (
                    <div style={{ marginTop: '8px' }}>
                      <span style={{ backgroundColor: getStatusBadge(selectedOrder.status)!.bg, color: getStatusBadge(selectedOrder.status)!.color, padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', border: `1px solid ${getStatusBadge(selectedOrder.status)!.color}20` }}>
                        {getStatusBadge(selectedOrder.status)!.text}
                      </span>
                    </div>
                  )}
                </div>
                
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'flex-start', flex: '1 1 auto' }}>
                  {selectedOrder.status !== 'completed' && selectedOrder.status !== 'cancelled' && (
                    <button onClick={handleForceComplete} style={{ padding: '8px 12px', backgroundColor: '#FFFFFF', border: '1px solid #4E7A5A', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', color: '#4E7A5A', fontSize: '13px' }}>強制結案</button>
                  )}
                  <button onClick={handleToggleArchive} style={{ padding: '8px 12px', backgroundColor: '#FFFFFF', border: '1px solid #DED9D3', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', color: selectedOrder.status === 'cancelled' ? '#4E7A5A' : '#A05C5C', fontSize: '13px' }}>
                    {selectedOrder.status === 'cancelled' ? '恢復預訂' : '作廢封存'}
                  </button>
                  {!selectedOrder.is_external && (
                    <button onClick={() => copyLink(selectedOrder.id)} style={{ padding: '8px 12px', backgroundColor: '#FFFFFF', border: '1px solid #DED9D3', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', color: '#5D4A3E', fontSize: '13px' }}>複製連結</button>
                  )}
                  <button onClick={() => navigate(`/workspace/${selectedOrder.id}?role=artist`)} style={{ padding: '8px 12px', borderRadius: '8px', border: 'none', color: '#FFFFFF', fontWeight: 'bold', backgroundColor: '#5D4A3E', cursor: 'pointer', fontSize: '13px' }}>進入聊天室</button>
                </div>
              </div>

              {/* RWD Tab Area */}
              <div className="scroll-tabs">
                <button onClick={() => setActiveTab('details')} style={tabStyle(activeTab === 'details')}>委託單細項</button>
                <button onClick={() => setActiveTab('delivery')} style={tabStyle(activeTab === 'delivery')}>檔案交付</button>
                <button onClick={() => setActiveTab('logs')} style={tabStyle(activeTab === 'logs')}>歷程紀錄</button>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '20px', backgroundColor: '#FFFFFF' }}>
                
                {activeTab === 'details' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    
                    {/* 財務區塊 */}
                    <div style={{ backgroundColor: '#FBFBF9', padding: '20px', borderRadius: '12px', border: '1px solid #EAE6E1' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginBottom: '20px', borderBottom: '1px solid #EAE6E1', paddingBottom: '12px' }}>
                        <h3 style={{ margin: 0, fontSize: '16px', color: '#5D4A3E' }}>財務與收款狀態</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '13px', color: '#7A7269', fontWeight: 'bold' }}>帳務狀態：</span>
                          <select value={selectedOrder.payment_status || 'unpaid'} onChange={(e) => handlePaymentStatusChange(e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #DED9D3', fontWeight: 'bold', color: '#5D4A3E', backgroundColor: '#FFFFFF', outline: 'none' }}>
                            <option value="unpaid">未收款</option><option value="partial">已收訂金</option><option value="paid">已收款</option>
                          </select>
                        </div>
                      </div>

                      {/* RWD 記帳輸入區 */}
                      <div className="payment-inputs">
                        <input type="date" value={newPayment.record_date} onChange={e => setNewPayment({...newPayment, record_date: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #DED9D3', color: '#5D4A3E', outline: 'none', flex: 1 }} />
                        <input type="text" placeholder="項目 (如: 訂金)" value={newPayment.item_name} onChange={e => setNewPayment({...newPayment, item_name: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #DED9D3', outline: 'none', flex: 1 }} />
                        <input type="number" placeholder="金額" value={newPayment.amount} onChange={e => setNewPayment({...newPayment, amount: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #DED9D3', outline: 'none', flex: 1 }} />
                        <button onClick={handleAddPayment} style={{ padding: '10px 20px', backgroundColor: '#5D4A3E', color: '#FFFFFF', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', whiteSpace: 'nowrap' }}>+ 記帳</button>
                      </div>

                      <div className="table-responsive">
                        <table style={{ width: '100%', minWidth: '400px', fontSize: '14px', borderCollapse: 'collapse', marginBottom: '20px' }}>
                          <tbody>
                            {payments.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', padding: '15px', color: '#A0978D' }}>尚無記帳紀錄</td></tr>}
                            {payments.map(p => (
                              <tr key={p.id} style={{ borderBottom: '1px dashed #EAE6E1' }}>
                                <td style={{ padding: '12px 8px', color: '#A0978D' }}>{p.record_date}</td>
                                <td style={{ padding: '12px 8px', color: '#5D4A3E', fontWeight: '500' }}>{p.item_name}</td>
                                <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 'bold', color: '#4E7A5A' }}>+ NT$ {p.amount}</td>
                                <td style={{ padding: '12px 8px', textAlign: 'right' }}><button onClick={() => handleDeletePayment(p.id)} style={{ padding: '4px 10px', backgroundColor: '#F5EBEB', color: '#A05C5C', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>刪除</button></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: '16px', fontSize: '14px', backgroundColor: '#FFFFFF', padding: '16px', borderRadius: '8px', border: '1px solid #EAE6E1' }}>
                        <div style={{ color: '#7A7269' }}>總金額：<span style={{ fontWeight: 'bold', color: '#5D4A3E' }}>${selectedOrder.total_price}</span></div>
                        <div style={{ color: '#7A7269' }}>已收款：<span style={{ fontWeight: 'bold', color: '#4E7A5A' }}>${totalPaid}</span></div>
                        <div style={{ color: '#7A7269' }}>未付款：<span style={{ fontWeight: 'bold', color: '#A05C5C' }}>${totalUnpaid > 0 ? totalUnpaid : 0}</span></div>
                      </div>
                    </div>

                    {/* 委託細項區塊 */}
                    <div style={{ border: '1px solid #EAE6E1', borderRadius: '12px', padding: '20px', backgroundColor: '#FFFFFF' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 style={{ margin: 0, fontSize: '16px', color: '#5D4A3E' }}>委託單細項</h3>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {isEditingRequest && <span style={{ color: '#A05C5C', fontSize: '12px', fontWeight: 'bold', backgroundColor: '#F5EBEB', padding: '6px 12px', borderRadius: '6px' }}>異動編輯模式</span>}
                          {selectedOrder.workflow_mode === 'free' && <span style={{ color: '#A67B3E', fontSize: '12px', fontWeight: 'bold', backgroundColor: '#FDF4E6', padding: '6px 12px', borderRadius: '6px' }}>自由紀錄模式</span>}
                        </div>
                      </div>
                      
                      {/* RWD 細項 Grid */}
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

                      <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '24px' }}>
                        <span style={{ color: '#7A7269', fontWeight: 'bold', marginBottom: '6px', fontSize: '13px' }}>詳細設定：(委託方不可見)</span>
                        <textarea value={editData.detailed_settings || ''} onChange={e => setEditData({...editData, detailed_settings: e.target.value})} style={{ color: '#5D4A3E', border: '1px solid #DED9D3', padding: '12px', minHeight: '100px', borderRadius: '8px', whiteSpace: 'pre-wrap', outline: 'none', backgroundColor: '#FBFBF9', resize: 'vertical', width: '100%', boxSizing: 'border-box' }} />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '24px', padding: '16px', backgroundColor: '#FAFAFA', borderRadius: '8px', border: '1px dashed #DED9D3' }}>
                        <span style={{ color: '#7A7269', fontWeight: 'bold', marginBottom: '8px', fontSize: '13px' }}>
                          專屬協議書快照 <span style={{ fontWeight: 'normal', color: '#A0978D', marginLeft: '6px' }}>(不可修改)</span>
                        </span>
                        <div style={{ color: '#5D4A3E', fontSize: '13px', lineHeight: '1.6', maxHeight: '150px', overflowY: 'auto' }}
                          dangerouslySetInnerHTML={{ __html: selectedOrder.agreed_tos_snapshot ? DOMPurify.sanitize(selectedOrder.agreed_tos_snapshot) : '<span style="color:#A0978D">未設定或舊版訂單</span>' }} 
                        />
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #EAE6E1', paddingTop: '20px' }}>
                        {selectedOrder.workflow_mode === 'free' ? (
                          <button onClick={handleSaveDailyFields} style={{ padding: '10px 24px', backgroundColor: '#5D4A3E', color: '#FFFFFF', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>儲存設定</button>
                        ) : isEditingRequest ? (
                          <>
                            <button onClick={handleCancelEditRequest} style={{ padding: '10px 20px', backgroundColor: '#FFFFFF', color: '#7A7269', border: '1px solid #DED9D3', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>取消編輯</button>
                            <button onClick={handleSubmitRequestFields} style={{ padding: '10px 20px', backgroundColor: '#A05C5C', color: '#FFFFFF', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>確認送出異動</button>
                          </>
                        ) : (
                          <>
                            <button onClick={handleStartEditRequest} style={{ padding: '10px 20px', backgroundColor: '#FFFFFF', color: '#5D4A3E', border: '1px solid #DED9D3', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>申請委託單異動</button>
                            <button onClick={handleSaveDailyFields} style={{ padding: '10px 24px', backgroundColor: '#5D4A3E', color: '#FFFFFF', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>日常儲存</button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'delivery' && (
                  <div style={{ animation: 'fadeIn 0.3s ease' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '24px' }}>
                      <span style={{ color: '#7A7269', fontSize: '14px' }}>🌟提示：上傳後系統會自動進行壓縮與壓製浮水印...</span>
                    </div>
                    {renderStageBox('階段 1：草稿 (Sketch)', 'sketch', selectedOrder.current_stage === 'sketch_reviewing', isStageActuallyReviewed('草稿'))}
                    {renderStageBox('階段 2：線稿 (Lineart)', 'lineart', selectedOrder.current_stage === 'lineart_reviewing', isStageActuallyReviewed('線稿'))}
                    {renderStageBox('階段 3：完稿 (Final Preview)', 'final', selectedOrder.current_stage === 'final_reviewing', selectedOrder.status === 'completed')}
                  </div>
                )}

                {activeTab === 'logs' && (
                  <div style={{ backgroundColor: '#FBFBF9', padding: '20px', borderRadius: '12px', border: '1px solid #EAE6E1' }}>
                    <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', color: '#5D4A3E' }}>決策與操作追蹤紀錄</h3>
                    <div className="table-responsive">
                      <table style={{ width: '100%', minWidth: '400px', borderCollapse: 'collapse', fontSize: '14px' }}>
                        <tbody>
                          {logs.length === 0 ? <tr><td style={{ color: '#A0978D', textAlign: 'center', padding: '30px 0' }}>尚未有紀錄</td></tr> : null}
                          {logs.map(log => (
                            <tr key={log.id} style={{ borderBottom: '1px solid #EAE6E1' }}>
                              <td style={{ padding: '16px 10px', color: '#A0978D', width: '160px', whiteSpace: 'nowrap' }}>{new Date(log.created_at).toLocaleString()}</td>
                              <td style={{ padding: '16px 10px', width: '80px' }}>
                                <span style={{ backgroundColor: log.actor_role === 'artist' ? '#EAE6E1' : '#E8F3EB', color: log.actor_role === 'artist' ? '#5D4A3E' : '#4E7A5A', padding: '6px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold' }}>
                                  {log.actor_role === 'artist' ? '繪師' : '委託人'}
                                </span>
                              </td>
                              <td style={{ padding: '16px 10px', color: '#5D4A3E', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>{log.content}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
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