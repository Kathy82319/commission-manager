import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

interface OrderData {
  id: string;
  type_name: string;
  status: string;
  current_stage: string;
  total_price: number;
  payment_status: string;
  // 新增欄位以支援異動顯示
  scope?: string;
  character_count?: number;
  format?: string;
  usage?: string;
  deadline?: string;
  pending_changes?: string; // 儲存 JSON 字串
}

interface ActionLog { id: string; created_at: string; actor_role: string; content: string; }
interface Submission { id: string; stage: string; file_url: string; version: number; created_at: string; }

const paymentStatusMap: Record<string, string> = { unpaid: '未付款', partial: '已付訂金', paid: '已付清' };

export function ClientOrder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'details' | 'delivery' | 'logs'>('delivery');
  
  const [order, setOrder] = useState<OrderData | null>(null);
  const [logs, setLogs] = useState<ActionLog[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchAllData = async () => {
    try {
      const orderRes = await fetch(`/api/commissions/${id}`);
      const orderData = await orderRes.json();
      if (orderData.success) setOrder(orderData.data);

      const delivRes = await fetch(`/api/commissions/${id}/deliverables`);
      const delivData = await delivRes.json();
      if (delivData.success) {
        setLogs(delivData.data.logs);
        setSubmissions(delivData.data.submissions);
      }
    } catch (error) {
      console.error("讀取失敗", error);
    }
  };

  useEffect(() => { fetchAllData(); }, [id]);

  // 回應紅字異動申請 (同意/拒絕)
  const handleResponseChange = async (action: 'approve' | 'reject') => {
    const msg = action === 'approve' 
      ? "同意變更後，委託規格將立即更新，確定嗎？" 
      : "確定要拒絕此異動申請嗎？（規格將維持不變）";
    
    if (!window.confirm(msg)) return;

    setIsProcessing(true);
    try {
      const res = await fetch(`/api/commissions/${id}/change-response`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      const data = await res.json();
      if (data.success) {
        alert(action === 'approve' ? '已更新委託規格！' : '已拒絕異動申請。');
        fetchAllData();
      } else {
        alert('操作失敗：' + data.error);
      }
    } catch (e) {
      alert('系統錯誤');
    } finally {
      setIsProcessing(false);
    }
  };

  // 稿件審閱邏輯 (同意/要求修改)
  const handleReview = async (stageKey: string, action: 'approve' | 'reject') => {
    let comment = '';
    if (action === 'approve') {
      const confirmApprove = window.confirm('確定要同意此階段的稿件嗎？\n按下同意後將鎖定此階段，並進入下一流程。此動作無法還原。');
      if (!confirmApprove) return;
    } else {
      const reason = window.prompt('請輸入請求修改的具體建議或原因：');
      if (reason === null) return;
      if (reason.trim() === '') return alert('必須填寫修改原因才能退回。');
      comment = reason;
    }

    setIsProcessing(true);
    const res = await fetch(`/api/commissions/${id}/review`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage: stageKey, action, comment })
    });
    const data = await res.json();
    setIsProcessing(false);

    if (data.success) {
      alert(action === 'approve' ? '已送出同意確認！' : '已送出修改請求！');
      fetchAllData();
    } else {
      alert('處理失敗：' + data.error);
    }
  };

  // 輔助函數：渲染帶有異動對比的欄位
  const renderFieldWithPending = (label: string, fieldKey: string, currentValue: any, suffix: string = '') => {
    let pendingValue = null;
    if (order?.pending_changes) {
      try {
        const changes = JSON.parse(order.pending_changes);
        pendingValue = changes[fieldKey];
      } catch (e) {}
    }

    const isChanged = pendingValue !== undefined && pendingValue !== null && pendingValue !== currentValue;

    return (
      <div style={{ marginBottom: '15px' }}>
        <div style={{ fontSize: '13px', color: '#666', marginBottom: '4px' }}>{label}</div>
        <div style={{ fontSize: '15px', color: '#333' }}>
          {isChanged ? (
            <>
              <span style={{ textDecoration: 'line-through', color: '#999', marginRight: '8px' }}>
                {currentValue}{suffix}
              </span>
              <span style={{ color: '#d32f2f', fontWeight: 'bold' }}>
                變更為：{pendingValue}{suffix}
              </span>
            </>
          ) : (
            <span>{currentValue || '未填寫'}{suffix}</span>
          )}
        </div>
      </div>
    );
  };

  if (!order) return <div style={{ padding: '20px', textAlign: 'center' }}>載入中...</div>;

  const isChatDisabled = !order.payment_status || order.payment_status === 'unpaid';

  const tabBtnStyle = (isActive: boolean) => ({
    flex: 1, padding: '12px 0', border: 'none', backgroundColor: 'transparent',
    borderBottom: isActive ? '3px solid #1976d2' : '3px solid #ddd',
    color: isActive ? '#1976d2' : '#666', fontWeight: isActive ? 'bold' : 'normal', cursor: 'pointer'
  });

  const renderClientStageBox = (title: string, stageKey: string, isReviewingStatus: boolean, isPassed: boolean) => {
    const sub = submissions.find(s => s.stage === stageKey);
    const isCompleted = order.status === 'completed';

    return (
      <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #ddd', overflow: 'hidden', marginBottom: '20px' }}>
        <div style={{ backgroundColor: isPassed || isCompleted ? '#e8f5e9' : '#f5f5f5', padding: '12px', fontWeight: 'bold', borderBottom: '1px solid #ddd', color: isPassed || isCompleted ? '#2e7d32' : '#333' }}>
          {title} {isPassed || isCompleted ? '(已確認)' : ''}
        </div>
        <div style={{ padding: '15px' }}>
          {!sub ? (
            <div style={{ color: '#888', textAlign: 'center', padding: '20px 0' }}>繪師尚未提交檔案或正在繪製中</div>
          ) : (
            <div>
              <div style={{ fontSize: '12px', color: '#888', marginBottom: '10px' }}>最新版本 (v{sub.version})</div>
              <img src={sub.file_url} alt="稿件預覽" style={{ width: '100%', borderRadius: '4px', border: '1px solid #eee' }} />
              {isReviewingStatus && !isCompleted && (
                <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                  <button onClick={() => handleReview(stageKey, 'reject')} disabled={isProcessing} style={{ flex: 1, padding: '12px', backgroundColor: '#fff', color: '#d32f2f', border: '1px solid #d32f2f', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>要求修改</button>
                  <button onClick={() => handleReview(stageKey, 'approve')} disabled={isProcessing} style={{ flex: 1, padding: '12px', backgroundColor: '#1976d2', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>同意稿件</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', backgroundColor: '#f5f5f5', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* 頁首 */}
      <div style={{ backgroundColor: '#fff', padding: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #ddd' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: '#1976d2', fontSize: '16px', padding: 0 }}>返回</button>
        <span style={{ fontWeight: 'bold' }}>委託單詳情</span>
        <div style={{ width: '32px' }}></div>
      </div>

      {/* 標題區 */}
      <div style={{ padding: '15px', backgroundColor: '#fff', borderBottom: '1px solid #ddd' }}>
        <h2 style={{ margin: '0 0 10px 0', fontSize: '18px' }}>{order.type_name}</h2>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '14px', color: '#666' }}>單號：{order.id.split('-')[0]}...</span>
          <button 
            onClick={() => navigate(`/workspace/${order.id}?role=client`)} disabled={isChatDisabled}
            style={{ padding: '8px 15px', backgroundColor: isChatDisabled ? '#ccc' : '#333', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '13px', cursor: isChatDisabled ? 'not-allowed' : 'pointer' }}
          >
            進入聊天室
          </button>
        </div>
      </div>

      {/* 紅字異動審核區 (僅在有 pending_changes 時顯示) */}
      {order.pending_changes && (
        <div style={{ backgroundColor: '#fffde7', borderBottom: '2px solid #fbc02d', padding: '15px' }}>
          <div style={{ color: '#827717', fontWeight: 'bold', marginBottom: '5px', display: 'flex', alignItems: 'center' }}>
            ⚠️ 繪師提出了內容異動申請
          </div>
          <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#555' }}>
            請查看「內容與付款」分頁中的紅字標示。是否同意以此新規格繼續委託？
          </p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              onClick={() => handleResponseChange('reject')} 
              disabled={isProcessing}
              style={{ flex: 1, padding: '10px', backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer' }}
            >
              拒絕變更
            </button>
            <button 
              onClick={() => handleResponseChange('approve')} 
              disabled={isProcessing}
              style={{ flex: 1, padding: '10px', backgroundColor: '#d32f2f', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              同意變更
            </button>
          </div>
        </div>
      )}

      {/* 分頁標籤 */}
      <div style={{ display: 'flex', backgroundColor: '#fff' }}>
        <button style={tabBtnStyle(activeTab === 'delivery')} onClick={() => setActiveTab('delivery')}>收件與審閱</button>
        <button style={tabBtnStyle(activeTab === 'details')} onClick={() => setActiveTab('details')}>內容與付款</button>
        <button style={tabBtnStyle(activeTab === 'logs')} onClick={() => setActiveTab('logs')}>歷程紀錄</button>
      </div>

      {/* 分頁內容 */}
      <div style={{ padding: '15px', flex: 1 }}>
        
        {activeTab === 'delivery' && (
          <div>
            {renderClientStageBox('草圖階段', 'sketch', order.current_stage === 'sketch_reviewing', ['lineart_drawing', 'lineart_reviewing', 'final_drawing', 'final_reviewing', 'completed'].includes(order.current_stage))}
            {renderClientStageBox('線稿階段', 'lineart', order.current_stage === 'lineart_reviewing', ['final_drawing', 'final_reviewing', 'completed'].includes(order.current_stage))}
            {renderClientStageBox('完稿階段', 'final', order.current_stage === 'final_reviewing', order.status === 'completed')}
          </div>
        )}

        {activeTab === 'details' && (
          <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #ddd' }}>
            <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', borderLeft: '4px solid #1976d2', paddingLeft: '10px' }}>付款資訊</h3>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: order.payment_status === 'paid' ? '#2e7d32' : '#e65100', marginBottom: '20px' }}>
              {renderFieldWithPending('總金額', 'total_price', order.total_price, ' 元')}
              <div style={{ fontSize: '14px', fontWeight: 'normal' }}>狀態：{paymentStatusMap[order.payment_status] || '未付款'}</div>
            </div>
            
            <h3 style={{ margin: '25px 0 15px 0', fontSize: '16px', borderLeft: '4px solid #1976d2', paddingLeft: '10px' }}>委託規格</h3>
            {renderFieldWithPending('繪畫範圍', 'scope', order.scope)}
            {renderFieldWithPending('人物數量', 'character_count', order.character_count, ' 人')}
            {renderFieldWithPending('交稿格式', 'format', order.format)}
            {renderFieldWithPending('用途說明', 'usage', order.usage)}
            {renderFieldWithPending('預計截稿日', 'deadline', order.deadline)}

            <h3 style={{ margin: '25px 0 10px 0', fontSize: '16px', color: '#666' }}>委託協議</h3>
            <div style={{ fontSize: '12px', color: '#999', lineHeight: '1.6', backgroundColor: '#f9f9f9', padding: '10px', borderRadius: '4px' }}>
              1. 本委託為客製化商品，不適用七天鑑賞期。<br/>
              2. 完稿後若非繪師方失誤，僅提供兩次微調修改。<br/>
              (您已於送出表單時勾選同意此版本協議)
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div style={{ backgroundColor: '#fff', padding: '15px', borderRadius: '8px', border: '1px solid #ddd' }}>
            {logs.length === 0 ? <div style={{ color: '#999', textAlign: 'center' }}>尚無紀錄</div> : (
              logs.map(log => (
                <div key={log.id} style={{ borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '10px' }}>
                  <div style={{ fontSize: '11px', color: '#bbb', marginBottom: '4px' }}>{new Date(log.created_at).toLocaleString()}</div>
                  <div style={{ fontSize: '14px', color: '#333' }}>
                    <span style={{ fontWeight: 'bold', color: log.actor_role === 'artist' ? '#1976d2' : '#2e7d32' }}>
                      [{log.actor_role === 'artist' ? '繪師' : '您'}]
                    </span> {log.content}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

      </div>
    </div>
  );
}