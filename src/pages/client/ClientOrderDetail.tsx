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
}

interface Submission { id: string; stage: string; file_url: string; version: number; created_at: string; }
interface ActionLog { id: string; actor_role: string; content: string; created_at: string; }

export function ClientOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
  
  const [activeTab, setActiveTab] = useState<'main' | 'review' | 'history'>('main');
  const [orderData, setOrderData] = useState<CommissionDetail | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [logs, setLogs] = useState<ActionLog[]>([]);
  
  const [customTitle, setCustomTitle] = useState('');
  const [savedTitle, setSavedTitle] = useState(''); 
  
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success'>('idle');
  const [isLoading, setIsLoading] = useState(true);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false); // 🌟 新增：審閱與下載的處理狀態

  // 1. 載入資料
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
        
        // 初始化自訂名稱字串
        const initialTitle = data.client_custom_title || '';
        setCustomTitle(initialTitle);
        setSavedTitle(initialTitle);

        if (data.latest_message_at) {
          const latestMsgTime = new Date(data.latest_message_at).getTime();
          const lastReadTime = data.last_read_at_client ? new Date(data.last_read_at_client).getTime() : 0;
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

  // 🌟 處理委託單規格異動 (來自繪師的修改申請)
  const handleReviewChange = async (action: 'approve' | 'reject') => {
    if (!id) return;
    try {
      const res = await fetch(`${API_BASE}/api/commissions/${id}/change-response`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      const data = await res.json();
      if (data.success) {
        alert(action === 'approve' ? '已同意內容異動' : '已拒絕內容異動');
        window.location.reload(); 
      } else {
        alert('操作失敗：' + data.error);
      }
    } catch (error) {}
  };

  // 🌟 處理儲存自訂名稱
  const handleSaveTitle = async () => {
    if (!id || saveStatus === 'saving') return;
    setSaveStatus('saving');
    try {
      const res = await fetch(`${API_BASE}/api/commissions/${id}`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_custom_title: customTitle })
      });
      const data = await res.json();
      if (data.success) {
        setSavedTitle(customTitle);
        setSaveStatus('success');
        setTimeout(() => setSaveStatus('idle'), 2000); 
      } else {
        alert('儲存名稱失敗：' + data.error);
        setSaveStatus('idle');
      }
    } catch (error) {
      setSaveStatus('idle');
    }
  };

  // 🌟 核心：處理階段稿件審閱 (已閱覽 / 同意 / 退回)
  const handleReview = async (stageKey: string, action: 'approve' | 'reject' | 'read_only') => {
    if (!id) return;
    let comment = '';
    if (action === 'reject') {
      comment = window.prompt("請輸入需要修改的意見：") || '';
      if (!comment.trim()) return alert("必須輸入意見才能退回。");
    } else {
      const msg = action === 'read_only' ? '確認標記此階段為已閱覽？' : '⚠️ 注意：同意此完稿後將立即結案，並解鎖無浮水印原檔下載。\n\n確定要同意嗎？';
      if (!window.confirm(msg)) return;
    }

    setIsProcessing(true);
    try {
      const res = await fetch(`${API_BASE}/api/commissions/${id}/review`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: stageKey, action, comment })
      });
      if ((await res.json()).success) {
        alert("已送出回覆！");
        fetchDetailData(); // 重新載入最新狀態
      } else {
        alert("操作失敗，請稍後再試。");
      }
    } catch (e) { 
      alert("發生錯誤"); 
    } finally { 
      setIsProcessing(false); 
    }
  };

  // 🌟 核心：從 R2 私有桶安全下載無浮水印原檔
  const handleDownloadOriginal = async (publicUrl: string) => {
    if (!id) return;
    setIsProcessing(true);
    try {
      // 將預覽網址對應到原始檔案路徑
      const urlObj = new URL(publicUrl);
      const publicPath = urlObj.pathname.substring(1); 
      const privatePath = publicPath.replace('_preview_', '_original_'); // 如果您上傳時有綴字，確保與這裡一致

      const res = await fetch(`${API_BASE}/api/r2/download-url`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commissionId: id, fileName: privatePath })
      });
      const data = await res.json();
      
      if (data.success) {
        window.location.href = data.downloadUrl; // 取得限時門票並觸發下載
      } else {
        alert('無法下載：' + data.error);
      }
    } catch (e) { 
      alert("網路連線錯誤"); 
    } finally { 
      setIsProcessing(false); 
    }
  };

  // 取得各階段最新版本的稿件
  const getLatestSubmissions = () => {
    const latest: Record<string, Submission> = {};
    submissions.forEach(sub => {
      if (!latest[sub.stage] || sub.version > latest[sub.stage].version) {
        latest[sub.stage] = sub;
      }
    });
    return latest;
  };

  // 🌟 渲染單一階段的審閱區塊
  const renderClientStageBox = (title: string, stageKey: string, isReviewing: boolean, isPassed: boolean) => {
    const sub = getLatestSubmissions()[stageKey];
    const isFinal = stageKey === 'final';
    let statusText = isPassed ? (isFinal ? '✓ 已同意，合約結案' : '✓ 已閱覽') : (isReviewing ? '👀 繪師已交付，請確認' : '⏳ 繪製中...');
    
    return (
      <div style={{ border: '1px solid #d0d8e4', borderRadius: '12px', overflow: 'hidden', marginBottom: '24px', backgroundColor: '#FFFFFF' }}>
        <div style={{ backgroundColor: isPassed ? '#e6f4ea' : (isReviewing ? '#fce8e6' : '#f8fafc'), padding: '14px 20px', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '15px', color: '#475569', borderBottom: '1px solid #d0d8e4' }}>
          <span>{title}</span> <span style={{ color: isPassed ? '#1e8e3e' : (isReviewing ? '#d93025' : '#94a3b8') }}>{statusText}</span>
        </div>
        <div style={{ padding: '20px' }}>
          {!sub ? (
            <div style={{ textAlign: 'center', color: '#94a3b8', padding: '20px' }}>繪師尚未上傳此階段稿件</div>
          ) : (
            <div>
               <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '12px' }}>
                 最後更新：{new Date(sub.created_at).toLocaleString('zh-TW')} (v{sub.version})
               </div>
               <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#f1f5f9', display: 'flex', justifyContent: 'center' }}>
                 <img src={sub.file_url} alt="稿件預覽" style={{ maxWidth: '100%', maxHeight: '500px', objectFit: 'contain' }} />
               </div>
               
               {/* 互動操作區 */}
               <div style={{ marginTop: '20px', display: 'flex', gap: '12px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                 
                 {isReviewing && !isFinal && (
                   <>
                     <button onClick={() => handleReview(stageKey, 'reject')} disabled={isProcessing} style={{ padding: '10px 20px', backgroundColor: '#FFF', color: '#d93025', border: '1px solid #d0d8e4', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}>退回修改</button>
                     <button onClick={() => handleReview(stageKey, 'read_only')} disabled={isProcessing} style={{ padding: '10px 24px', backgroundColor: '#4A7294', color: '#FFF', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}>✓ 標記為已閱覽</button>
                   </>
                 )}

                 {isReviewing && isFinal && (
                   <>
                     <div style={{ flex: '1 1 100%', fontSize: '13px', color: '#d93025', fontWeight: 'bold', marginBottom: '8px', textAlign: 'right' }}>⚠️ 同意後將結案並解鎖原檔下載。</div>
                     <button onClick={() => handleReview(stageKey, 'reject')} disabled={isProcessing} style={{ padding: '10px 20px', backgroundColor: '#FFF', color: '#d93025', border: '1px solid #d0d8e4', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}>退回修改</button>
                     <button onClick={() => handleReview(stageKey, 'approve')} disabled={isProcessing} style={{ padding: '10px 24px', backgroundColor: '#1e8e3e', color: '#FFF', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}>✓ 同意完稿</button>
                   </>
                 )}

                 {/* 🌟 保險箱下載按鈕 */}
                 {isPassed && isFinal && orderData?.status === 'completed' && (
                   <button onClick={() => handleDownloadOriginal(sub.file_url)} disabled={isProcessing} style={{ padding: '14px 24px', width: '100%', backgroundColor: '#475569', color: '#FFF', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', transition: 'all 0.2s' }}>
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

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#FFF', flex: 1 }}>載入中...</div>;
  if (!orderData) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#FFF', flex: 1 }}>找不到此委託單</div>;

  const tabStyle = (tabName: string) => ({
    flex: 1, padding: '12px', textAlign: 'center' as const, fontWeight: 'bold', cursor: 'pointer',
    borderBottom: activeTab === tabName ? '3px solid #4A7294' : '3px solid transparent',
    color: activeTab === tabName ? '#4A7294' : '#556577',
    backgroundColor: activeTab === tabName ? '#FFFFFF' : '#e8ecf3',
    transition: 'all 0.2s'
  });

  const sectionBoxStyle = { backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '12px', marginBottom: '16px', border: '1px solid #d0d8e4' };
  const isSavedAndNotEmpty = customTitle.trim() !== '' && customTitle === savedTitle;

  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 16px', flex: 1, fontFamily: 'sans-serif' }}>
      
      <style>{`
        @keyframes pulse-yellow {
          0% { box-shadow: 0 0 0 0 rgba(250, 204, 21, 0.7); border: 2px solid rgba(250, 204, 21, 1); }
          70% { box-shadow: 0 0 0 10px rgba(250, 204, 21, 0); border: 2px solid rgba(250, 204, 21, 1); }
          100% { box-shadow: 0 0 0 0 rgba(250, 204, 21, 0); border: 2px solid rgba(250, 204, 21, 1); }
        }
      `}</style>

      {/* 異動申請彈窗 */}
      {orderData.pending_changes && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
          <div style={{ backgroundColor: '#FFF', padding: '24px', borderRadius: '16px', maxWidth: '500px', width: '90%', boxShadow: '0 8px 32px rgba(0,0,0,0.24)' }}>
            <h3 style={{ color: '#e11d48', marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              ⚠️ 繪師提出了規格異動申請
            </h3>
            <p style={{ color: '#556577', fontSize: '14px', marginBottom: '12px' }}>繪師希望調整委託單內容，請確認以下項目：</p>
            <div style={{ backgroundColor: '#f1f5f9', padding: '16px', borderRadius: '12px', fontSize: '14px', color: '#475569', marginBottom: '24px', whiteSpace: 'pre-wrap', maxHeight: '200px', overflowY: 'auto' }}>
              {(() => {
                try {
                  const changes = JSON.parse(orderData.pending_changes!);
                  const fieldMap: any = {
                    usage_type: '委託用途', is_rush: '急件', delivery_method: '交稿方式',
                    total_price: '總金額', draw_scope: '繪畫範圍', char_count: '人物數量',
                    bg_type: '背景設定', add_ons: '附加選項'
                  };
                  return Object.keys(changes).map(key => (
                    <div key={key} style={{ marginBottom: '4px' }}>
                      <span style={{ fontWeight: 'bold' }}>• {fieldMap[key] || key}：</span>
                      <span>{changes[key]}</span>
                    </div>
                  ));
                } catch (e) { return '解析異動資料錯誤'; }
              })()}
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => handleReviewChange('approve')} style={{ flex: 1, padding: '14px', backgroundColor: '#1e8e3e', color: '#FFF', borderRadius: '12px', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px' }}>同意並更新合約</button>
              <button onClick={() => handleReviewChange('reject')} style={{ flex: 1, padding: '14px', backgroundColor: '#e11d48', color: '#FFF', borderRadius: '12px', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px' }}>拒絕修改</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ width: '100%', maxWidth: '700px', display: 'flex', flexDirection: 'column' }}>
        
        {/* 返回按鈕 */}
        <button 
          onClick={() => navigate('/client/orders')} 
          style={{ 
            background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', padding: '0 0 16px 0', 
            cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', transition: 'color 0.2s',
            alignSelf: 'flex-start', fontWeight: 'bold'
          }} 
          onMouseEnter={e => e.currentTarget.style.color = '#FFF'} 
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}
        >
          ← 返回列表
        </button>

        {/* 頁籤 */}
        <div style={{ display: 'flex', backgroundColor: '#e8ecf3', borderRadius: '16px 16px 0 0', overflow: 'hidden' }}>
          <div style={tabStyle('main')} onClick={() => setActiveTab('main')}>詳細內容</div>
          <div style={tabStyle('review')} onClick={() => setActiveTab('review')}>稿件審閱</div>
          <div style={tabStyle('history')} onClick={() => setActiveTab('history')}>歷程紀錄</div>
        </div>

        {/* 主要內容區塊 */}
        <div style={{ backgroundColor: '#e8ecf3', padding: '20px', borderRadius: '0 0 16px 16px', minHeight: '400px' }}>
          
          {activeTab === 'main' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ ...sectionBoxStyle, marginBottom: '0' }}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', color: '#475569', marginBottom: '8px' }}>項目名稱</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input 
                      type="text" 
                      value={customTitle} 
                      onChange={(e) => setCustomTitle(e.target.value)}
                      placeholder="請輸入您的委託名稱..."
                      style={{ 
                        flex: 1, padding: '10px', borderRadius: '8px', outline: 'none', 
                        border: isSavedAndNotEmpty ? '1px solid #e2e8f0' : '1px solid #94a3b8',
                        backgroundColor: isSavedAndNotEmpty ? '#f1f5f9' : '#FFFFFF',
                        transition: 'all 0.3s ease', color: '#475569'
                      }}
                    />
                    <button 
                      onClick={handleSaveTitle}
                      disabled={saveStatus !== 'idle'}
                      style={{ 
                        padding: '10px 20px', color: '#FFF', border: 'none', borderRadius: '8px', 
                        cursor: saveStatus === 'idle' ? 'pointer' : 'default', fontWeight: 'bold',
                        backgroundColor: saveStatus === 'success' ? '#1e8e3e' : '#556577',
                        transition: 'all 0.3s ease', minWidth: '90px'
                      }}
                    >
                      {saveStatus === 'saving' ? '⏳ 儲存中...' : saveStatus === 'success' ? '✅ 成功' : '儲存'}
                    </button>
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '14px', color: '#556577', fontWeight: 'bold' }}>訂單編號：</span>
                  <span style={{ fontSize: '16px', color: '#475569', fontFamily: 'monospace', fontWeight: 'bold' }}>{orderData.id}</span>
                </div>
              </div>

              <div style={{ ...sectionBoxStyle, marginBottom: '0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e8ecf3', paddingBottom: '12px', marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '16px', color: '#475569', margin: 0 }}>委託規格</h3>
                  <button 
                    onClick={() => navigate(`/workspace/${id}`)}
                    style={{ 
                      padding: '8px 16px', backgroundColor: '#4A7294', color: '#FFFFFF', border: 'none', borderRadius: '8px', 
                      fontWeight: 'bold', cursor: 'pointer', fontSize: '13px', transition: 'all 0.3s',
                      animation: hasNewMessage ? 'pulse-yellow 2s infinite' : 'none'
                    }}
                  >
                    {hasNewMessage ? '🔔 有新訊息！' : '進入聊天室'}
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '14px', color: '#556577' }}>
                  <div><strong>繪製範圍：</strong>{orderData.draw_scope || '未提供'}</div>
                  <div><strong>人數：</strong>{orderData.char_count || 1} 人</div>
                  <div><strong>背景：</strong>{orderData.bg_type || '未提供'}</div>
                  <div><strong>備註：</strong>{orderData.add_ons || '無'}</div>
                  <div style={{ gridColumn: 'span 2', marginTop: '4px', borderTop: '1px dashed #d0d8e4', paddingTop: '12px', fontSize: '16px', color: '#4A7294' }}>
                    <strong>總金額：</strong>NT$ {orderData.total_price.toLocaleString()}
                  </div>
                </div>
              </div>

              <div style={{ ...sectionBoxStyle, marginBottom: '0' }}>
                <h3 style={{ fontSize: '16px', color: '#475569', margin: '0 0 12px 0', borderBottom: '1px solid #e8ecf3', paddingBottom: '8px' }}>委託協議</h3>
                <div style={{ fontSize: '14px', color: '#556577', maxHeight: '200px', overflowY: 'auto', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e8ecf3' }}>
                  {orderData.artist_settings ? (
                    <div dangerouslySetInnerHTML={{ 
                      __html: (() => {
                        try {
                          const rawHtml = JSON.parse(orderData.artist_settings).rules;
                          return rawHtml ? DOMPurify.sanitize(rawHtml) : '繪師尚未設定使用規範。';
                        } catch(e) {
                          return orderData.agreed_tos_snapshot ? DOMPurify.sanitize(orderData.agreed_tos_snapshot) : '無協議紀錄';
                        }
                      })()
                    }} />
                  ) : (
                    <div style={{ whiteSpace: 'pre-wrap' }}>{orderData.agreed_tos_snapshot || '無協議紀錄'}</div>
                  )}
                </div>
              </div>

            </div>
          )}

          {activeTab === 'review' && (
            <div>
              {/* 如果非一鍵出圖，才顯示草稿和線稿 */}
              {orderData.delivery_method !== '一鍵出圖' && (
                <>
                  {renderClientStageBox('階段 1：草稿', 'sketch', orderData.current_stage === 'sketch_reviewing', ['lineart_drawing', 'lineart_reviewing', 'final_drawing', 'final_reviewing', 'completed'].includes(orderData.current_stage))}
                  {renderClientStageBox('階段 2：線稿', 'lineart', orderData.current_stage === 'lineart_reviewing', ['final_drawing', 'final_reviewing', 'completed'].includes(orderData.current_stage))}
                </>
              )}
              {/* 完稿階段永遠顯示 */}
              {renderClientStageBox('階段 3：完稿交付', 'final', orderData.current_stage === 'final_reviewing', orderData.status === 'completed')}
            </div>
          )}

          {activeTab === 'history' && (
             <div>
               {logs.length === 0 ? (
                 <div style={{ textAlign: 'center', color: '#556577', padding: '40px' }}>無歷程紀錄</div>
               ) : (
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                   {logs.map(log => (
                     <div key={log.id} style={{ padding: '12px', backgroundColor: '#FFFFFF', borderRadius: '8px', borderLeft: log.actor_role === 'artist' ? '4px solid #4E7A5A' : '4px solid #4A7294' }}>
                       <div style={{ fontSize: '12px', color: '#8a95a8', marginBottom: '4px' }}>{new Date(log.created_at).toLocaleString('zh-TW')} | {log.actor_role === 'artist' ? '繪師' : '委託人'}</div>
                       <div style={{ fontSize: '14px', color: '#475569' }}>{log.content}</div>
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