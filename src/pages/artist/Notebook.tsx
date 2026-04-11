import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

interface Commission {
  id: string; client_name: string; project_name: string; order_date: string;
  total_price: number; payment_status: string; status: string; current_stage: string; is_external: number;
  usage_type: string; is_rush: string; delivery_method: string; payment_method: string;
  draw_scope: string; char_count: number; bg_type: string; add_ons: string; detailed_settings: string;
  pending_changes?: string;
}
interface PaymentRecord { id: string; record_date: string; item_name: string; amount: number; }
interface ActionLog { id: string; created_at: string; actor_role: string; action_type: string; content: string; }
interface Submission { id: string; stage: string; file_url: string; version: number; created_at: string; }

export function Notebook() {
  const location = useLocation();
  const navigate = useNavigate(); 
  const queryParams = new URLSearchParams(location.search);
  const initialSelectedId = queryParams.get('id');
  const initialTab = (queryParams.get('tab') as 'details' | 'delivery' | 'logs') || 'details';

  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [filter, setFilter] = useState<'active' | 'archived' | 'all'>('active');
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId);
  const [activeTab, setActiveTab] = useState<'details' | 'delivery' | 'logs'>(initialTab);

  const [editData, setEditData] = useState<Partial<Commission>>({});
  const [isEditingRequest, setIsEditingRequest] = useState(false);

  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [newPayment, setNewPayment] = useState({ record_date: '', item_name: '', amount: '' });
  
  const [logs, setLogs] = useState<ActionLog[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [uploadUrl, setUploadUrl] = useState('');

  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedId) params.set('id', selectedId);
    params.set('tab', activeTab);
    navigate(`?${params.toString()}`, { replace: true });
  }, [selectedId, activeTab, navigate]);

  const fetchCommissions = async () => {
    const res = await fetch('/api/commissions');
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
    const res = await fetch(`/api/commissions/${id}/payments`);
    const data = await res.json();
    if (data.success) setPayments(data.data);
  };

  const fetchDeliverables = async (id: string) => {
    const res = await fetch(`/api/commissions/${id}/deliverables`);
    const data = await res.json();
    if (data.success) {
      setSubmissions(data.data.submissions);
      setLogs(data.data.logs);
    }
  };

  useEffect(() => { fetchCommissions(); }, []);

  const handleSelect = (order: Commission) => {
    setSelectedId(order.id);
    setEditData(order);
    setIsEditingRequest(false);
    fetchPayments(order.id);
    fetchDeliverables(order.id);
  };

  const handleSaveDailyFields = async () => {
    if (!selectedId) return;
    await fetch(`/api/commissions/${selectedId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_name: editData.project_name, payment_method: editData.payment_method, detailed_settings: editData.detailed_settings })
    });
    alert('日常設定已儲存');
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
      alert('尚未修改任何欄位。');
      setIsEditingRequest(false);
      return;
    }

    if (!window.confirm("請確定是否要更改委託單，此異動須經委託人同意方能變更完成")) return;

    const res = await fetch(`/api/commissions/${selectedId}/change-request`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
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

    await fetch(`/api/commissions/${selectedId}`, {
      method: 'PATCH', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    
    fetchCommissions();
  };

  const handlePaymentStatusChange = async (newStatus: string) => {
    if (!selectedId) return;
    await fetch(`/api/commissions/${selectedId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ payment_status: newStatus }) });
    fetchCommissions();
  };

  const handleAddPayment = async () => {
    if (!selectedId || !newPayment.record_date || !newPayment.item_name || !newPayment.amount) return alert("請填寫完整");
    await fetch(`/api/commissions/${selectedId}/payments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...newPayment, amount: Number(newPayment.amount) }) });
    setNewPayment({ record_date: '', item_name: '', amount: '' });
    fetchPayments(selectedId);
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!selectedId || !window.confirm('確定要刪除此筆財務紀錄嗎？')) return;
    await fetch(`/api/commissions/${selectedId}/payments/${paymentId}`, { method: 'DELETE' });
    fetchPayments(selectedId);
  };

  const copyLink = (id: string) => {
    const link = `http://localhost:5173/quote/${id}`;
    navigator.clipboard.writeText(link).then(() => alert('專屬連結已複製！'));
  };

  const handleSubmitStage = async (stageKey: string) => {
    if (!uploadUrl.trim() || !selectedId) return;
    const res = await fetch(`/api/commissions/${selectedId}/submit`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stage: stageKey, file_url: uploadUrl }) });
    const data = await res.json();
    if (data.success) { 
      setUploadUrl(''); fetchCommissions(); fetchDeliverables(selectedId); 
    } else {
      alert(data.error || '提交失敗，可能該階段已鎖定。');
      fetchDeliverables(selectedId); 
    }
  };

  const filteredCommissions = commissions.filter(c => {
    if (filter === 'active') return c.status !== 'cancelled';
    if (filter === 'archived') return c.status === 'cancelled';
    return true;
  });

  const selectedOrder = commissions.find(c => c.id === selectedId);
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const totalUnpaid = selectedOrder ? selectedOrder.total_price - totalPaid : 0;
  const isChatDisabled = selectedOrder?.is_external ? false : (!selectedOrder?.payment_status || selectedOrder?.payment_status === 'unpaid');



  const getPaymentBadge = (payment_status: string) => {
    if (payment_status === 'paid') return { text: '已收全額', color: '#fff', bg: '#1976d2' };
    if (payment_status === 'partial') return { text: '已收訂', color: '#333', bg: '#fbc02d' };
    return { text: '未付款', color: '#fff', bg: '#333' };
  };

  const tabStyle = (isActive: boolean) => ({
    padding: '12px 20px', cursor: 'pointer', borderBottom: isActive ? '3px solid #333' : '3px solid transparent',
    fontWeight: isActive ? 'bold' : 'normal', color: '#333', backgroundColor: 'transparent', borderTop: 'none', borderLeft: 'none', borderRight: 'none'
  });

  const renderStageBox = (title: string, stageKey: string, canUpload: boolean, isReviewingStatus: boolean, isPassed: boolean) => {
    const sub = submissions.find(s => s.stage === stageKey);
    const isCompleted = selectedOrder?.status === 'completed';

    let headerBg = '#f5f5f5'; let headerColor = '#333'; let statusTag = '';
    
    if (isCompleted || isPassed) { 
      headerBg = '#e8f5e9'; headerColor = '#2e7d32'; statusTag = '[已確認] 委託人已同意，本階段已鎖定'; 
    } else if (isReviewingStatus) { 
      headerBg = '#fff3e0'; headerColor = '#e65100'; statusTag = '[待審閱] 委託人確認前仍可重複上傳'; 
    } else if (canUpload) { 
      if (sub) { headerBg = '#ffebee'; headerColor = '#c62828'; statusTag = '[請求修改] 委託人已退回，請重新上傳'; } 
      else { headerBg = '#e3f2fd'; headerColor = '#1976d2'; statusTag = '[繪製中] 請上傳檔案'; }
    } else { 
      statusTag = '[鎖定] 尚未解鎖此階段'; 
    }

    return (
      <div style={{ border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden', marginBottom: '20px' }}>
        <div style={{ backgroundColor: headerBg, color: headerColor, padding: '12px 20px', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
          <span>{title}</span> <span>{statusTag}</span>
        </div>
        <div style={{ padding: '20px', backgroundColor: '#fff' }}>
          {sub && (
            <div style={{ marginBottom: '15px' }}>
              <div style={{ fontSize: '12px', color: '#888', marginBottom: '5px' }}>目前最新版本 (v{sub.version}) - {new Date(sub.created_at).toLocaleString()}</div>
              <img src={sub.file_url} alt="交稿預覽" style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '4px', border: '1px solid #eee' }} />
            </div>
          )}
          {canUpload && (
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <input type="text" placeholder="請貼上圖片網址 (模擬檔案上傳)..." value={uploadUrl} onChange={e => setUploadUrl(e.target.value)} style={{ flex: 1, padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} />
              <button onClick={() => handleSubmitStage(stageKey)} style={{ padding: '10px 20px', backgroundColor: '#333', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>提交新版本</button>
            </div>
          )}
          {(!canUpload && !sub) && <div style={{ color: '#aaa', textAlign: 'center' }}>尚無檔案</div>}
        </div>
      </div>
    );
  };

  const renderRequestField = (label: string, fieldKey: keyof Commission, type: 'text' | 'number' = 'text', suffix: string = '') => {
    if (!selectedOrder) return null;
    let pendingObj: Record<string, any> = {};
    if (selectedOrder.pending_changes) {
      try { pendingObj = JSON.parse(selectedOrder.pending_changes); } catch(e) {}
    }

    const originalValue = selectedOrder[fieldKey];
    const pendingValue = pendingObj[fieldKey];
    const hasPending = pendingValue !== undefined && pendingValue !== originalValue;

    return (
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ color: '#333', fontWeight: 'bold', marginBottom: '4px' }}>{label}</span>
        {isEditingRequest ? (
          <input type={type} value={editData[fieldKey] || ''} onChange={e => setEditData({...editData, [fieldKey]: type === 'number' ? Number(e.target.value) : e.target.value})} style={{ color: '#333', border: '1px solid #ccc', padding: '6px', borderRadius: '4px' }} />
        ) : (
          <div style={{ padding: '6px', backgroundColor: '#fff', border: '1px solid #eee', borderRadius: '4px', minHeight: '33px', display: 'flex', alignItems: 'center' }}>
            {hasPending ? (
              <div>
                <span style={{ textDecoration: 'line-through', color: '#999', marginRight: '8px' }}>{originalValue}{suffix}</span>
                <span style={{ color: '#d32f2f', fontWeight: 'bold' }}>待異動：{pendingValue}{suffix}</span>
              </div>
            ) : (
              <span style={{ color: '#333' }}>{originalValue || '-'}{suffix}</span>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 120px)', gap: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      
      <div style={{ width: '380px', backgroundColor: '#fff', border: '1px solid #ddd', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '15px', borderBottom: '1px solid #ddd', backgroundColor: '#f9f9f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 'bold' }}>委託單列表</span>
          <select value={filter} onChange={e => setFilter(e.target.value as any)} style={{ padding: '4px', borderRadius: '4px', border: '1px solid #ccc' }}>
            <option value="active">進行中</option>
            <option value="archived">已作廢</option>
            <option value="all">全部顯示</option>
          </select>
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {filteredCommissions.map(order => {
            const payBadge = getPaymentBadge(order.payment_status);
            const dateStr = order.order_date ? new Date(order.order_date).toLocaleDateString() : '';
            return (
              <div key={order.id} onClick={() => handleSelect(order)} style={{ padding: '15px', borderBottom: '1px solid #eee', cursor: 'pointer', backgroundColor: selectedId === order.id ? '#f0f8ff' : '#fff', opacity: order.status === 'cancelled' ? 0.6 : 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                  <span>{dateStr}</span>
                  {/* 新增委託人名稱 */}
                  <span style={{ fontWeight: '500' }}>{order.client_name || '外部委託'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <span style={{ fontWeight: 'bold', color: '#333' }}>{order.project_name || '未命名項目'}</span>
                  <span style={{ fontWeight: 'bold', color: '#2e7d32' }}>NT$ {order.total_price}</span>
                </div>
<div style={{ display: 'flex', gap: '6px', fontSize: '11px', flexWrap: 'wrap' }}>
  <span style={{ backgroundColor: payBadge.bg, color: payBadge.color, padding: '2px 6px', borderRadius: '2px' }}>{payBadge.text}</span>
  {/* 動態顯示目前進度 */}
  <span style={{ border: '1px solid #1976d2', color: '#1976d2', padding: '2px 6px', borderRadius: '2px', fontWeight: 'bold' }}>
    {order.current_stage || '尚未開始'}
  </span>
</div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ flex: 1, backgroundColor: '#fff', border: '1px solid #ddd', overflowY: 'auto' }}>
        {!selectedOrder ? <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>請選擇委託單</div> : (
          <div>
            <div style={{ padding: '20px', borderBottom: '1px solid #ddd', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2 style={{ margin: '0 0 5px 0', color: '#333' }}>{selectedOrder.project_name || '未命名項目'}</h2>
                <div style={{ color: '#888', fontSize: '13px', fontFamily: 'monospace' }}>單號：{selectedOrder.id}</div>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  onClick={handleToggleArchive} 
                  style={{ 
                    padding: '8px 15px', 
                    backgroundColor: '#fff', 
                    border: '1px solid #ccc', 
                    borderRadius: '6px', 
                    cursor: 'pointer', 
                    fontWeight: 'bold',
                    color: selectedOrder.status === 'cancelled' ? '#2e7d32' : '#d32f2f' 
                  }}
                >
                  {selectedOrder.status === 'cancelled' ? '恢復預訂' : '作廢封存'}
                </button>
                
                {!selectedOrder.is_external && (
                  <button onClick={() => copyLink(selectedOrder.id)} style={{ padding: '8px 15px', backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', color: '#333' }}>
                    複製連結
                  </button>
                )}
                <button 
                  onClick={() => navigate(`/workspace/${selectedOrder.id}?role=artist`)}
                  disabled={isChatDisabled}
                  style={{ padding: '8px 15px', borderRadius: '6px', border: 'none', color: '#fff', fontWeight: 'bold', backgroundColor: isChatDisabled ? '#ccc' : '#333', cursor: isChatDisabled ? 'not-allowed' : 'pointer' }}
                >
                  {isChatDisabled ? '[等待收款解鎖]' : '進入工作區'}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', borderBottom: '1px solid #ddd', padding: '0 20px' }}>
              <button onClick={() => setActiveTab('details')} style={tabStyle(activeTab === 'details')}>委託單細項</button>
              <button onClick={() => setActiveTab('delivery')} style={tabStyle(activeTab === 'delivery')}>檔案交付</button>
              <button onClick={() => setActiveTab('logs')} style={tabStyle(activeTab === 'logs')}>歷程紀錄</button>
            </div>

            {activeTab === 'details' && (
              <div style={{ padding: '20px' }}>
                <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e0e0e0', borderLeft: '4px solid #fbc02d', marginBottom: '25px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                    <h3 style={{ margin: 0, fontSize: '16px', color: '#333' }}>財務與收款狀態</h3>
                    <div>
                      <span style={{ fontSize: '14px', marginRight: '10px', color: '#333' }}>調整狀態：</span>
                      <select value={selectedOrder.payment_status || 'unpaid'} onChange={(e) => handlePaymentStatusChange(e.target.value)} style={{ padding: '6px', borderRadius: '4px', border: '1px solid #ccc', fontWeight: 'bold', color: '#333' }}>
                        <option value="unpaid">未收款 (聊天室鎖定)</option>
                        <option value="partial">已收訂金 (解鎖)</option>
                        <option value="paid">已收款 (解鎖)</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                    <input type="date" value={newPayment.record_date} onChange={e => setNewPayment({...newPayment, record_date: e.target.value})} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
                    <input type="text" placeholder="項目 (如: 訂金)" value={newPayment.item_name} onChange={e => setNewPayment({...newPayment, item_name: e.target.value})} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', flex: 1 }} />
                    <input type="number" placeholder="金額" value={newPayment.amount} onChange={e => setNewPayment({...newPayment, amount: e.target.value})} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', width: '100px' }} />
                    <button onClick={handleAddPayment} style={{ padding: '8px 15px', backgroundColor: '#333', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>＋ 記帳</button>
                  </div>

                  <table style={{ width: '100%', fontSize: '14px', borderCollapse: 'collapse', marginBottom: '15px' }}>
                    <tbody>
                      {payments.map(p => (
                        <tr key={p.id} style={{ borderBottom: '1px dashed #eee' }}>
                          <td style={{ padding: '8px 0', color: '#666' }}>{p.record_date}</td>
                          <td style={{ padding: '8px 0', color: '#333' }}>{p.item_name}</td>
                          <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 'bold', color: '#333' }}>+ NT$ {p.amount}</td>
                          <td style={{ padding: '8px 0', textAlign: 'right' }}>
                            <button onClick={() => handleDeletePayment(p.id)} style={{ padding: '2px 6px', backgroundColor: '#ffebee', color: '#c62828', border: '1px solid #ffcdd2', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>刪除</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '20px', fontSize: '15px', backgroundColor: '#f9f9f9', padding: '10px', borderRadius: '6px' }}>
                    <div style={{ color: '#333' }}>總金額設定：<span style={{ fontWeight: 'bold' }}>${selectedOrder.total_price}</span></div>
                    <div style={{ color: '#333' }}>已收款總計：<span style={{ fontWeight: 'bold', color: 'green' }}>${totalPaid}</span></div>
                    <div style={{ color: '#333' }}>尚未付款：<span style={{ fontWeight: 'bold', color: 'red' }}>${totalUnpaid > 0 ? totalUnpaid : 0}</span></div>
                  </div>
                </div>

                <div style={{ border: '1px solid #e0e0e0', borderRadius: '8px', padding: '20px', backgroundColor: '#fafafa' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h3 style={{ margin: 0, fontSize: '16px', color: '#333' }}>委託單細項</h3>
                    {isEditingRequest && <span style={{ color: '#d32f2f', fontSize: '13px', fontWeight: 'bold', backgroundColor: '#ffebee', padding: '4px 8px', borderRadius: '4px' }}>✏️ 異動編輯模式</span>}
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px', fontSize: '14px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ color: '#333', fontWeight: 'bold', marginBottom: '4px' }}>項目名稱：(繪師自訂)</span>
                      <input type="text" value={editData.project_name || ''} onChange={e => setEditData({...editData, project_name: e.target.value})} style={{ color: '#333', border: '1px solid #ccc', padding: '6px', borderRadius: '4px' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ color: '#333', fontWeight: 'bold', marginBottom: '4px' }}>交易方式：(繪師自訂)</span>
                      <input type="text" value={editData.payment_method || ''} onChange={e => setEditData({...editData, payment_method: e.target.value})} style={{ color: '#333', border: '1px solid #ccc', padding: '6px', borderRadius: '4px' }} />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px', fontSize: '14px' }}>
                    {renderRequestField('委託用途：', 'usage_type')}
                    {renderRequestField('是否急件：', 'is_rush')}
                    {renderRequestField('交稿方式：', 'delivery_method')}
                    {renderRequestField('總金額：', 'total_price', 'number')}
                    {renderRequestField('繪畫範圍：', 'draw_scope')}
                    {renderRequestField('人物數量：', 'char_count', 'number', ' 人')}
                    {renderRequestField('背景設定：', 'bg_type')}
                    {renderRequestField('附加選項：', 'add_ons')}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '20px' }}>
                    <span style={{ color: '#333', fontWeight: 'bold', marginBottom: '4px' }}>詳細設定：(委託方不可見)</span>
                    <textarea value={editData.detailed_settings || ''} onChange={e => setEditData({...editData, detailed_settings: e.target.value})} style={{ color: '#333', border: '1px solid #ccc', padding: '8px', minHeight: '80px', borderRadius: '4px', whiteSpace: 'pre-wrap' }} />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '15px', borderTop: '1px solid #eee', paddingTop: '15px' }}>
                    {isEditingRequest ? (
                      <>
                        <button onClick={handleCancelEditRequest} style={{ padding: '8px 16px', backgroundColor: '#fff', color: '#666', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>取消編輯</button>
                        <button onClick={handleSubmitRequestFields} style={{ padding: '8px 16px', backgroundColor: '#d32f2f', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>確認送出異動</button>
                      </>
                    ) : (
                      <>
                        <button onClick={handleStartEditRequest} style={{ padding: '8px 16px', backgroundColor: '#fff', color: '#333', border: '1px solid #333', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>申請委託單異動</button>
                        <button onClick={handleSaveDailyFields} style={{ padding: '8px 16px', backgroundColor: '#333', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>日常儲存</button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'delivery' && (
              <div style={{ padding: '20px' }}>
                <p style={{ color: '#666', marginBottom: '20px' }}>在此區塊提交各階段的檔案。委託人同意前皆可重複上傳新版本覆蓋。</p>
                {renderStageBox('階段 1：草稿 (Sketch)', 'sketch', ['sketch_drawing', 'sketch_reviewing'].includes(selectedOrder.current_stage), selectedOrder.current_stage === 'sketch_reviewing', ['lineart_drawing', 'lineart_reviewing', 'final_drawing', 'final_reviewing', 'completed'].includes(selectedOrder.current_stage))}
                {renderStageBox('階段 2：線稿 (Lineart)', 'lineart', ['lineart_drawing', 'lineart_reviewing'].includes(selectedOrder.current_stage), selectedOrder.current_stage === 'lineart_reviewing', ['final_drawing', 'final_reviewing', 'completed'].includes(selectedOrder.current_stage))}
                {renderStageBox('階段 3：完稿 (Final)', 'final', ['final_drawing', 'final_reviewing'].includes(selectedOrder.current_stage), selectedOrder.current_stage === 'final_reviewing', selectedOrder.status === 'completed')}
              </div>
            )}

            {activeTab === 'logs' && (
              <div style={{ padding: '20px' }}>
                <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
                  <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', color: '#333' }}>決策與操作追蹤紀錄</h3>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                    <tbody>
                      {logs.length === 0 ? <tr><td style={{ color: '#999', textAlign: 'center', padding: '20px' }}>尚未有任何操作紀錄</td></tr> : null}
                      {logs.map(log => (
                        <tr key={log.id} style={{ borderBottom: '1px solid #eee' }}>
                          <td style={{ padding: '12px 10px', color: '#888', width: '160px' }}>{new Date(log.created_at).toLocaleString()}</td>
                          <td style={{ padding: '12px 10px', width: '80px' }}>
                            <span style={{ backgroundColor: log.actor_role === 'artist' ? '#eee' : '#e8f5e9', color: log.actor_role === 'artist' ? '#333' : '#2e7d32', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>
                              {log.actor_role === 'artist' ? '繪師' : '委託人'}
                            </span>
                          </td>
                          <td style={{ padding: '12px 10px', color: '#333', whiteSpace: 'pre-wrap' }}>{log.content}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}