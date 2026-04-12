import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

interface OrderData {
  id: string;
  type_name: string;
  status: string;
  current_stage: string;
  total_price: number;
  payment_status: string;
  scope?: string;
  character_count?: number;
  format?: string;
  usage?: string;
  deadline?: string;
  pending_changes?: string; 
}

interface ActionLog { id: string; created_at: string; actor_role: string; content: string; }
interface Submission { id: string; stage: string; file_url: string; version: number; created_at: string; }

const paymentStatusMap: Record<string, string> = { unpaid: '尚未付款', partial: '已付訂金', paid: '已付清' };

export function ClientOrder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'delivery' | 'details' | 'logs'>('delivery');
  
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
    try {
      const res = await fetch(`/api/commissions/${id}/review`, {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: stageKey, action, comment })
      });
      
      if (!res.ok) throw new Error(`伺服器錯誤狀態: ${res.status}`);

      const data = await res.json();
      if (data.success) {
        alert(action === 'approve' ? '已送出同意確認！' : '已送出修改請求！');
        fetchAllData();
      } else {
        alert('處理失敗：' + data.error);
      }
    } catch (err) {
      console.error(err);
      alert('發生預期外的錯誤，請檢查網路連線或系統日誌。');
    } finally {
      setIsProcessing(false);
    }
  };

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
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '13px', color: '#A0978D', marginBottom: '6px', fontWeight: 'bold' }}>{label}</div>
        <div style={{ fontSize: '15px', color: '#5D4A3E', fontWeight: '500' }}>
          {isChanged ? (
            <>
              <span style={{ textDecoration: 'line-through', color: '#C4BDB5', marginRight: '8px' }}>
                {currentValue}{suffix}
              </span>
              <span style={{ color: '#A05C5C', fontWeight: 'bold', backgroundColor: '#F5EBEB', padding: '2px 6px', borderRadius: '4px' }}>
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

  if (!order) return <div style={{ backgroundColor: '#FBFBF9', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#A0978D' }}>載入委託單資料中...</div>;

  const isChatDisabled = !order.payment_status || order.payment_status === 'unpaid';

  const tabBtnStyle = (isActive: boolean) => ({
    flex: 1, padding: '14px 0', border: 'none', backgroundColor: 'transparent',
    borderBottom: isActive ? '3px solid #5D4A3E' : '3px solid transparent',
    color: isActive ? '#5D4A3E' : '#A0978D', fontWeight: isActive ? 'bold' : 'normal', 
    cursor: 'pointer', fontSize: '15px', transition: 'all 0.2s ease'
  });

  const renderClientStageBox = (title: string, stageKey: string, isReviewingStatus: boolean, isPassed: boolean) => {
    const sub = submissions.find(s => s.stage === stageKey);
    const isCompleted = order.status === 'completed';

    return (
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #EAE6E1', overflow: 'hidden', marginBottom: '20px', boxShadow: '0 4px 16px rgba(0,0,0,0.02)' }}>
        <div style={{ backgroundColor: isPassed || isCompleted ? '#E8F3EB' : '#FBFBF9', padding: '16px 20px', fontWeight: 'bold', borderBottom: '1px solid #EAE6E1', color: isPassed || isCompleted ? '#4E7A5A' : '#5D4A3E', fontSize: '15px' }}>
          {title} {isPassed || isCompleted ? ' (已確認)' : ''}
        </div>
        <div style={{ padding: '20px' }}>
          {!sub ? (
            <div style={{ color: '#A0978D', textAlign: 'center', padding: '30px 0', fontSize: '14px', backgroundColor: '#FDFDFB', borderRadius: '8px', border: '1px dashed #DED9D3' }}>繪師尚未提交檔案或正在繪製中</div>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '12px', color: '#7A7269', fontWeight: 'bold', backgroundColor: '#F4F0EB', padding: '4px 10px', borderRadius: '12px' }}>最新版本 (v{sub.version})</span>
                <span style={{ fontSize: '12px', color: '#A0978D' }}>{new Date(sub.created_at).toLocaleDateString()}</span>
              </div>
              <img src={sub.file_url} alt="稿件預覽" style={{ width: '100%', borderRadius: '8px', border: '1px solid #EAE6E1', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }} />
              
              {isReviewingStatus && !isCompleted && (
                <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                  <button onClick={() => handleReview(stageKey, 'reject')} disabled={isProcessing} style={{ flex: 1, padding: '14px', backgroundColor: '#FFFFFF', color: '#A05C5C', border: '1px solid #DED9D3', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }} onMouseEnter={e => e.currentTarget.style.borderColor='#A05C5C'} onMouseLeave={e => e.currentTarget.style.borderColor='#DED9D3'}>要求修改</button>
                  <button onClick={() => handleReview(stageKey, 'approve')} disabled={isProcessing} style={{ flex: 1, padding: '14px', backgroundColor: '#4A7294', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(74,114,148,0.2)' }} onMouseEnter={e => e.currentTarget.style.transform='translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform='translateY(0)'}>同意稿件</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ backgroundColor: '#d5d9ed', minHeight: '100vh', display: 'flex', justifyContent: 'center', fontFamily: 'sans-serif' }}>
      <div style={{ width: '100%', maxWidth: '500px', backgroundColor: '#FBFBF9', display: 'flex', flexDirection: 'column', boxShadow: '0 0 40px rgba(0,0,0,0.05)', minHeight: '100vh' }}>
        
        {/* 頁首 */}
        <div style={{ backgroundColor: '#FFFFFF', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #EAE6E1', position: 'sticky', top: 0, zIndex: 10 }}>
          <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: '#A0978D', fontSize: '15px', padding: 0, fontWeight: 'bold', cursor: 'pointer' }}>← 返回</button>
          <span style={{ fontWeight: 'bold', color: '#5D4A3E', fontSize: '16px' }}>委託單管理區</span>
          <div style={{ width: '40px' }}></div>
        </div>

        {/* 標題區 */}
        <div style={{ padding: '24px 20px', backgroundColor: '#FFFFFF', borderBottom: '1px solid #EAE6E1' }}>
          <h2 style={{ margin: '0 0 12px 0', fontSize: '20px', color: '#5D4A3E' }}>{order.type_name || '未命名項目'}</h2>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: '#A0978D', fontFamily: 'monospace' }}>單號：{order.id.split('-')[0]}...</span>
            <button 
              onClick={() => navigate(`/workspace/${order.id}?role=client`)} 
              style={{ padding: '10px 16px', backgroundColor: '#5D4A3E', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(93,74,62,0.2)' }}
            >
              進入聊天室
            </button>
          </div>
        </div>

        {/* 內容區 */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          
          {/* 紅字異動審核區 */}
          {order.pending_changes && (
            <div style={{ backgroundColor: '#FDF4E6', borderBottom: '2px solid #A67B3E', padding: '20px' }}>
              <div style={{ color: '#A67B3E', fontWeight: 'bold', marginBottom: '8px', display: 'flex', alignItems: 'center', fontSize: '15px' }}>
                ⚠️ 繪師提出了規格異動申請
              </div>
              <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#7A7269', lineHeight: '1.6' }}>
                請查看「內容與付款」分頁中的紅字標示。是否同意以此新規格繼續委託？
              </p>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={() => handleResponseChange('reject')} disabled={isProcessing} style={{ flex: 1, padding: '12px', backgroundColor: '#FFFFFF', border: '1px solid #DED9D3', color: '#7A7269', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s' }}>拒絕變更</button>
                <button onClick={() => handleResponseChange('approve')} disabled={isProcessing} style={{ flex: 1, padding: '12px', backgroundColor: '#A05C5C', color: '#FFFFFF', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(160,92,92,0.2)' }}>同意變更</button>
              </div>
            </div>
          )}

          {/* 分頁標籤 */}
          <div style={{ display: 'flex', backgroundColor: '#FFFFFF', borderBottom: '1px solid #EAE6E1', position: 'sticky', top: '56px', zIndex: 9 }}>
            <button style={tabBtnStyle(activeTab === 'delivery')} onClick={() => setActiveTab('delivery')}>收件與審閱</button>
            <button style={tabBtnStyle(activeTab === 'details')} onClick={() => setActiveTab('details')}>內容與付款</button>
            <button style={tabBtnStyle(activeTab === 'logs')} onClick={() => setActiveTab('logs')}>歷程紀錄</button>
          </div>

          {/* 分頁內容 */}
          <div style={{ padding: '20px' }}>
            
            {activeTab === 'delivery' && (
              <div style={{ animation: 'fadeIn 0.2s ease' }}>
                {renderClientStageBox('草圖階段', 'sketch', order.current_stage === 'sketch_reviewing', ['lineart_drawing', 'lineart_reviewing', 'final_drawing', 'final_reviewing', 'completed'].includes(order.current_stage))}
                {renderClientStageBox('線稿階段', 'lineart', order.current_stage === 'lineart_reviewing', ['final_drawing', 'final_reviewing', 'completed'].includes(order.current_stage))}
                {renderClientStageBox('完稿階段', 'final', order.current_stage === 'final_reviewing', order.status === 'completed')}
              </div>
            )}

            {activeTab === 'details' && (
              <div style={{ backgroundColor: '#FFFFFF', padding: '24px', borderRadius: '16px', border: '1px solid #EAE6E1', boxShadow: '0 4px 16px rgba(0,0,0,0.02)', animation: 'fadeIn 0.2s ease' }}>
                
                <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', color: '#5D4A3E', borderBottom: '1px solid #F0ECE7', paddingBottom: '12px' }}>財務資訊</h3>
                <div style={{ backgroundColor: '#FBFBF9', padding: '16px', borderRadius: '12px', border: '1px dashed #DED9D3', marginBottom: '24px' }}>
                  {renderFieldWithPending('總金額', 'total_price', order.total_price, ' 元')}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #EAE6E1' }}>
                    <span style={{ fontSize: '13px', color: '#7A7269', fontWeight: 'bold' }}>付款狀態</span>
                    <span style={{ fontSize: '14px', fontWeight: 'bold', color: order.payment_status === 'paid' ? '#4E7A5A' : '#A05C5C', backgroundColor: order.payment_status === 'paid' ? '#E8F3EB' : '#F5EBEB', padding: '4px 10px', borderRadius: '6px' }}>
                      {paymentStatusMap[order.payment_status] || '未付款'}
                    </span>
                  </div>
                </div>
                
                <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', color: '#5D4A3E', borderBottom: '1px solid #F0ECE7', paddingBottom: '12px' }}>委託規格</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '4px' }}>
                  {renderFieldWithPending('繪畫範圍', 'scope', order.scope)}
                  {renderFieldWithPending('人物數量', 'character_count', order.character_count, ' 人')}
                  {renderFieldWithPending('交稿格式', 'format', order.format)}
                  {renderFieldWithPending('用途說明', 'usage', order.usage)}
                  {renderFieldWithPending('預計截稿日', 'deadline', order.deadline)}
                </div>

                <h3 style={{ margin: '24px 0 16px 0', fontSize: '16px', color: '#5D4A3E', borderBottom: '1px solid #F0ECE7', paddingBottom: '12px' }}>委託協議</h3>
                <div style={{ fontSize: '13px', color: '#7A7269', lineHeight: '1.8', backgroundColor: '#FDFDFB', padding: '16px', borderRadius: '12px', border: '1px solid #EAE6E1' }}>
                  1. 本委託為客製化商品，不適用七天鑑賞期。<br/>
                  2. 完稿後若非繪師方失誤，僅提供兩次微調修改。<br/>
                  <div style={{ color: '#A0978D', marginTop: '8px', fontSize: '12px', fontWeight: 'bold' }}>(您已於送出表單時同意此版本協議)</div>
                </div>
              </div>
            )}

            {activeTab === 'logs' && (
              <div style={{ backgroundColor: '#FFFFFF', padding: '24px', borderRadius: '16px', border: '1px solid #EAE6E1', boxShadow: '0 4px 16px rgba(0,0,0,0.02)', animation: 'fadeIn 0.2s ease' }}>
                <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', color: '#5D4A3E', borderBottom: '1px solid #F0ECE7', paddingBottom: '12px' }}>操作與決策紀錄</h3>
                {logs.length === 0 ? <div style={{ color: '#A0978D', textAlign: 'center', padding: '30px 0', fontSize: '14px' }}>尚無任何歷程紀錄</div> : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {logs.map((log, index) => (
                      <div key={log.id} style={{ display: 'flex', gap: '12px', paddingBottom: index !== logs.length - 1 ? '16px' : '0', borderBottom: index !== logs.length - 1 ? '1px dashed #EAE6E1' : 'none' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: log.actor_role === 'artist' ? '#EBF2F7' : '#E8F3EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold', color: log.actor_role === 'artist' ? '#4A7294' : '#4E7A5A', flexShrink: 0 }}>
                          {log.actor_role === 'artist' ? '繪師' : '您'}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '11px', color: '#A0978D', marginBottom: '4px', fontFamily: 'monospace' }}>{new Date(log.created_at).toLocaleString()}</div>
                          <div style={{ fontSize: '14px', color: '#5D4A3E', lineHeight: '1.5' }}>
                            {log.content}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}