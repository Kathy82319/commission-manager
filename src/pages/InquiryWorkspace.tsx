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
  const chatEndRef = useRef<HTMLDivElement>(null);

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

  const fetchData = async () => {
    try {
      const resInquiry = await apiClient.get(`/api/inquiries/${id}`);
      if (resInquiry.success) {
        setInquiry(resInquiry.data);
        const resUser = await apiClient.get('/api/users/me');
        setIsArtist(resUser.data.id === resInquiry.data.artist_id);
        
        if (resInquiry.data.negotiation_draft) {
          setDraft(JSON.parse(resInquiry.data.negotiation_draft));
        } else {
          setDraft((prev: any) => ({
            ...prev,
            project_name: resInquiry.data.bulletin_content.substring(0, 30)
          }));
        }
      }
      const resMsgs = await apiClient.get(`/api/inquiries/${id}/messages`);
      if (resMsgs.success) setMessages(resMsgs.data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
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
    alert('協議草稿已儲存');
  };

  const handlePropose = async () => {
    if (!window.confirm('送出正式提案後將鎖定內容，直到案主回覆。確定送出？')) return;
    await apiClient.post(`/api/inquiries/${id}/propose`, {});
    fetchData();
  };

  const handleFinalize = async () => {
    if (!window.confirm('確定以此協議建立委託單？')) return;
    const res = await apiClient.post(`/api/inquiries/${id}/finalize`, {});
    if (res.success) {
      alert('委託單建立成功！');
      navigate(`/workspace/${res.commission_id}`);
    } else {
      alert('成單失敗：' + res.error);
    }
  };

  if (loading || !inquiry) return <div className="p-10 text-center">載入中...</div>;

  return (
    <div className="workspace-wrapper">
      {/* 左側聊天區 */}
      <div className="workspace-chat-section">
        <div className="inquiry-info-header">
          <h3>洽談：{inquiry.bulletin_content.substring(0, 20)}...</h3>
          <p className="text-xs text-gray-500">狀態：{inquiry.status}</p>
        </div>
        <div className="messages-container">
          {messages.map((msg) => (
            <div key={msg.id} className={`message-bubble ${msg.sender_id === inquiry.artist_id ? 'artist' : 'client'}`}>
              <div className="message-content">{msg.content}</div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
        <form onSubmit={handleSendMessage} className="message-input-area">
          <input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="輸入訊息..." />
          <button type="submit">發送</button>
        </form>
      </div>

      {/* 右側側邊欄：軌跡與協議 */}
      <aside className="workspace-sidebar" style={{ width: '400px', borderLeft: '1px solid #ddd', overflowY: 'auto' }}>
        {/* 1. 媒合軌跡區 */}
        <div className="p-4 bg-gray-50 border-bottom">
          <h4 className="text-sm font-bold text-blue-600 mb-3">媒合軌跡參考</h4>
          <div className="mb-3">
            <label className="text-xs text-gray-400 block">原始許願內容</label>
            <p className="text-sm bg-white p-2 rounded border">{inquiry.bulletin_content}</p>
          </div>
          <div>
            <label className="text-xs text-gray-400 block">繪師初始投遞規格</label>
            <div className="text-sm bg-white p-2 rounded border border-dashed">
              {JSON.parse(inquiry.artist_snapshot).title} / {JSON.parse(inquiry.artist_snapshot).price}
            </div>
          </div>
        </div>

        {/* 2. 正式協議編輯區 */}
        <div className="p-4">
          <h4 className="font-bold mb-4">正式協議內容</h4>
          <div className="space-y-4">
            <div className="form-group">
              <label className="text-xs font-bold block mb-1">項目名稱</label>
              <input disabled={!isArtist || inquiry.status !== 'submitted'} className="w-full border p-2 rounded" 
                     value={draft.project_name} onChange={(e) => setDraft({...draft, project_name: e.target.value})} />
            </div>

            <div className="form-group">
              <label className="text-xs font-bold block mb-1">委託總金額</label>
              <input type="number" disabled={!isArtist || inquiry.status !== 'submitted'} className="w-full border p-2 rounded" 
                     value={draft.total_price} onChange={(e) => setDraft({...draft, total_price: Number(e.target.value)})} />
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs font-bold block mb-1">急件</label>
                <select disabled={!isArtist || inquiry.status !== 'submitted'} className="w-full border p-2 rounded"
                        value={draft.is_rush} onChange={(e) => setDraft({...draft, is_rush: e.target.value})}>
                  <option value="否">否</option>
                  <option value="是">是</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="text-xs font-bold block mb-1">人物數量</label>
                <input type="number" disabled={!isArtist || inquiry.status !== 'submitted'} className="w-full border p-2 rounded"
                       value={draft.char_count} onChange={(e) => setDraft({...draft, char_count: Number(e.target.value)})} />
              </div>
            </div>

            <div className="form-group">
              <label className="text-xs font-bold block mb-1">繪畫範圍</label>
              <select disabled={!isArtist || inquiry.status !== 'submitted'} className="w-full border p-2 rounded mb-2"
                      value={['胸像', '半身', '全身'].includes(draft.draw_scope) ? draft.draw_scope : 'other'}
                      onChange={(e) => setDraft({...draft, draw_scope: e.target.value === 'other' ? '' : e.target.value})}>
                <option value="胸像">胸像</option>
                <option value="半身">半身</option>
                <option value="全身">全身</option>
                <option value="other">自行輸入...</option>
              </select>
              {!['胸像', '半身', '全身'].includes(draft.draw_scope) && (
                <input className="w-full border p-2 rounded" placeholder="請輸入範圍" value={draft.draw_scope} 
                       onChange={(e) => setDraft({...draft, draw_scope: e.target.value})} />
              )}
            </div>

            <div className="form-group">
              <label className="text-xs font-bold block mb-1">背景類型</label>
              <select disabled={!isArtist || inquiry.status !== 'submitted'} className="w-full border p-2 rounded mb-2"
                      value={['透明/純色', '簡單裝飾', '複雜背景'].includes(draft.bg_type) ? draft.bg_type : 'other'}
                      onChange={(e) => setDraft({...draft, bg_type: e.target.value === 'other' ? '' : e.target.value})}>
                <option value="透明/純色">透明/純色</option>
                <option value="簡單裝飾">簡單裝飾</option>
                <option value="複雜背景">複雜背景</option>
                <option value="other">自行輸入...</option>
              </select>
              {!['透明/純色', '簡單裝飾', '複雜背景'].includes(draft.bg_type) && (
                <input className="w-full border p-2 rounded" placeholder="請輸入背景需求" value={draft.bg_type} 
                       onChange={(e) => setDraft({...draft, bg_type: e.target.value})} />
              )}
            </div>

            <div className="form-group">
              <label className="text-xs font-bold block mb-1">委託用途</label>
              <input disabled={!isArtist || inquiry.status !== 'submitted'} className="w-full border p-2 rounded" 
                     value={draft.usage_type} onChange={(e) => setDraft({...draft, usage_type: e.target.value})} />
            </div>

            <div className="form-group">
              <label className="text-xs font-bold block mb-1">快速標籤 / 加選項目</label>
              <textarea disabled={!isArtist || inquiry.status !== 'submitted'} className="w-full border p-2 rounded" rows={3}
                        value={draft.add_ons} onChange={(e) => setDraft({...draft, add_ons: e.target.value})} />
            </div>
          </div>

          <div className="mt-6 space-y-2">
            {isArtist && inquiry.status === 'submitted' && (
              <>
                <button onClick={handleSaveDraft} className="btn-secondary w-full">儲存協議草稿</button>
                <button onClick={handlePropose} className="btn-primary w-full">送出正式提案</button>
              </>
            )}
            {!isArtist && inquiry.status === 'proposed' && (
              <button onClick={handleFinalize} className="btn-primary w-full py-3 text-lg">同意並正式建立委託</button>
            )}
            {inquiry.status === 'proposed' && isArtist && (
              <p className="text-center text-gray-500 text-sm py-2">已送出提案，等待案主確認...</p>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
};