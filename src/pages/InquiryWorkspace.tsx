import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import '../styles/Workspace.css'; // 沿用現有的 Workspace 樣式

export const InquiryWorkspace: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [inquiry, setInquiry] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [draft, setDraft] = useState<any>({
    project_name: '',
    total_price: 0,
    specs: '',
    notes: ''
  });
  const [loading, setLoading] = useState(true);
  const [isArtist, setIsArtist] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const fetchData = async () => {
    try {
      // 1. 獲取洽談詳情
      const resInquiry = await apiClient.get(`/api/inquiries/${id}`);
      if (resInquiry.success) {
        setInquiry(resInquiry.data);
        // 判斷當前使用者是否為繪師
        const resUser = await apiClient.get('/api/users/me');
        setIsArtist(resUser.data.id === resInquiry.data.artist_id);
        
        // 載入草稿，若無草稿則初始化
        if (resInquiry.data.negotiation_draft) {
          setDraft(JSON.parse(resInquiry.data.negotiation_draft));
        } else {
          setDraft((prev: any) => ({
            ...prev,
            project_name: resInquiry.data.bulletin_content.substring(0, 50)
          }));
        }
      }

      // 2. 獲取訊息紀錄
      const resMsgs = await apiClient.get(`/api/inquiries/${id}/messages`);
      if (resMsgs.success) {
        setMessages(resMsgs.data);
      }
    } catch (error) {
      console.error('載入失敗', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const timer = setInterval(fetchData, 5000); // 簡單輪詢
    return () => clearInterval(timer);
  }, [id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    try {
      await apiClient.post(`/api/inquiries/${id}/messages`, { content: newMessage });
      setNewMessage('');
      fetchData();
    } catch (error) { alert('發送失敗'); }
  };

  const handleSaveDraft = async () => {
    try {
      await apiClient.patch(`/api/inquiries/${id}/draft`, { draft_json: JSON.stringify(draft) });
      alert('草稿已儲存');
    } catch (error) { alert('儲存失敗'); }
  };

  const handlePropose = async () => {
    if (!window.confirm('送出正式提案後，在案主回覆前您將無法再修改內容。確定送出？')) return;
    try {
      await apiClient.post(`/api/inquiries/${id}/propose`, {});
      alert('提案已送出');
      fetchData();
    } catch (error) { alert('送出失敗'); }
  };

  const handleFinalize = async () => {
    if (!window.confirm('您是否同意此份協議內容並正式建立委託單？')) return;
    try {
      const res = await apiClient.post(`/api/inquiries/${id}/finalize`, {});
      if (res.success) {
        alert('委託單已建立！');
        navigate(`/workspace/${res.commission_id}`);
      }
    } catch (error) { alert('成單失敗'); }
  };

  if (loading || !inquiry) return <div className="p-10 text-center">載入中...</div>;

  return (
    <div className="workspace-wrapper">
      {/* 左側：聊天與資訊 */}
      <div className="workspace-chat-section">
        <div className="inquiry-info-header">
          <h3>洽談對象：{inquiry.bulletin_content}</h3>
          <p className="text-sm text-gray-500">當前狀態：
            {inquiry.status === 'submitted' ? '洽談中' : 
             inquiry.status === 'proposed' ? '待案主審閱協議' : inquiry.status}
          </p>
        </div>

        <div className="messages-container">
          {messages.map((msg) => (
            <div key={msg.id} className={`message-bubble ${msg.sender_id === inquiry.artist_id ? 'artist' : 'client'}`}>
              <div className="message-content">{msg.content}</div>
              <div className="message-time">{new Date(msg.created_at).toLocaleTimeString()}</div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        <form onSubmit={handleSendMessage} className="message-input-area">
          <input 
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="輸入訊息..."
          />
          <button type="submit">發送</button>
        </form>
      </div>

      {/* 右側：協議編輯/預覽 */}
      <aside className="workspace-sidebar">
        <div className="sidebar-header">
          <h4>協議草稿</h4>
          {isArtist && inquiry.status === 'submitted' && (
            <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">編輯模式</span>
          )}
        </div>

        <div className="proposal-form">
          <div className="form-group">
            <label>項目名稱</label>
            <input 
              disabled={!isArtist || inquiry.status !== 'submitted'}
              value={draft.project_name}
              onChange={(e) => setDraft({...draft, project_name: e.target.value})}
            />
          </div>
          <div className="form-group">
            <label>委託金額 (TWD)</label>
            <input 
              type="number"
              disabled={!isArtist || inquiry.status !== 'submitted'}
              value={draft.total_price}
              onChange={(e) => setDraft({...draft, total_price: Number(e.target.value)})}
            />
          </div>
          <div className="form-group">
            <label>規格細節</label>
            <textarea 
              rows={5}
              disabled={!isArtist || inquiry.status !== 'submitted'}
              value={draft.specs}
              onChange={(e) => setDraft({...draft, specs: e.target.value})}
            />
          </div>
          <div className="form-group">
            <label>備註事項</label>
            <textarea 
              disabled={!isArtist || inquiry.status !== 'submitted'}
              value={draft.notes}
              onChange={(e) => setDraft({...draft, notes: e.target.value})}
            />
          </div>

          <div className="proposal-actions">
            {isArtist && inquiry.status === 'submitted' && (
              <>
                <button onClick={handleSaveDraft} className="btn-secondary">儲存草稿</button>
                <button onClick={handlePropose} className="btn-primary">送出正式提案</button>
              </>
            )}

            {!isArtist && inquiry.status === 'proposed' && (
              <div className="client-approval-zone">
                <p className="text-sm text-blue-600 mb-2 font-bold">繪師已送出最終協議，請確認內容後點擊同意。</p>
                <button onClick={handleFinalize} className="btn-primary w-full">同意並正式建立委託</button>
              </div>
            )}

            {inquiry.status === 'proposed' && isArtist && (
              <p className="text-center text-gray-500 py-4 italic">已送出提案，等待案主確認中...</p>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
};