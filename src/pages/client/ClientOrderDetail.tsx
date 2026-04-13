// src/pages/client/ClientOrderDetail.tsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

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
  artist_settings?: string; // 🌟 新增此欄位
}

interface Submission {
  id: string;
  stage: string;
  file_url: string;
  version: number;
  created_at: string;
}

interface ActionLog {
  id: string;
  actor_role: string;
  content: string;
  created_at: string;
}

export function ClientOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<'main' | 'review' | 'history'>('main');
  const [orderData, setOrderData] = useState<CommissionDetail | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [logs, setLogs] = useState<ActionLog[]>([]);
  
  const [customTitle, setCustomTitle] = useState('');
  const [isSavingTitle, setIsSavingTitle] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasNewMessage, setHasNewMessage] = useState(false);

  useEffect(() => {
    const fetchDetailData = async () => {
      if (!id) return;
      setIsLoading(true);
      try {
        const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

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
          setCustomTitle(data.client_custom_title || '');

          if (data.latest_message_at) {
            const latestMsgTime = new Date(data.latest_message_at).getTime();
            const lastReadTime = data.last_read_at_client 
              ? new Date(data.last_read_at_client).getTime() 
              : 0;
            if (latestMsgTime > lastReadTime) {
              setHasNewMessage(true);
            }
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

    fetchDetailData();
  }, [id]);

  const handleReviewChange = async (action: 'approve' | 'reject') => {
    if (!id) return;
    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
      const res = await fetch(`${API_BASE}/api/commissions/${id}/change-response`, {
        method: 'POST',
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
    } catch (error) {
      console.error('處理異動申請發生錯誤:', error);
    }
  };

  const handleSaveTitle = async () => {
    if (!id) return;
    setIsSavingTitle(true);
    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
      const res = await fetch(`${API_BASE}/api/commissions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_custom_title: customTitle })
      });
      const data = await res.json();
      if (!data.success) {
        alert('儲存名稱失敗：' + data.error);
      }
    } catch (error) {
      console.error('更新名稱發生錯誤:', error);
    } finally {
      setIsSavingTitle(false);
    }
  };

  const getLatestSubmissions = () => {
    const latest: Record<string, Submission> = {};
    submissions.forEach(sub => {
      if (!latest[sub.stage] || sub.version > latest[sub.stage].version) {
        latest[sub.stage] = sub;
      }
    });
    return latest;
  };

  const renderReviewBlocks = () => {
    const latestSubs = getLatestSubmissions();
    const stages = orderData?.delivery_method === '一鍵出圖'
      ? [{ id: 'final', label: '完稿/成品' }]
      : [
          { id: 'sketch', label: '草稿階段' },
          { id: 'lineart', label: '線稿階段' },
          { id: 'final', label: '完稿階段' }
        ];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {stages.map(stage => {
          const sub = latestSubs[stage.id];
          return (
            <div key={stage.id} style={{ ...sectionBoxStyle, marginBottom: '0', borderLeft: sub ? '4px solid #4A7294' : '4px solid #d0d8e4' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: sub ? '12px' : '0' }}>
                <h4 style={{ margin: 0, color: '#475569', fontSize: '16px' }}>{stage.label}</h4>
                {sub ? (
                  <span style={{ fontSize: '12px', color: '#8a95a8' }}>
                    最後更新：{new Date(sub.created_at).toLocaleString('zh-TW')} (v{sub.version})
                  </span>
                ) : (
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>尚未交付</span>
                )}
              </div>

              {sub ? (
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{ flex: 1, padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', fontSize: '14px', color: '#556577', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {sub.file_url}
                  </div>
                  <a 
                    href={sub.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ padding: '8px 16px', backgroundColor: '#4A7294', color: '#FFF', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold', fontSize: '13px' }}
                  >
                    檢視
                  </a>
                </div>
              ) : (
                <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '14px', backgroundColor: '#f1f5f9', borderRadius: '8px', marginTop: '8px' }}>
                  繪師尚未上傳此階段稿件
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  if (isLoading) {
    return <div style={{ minHeight: '100vh', backgroundColor: '#778ca4', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#FFF' }}>載入中...</div>;
  }

  if (!orderData) {
    return <div style={{ minHeight: '100vh', backgroundColor: '#778ca4', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#FFF' }}>找不到此委託單</div>;
  }

  const tabStyle = (tabName: string) => ({
    flex: 1,
    padding: '12px',
    textAlign: 'center' as const,
    fontWeight: 'bold',
    cursor: 'pointer',
    borderBottom: activeTab === tabName ? '3px solid #4A7294' : '3px solid transparent',
    color: activeTab === tabName ? '#4A7294' : '#556577',
    backgroundColor: activeTab === tabName ? '#FFFFFF' : '#e8ecf3',
    transition: 'all 0.2s'
  });

  const sectionBoxStyle = {
    backgroundColor: '#FFFFFF',
    padding: '20px',
    borderRadius: '12px',
    marginBottom: '16px',
    border: '1px solid #d0d8e4'
  };

  return (
    <div style={{ backgroundColor: '#778ca4', minHeight: '100vh', display: 'flex', justifyContent: 'center', padding: '20px 16px', fontFamily: 'sans-serif' }}>
      
      <style>{`
        @keyframes pulse-yellow {
          0% { box-shadow: 0 0 0 0 rgba(250, 204, 21, 0.7); border: 2px solid rgba(250, 204, 21, 1); }
          70% { box-shadow: 0 0 0 10px rgba(250, 204, 21, 0); border: 2px solid rgba(250, 204, 21, 1); }
          100% { box-shadow: 0 0 0 0 rgba(250, 204, 21, 0); border: 2px solid rgba(250, 204, 21, 1); }
        }
      `}</style>

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
                  const changes = JSON.parse(orderData.pending_changes);
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
              <button 
                onClick={() => handleReviewChange('approve')} 
                style={{ flex: 1, padding: '14px', backgroundColor: '#4E7A5A', color: '#FFF', borderRadius: '12px', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px' }}
              >
                同意並更新合約
              </button>
              <button 
                onClick={() => handleReviewChange('reject')} 
                style={{ flex: 1, padding: '14px', backgroundColor: '#e11d48', color: '#FFF', borderRadius: '12px', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px' }}
              >
                拒絕修改
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ width: '100%', maxWidth: '700px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        <div style={{ display: 'flex', backgroundColor: '#e8ecf3', borderRadius: '16px 16px 0 0', overflow: 'hidden', marginTop: '20px' }}>
          <div style={tabStyle('main')} onClick={() => setActiveTab('main')}>詳細內容</div>
          <div style={tabStyle('review')} onClick={() => setActiveTab('review')}>稿件審閱</div>
          <div style={tabStyle('history')} onClick={() => setActiveTab('history')}>歷程紀錄</div>
        </div>

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
                      style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #c5cfd9', outline: 'none', backgroundColor: '#f8fafc' }}
                    />
                    <button 
                      onClick={handleSaveTitle}
                      disabled={isSavingTitle}
                      style={{ padding: '10px 20px', backgroundColor: '#556577', color: '#FFF', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      {isSavingTitle ? '儲存中...' : '儲存'}
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
                      padding: '8px 16px', 
                      backgroundColor: '#4A7294', 
                      color: '#FFFFFF', 
                      border: 'none', 
                      borderRadius: '8px', 
                      fontWeight: 'bold', 
                      cursor: 'pointer', 
                      fontSize: '13px',
                      animation: hasNewMessage ? 'pulse-yellow 2s infinite' : 'none',
                      transition: 'all 0.3s'
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

              {/* 🌟 核心修正：使用 dangerouslySetInnerHTML 來渲染富文本 */}
              <div style={{ ...sectionBoxStyle, marginBottom: '0' }}>
                <h3 style={{ fontSize: '16px', color: '#475569', margin: '0 0 12px 0', borderBottom: '1px solid #e8ecf3', paddingBottom: '8px' }}>委託協議</h3>
                <div style={{ fontSize: '14px', color: '#556577', maxHeight: '200px', overflowY: 'auto', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e8ecf3' }}>
                  {orderData.artist_settings ? (
                    <div 
                      dangerouslySetInnerHTML={{ 
                        __html: (() => {
                          try {
                            return JSON.parse(orderData.artist_settings).rules || '繪師尚未設定使用規範。';
                          } catch(e) {
                            // 若解析失敗，退回顯示原有的 snapshot
                            return orderData.agreed_tos_snapshot || '無協議紀錄';
                          }
                        })()
                      }} 
                    />
                  ) : (
                    <div style={{ whiteSpace: 'pre-wrap' }}>
                      {orderData.agreed_tos_snapshot || '無協議紀錄'}
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

          {activeTab === 'review' && (
            <div>
              {renderReviewBlocks()}
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