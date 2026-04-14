import { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ImageUploader } from '../../components/ImageUploader'; // 🌟 引入兵工廠

interface Commission {
  id: string; client_name: string; contact_memo: string; project_name: string; order_date: string;
  total_price: number; payment_status: string; status: string; current_stage: string; is_external: number;
  usage_type: string; is_rush: string; delivery_method: string; payment_method: string;
  draw_scope: string; char_count: number; bg_type: string; add_ons: string; detailed_settings: string;
  pending_changes?: string; workflow_mode: string; queue_status: string;
  type_name?: string; latest_message_at?: string; last_read_at_artist?: string;
  client_public_id?: string;
}

interface PaymentRecord { id: string; record_date: string; item_name: string; amount: number; }
interface ActionLog { id: string; created_at: string; actor_role: string; action_type: string; content: string; }
interface Submission { id: string; stage: string; file_url: string; version: number; created_at: string; private_file_key?: string; }

export function Notebook() {
  const location = useLocation();
  const navigate = useNavigate(); 
  const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
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
  const [searchTerm, setSearchTerm] = useState(''); // 🌟 搜尋狀態
  
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId);
  const [activeTab, setActiveTab] = useState<'details' | 'delivery' | 'logs'>(initialTab);

  const [editData, setEditData] = useState<Partial<Commission>>({});
  const [isEditingRequest, setIsEditingRequest] = useState(false);

  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [newPayment, setNewPayment] = useState({ record_date: '', item_name: '', amount: '' });
  
  const [logs, setLogs] = useState<ActionLog[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  
  // 🌟 上傳狀態追蹤
  const [isUploading, setIsUploading] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedId) params.set('id', selectedId);
    params.set('tab', activeTab);
    navigate(`?${params.toString()}`, { replace: true });
  }, [selectedId, activeTab, navigate]);

  const fetchCommissions = async () => {
    const res = await fetch(`${API_BASE}/api/commissions`, { credentials: 'include' });
    const data = await res.json();
    if (data.success) {
      setCommissions(data.data);
      if (initialSelectedId) {
        const target = data.data.find((c: Commission) => c.id === initialSelectedId);
        if (target) {
          setEditData(target);
          fetchPayments(initialSelectedId);
          fetchDeliverables(initialSelectedId);
        }
      }
    }
  };

  const fetchPayments = async (id: string) => {
    const res = await fetch(`${API_BASE}/api/commissions/${id}/payments`, { credentials: 'include' });
    const data = await res.json();
    if (data.success) setPayments(data.data);
  };

  const fetchDeliverables = async (id: string) => {
    const res = await fetch(`${API_BASE}/api/commissions/${id}/deliverables`, { credentials: 'include' });
    const data = await res.json();
    if (data.success) {
      setSubmissions(data.data.submissions);
      setLogs(data.data.logs);
    }
  };

  useEffect(() => { fetchCommissions(); }, []);

  const handleSelect = async (order: Commission) => {
    setSelectedId(order.id);
    setEditData(order);
    setIsEditingRequest(false);
    fetchPayments(order.id);
    fetchDeliverables(order.id);

    try {
      await fetch(`${API_BASE}/api/commissions/${order.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ last_read_at_artist: new Date().toISOString() })
      });
      fetchCommissions();
    } catch (e) {
      console.error("更新已讀時間失敗", e); // 💡 安全性建議：避免靜默錯誤
    }
  };

  const handleSaveDailyFields = async () => {
    if (!selectedId || !selectedOrder) return;
    const bodyData = selectedOrder.workflow_mode === 'free' 
      ? { ...editData } 
      : { project_name: editData.project_name, payment_method: editData.payment_method, detailed_settings: editData.detailed_settings };

    await fetch(`${API_BASE}/api/commissions/${selectedId}`, {
      method: 'PATCH', 
      credentials: 'include',
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
      setIsEditingRequest(false);
      return;
    }

    if (!window.confirm("請確定是否要更改委託單，此異動須經委託人同意方能變更完成")) return;

    const res = await fetch(`${API_BASE}/api/commissions/${selectedId}/change-request`, {
      method: 'POST', 
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ changes })
    });
    const data = await res.json();
    if (data.success) {
      alert('異動申請已送出！請等待委託方確認。');
      setIsEditingRequest(false);
      fetchCommissions();
      fetchDeliverables(selectedId);
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
    const newStatus = isCancelled ? 'quote_created' : 'cancelled';

    await fetch(`${API_BASE}/api/commissions/${selectedId}`, {
      method: 'PATCH', 
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    fetchCommissions();
  };

  const handleForceComplete = async () => {
    if (!selectedId || !selectedOrder) return;
    if (!window.confirm('確定要強制結案嗎？這將會把訂單狀態直接改為已完成。')) return;
    
    await fetch(`${API_BASE}/api/commissions/${selectedId}`, {
      method: 'PATCH', 
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed' })
    });
    fetchCommissions();
  };

  const handlePaymentStatusChange = async (newStatus: string) => {
    if (!selectedId) return;
    await fetch(`${API_BASE}/api/commissions/${selectedId}`, { 
      method: 'PATCH', 
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ payment_status: newStatus }) 
    });
    fetchCommissions();
  };

  const handleAddPayment = async () => {
    const amountNum = Number(newPayment.amount);
    
    if (!selectedId || !newPayment.record_date || !newPayment.item_name || !newPayment.amount) {
      return alert("請填寫完整的記帳資訊喔！");
    }

    // 💡 安全性建議：防範輸入空白、非數字字串導致 NaN
    if (isNaN(amountNum) || amountNum <= 0) {
      return alert("請輸入有效的金額！");
    }

    const res = await fetch(`${API_BASE}/api/commissions/${selectedId}/payments`, { 
      method: 'POST', 
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ ...newPayment, amount: amountNum }) 
    });
    const data = await res.json();
    if (data.success) {
      setNewPayment({ record_date: '', item_name: '', amount: '' });
      fetchPayments(selectedId);
    } else {
      alert('記帳失敗：' + data.error);
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!selectedId || !window.confirm('確定要刪除此筆財務紀錄嗎？')) return;
    await fetch(`${API_BASE}/api/commissions/${selectedId}/payments/${paymentId}`, { 
      method: 'DELETE',
      credentials: 'include' 
    });
    fetchPayments(selectedId);
  };

  const copyLink = (id: string) => {
    const msg = "⚠️ 注意：此連結具備「綁定」特性。\n\n當委託人點擊並登入後，此訂單將永久綁定該帳號。若綁定錯誤，您將需要刪除並重新建單。\n\n確定要複製連結嗎？";
    if (window.confirm(msg)) {
      const link = `${window.location.origin}/quote/${id}`;
      navigator.clipboard.writeText(link).then(() => alert('專屬連結已複製！請私下傳送給對應的委託人。'));
    }
  };

  // 🌟 核心修正：雙重上傳與保險箱邏輯
  const handleR2FileUpload = async (stageKey: string, resultBlobs: { preview: Blob; original?: Blob }) => {
    if (!selectedId) return;
    setIsUploading(stageKey);

    try {
      const timestamp = Date.now();
      const publicPath = `commissions/${selectedId}/${stageKey}_preview_${timestamp}.jpg`;
      const privatePath = `commissions/${selectedId}/${stageKey}_original_${timestamp}.jpg`;

      // 1. 上傳預覽圖到 Public Bucket (草稿/線稿/完稿預覽 通用)
      const ticketRes = await fetch(`${API_BASE}/api/r2/upload-url`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: publicPath, contentType: 'image/jpeg', bucketType: 'public' })
      });
      const { uploadUrl: publicUploadUrl } = await ticketRes.json();
      await fetch(publicUploadUrl, { method: 'PUT', body: resultBlobs.preview, headers: { 'Content-Type': 'image/jpeg' } });

      const publicFinalUrl = `https://pub-f050b181e18d45ba8489814467d581be.r2.dev/${publicPath}`;

      // 2. 如果是完稿，額外上傳原圖到 Private Bucket
      let privateKey = null;
      if (stageKey === 'final' && resultBlobs.original) {
        const privateTicketRes = await fetch(`${API_BASE}/api/r2/upload-url`, {
          method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName: privatePath, contentType: 'image/jpeg', bucketType: 'private' })
        });
        const { uploadUrl: privateUploadUrl } = await privateTicketRes.json();
        await fetch(privateUploadUrl, { method: 'PUT', body: resultBlobs.original, headers: { 'Content-Type': 'image/jpeg' } });
        privateKey = privatePath;
      }

      // 3. 更新資料庫
      const submitRes = await fetch(`${API_BASE}/api/commissions/${selectedId}/submit`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          stage: stageKey, 
          file_url: publicFinalUrl,
          private_file_key: privateKey // 🌟 傳入保險箱路徑
        })
      });

      if ((await submitRes.json()).success) {
        alert(`${stageKey === 'final' ? '完稿預覽與原檔' : '稿件'}已成功交付！`);
        fetchCommissions(); fetchDeliverables(selectedId);
      }
    } catch (err) {
      alert("上傳過程中發生錯誤");
    } finally {
      setIsUploading(null);
    }
  };

  const getPaymentBadge = (payment_status: string) => {
    if (payment_status === 'paid') return { text: '已收全額', color: '#4E7A5A', bg: '#E8F3EB' };
    if (payment_status === 'partial') return { text: '已收訂金', color: '#A67B3E', bg: '#FDF4E6' };
    return { text: '尚未付款', color: '#8A7A7A', bg: '#F4F0EB' };
  };

  // 💡 效能優化建議：使用 useMemo 緩存搜尋過濾結果，減少不必要的重新計算
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
    borderTop: 'none', borderLeft: 'none', borderRight: 'none', fontSize: '15px', transition: 'all 0.2s ease'
  });

  const renderStageBox = (title: string, stageKey: string, isReviewing: boolean, isPassed: boolean) => {
  const sub = submissions.find(s => s.stage === stageKey);
  const isFinal = stageKey === 'final';

    let headerBg = '#FCFAF8'; let statusTag = '';
    
    // 🌟 修改狀態顯示文字
    if (isPassed) {
      headerBg = '#E8F3EB';
      statusTag = isFinal ? '✓ 委託人已同意 (原檔已解鎖)' : '✓ 委託人已閱覽';
    } else if (isReviewing) {
      headerBg = '#FDF4E6';
      statusTag = '⏳ 待委託人確認';
    }

    return (
    <div style={{ border: '1px solid #EAE6E1', borderRadius: '12px', overflow: 'hidden', marginBottom: '24px' }}>
      <div style={{ backgroundColor: headerBg, padding: '14px 20px', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '14px' }}>
        <span>{title}</span> <span style={{ color: isPassed ? '#4E7A5A' : '#A67B3E' }}>{statusTag}</span>
      </div>
      <div style={{ padding: '20px' }}>
        {isFinal && <div style={{ fontSize: '12px', color: '#A05C5C', backgroundColor: '#F5EBEB', padding: '10px', borderRadius: '8px', marginBottom: '15px', fontWeight: 'bold' }}>
          💡 上傳說明：系統會自動產生「浮水印預覽圖」供委託人確認。委託人按下同意後，才能下載您上傳的高畫質原檔。
        </div>}

        {/* 🌟 核心修正：徹底刪除原本的手動渲染圖片塊 {sub && (...)} */}
        {/* 只保留 Uploader 呼叫，並將所有邏輯交給它 */}

        {isUploading === stageKey ? (
          <div style={{ textAlign: 'center', padding: '30px', color: '#4A7294', fontWeight: 'bold' }}>檔案處理中，請稍候...</div>
        ) : (
          <ImageUploader 
            onUpload={(blobs) => handleR2FileUpload(stageKey, blobs)}
            withWatermark={true}
            watermarkText="SAMPLE"
            existingUrl={sub?.file_url}
            isFinal={isFinal} 
            // 🌟 傳入中繼資料，讓 Uploader 自己決定怎麼整合顯示
            metadata={sub ? {
              version: sub.version,
              date: new Date(sub.created_at).toLocaleDateString()
            } : undefined}
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
    if (selectedOrder.pending_changes && !isFreeMode) {
      try { pendingObj = JSON.parse(selectedOrder.pending_changes); } catch(e) {}
    }

    const originalValue = selectedOrder[fieldKey];
    const pendingValue = pendingObj[fieldKey];
    const hasPending = pendingValue !== undefined && pendingValue !== originalValue;

    return (
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ color: '#7A7269', fontWeight: 'bold', marginBottom: '6px', fontSize: '13px' }}>{label}</span>
        {canDirectEdit ? (
          type === 'select' ? (
            <select 
              value={(editData[fieldKey] as string) || ''} 
              onChange={e => setEditData({...editData, [fieldKey]: e.target.value})} 
              style={{ color: '#5D4A3E', border: '1px solid #DED9D3', padding: '10px', borderRadius: '8px', backgroundColor: '#FBFBF9', outline: 'none' }}
            >
              <option value="">請選擇</option>
              {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          ) : (
            <input type={type} value={editData[fieldKey] || ''} onChange={e => setEditData({...editData, [fieldKey]: type === 'number' ? Number(e.target.value) : e.target.value})} style={{ color: '#5D4A3E', border: '1px solid #DED9D3', padding: '10px', borderRadius: '8px', backgroundColor: '#FBFBF9', outline: 'none' }} />
          )
        ) : (
          <div style={{ padding: '10px', backgroundColor: '#FBFBF9', border: '1px solid #EAE6E1', borderRadius: '8px', minHeight: '19px', display: 'flex', alignItems: 'center' }}>
            {hasPending ? (
              <div>
                <span style={{ textDecoration: 'line-through', color: '#C4BDB5', marginRight: '8px' }}>{originalValue}{suffix}</span>
                <span style={{ color: '#A05C5C', fontWeight: 'bold' }}>待異動：{pendingValue}{suffix}</span>
              </div>
            ) : (
              <span style={{ color: '#5D4A3E' }}>{originalValue || '-'}{suffix}</span>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', height: '100%', gap: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* 左側列表區 */}
      <div style={{ width: '380px', backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #EAE6E1', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid #EAE6E1', backgroundColor: '#FFFFFF', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 'bold', color: '#5D4A3E', fontSize: '16px' }}>委託單列表</span>
          <select value={filter} onChange={e => setFilter(e.target.value as any)} style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #DED9D3', backgroundColor: '#FBFBF9', color: '#5D4A3E', outline: 'none' }}>
            {tabs.map(tab => <option key={tab.id} value={tab.id}>{tab.label}</option>)}
          </select>
        </div>

        {/* 🌟 搜尋列 */}
        <div style={{ padding: '10px 20px', borderBottom: '1px solid #EAE6E1', backgroundColor: '#FAFAFA' }}>
          <input
            type="text"
            placeholder="🔍 搜尋暱稱/單號/狀態... (輸入2字元以上)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #DED9D3', outline: 'none', fontSize: '13px', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: '10px' }}>
          {filteredOrders.map(order => {
            const payBadge = getPaymentBadge(order.payment_status);
            const statusBadge = getStatusBadge(order.status);
            const dateStr = order.order_date ? new Date(order.order_date).toLocaleDateString() : '';
            const isSelected = selectedId === order.id;

            const latestMsgTime = order.latest_message_at ? new Date(order.latest_message_at).getTime() : 0;
            const lastReadTime = order.last_read_at_artist ? new Date(order.last_read_at_artist).getTime() : 0;
            const hasNewMsg = latestMsgTime > lastReadTime;
            
            return (
              <div key={order.id} onClick={() => handleSelect(order)} style={{ padding: '16px', marginBottom: '8px', borderRadius: '12px', border: isSelected ? '1px solid #DED9D3' : '1px solid transparent', cursor: 'pointer', backgroundColor: isSelected ? '#FDFDFB' : '#FFFFFF', transition: 'all 0.2s ease', opacity: order.status === 'cancelled' ? 0.5 : 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#A0978D', marginBottom: '8px' }}>
                  <span>{dateStr}</span>
                  <span style={{ fontSize: '11px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px', backgroundColor: order.workflow_mode === 'free' ? '#FDF4E6' : '#E8F3EB', color: order.workflow_mode === 'free' ? '#A67B3E' : '#4E7A5A' }}>
                    {order.workflow_mode === 'free' ? '自由紀錄' : '標準委託'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', alignItems: 'center' }}>
                  <span style={{ fontWeight: 'bold', color: '#5D4A3E', fontSize: '15px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' }} title={getDualName(order)}>{getDualName(order)}</span>
                  <span style={{ fontWeight: 'bold', color: '#4E7A5A', fontSize: '15px' }}>NT$ {order.total_price}</span>
                </div>
                <div style={{ fontSize: '12px', color: '#7A7269', marginBottom: '10px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', justifyContent: 'space-between' }}>
                  <span>項目：{order.project_name || order.type_name || '未命名項目'}</span>
                  <span style={{ color: '#A0978D' }}>委託人編號：{order.client_public_id || '未綁定'}</span>
                </div>
                <div style={{ display: 'flex', gap: '8px', fontSize: '11px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ backgroundColor: payBadge.bg, color: payBadge.color, padding: '4px 8px', borderRadius: '6px', fontWeight: 'bold' }}>{payBadge.text}</span>
                  {statusBadge && <span style={{ backgroundColor: statusBadge.bg, color: statusBadge.color, padding: '4px 8px', borderRadius: '6px', fontWeight: 'bold' }}>{statusBadge.text}</span>}
                  {order.queue_status && <span style={{ backgroundColor: '#F0ECE7', color: '#5D4A3E', padding: '4px 8px', borderRadius: '6px', fontWeight: 'bold' }}>{order.queue_status}</span>}
                  {hasNewMsg && <span style={{ backgroundColor: '#F5EBEB', color: '#A05C5C', padding: '4px 8px', borderRadius: '6px', fontWeight: 'bold' }}>新訊息</span>}
                </div>
              </div>
            );
          })}
          {filteredOrders.length === 0 && <div style={{ textAlign: 'center', padding: '40px 20px', color: '#C4BDB5' }}>沒有符合條件的委託單</div>}
        </div>
      </div>

      {/* 右側內容區 */}
      <div style={{ flex: 1, backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #EAE6E1', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {!selectedOrder ? <div style={{ padding: '60px', textAlign: 'center', color: '#C4BDB5', fontSize: '15px' }}>請由左側選擇委託單以檢視詳情</div> : (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            
            <div style={{ padding: '24px 30px', borderBottom: '1px solid #EAE6E1', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
              <div>
                <h2 style={{ margin: '0 0 6px 0', color: '#5D4A3E', fontSize: '22px' }}>{getDualName(selectedOrder)}</h2>
                <div style={{ color: '#7A7269', fontSize: '14px', fontWeight: 'bold', marginBottom: '6px' }}>項目：{selectedOrder.project_name || '未命名項目'}</div>
                <div style={{ color: '#A0978D', fontSize: '12px', fontFamily: 'monospace', marginBottom: '8px', display: 'flex', gap: '16px' }}>
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
              <div style={{ display: 'flex', gap: '12px' }}>
                {selectedOrder.status !== 'completed' && selectedOrder.status !== 'cancelled' && (
                  <button onClick={handleForceComplete} style={{ padding: '10px 18px', backgroundColor: '#FFFFFF', border: '1px solid #4E7A5A', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', color: '#4E7A5A', transition: 'all 0.2s ease' }}>強制結案</button>
                )}
                <button onClick={handleToggleArchive} style={{ padding: '10px 18px', backgroundColor: '#FFFFFF', border: '1px solid #DED9D3', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', color: selectedOrder.status === 'cancelled' ? '#4E7A5A' : '#A05C5C', transition: 'all 0.2s ease' }}>
                  {selectedOrder.status === 'cancelled' ? '恢復預訂' : '作廢封存'}
                </button>
                {!selectedOrder.is_external && (
                  <button onClick={() => copyLink(selectedOrder.id)} style={{ padding: '10px 18px', backgroundColor: '#FFFFFF', border: '1px solid #DED9D3', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', color: '#5D4A3E', transition: 'all 0.2s ease' }}>複製連結</button>
                )}
                <button onClick={() => navigate(`/workspace/${selectedOrder.id}?role=artist`)} style={{ padding: '10px 18px', borderRadius: '8px', border: 'none', color: '#FFFFFF', fontWeight: 'bold', backgroundColor: '#5D4A3E', cursor: 'pointer', transition: 'all 0.2s ease' }}>進入聊天室</button>
              </div>
            </div>

            <div style={{ display: 'flex', borderBottom: '1px solid #EAE6E1', padding: '0 20px', backgroundColor: '#FAFAFA' }}>
              <button onClick={() => setActiveTab('details')} style={tabStyle(activeTab === 'details')}>委託單細項</button>
              <button onClick={() => setActiveTab('delivery')} style={tabStyle(activeTab === 'delivery')}>檔案交付</button>
              <button onClick={() => setActiveTab('logs')} style={tabStyle(activeTab === 'logs')}>歷程紀錄</button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '30px', backgroundColor: '#FFFFFF' }}>
              
              {activeTab === 'details' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <div style={{ backgroundColor: '#FBFBF9', padding: '24px', borderRadius: '12px', border: '1px solid #EAE6E1' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #EAE6E1', paddingBottom: '12px' }}>
                      <h3 style={{ margin: 0, fontSize: '16px', color: '#5D4A3E' }}>財務與收款狀態</h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '13px', color: '#7A7269', fontWeight: 'bold' }}>帳務狀態：</span>
                        <select value={selectedOrder.payment_status || 'unpaid'} onChange={(e) => handlePaymentStatusChange(e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #DED9D3', fontWeight: 'bold', color: '#5D4A3E', backgroundColor: '#FFFFFF', outline: 'none' }}>
                          <option value="unpaid">未收款</option><option value="partial">已收訂金</option><option value="paid">已收款</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
                      <input type="date" value={newPayment.record_date} onChange={e => setNewPayment({...newPayment, record_date: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #DED9D3', color: '#5D4A3E', outline: 'none' }} />
                      <input type="text" placeholder="項目 (如: 訂金)" value={newPayment.item_name} onChange={e => setNewPayment({...newPayment, item_name: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #DED9D3', flex: 1, outline: 'none' }} />
                      <input type="number" placeholder="金額" value={newPayment.amount} onChange={e => setNewPayment({...newPayment, amount: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #DED9D3', width: '120px', outline: 'none' }} />
                      <button onClick={handleAddPayment} style={{ padding: '10px 20px', backgroundColor: '#5D4A3E', color: '#FFFFFF', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>+ 記帳</button>
                    </div>

                    <table style={{ width: '100%', fontSize: '14px', borderCollapse: 'collapse', marginBottom: '20px' }}>
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

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '24px', fontSize: '14px', backgroundColor: '#FFFFFF', padding: '16px', borderRadius: '8px', border: '1px solid #EAE6E1' }}>
                      <div style={{ color: '#7A7269' }}>總金額：<span style={{ fontWeight: 'bold', color: '#5D4A3E' }}>${selectedOrder.total_price}</span></div>
                      <div style={{ color: '#7A7269' }}>已收款：<span style={{ fontWeight: 'bold', color: '#4E7A5A' }}>${totalPaid}</span></div>
                      <div style={{ color: '#7A7269' }}>未付款：<span style={{ fontWeight: 'bold', color: '#A05C5C' }}>${totalUnpaid > 0 ? totalUnpaid : 0}</span></div>
                    </div>
                  </div>

                  <div style={{ border: '1px solid #EAE6E1', borderRadius: '12px', padding: '24px', backgroundColor: '#FFFFFF' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                      <h3 style={{ margin: 0, fontSize: '16px', color: '#5D4A3E' }}>委託單細項</h3>
                      {isEditingRequest && <span style={{ color: '#A05C5C', fontSize: '13px', fontWeight: 'bold', backgroundColor: '#F5EBEB', padding: '6px 12px', borderRadius: '6px' }}>[異動編輯模式]</span>}
                      {selectedOrder.workflow_mode === 'free' && <span style={{ color: '#A67B3E', fontSize: '13px', fontWeight: 'bold', backgroundColor: '#FDF4E6', padding: '6px 12px', borderRadius: '6px' }}>[自由紀錄全解鎖]</span>}
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px', fontSize: '14px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ color: '#7A7269', fontWeight: 'bold', marginBottom: '6px', fontSize: '13px' }}>項目名稱：(繪師自訂)</span>
                        <input type="text" value={editData.project_name || ''} onChange={e => setEditData({...editData, project_name: e.target.value})} style={{ color: '#5D4A3E', border: '1px solid #DED9D3', padding: '10px', borderRadius: '8px', outline: 'none', backgroundColor: '#FBFBF9' }} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ color: '#7A7269', fontWeight: 'bold', marginBottom: '6px', fontSize: '13px' }}>交易方式：(繪師自訂)</span>
                        <input type="text" value={editData.payment_method || ''} onChange={e => setEditData({...editData, payment_method: e.target.value})} style={{ color: '#5D4A3E', border: '1px solid #DED9D3', padding: '10px', borderRadius: '8px', outline: 'none', backgroundColor: '#FBFBF9' }} />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px', fontSize: '14px' }}>
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
                      <textarea value={editData.detailed_settings || ''} onChange={e => setEditData({...editData, detailed_settings: e.target.value})} style={{ color: '#5D4A3E', border: '1px solid #DED9D3', padding: '12px', minHeight: '100px', borderRadius: '8px', whiteSpace: 'pre-wrap', outline: 'none', backgroundColor: '#FBFBF9', resize: 'vertical' }} />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #EAE6E1', paddingTop: '20px' }}>
                      {selectedOrder.workflow_mode === 'free' ? (
                        <button onClick={handleSaveDailyFields} style={{ padding: '10px 24px', backgroundColor: '#5D4A3E', color: '#FFFFFF', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s' }}>儲存所有設定</button>
                      ) : isEditingRequest ? (
                        <>
                          <button onClick={handleCancelEditRequest} style={{ padding: '10px 20px', backgroundColor: '#FFFFFF', color: '#7A7269', border: '1px solid #DED9D3', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s' }}>取消編輯</button>
                          <button onClick={handleSubmitRequestFields} style={{ padding: '10px 20px', backgroundColor: '#A05C5C', color: '#FFFFFF', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s' }}>確認送出異動</button>
                        </>
                      ) : (
                        <>
                          <button onClick={handleStartEditRequest} style={{ padding: '10px 20px', backgroundColor: '#FFFFFF', color: '#5D4A3E', border: '1px solid #DED9D3', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s' }}>申請委託單異動</button>
                          <button onClick={handleSaveDailyFields} style={{ padding: '10px 24px', backgroundColor: '#5D4A3E', color: '#FFFFFF', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s' }}>日常儲存</button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'delivery' && (
                <div style={{ animation: 'fadeIn 0.3s ease' }}>
                  {selectedOrder.workflow_mode === 'free' ? (
                    <p style={{ color: '#A05C5C', marginBottom: '24px', fontSize: '14px', fontWeight: 'bold' }}>注意：自由模式下將不紀錄合約變更及歷程紀錄，有爭議請各憑本事。</p>
                  ) : (
                    <p style={{ color: '#7A7269', marginBottom: '24px', fontSize: '14px' }}>提示：上傳後系統會自動進行壓縮與壓製浮水印，保護您的作品權益。委託人同意前皆可重複上傳新版本覆蓋。</p>
                  )}
                  
// 🌟 呼叫修正：配合定義刪除多餘參數
{renderStageBox('階段 1：草稿 (Sketch)', 'sketch', selectedOrder.current_stage === 'sketch_reviewing', ['lineart_drawing', 'lineart_reviewing', 'final_drawing', 'final_reviewing', 'completed'].includes(selectedOrder.current_stage))}
{renderStageBox('階段 2：線稿 (Lineart)', 'lineart', selectedOrder.current_stage === 'lineart_reviewing', ['final_drawing', 'final_reviewing', 'completed'].includes(selectedOrder.current_stage))}
{renderStageBox('階段 3：完稿 (Final Preview)', 'final', selectedOrder.current_stage === 'final_reviewing', selectedOrder.status === 'completed')}                </div>
              )}

              {activeTab === 'logs' && (
                <div style={{ backgroundColor: '#FBFBF9', padding: '24px', borderRadius: '12px', border: '1px solid #EAE6E1' }}>
                  <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', color: '#5D4A3E' }}>決策與操作追蹤紀錄</h3>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                    <tbody>
                      {logs.length === 0 ? <tr><td style={{ color: '#A0978D', textAlign: 'center', padding: '30px 0' }}>尚未有任何操作紀錄</td></tr> : null}
                      {logs.map(log => (
                        <tr key={log.id} style={{ borderBottom: '1px solid #EAE6E1' }}>
                          <td style={{ padding: '16px 10px', color: '#A0978D', width: '180px' }}>{new Date(log.created_at).toLocaleString()}</td>
                          <td style={{ padding: '16px 10px', width: '90px' }}>
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
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}