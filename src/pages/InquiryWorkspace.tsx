// src/pages/InquiryWorkspace.tsx
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import '../styles/Workspace.css';

export const InquiryWorkspace: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [inquiry, setInquiry] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isArtist, setIsArtist] = useState(false);
  const [loading, setLoading] = useState(true);
  const [focusedField, setFocusedField] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  // 🌟 修正 2：加入初次載入標記，避免 5 秒輪詢覆蓋正在輸入的草稿
  const isFirstLoad = useRef(true);

  // 初始化草稿結構
  const [draft, setDraft] = useState<any>({
    project_name: '',
    total_price: 0,
    usage_type: '個人收藏',
    is_rush: '否',
    draw_scope: '胸像',
    bg_type: '透明/純色',
    char_count: 1,
    add_ons: ''
  });

  const formatLocalTime = (dateStr: string) => {
    if (!dateStr) return '';
    const utcStr = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T') + 'Z';
    return new Date(utcStr).toLocaleTimeString('zh-TW', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false
    });
  };

  const fetchData = async () => {
    try {
      const resInquiry = await apiClient.get(`/api/inquiries/${id}`);
      if (resInquiry.success) {
        setInquiry(resInquiry.data);
        const resUser = await apiClient.get('/api/users/me');
        const currentUserIsArtist = resUser.data.id === resInquiry.data.artist_id;
        setIsArtist(currentUserIsArtist);
        
        // 🌟 修正 2：如果是初次載入，或不是繪師在編輯時，才允許資料庫覆蓋草稿畫面
        if (isFirstLoad.current || !currentUserIsArtist || resInquiry.data.status !== 'submitted') {
          if (resInquiry.data.negotiation_draft) {
            setDraft(JSON.parse(resInquiry.data.negotiation_draft));
          } else if (isFirstLoad.current) {
            setDraft((prev: any) => ({
              ...prev,
              project_name: resInquiry.data.bulletin_content.substring(0, 30)
            }));
          }
        }
        isFirstLoad.current = false;
      }
      
      const resMsgs = await apiClient.get(`/api/inquiries/${id}/messages`);
      if (resMsgs.success) {
        setMessages(resMsgs.data);
      }
    } catch (e) { 
      console.error(e); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => {
    fetchData();
    const timer = setInterval(fetchData, 5000);
    return () => clearInterval(timer);
  }, [id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    await apiClient.post(`/api/inquiries/${id}/messages`, { content: newMessage });
    setNewMessage('');
    fetchData();
  };

  const handleSaveDraft = async () => {
    await apiClient.patch(`/api/inquiries/${id}/draft`, { draft_json: JSON.stringify(draft) });
    alert('協議草稿已儲存！');
  };

  const handlePropose = async () => {
    if (!window.confirm('送出正式提案後將鎖定內容，直到案主回覆。確定送出？')) return;
    
    try {
      // 🌟 修正 3：防呆機制！送出前強制幫繪師「自動儲存草稿」，避免案主讀不到資料而 500 Error
      await apiClient.patch(`/api/inquiries/${id}/draft`, { draft_json: JSON.stringify(draft) });
      
      // 再送出改變狀態的請求
      await apiClient.post(`/api/inquiries/${id}/propose`, {});
      alert('已送出正式提案給案主！');
      fetchData();
    } catch (error: any) {
      alert('送出提案失敗：' + error.message);
    }
  };

  const handleFinalize = async () => {
    if (!window.confirm('確定以此協議建立委託單？')) return;
    try {
      const res = await apiClient.post(`/api/inquiries/${id}/finalize`, {});
      if (res.success) {
        alert('委託單建立成功！');
        navigate(`/workspace/${res.commission_id}`);
      } else {
        alert('成單失敗：' + res.error);
      }
    } catch (error: any) {
      alert('系統異常，成單失敗');
    }
  };

  if (loading || !inquiry) return (
    <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#FBFBF9', color: '#5D4A3E', fontSize: '15px', position: 'fixed', inset: 0, zIndex: 9999 }}>
      載入洽談室中...
    </div>
  );

  return (
    // 🌟 修正 1：強制覆蓋全螢幕 (position: fixed, inset: 0, zIndex: 9999)，避免被 ClientLayout 的底端列干擾
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', backgroundColor: '#FBFBF9', overflow: 'hidden' }}>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #DED9D3; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #A0978D; }
        
        .draft-input {
          width: 100%; border: 1px solid #EAE6E1; padding: 8px 12px; border-radius: 8px; font-size: 13px; color: #5D4A3E; transition: all 0.2s; outline: none; background: #FFFFFF;
        }
        .draft-input:focus { border-color: #5D4A3E; box-shadow: 0 0 0 2px rgba(93, 74, 62, 0.1); }
        .draft-input:disabled { background: #FBFBF9; color: #A0978D; cursor: not-allowed; }
      `}</style>

      {/* 左側聊天區 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#FFFFFF', position: 'relative' }}>
        
        <header style={{ backgroundColor: '#FFFFFF', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #EAE6E1', zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: '#A0978D', fontSize: '15px', cursor: 'pointer', fontWeight: 'bold' }}>
              ← 返回
            </button>
            <div>
              <h2 style={{ margin: 0, fontSize: '16px', color: '#5D4A3E', fontWeight: 'bold' }}>
                洽談：{inquiry.bulletin_content.substring(0, 20)}...
              </h2>
            </div>
          </div>
          <div style={{ padding: '4px 12px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', backgroundColor: isArtist ? '#EBF2F7' : '#FDF4E6', color: isArtist ? '#4A7294' : '#A67B3E', border: isArtist ? '1px solid #C1D6E8' : '1px solid #FDE0B5' }}>
            {isArtist ? '🎨 我是繪師' : '👤 我是案主'}
          </div>
        </header>

        <main className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', backgroundColor: '#FBFBF9' }}>
          
          {/* 系統提示區 */}
          <div style={{ alignSelf: 'center', backgroundColor: '#EAE6E1', color: '#7A7269', fontSize: '12px', padding: '6px 16px', borderRadius: '20px', marginBottom: '8px' }}>
            已建立洽談室，雙方可在此確認細節。
          </div>

          {/* 訊息列表 */}
          {messages.map((msg) => {
            const isMe = msg.sender_id === (isArtist ? inquiry.artist_id : inquiry.bulletin_client_id);
            return (
              <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                <div style={{ display: 'flex', gap: '6px', marginBottom: '4px', fontSize: '11px', color: '#A0978D', flexDirection: isMe ? 'row-reverse' : 'row' }}>
                  <span>{msg.sender_id === inquiry.artist_id ? '繪師' : '委託人'}</span>
                  <span>{formatLocalTime(msg.created_at)}</span>
                </div>
                <div style={{ 
                  maxWidth: '80%', padding: '10px 14px', fontSize: '14px',
                  backgroundColor: isMe ? '#5D4A3E' : '#FFFFFF',
                  color: isMe ? '#FFFFFF' : '#5D4A3E',
                  borderRadius: isMe ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
                  border: isMe ? 'none' : '1px solid #EAE6E1',
                  wordBreak: 'break-word', whiteSpace: 'pre-wrap', lineHeight: '1.5'
                }}>
                  {msg.content}
                </div>
              </div>
            );
          })}
          <div ref={chatEndRef} />
        </main>

        <footer style={{ backgroundColor: '#FFFFFF', padding: '16px 20px', borderTop: '1px solid #EAE6E1', display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
          <textarea 
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onFocus={() => setFocusedField(true)}
            onBlur={() => setFocusedField(false)}
            onKeyDown={(e) => { 
              if (e.key === 'Enter' && !e.shiftKey) { 
                e.preventDefault(); 
                handleSendMessage(e as any); 
              } 
            }}
            placeholder="請輸入訊息 (Enter 發送)..."
            style={{ 
              flex: 1, padding: '12px 16px', borderRadius: '16px', 
              border: focusedField ? '1.5px solid #5D4A3E' : '1px solid #DED9D3',
              backgroundColor: '#FBFBF9', fontSize: '14px', color: '#5D4A3E',
              minHeight: '44px', maxHeight: '120px', outline: 'none', resize: 'none', lineHeight: '1.4'
            }}
          />
          <button 
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
            style={{ 
              padding: '12px 24px', borderRadius: '99px', 
              backgroundColor: newMessage.trim() ? '#5D4A3E' : '#DED9D3',
              color: '#FFFFFF', border: 'none', fontWeight: 'bold', cursor: newMessage.trim() ? 'pointer' : 'not-allowed', transition: '0.2s', marginBottom: '2px'
            }}
          >
            傳送
          </button>
        </footer>
      </div>

      {/* 右側側邊欄：軌跡與協議 */}
      <aside className="custom-scrollbar" style={{ width: '420px', borderLeft: '1px solid #EAE6E1', backgroundColor: '#FDFDFB', display: 'flex', flexDirection: 'column' }}>
        
        <div style={{ padding: '20px', borderBottom: '1px solid #EAE6E1', backgroundColor: '#FFFFFF' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#5D4A3E', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>📝 正式協議編輯區</span>
            <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '6px', backgroundColor: '#FBFBF9', border: '1px solid #EAE6E1', color: '#7A7269' }}>
              {inquiry.status === 'submitted' ? '草稿編修中' : inquiry.status === 'proposed' ? '待案主同意' : '已成單'}
            </span>
          </h3>
          <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#A0978D', lineHeight: '1.5' }}>
            {isArtist 
              ? '請依據左側的討論內容，在此填寫最終確認的規格與金額。確認無誤後即可送出正式提案。' 
              : '繪師將在此填寫最終規格。當繪師送出提案後，您可在此確認並正式建立委託單。'}
          </p>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          
          <div style={{ backgroundColor: '#FBFBF9', border: '1px solid #EAE6E1', borderRadius: '12px', padding: '16px', marginBottom: '24px' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 'bold', color: '#7A7269', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              🔍 許願池媒合軌跡
            </h4>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '11px', color: '#A0978D', display: 'block', marginBottom: '4px' }}>原始許願內容</label>
              <div style={{ fontSize: '13px', color: '#5D4A3E', backgroundColor: '#FFFFFF', padding: '10px', borderRadius: '8px', border: '1px solid #EAE6E1' }}>
                {inquiry.bulletin_content}
              </div>
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#A0978D', display: 'block', marginBottom: '4px' }}>繪師投遞規格</label>
              <div style={{ fontSize: '13px', color: '#5D4A3E', backgroundColor: '#FFFFFF', padding: '10px', borderRadius: '8px', border: '1px solid #EAE6E1', fontWeight: 'bold' }}>
                {JSON.parse(inquiry.artist_snapshot).title} / {JSON.parse(inquiry.artist_snapshot).price}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#5D4A3E', display: 'block', marginBottom: '6px' }}>項目名稱</label>
              <input 
                disabled={!isArtist || inquiry.status !== 'submitted'} 
                className="draft-input" 
                value={draft.project_name} 
                onChange={(e) => setDraft({...draft, project_name: e.target.value})} 
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#5D4A3E', display: 'block', marginBottom: '6px' }}>委託總金額 (NT$)</label>
              <input 
                type="number" 
                disabled={!isArtist || inquiry.status !== 'submitted'} 
                className="draft-input" 
                value={draft.total_price} 
                onChange={(e) => setDraft({...draft, total_price: Number(e.target.value)})} 
              />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#5D4A3E', display: 'block', marginBottom: '6px' }}>是否急件</label>
                <select 
                  disabled={!isArtist || inquiry.status !== 'submitted'} 
                  className="draft-input"
                  value={draft.is_rush} 
                  onChange={(e) => setDraft({...draft, is_rush: e.target.value})}
                >
                  <option value="否">否</option>
                  <option value="是">是</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#5D4A3E', display: 'block', marginBottom: '6px' }}>人物數量</label>
                <input 
                  type="number" 
                  disabled={!isArtist || inquiry.status !== 'submitted'} 
                  className="draft-input"
                  value={draft.char_count} 
                  onChange={(e) => setDraft({...draft, char_count: Number(e.target.value)})} 
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#5D4A3E', display: 'block', marginBottom: '6px' }}>繪畫範圍</label>
              <select 
                disabled={!isArtist || inquiry.status !== 'submitted'} 
                className="draft-input" style={{ marginBottom: '8px' }}
                value={['胸像', '半身', '全身'].includes(draft.draw_scope) ? draft.draw_scope : 'other'}
                onChange={(e) => setDraft({...draft, draw_scope: e.target.value === 'other' ? '' : e.target.value})}
              >
                <option value="胸像">胸像</option>
                <option value="半身">半身</option>
                <option value="全身">全身</option>
                <option value="other">自行輸入...</option>
              </select>
              {!['胸像', '半身', '全身'].includes(draft.draw_scope) && (
                <input 
                  className="draft-input" 
                  placeholder="請輸入範圍" 
                  value={draft.draw_scope} 
                  onChange={(e) => setDraft({...draft, draw_scope: e.target.value})} 
                />
              )}
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#5D4A3E', display: 'block', marginBottom: '6px' }}>背景類型</label>
              <select 
                disabled={!isArtist || inquiry.status !== 'submitted'} 
                className="draft-input" style={{ marginBottom: '8px' }}
                value={['透明/純色', '簡單裝飾', '複雜背景'].includes(draft.bg_type) ? draft.bg_type : 'other'}
                onChange={(e) => setDraft({...draft, bg_type: e.target.value === 'other' ? '' : e.target.value})}
              >
                <option value="透明/純色">透明/純色</option>
                <option value="簡單裝飾">簡單裝飾</option>
                <option value="複雜背景">複雜背景</option>
                <option value="other">自行輸入...</option>
              </select>
              {!['透明/純色', '簡單裝飾', '複雜背景'].includes(draft.bg_type) && (
                <input 
                  className="draft-input" 
                  placeholder="請輸入背景需求" 
                  value={draft.bg_type} 
                  onChange={(e) => setDraft({...draft, bg_type: e.target.value})} 
                />
              )}
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#5D4A3E', display: 'block', marginBottom: '6px' }}>委託用途</label>
              <input 
                disabled={!isArtist || inquiry.status !== 'submitted'} 
                className="draft-input" 
                value={draft.usage_type} 
                onChange={(e) => setDraft({...draft, usage_type: e.target.value})} 
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#5D4A3E', display: 'block', marginBottom: '6px' }}>快速標籤 / 加選項目</label>
              <textarea 
                disabled={!isArtist || inquiry.status !== 'submitted'} 
                className="draft-input" 
                rows={3} style={{ resize: 'none' }}
                value={draft.add_ons} 
                onChange={(e) => setDraft({...draft, add_ons: e.target.value})} 
              />
            </div>
          </div>
        </div>

        {/* 底部操作區 */}
        <div style={{ padding: '20px', backgroundColor: '#FFFFFF', borderTop: '1px solid #EAE6E1', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {isArtist && inquiry.status === 'submitted' && (
            <>
              <button 
                onClick={handleSaveDraft} 
                style={{ width: '100%', padding: '12px', borderRadius: '8px', background: '#FBFBF9', color: '#5D4A3E', border: '1px solid #DED9D3', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s' }}
                onMouseOver={(e) => e.currentTarget.style.background = '#F3F2EE'}
                onMouseOut={(e) => e.currentTarget.style.background = '#FBFBF9'}
              >
                💾 儲存協議草稿
              </button>
              <button 
                onClick={handlePropose} 
                style={{ width: '100%', padding: '12px', borderRadius: '8px', background: '#5D4A3E', color: '#FFFFFF', border: 'none', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }}
              >
                🚀 送出正式提案
              </button>
            </>
          )}
          
          {!isArtist && inquiry.status === 'proposed' && (
            <button 
              onClick={handleFinalize} 
              style={{ width: '100%', padding: '16px', borderRadius: '8px', background: '#4E7A5A', color: '#FFFFFF', border: 'none', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer', boxShadow: '0 4px 10px rgba(78, 122, 90, 0.2)' }}
            >
              ✅ 同意並正式建立委託單
            </button>
          )}

          {inquiry.status === 'proposed' && isArtist && (
            <div style={{ textAlign: 'center', color: '#A67B3E', fontSize: '13px', fontWeight: 'bold', backgroundColor: '#FDF4E6', padding: '12px', borderRadius: '8px', border: '1px solid #FDE0B5' }}>
              ⏳ 已送出提案，等待案主確認中...
            </div>
          )}

          {inquiry.status === 'accepted' && (
            <div style={{ textAlign: 'center', color: '#4E7A5A', fontSize: '13px', fontWeight: 'bold', backgroundColor: '#E8F3EB', padding: '12px', borderRadius: '8px', border: '1px solid #C3E0CC' }}>
              🎉 雙方已達成共識並建立委託！
            </div>
          )}
        </div>
      </aside>
    </div> 
  );
};