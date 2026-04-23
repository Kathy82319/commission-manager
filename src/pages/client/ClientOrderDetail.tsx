// src/pages/client/ClientOrderDetail.tsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DOMPurify from 'dompurify';

interface CommissionDetail {
  id: string;
  status: string;
  type_name: string;
  project_name: string;
  client_custom_title: string;
  total_price: number;
  draw_scope: string;
  char_count: number;
  bg_type: string;
  add_ons: string;
  detailed_settings: string;
  agreed_tos_snapshot: string;
  delivery_method: string; 
  pending_changes?: string;
  latest_message_at?: string;
  last_read_at_client?: string;
  artist_settings?: string; 
  current_stage: string;
  workflow_mode: string;
  order_date: string;
}

interface Submission { id: string; stage: string; file_url: string; version: number; created_at: string; }
interface ActionLog { id: string; actor_role: string; content: string; created_at: string; }

const parseTime = (dateStr?: string) => {
  if (!dateStr) return 0;
  return new Date(dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T') + 'Z').getTime();
};

export function ClientOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || '';

  const [activeTab, setActiveTab] = useState<'main' | 'review' | 'history'>('main');
  const [orderData, setOrderData] = useState<CommissionDetail | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [logs, setLogs] = useState<ActionLog[]>([]);

  const [customTitle, setCustomTitle] = useState('');
  const [savedTitle, setSavedTitle] = useState(''); 
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success'>('idle');
  const [isLoading, setIsLoading] = useState(true);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchDetailData = async () => {
    if (!id) return;
    try {
      const [orderRes, subRes, logRes] = await Promise.all([
        fetch(`${API_BASE}/api/commissions/${id}`, { credentials: 'include' }),
        fetch(`${API_BASE}/api/commissions/${id}/submissions`, { credentials: 'include' }),
        fetch(`${API_BASE}/api/commissions/${id}/logs`, { credentials: 'include' })
      ]);

      if (orderRes.status === 401) {
        alert("登入逾時或尚未登入，請先登入 LINE 以查看委託單內容");
        window.location.href = `${API_BASE}/api/auth/line/login`;
        return;
      }

      const orderJson = await orderRes.json();
      if (orderJson.success) {
        const data = orderJson.data;
        setOrderData(data);
        const initialTitle = data.client_custom_title || '';
        setCustomTitle(initialTitle);
        setSavedTitle(initialTitle);

        if (data.latest_message_at) {
          const latestMsgTime = parseTime(data.latest_message_at);
          const lastReadTime = parseTime(data.last_read_at_client);
          if (latestMsgTime > lastReadTime) setHasNewMessage(true);
        }

        fetch(`${API_BASE}/api/commissions/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ last_read_at_client: new Date().toISOString() })
        });
      }

      const subJson = await subRes.json();
      if (subJson.success) setSubmissions(subJson.data);
      const logJson = await logRes.json();
      if (logJson.success) setLogs(logJson.data);
    } catch (error) {
      console.error('取得委託單詳細資料失敗:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDetailData();
  }, [id]);

  useEffect(() => {
    if (activeTab === 'review' && orderData && !isProcessing) {
      if (orderData.current_stage === 'sketch_reviewing' || orderData.current_stage === 'lineart_reviewing') {
        const stageKey = orderData.current_stage.replace('_reviewing', '');
        const triggerAutoRead = async () => {
          setIsProcessing(true);
          try {
            const res = await fetch(`${API_BASE}/api/commissions/${id}/review`, {
              method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ stage: stageKey, action: 'read_only' })
            });
            const data = await res.json();
            if (data.success) {
              setSubmissions(data.data.submissions || []); 
              setLogs(data.data.logs || []);
              await fetchDetailData();
            }
          } catch (e) { console.error("自動標記已讀失敗", e); } 
          finally { setIsProcessing(false); }
        };
        triggerAutoRead();
      }
    }
  }, [activeTab, orderData?.current_stage, id, API_BASE]);

  const handleReviewChange = async (action: 'approve' | 'reject') => {
    if (!id) return;
    try {
      const res = await fetch(`${API_BASE}/api/commissions/${id}/change-response`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      const data = await res.json();
      if (data.success) {
        alert(action === 'approve' ? '已同意內容異動' : '已拒絕內容異動');
        window.location.reload(); 
      } else alert('操作失敗：' + data.error);
    } catch (error) {}
  };

  const handleSaveTitle = async () => {
    if (!id || saveStatus === 'saving') return;
    setSaveStatus('saving');
    try {
      const res = await fetch(`${API_BASE}/api/commissions/${id}`, {
        method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_custom_title: customTitle })
      });
      const data = await res.json();
      if (data.success) {
        setSavedTitle(customTitle); setSaveStatus('success'); setTimeout(() => setSaveStatus('idle'), 2000); 
      } else { alert('儲存名稱失敗：' + data.error); setSaveStatus('idle'); }
    } catch (error) { setSaveStatus('idle'); }
  };

  const handleReview = async (stageKey: string, action: 'approve' | 'reject') => {
    if (!id) return;
    let comment = '';
    if (action === 'reject') {
      comment = window.prompt("請輸入需要修改的意見：") || '';
      if (!comment.trim()) return alert("必須輸入意見才能退回。");
    } else {
      if (!window.confirm('⚠️ 注意：同意此完稿後將立即結案，並解鎖無浮水印原檔下載。\n\n確定要同意嗎？')) return;
    }
    setIsProcessing(true);
    try {
      const res = await fetch(`${API_BASE}/api/commissions/${id}/review`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: stageKey, action, comment })
      });
      if ((await res.json()).success) { alert("已送出回覆！"); fetchDetailData(); } 
      else alert("操作失敗，請稍後再試。");
    } catch (e) { alert("發生錯誤"); } 
    finally { setIsProcessing(false); }
  };

  const handleDownloadOriginal = async (fileUrlString: string) => {
    if (!id || !fileUrlString) return;
    setIsProcessing(true);
    try {
      const parts = fileUrlString.split('|');
      const publicUrl = parts[0];
      const privateKey = parts[1];
      let targetKey = '';
      let bucketType = 'private';
      if (privateKey) {
        targetKey = privateKey;
        bucketType = 'private';
      } else {
        const urlObj = new URL(publicUrl);
        targetKey = urlObj.pathname.substring(1); 
        bucketType = 'public';
      }
      const res = await fetch(`${API_BASE}/api/r2/download-url`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commissionId: id, fileName: targetKey, bucketType })
      });
      const data = await res.json();
      if (data.success) window.location.href = data.downloadUrl; else alert('無法下載：' + data.error);
    } catch (e) { alert("網路連線錯誤"); } 
    finally { setIsProcessing(false); }
  };

  const getLatestSubmissions = () => {
    const latest: Record<string, Submission> = {};
    submissions.forEach(sub => {
      if (!latest[sub.stage] || sub.version > latest[sub.stage].version) latest[sub.stage] = sub;
    });
    return latest;
  };

  const renderClientStageBox = (title: string, stageKey: string, isPassed: boolean) => {
    const sub = getLatestSubmissions()[stageKey];
    const isFinal = stageKey === 'final';
    const isFreeMode = orderData?.workflow_mode === 'free';
    const shouldShowActionButtons = isFinal && !isFreeMode && !!sub && !isPassed;
    let statusText = '';
    let headerBg = '#f8fafc';
    let statusColor = '#94a3b8';
    
    if (isFreeMode) { statusText = ''; } 
    else if (isPassed) {
      headerBg = '#e8f3eb'; statusColor = '#4E7A5A';
      statusText = isFinal ? '✓ 已同意，合約結案' : '✓ 繪師已推進下一階段';
    } else if (sub) {
      headerBg = '#feebeb'; statusColor = '#c04b4b';
      statusText = isFinal ? '👀 繪師已交付，待您確認' : '👀 繪師已交付，請過目';
    } else {
      statusText = '⏳ 尚未交付';
    }

    return (
      <div style={{ border: '1px solid #EAE6E1', borderRadius: '12px', overflow: 'hidden', marginBottom: '24px', backgroundColor: '#FFFFFF' }}>
        <div style={{ backgroundColor: headerBg, padding: '14px 20px', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '15px', color: '#5D4A3E', borderBottom: '1px solid #EAE6E1' }}>
          <span>{title}</span> <span style={{ color: statusColor }}>{statusText}</span>
        </div>
        <div style={{ padding: '20px', textAlign: 'center' }}>
          {!sub ? (
            <div style={{ color: '#A0978D', padding: '20px' }}>繪師尚未上傳此階段稿件</div>
          ) : (
            <div>
              <div style={{ fontSize: '13px', color: '#7A7269', marginBottom: '12px', textAlign: 'left' }}>
                最後更新：{new Date(sub.created_at).toLocaleString('zh-TW')} (v{sub.version})
              </div>
              <div style={{ border: '1px solid #EAE6E1', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#F9F7F5', maxWidth: '100%', margin: '0 auto', display: 'flex', justifyContent: 'center' }}>
                <img src={sub.file_url.split('|')[0]} alt="稿件預覽" style={{ width: '100%', maxWidth: '400px', maxHeight: '400px', objectFit: 'contain', display: 'block' }} />
              </div>
              <div style={{ marginTop: '20px', display: 'flex', gap: '12px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                {!isFinal && !isPassed && !isFreeMode && (
                  <div style={{ flex: '1 1 100%', fontSize: '13px', color: '#7A7269', fontWeight: 'bold', textAlign: 'right' }}>
                    👀 本階段請過目即可，繪師後續將會直接推進至下一階段。
                  </div>
                )}
                {shouldShowActionButtons && (
                  <>
                    <div style={{ flex: '1 1 100%', fontSize: '13px', color: '#c04b4b', fontWeight: 'bold', marginBottom: '8px', textAlign: 'right' }}>⚠️ 同意後將結案並解鎖原檔下載。</div>
                    <button onClick={() => handleReview(stageKey, 'reject')} disabled={isProcessing} style={{ padding: '10px 20px', backgroundColor: '#FFF', color: '#c04b4b', border: '1px solid #c04b4b', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', flex: '1 1 auto' }}>退回修改</button>
                    <button onClick={() => handleReview(stageKey, 'approve')} disabled={isProcessing} style={{ padding: '10px 24px', backgroundColor: '#4E7A5A', color: '#FFF', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', flex: '1 1 auto' }}>✓ 同意完稿</button>
                  </>
                )}
                {((isPassed && isFinal && orderData?.status === 'completed') || (isFreeMode && isFinal && sub)) && (
                  <button onClick={() => handleDownloadOriginal(sub.file_url)} disabled={isProcessing} style={{ padding: '14px 24px', width: '100%', backgroundColor: '#5D4A3E', color: '#FFF', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
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

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#FFF', flex: 1, height: '100vh', background: 'linear-gradient(135deg, #778ca4 0%, #5a6e85 100%)' }}>載入中...</div>;
  if (!orderData) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#FFF', flex: 1, height: '100vh', background: 'linear-gradient(135deg, #778ca4 0%, #5a6e85 100%)' }}>找不到此委託單</div>;

  const sectionBoxStyle = { backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '12px', marginBottom: '16px', border: '1px solid #EAE6E1' };

  const isSavedAndNotEmpty = customTitle.trim() !== '' && customTitle === savedTitle;

  let parsedChanges: Record<string, string> | null = null;
  if (orderData?.pending_changes) {
    try {
      const parsed = typeof orderData.pending_changes === 'string' ? JSON.parse(orderData.pending_changes) : orderData.pending_changes;
      if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) parsedChanges = parsed;
    } catch (e) {}
  }

  const fieldMap: Record<string, string> = { usage_type: '委託用途', is_rush: '急件', delivery_method: '交稿方式', total_price: '總金額', draw_scope: '繪畫範圍', char_count: '人物數量', bg_type: '背景設定', add_ons: '附加選項' };
  let finalTosHtml = '';
  if (orderData?.agreed_tos_snapshot) finalTosHtml = orderData.agreed_tos_snapshot;
  else if (orderData?.artist_settings) { try { finalTosHtml = JSON.parse(orderData.artist_settings).rules || ''; } catch(e) {} }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 16px', flex: 1, fontFamily: 'sans-serif', backgroundColor: '#FBFBF9', minHeight: '100vh' }}>
      <style>{`
        @keyframes pulse-yellow {
          0% { box-shadow: 0 0 0 0 rgba(250, 204, 21, 0.7); border: 2px solid rgba(250, 204, 21, 1); }
          70% { box-shadow: 0 0 0 10px rgba(250, 204, 21, 0); border: 2px solid rgba(250, 204, 21, 1); }
          100% { box-shadow: 0 0 0 0 rgba(250, 204, 21, 0); border: 2px solid rgba(250, 204, 21, 1); }
        }
        .tab-scroll-container { 
          display: flex; 
          overflow-x: auto; 
          background-color: #FFFFFF; 
          border-bottom: 1px solid #EAE6E1;
          padding: 12px 8px; 
          scrollbar-width: none; 
        }
        .tab-scroll-container::-webkit-scrollbar { display: none; }

        .detail-tab {
          flex: 1; 
          padding: 10px 16px; 
          margin: 0 4px;
          text-align: center; 
          font-weight: bold; 
          cursor: pointer;
          border: none;
          border-radius: 20px; 
          color: #8A7E72 !important; 
          background-color: transparent !important;
          transition: all 0.2s; 
          outline: none; 
          white-space: nowrap;
          appearance: none;
          -webkit-appearance: none;
          font-size: 14px;
          position: relative;
          z-index: 1; /* 建立堆疊上下文 */
        }

        /* 🌟 強力重置 active 狀態，防止被偽元素遮蓋 */
        .detail-tab.active {
          background-color: #5D4A3E !important;
          color: #FFFFFF !important;
          -webkit-text-fill-color: #FFFFFF !important;
        }

        /* 🌟 鎮壓所有可能的偽元素背景 */
        .detail-tab::before, .detail-tab::after {
          content: none !important;
          display: none !important;
          z-index: -1 !important;
        }

        .detail-tab-text {
          position: relative;
          z-index: 10; /* 強制文字在最頂層 */
          pointer-events: none;
        }
      `}</style>

      {parsedChanges && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
          <div style={{ backgroundColor: '#FFF', padding: '24px', borderRadius: '16px', maxWidth: '500px', width: '90%', boxShadow: '0 8px 32px rgba(0,0,0,0.24)' }}>
            <h3 style={{ color: '#c04b4b', marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>⚠️ 繪師提出了規格異動申請</h3>
            <p style={{ color: '#7A7269', fontSize: '14px', marginBottom: '12px' }}>繪師希望調整委託單內容，請確認以下項目：</p>
            <div style={{ backgroundColor: '#F9F7F5', padding: '16px', borderRadius: '12px', fontSize: '14px', color: '#5D4A3E', marginBottom: '24px', whiteSpace: 'pre-wrap', maxHeight: '200px', overflowY: 'auto', border: '1px solid #EAE6E1' }}>
              {Object.keys(parsedChanges).map(key => (
                <div key={key} style={{ marginBottom: '6px' }}>
                  <span style={{ fontWeight: 'bold' }}>• {fieldMap[key] || key}：</span><span>{parsedChanges![key]}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => handleReviewChange('approve')} style={{ flex: 1, padding: '14px', backgroundColor: '#4E7A5A', color: '#FFF', borderRadius: '12px', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px' }}>同意並更新</button>
              <button onClick={() => handleReviewChange('reject')} style={{ flex: 1, padding: '14px', backgroundColor: '#c04b4b', color: '#FFF', borderRadius: '12px', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px' }}>拒絕修改</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ width: '100%', maxWidth: '800px', display: 'flex', flexDirection: 'column' }}>
        <button 
          onClick={() => navigate('/client/orders')} 
          style={{ background: 'none', border: 'none', color: '#5D4A3E', padding: '0 0 16px 0', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', transition: 'color 0.2s', alignSelf: 'flex-start', fontWeight: 'bold' }} 
        >
          ← 返回列表
        </button>

        <div style={{ backgroundColor: '#FFFFFF', padding: '24px', borderRadius: '16px 16px 0 0', display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'space-between', alignItems: 'flex-start', border: '1px solid #EAE6E1', borderBottom: 'none' }}>
          <div style={{ flex: '1 1 200px' }}>
            <h2 style={{ margin: '0 0 8px 0', color: '#5D4A3E', fontSize: '20px' }}>{orderData.client_custom_title || orderData.project_name || '未命名項目'}</h2>
            <div style={{ color: '#7A7269', fontSize: '13px', marginBottom: '4px', fontWeight: 'bold' }}>繪師項目名：{orderData.project_name || '無'}</div>
            <div style={{ color: '#A0978D', fontSize: '12px', fontFamily: 'monospace' }}>單號：{orderData.id}</div>
          </div>
          <button 
            onClick={() => {
              fetch(`${API_BASE}/api/commissions/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ last_read_at_client: new Date().toISOString() }) });
              navigate(`/workspace/${id}`);
            }} 
            style={{ 
              padding: '10px 20px', 
              backgroundColor: '#5D4A3E',
              color: '#FFFFFF', border: 'none', borderRadius: '8px', 
              fontWeight: 'bold', cursor: 'pointer', fontSize: '14px', transition: 'all 0.3s', 
              animation: hasNewMessage ? 'pulse-yellow 2s infinite' : 'none', flex: '1 1 auto', minWidth: '120px'
            }}
          >
            {hasNewMessage ? '🔔 有新訊息！' : '進入聊天室'}
          </button>
        </div>

        <div className="tab-scroll-container">
          <button className={`detail-tab ${activeTab === 'main' ? 'active' : ''}`} onClick={() => setActiveTab('main')}>
            <span className="detail-tab-text">詳細內容</span>
          </button>
          <button className={`detail-tab ${activeTab === 'review' ? 'active' : ''}`} onClick={() => setActiveTab('review')}>
            <span className="detail-tab-text">稿件審閱</span>
          </button>
          <button className={`detail-tab ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
            <span className="detail-tab-text">歷程紀錄</span>
          </button>
        </div>

        <div style={{ backgroundColor: '#FDFBFA', padding: '20px', borderRadius: '0 0 16px 16px', border: '1px solid #EAE6E1', borderTop: 'none', minHeight: '400px' }}>
          
          {activeTab === 'main' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ ...sectionBoxStyle, marginBottom: '0' }}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', color: '#5D4A3E', marginBottom: '8px' }}>項目名稱</label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <input 
                      type="text" 
                      value={customTitle} 
                      onChange={(e) => setCustomTitle(e.target.value)}
                      placeholder="請輸入您的委託名稱..."
                      style={{ flex: '1 1 200px', padding: '10px', borderRadius: '8px', outline: 'none', border: isSavedAndNotEmpty ? '1px solid #EAE6E1' : '1px solid #DED9D3', backgroundColor: isSavedAndNotEmpty ? '#F9F7F5' : '#FFFFFF', color: '#5D4A3E' }}
                    />
                    <button 
                      onClick={handleSaveTitle} disabled={saveStatus !== 'idle'}
                      style={{ padding: '10px 20px', color: '#FFF', border: 'none', borderRadius: '8px', cursor: saveStatus === 'idle' ? 'pointer' : 'default', fontWeight: 'bold', backgroundColor: saveStatus === 'success' ? '#4E7A5A' : '#5D4A3E', flex: '1 1 auto', minWidth: '90px' }}
                    >
                      {saveStatus === 'saving' ? '⏳ 儲存中...' : saveStatus === 'success' ? '✅ 成功' : '儲存'}
                    </button>
                  </div>
                </div>
              </div>

              <div style={{ ...sectionBoxStyle, marginBottom: '0' }}>
                <h3 style={{ fontSize: '16px', color: '#5D4A3E', margin: '0 0 12px 0', borderBottom: '1px solid #EAE6E1', paddingBottom: '8px' }}>委託規格</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px', fontSize: '14px', color: '#7A7269' }}>
                  <div><strong>繪製範圍：</strong>{orderData.draw_scope || '未提供'}</div>
                  <div><strong>人數：</strong>{orderData.char_count || 1} 人</div>
                  <div><strong>背景：</strong>{orderData.bg_type || '未提供'}</div>
                  <div><strong>備註：</strong>{orderData.add_ons || '無'}</div>
                  <div style={{ gridColumn: '1 / -1', marginTop: '4px', borderTop: '1px dashed #EAE6E1', paddingTop: '12px', fontSize: '16px', color: '#5D4A3E' }}>
                    <strong>總金額：</strong>NT$ {orderData.total_price.toLocaleString()}
                  </div>
                </div>
              </div>

              <div style={{ ...sectionBoxStyle, marginBottom: '0' }}>
                <h3 style={{ fontSize: '16px', color: '#5D4A3E', margin: '0 0 12px 0', borderBottom: '1px solid #EAE6E1', paddingBottom: '8px' }}>委託協議</h3>
                <div style={{ fontSize: '14px', color: '#7A7269', maxHeight: '200px', overflowY: 'auto', padding: '12px', backgroundColor: '#F9F7F5', borderRadius: '8px', border: '1px solid #EAE6E1' }}>
                  {finalTosHtml ? (<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(finalTosHtml) }} />) : (<div style={{ whiteSpace: 'pre-wrap' }}>無協議紀錄</div>)}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'review' && (
            <div>
              {orderData.delivery_method !== '一鍵出圖' && (
                <>
                  {renderClientStageBox('階段 1：草稿', 'sketch', ['lineart_drawing', 'lineart_reviewing', 'final_drawing', 'final_reviewing', 'completed'].includes(orderData.current_stage))}
                  {renderClientStageBox('階段 2：線稿', 'lineart', ['final_drawing', 'final_reviewing', 'completed'].includes(orderData.current_stage))}
                </>
              )}
              {renderClientStageBox('階段 3：完稿交付', 'final', orderData.status === 'completed')}
            </div>
          )}

          {activeTab === 'history' && (
            <div>
              {logs.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#7A7269', padding: '40px' }}>無歷程紀錄</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {logs.map(log => (
                    <div key={log.id} style={{ padding: '12px', backgroundColor: '#FFFFFF', borderRadius: '8px', borderLeft: log.actor_role === 'artist' ? '4px solid #4E7A5A' : '4px solid #5D4A3E', borderTop: '1px solid #EAE6E1', borderRight: '1px solid #EAE6E1', borderBottom: '1px solid #EAE6E1' }}>
                      <div style={{ fontSize: '12px', color: '#A0978D', marginBottom: '4px' }}>{new Date(log.created_at).toLocaleString('zh-TW')} | {log.actor_role === 'artist' ? '繪師' : '委託人'}</div>
                      <div style={{ fontSize: '14px', color: '#5D4A3E' }}>{log.content}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}