// src/pages/InquiryWorkspace.tsx
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import DOMPurify from 'dompurify';
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
  
  // 🌟 控制軌跡收合
  const [isTrajectoryExpanded, setIsTrajectoryExpanded] = useState(false);
  // 🌟 合約彈窗控制
  const [showFinalModal, setShowFinalModal] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const isFirstLoad = useRef(true);
  const [isAccepted, setIsAccepted] = useState(false);

  const [draft, setDraft] = useState<any>({
    project_name: '', total_price: 0, usage_type: '非商用', is_rush: '否', draw_scope: '大頭', bg_type: '無背景', char_count: 1, add_ons: ''
  });

  const formatLocalTime = (dateStr: string) => {
    if (!dateStr) return '';
    const utcStr = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T') + 'Z';
    return new Date(utcStr).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const fetchData = async () => {
    if (isAccepted) return;
    try {
      const resInquiry = await apiClient.get(`/api/inquiries/${id}`);
      if (resInquiry.success) {
        setInquiry(resInquiry.data);
        const resUser = await apiClient.get('/api/users/me');
        const currentUserIsArtist = resUser.data.id === resInquiry.data.artist_id;
        setIsArtist(currentUserIsArtist);
        if (resInquiry.data.status === 'accepted') setIsAccepted(true);

        if (isFirstLoad.current || !currentUserIsArtist || resInquiry.data.status !== 'submitted') {
          if (resInquiry.data.negotiation_draft) {
            setDraft(JSON.parse(resInquiry.data.negotiation_draft));
          } else if (isFirstLoad.current) {
            setDraft((prev: any) => ({ ...prev, project_name: resInquiry.data.bulletin_content.substring(0, 30) }));
          }
        }
        isFirstLoad.current = false;
      }
      const resMsgs = await apiClient.get(`/api/inquiries/${id}/messages`);
      if (resMsgs.success) setMessages(resMsgs.data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => {
    fetchData();
    const timer = setInterval(fetchData, 5000);
    return () => clearInterval(timer);
  }, [id, isAccepted]);

  useEffect(() => { if (!isAccepted) chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isAccepted]);

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
      await apiClient.patch(`/api/inquiries/${id}/draft`, { draft_json: JSON.stringify(draft) });
      await apiClient.post(`/api/inquiries/${id}/propose`, {});
      alert('已送出正式提案給案主！');
      fetchData();
    } catch (error: any) { alert('送出提案失敗：' + error.message); }
  };

  const handleFinalize = async () => {
    if (!agreedToTerms) return alert('請先勾選同意委託協議。');
    try {
      const res = await apiClient.post(`/api/inquiries/${id}/finalize`, {});
      if (res.success) {
        setShowFinalModal(false);
        fetchData();
      } else { alert('成單失敗：' + res.error); }
    } catch (error: any) { alert('系統異常，成單失敗'); }
  };

  if (loading || !inquiry) return (
    <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#FBFBF9', color: '#5D4A3E', fontSize: '15px', position: 'fixed', inset: 0, zIndex: 9999 }}>
      載入洽談室中...
    </div>
  );

  // 🌟 成單成功面板
  if (isAccepted) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', backgroundColor: '#FBFBF9' }}>
        <div style={{ backgroundColor: '#FFFFFF', padding: '40px', borderRadius: '16px', boxShadow: '0 10px 25px rgba(93, 74, 62, 0.1)', textAlign: 'center', maxWidth: '500px', border: '1px solid #EAE6E1' }}>
          <div style={{ fontSize: '60px', marginBottom: '20px' }}>🎉</div>
          <h2 style={{ color: '#4E7A5A', fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>
            {isArtist ? '合作達成！委託單已建立' : '恭喜！您已成功與繪師達成協議'}
          </h2>
          <p style={{ color: '#7A7269', fontSize: '15px', marginBottom: '32px', lineHeight: '1.6' }}>
            {isArtist 
              ? '系統已將協議轉換為正式委託單並放入您的筆記本。現在可以開始工作囉！' 
              : '系統已為您建立正式的委託進度追蹤單。您可以隨時查看繪師的最新進度。'}
          </p>
          <button onClick={() => navigate(isArtist ? '/artist/notebook' : '/client/orders')} style={{ width: '100%', padding: '16px', borderRadius: '99px', background: '#5D4A3E', color: '#FFFFFF', border: 'none', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', boxShadow: '0 4px 10px rgba(93, 74, 62, 0.2)' }}>
            {isArtist ? '前往委託管理 (筆記本) ➔' : '前往我的委託管理 ➔'}
          </button>
        </div>
      </div>
    );
  }

  // 🌟 解析繪師提問
  const artistSnap = JSON.parse(inquiry.artist_snapshot || '{}');
  const artistTos = JSON.parse(inquiry.artist_settings || '{}').terms_of_service || "繪師未提供額外協議說明。";

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', backgroundColor: '#FBFBF9', overflow: 'hidden' }}>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #DED9D3; border-radius: 10px; }
        .draft-input { width: 100%; border: 1px solid #EAE6E1; padding: 8px 12px; border-radius: 8px; font-size: 13px; color: #5D4A3E; transition: all 0.2s; outline: none; background: #FFFFFF; }
        .draft-input:focus { border-color: #5D4A3E; box-shadow: 0 0 0 2px rgba(93, 74, 62, 0.1); }
        .draft-input:disabled { background: #FBFBF9; color: #A0978D; cursor: not-allowed; }
        .line-clamp-3 { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }

        /* 🌟 補上合約確認彈窗的信紙樣式 */
        .modal-overlay { position: fixed; inset: 0; background: rgba(26, 20, 18, 0.6); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 10001; padding: 20px; }
        .modal-content-paper { background: #FDFDFB; width: 100%; border-radius: 16px; box-shadow: 0 25px 50px -12px rgba(93, 74, 62, 0.25); position: relative; overflow: hidden; border: 1px solid #EAE6E1; }
        .paper-deco { position: absolute; top: 0; left: 0; right: 0; height: 8px; background: repeating-linear-gradient(45deg, #C27A7A 0, #C27A7A 20px, #FDFDFB 20px, #FDFDFB 40px, #7A93AC 40px, #7A93AC 60px, #FDFDFB 60px, #FDFDFB 80px); }
        .btn-paper-cancel { color: #A0978D; font-weight: bold; border: none; background: none; cursor: pointer; padding: 12px 20px; border-radius: 8px; transition: 0.2s; }
        .btn-paper-cancel:hover { background: #FBFBF9; color: #7A7269; }
        .btn-paper-submit { background: #4E7A5A; color: white; padding: 12px 30px; border-radius: 8px; font-weight: bold; border: none; cursor: pointer; transition: 0.2s; }
        .btn-paper-submit:hover:not(:disabled) { background: #3B5C44; transform: translateY(-2px); }
      `}</style>

      {/* 左側聊天區 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#FFFFFF', position: 'relative' }}>
        <header style={{ backgroundColor: '#FFFFFF', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #EAE6E1', zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: '#A0978D', fontSize: '15px', cursor: 'pointer', fontWeight: 'bold' }}>← 返回</button>
            <h2 style={{ margin: 0, fontSize: '16px', color: '#5D4A3E', fontWeight: 'bold' }}>洽談：{inquiry.bulletin_content.substring(0, 20)}...</h2>
          </div>
          <div style={{ padding: '4px 12px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', backgroundColor: isArtist ? '#EBF2F7' : '#FDF4E6', color: isArtist ? '#4A7294' : '#A67B3E', border: isArtist ? '1px solid #C1D6E8' : '1px solid #FDE0B5' }}>
            {isArtist ? '🎨 我是繪師' : '👤 我是案主'}
          </div>
        </header>

        <main className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', backgroundColor: '#FBFBF9' }}>
          {messages.map((msg) => {
            const isMe = msg.sender_id === (isArtist ? inquiry.artist_id : inquiry.bulletin_client_id);
            return (
              <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                <div style={{ display: 'flex', gap: '6px', marginBottom: '4px', fontSize: '11px', color: '#A0978D', flexDirection: isMe ? 'row-reverse' : 'row' }}>
                  <span>{msg.sender_id === inquiry.artist_id ? '繪師' : '委託人'}</span>
                  <span>{formatLocalTime(msg.created_at)}</span>
                </div>
                <div style={{ maxWidth: '80%', padding: '10px 14px', fontSize: '14px', backgroundColor: isMe ? '#5D4A3E' : '#FFFFFF', color: isMe ? '#FFFFFF' : '#5D4A3E', borderRadius: isMe ? '16px 4px 16px 16px' : '4px 16px 16px 16px', boxShadow: '0 2px 4px rgba(0,0,0,0.04)', border: isMe ? 'none' : '1px solid #EAE6E1', wordBreak: 'break-word', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                  {msg.content}
                </div>
              </div>
            );
          })}
          <div ref={chatEndRef} />
        </main>

        <footer style={{ backgroundColor: '#FFFFFF', padding: '16px 20px', borderTop: '1px solid #EAE6E1', display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
          <textarea value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onFocus={() => setFocusedField(true)} onBlur={() => setFocusedField(false)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(e as any); } }} placeholder="請輸入訊息 (Enter 發送)..." style={{ flex: 1, padding: '12px 16px', borderRadius: '16px', border: focusedField ? '1.5px solid #5D4A3E' : '1px solid #DED9D3', backgroundColor: '#FBFBF9', fontSize: '14px', color: '#5D4A3E', minHeight: '44px', maxHeight: '120px', outline: 'none', resize: 'none', lineHeight: '1.4' }} />
          <button onClick={handleSendMessage} disabled={!newMessage.trim()} style={{ padding: '12px 24px', borderRadius: '99px', backgroundColor: newMessage.trim() ? '#5D4A3E' : '#DED9D3', color: '#FFFFFF', border: 'none', fontWeight: 'bold', cursor: newMessage.trim() ? 'pointer' : 'not-allowed', transition: '0.2s', marginBottom: '2px' }}>傳送</button>
        </footer>
      </div>

      {/* 右側側邊欄 */}
      <aside className="custom-scrollbar" style={{ width: '420px', borderLeft: '1px solid #EAE6E1', backgroundColor: '#FDFDFB', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid #EAE6E1', backgroundColor: '#FFFFFF' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#5D4A3E', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>📝 正式協議編輯區</span>
            <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '6px', backgroundColor: '#FBFBF9', border: '1px solid #EAE6E1', color: '#7A7269' }}>
              {inquiry.status === 'submitted' ? '草稿編修中' : inquiry.status === 'proposed' ? '待案主同意' : '已成單'}
            </span>
          </h3>
          <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#A0978D', lineHeight: '1.5' }}>{isArtist ? '請在此填寫最終規格，確認後送出提案。' : '繪師送出提案後，您可在此確認並建立委託。'}</p>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {/* 🌟 升級版：許願池媒合軌跡 (可收合) */}
          <div style={{ backgroundColor: '#FBFBF9', border: '1px solid #EAE6E1', borderRadius: '12px', padding: '16px', marginBottom: '24px', position: 'relative' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 'bold', color: '#7A7269', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>🔍 許願池媒合軌跡</h4>
            <div className={isTrajectoryExpanded ? "" : "line-clamp-3"} style={{ fontSize: '12px', color: '#5D4A3E', lineHeight: '1.6' }}>
              <p><strong>原始許願內容：</strong><br/>{inquiry.bulletin_content}</p>
              <p style={{ marginTop: '8px' }}><strong>繪師提問單範本：</strong><br/>{artistSnap.question_template || "無提問範本"}</p>
              <p style={{ marginTop: '8px' }}><strong>案主初始回覆：</strong><br/>{inquiry.client_response || "尚未回覆"}</p>
            </div>
            <button onClick={() => setIsTrajectoryExpanded(!isTrajectoryExpanded)} style={{ background: 'none', border: 'none', color: '#A67B3E', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', padding: '4px 0', marginTop: '4px' }}>
              {isTrajectoryExpanded ? "▲ 收合軌跡" : "▼ 展開完整軌跡"}
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div><label style={{ fontSize: '12px', fontWeight: 'bold', color: '#5D4A3E', display: 'block', marginBottom: '6px' }}>項目名稱</label><input disabled={!isArtist || inquiry.status !== 'submitted'} className="draft-input" value={draft.project_name} onChange={(e) => setDraft({...draft, project_name: e.target.value})} /></div>
            <div><label style={{ fontSize: '12px', fontWeight: 'bold', color: '#5D4A3E', display: 'block', marginBottom: '6px' }}>委託總金額 (NT$)</label><input type="number" disabled={!isArtist || inquiry.status !== 'submitted'} className="draft-input" value={draft.total_price} onChange={(e) => setDraft({...draft, total_price: Number(e.target.value)})} /></div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flex: 1 }}><label style={{ fontSize: '12px', fontWeight: 'bold', color: '#5D4A3E', display: 'block', marginBottom: '6px' }}>是否急件</label><select disabled={!isArtist || inquiry.status !== 'submitted'} className="draft-input" value={draft.is_rush} onChange={(e) => setDraft({...draft, is_rush: e.target.value})}><option value="否">否</option><option value="是">是</option></select></div>
              <div style={{ flex: 1 }}><label style={{ fontSize: '12px', fontWeight: 'bold', color: '#5D4A3E', display: 'block', marginBottom: '6px' }}>人物數量</label><input type="number" disabled={!isArtist || inquiry.status !== 'submitted'} className="draft-input" value={draft.char_count} onChange={(e) => setDraft({...draft, char_count: Number(e.target.value)})} /></div>
            </div>
            <div><label style={{ fontSize: '12px', fontWeight: 'bold', color: '#5D4A3E', display: 'block', marginBottom: '6px' }}>繪畫範圍</label><select disabled={!isArtist || inquiry.status !== 'submitted'} className="draft-input" style={{ marginBottom: '8px' }} value={['大頭', '半身', '全身'].includes(draft.draw_scope) ? draft.draw_scope : 'other'} onChange={(e) => setDraft({...draft, draw_scope: e.target.value === 'other' ? '' : e.target.value})}><option value="大頭">大頭</option><option value="半身">半身</option><option value="全身">全身</option><option value="other">自行輸入...</option></select>
            {!['大頭', '半身', '全身'].includes(draft.draw_scope) && <input disabled={!isArtist || inquiry.status !== 'submitted'} className="draft-input" placeholder="請輸入範圍" value={draft.draw_scope} onChange={(e) => setDraft({...draft, draw_scope: e.target.value})} />}</div>
            <div><label style={{ fontSize: '12px', fontWeight: 'bold', color: '#5D4A3E', display: 'block', marginBottom: '6px' }}>背景類型</label><select disabled={!isArtist || inquiry.status !== 'submitted'} className="draft-input" style={{ marginBottom: '8px' }} value={['無背景', '簡單/色塊', '複雜背景'].includes(draft.bg_type) ? draft.bg_type : 'other'} onChange={(e) => setDraft({...draft, bg_type: e.target.value === 'other' ? '' : e.target.value})}><option value="無背景">無背景</option><option value="簡單/色塊">簡單/色塊</option><option value="複雜背景">複雜背景</option><option value="other">自行輸入...</option></select>
            {!['無背景', '簡單/色塊', '複雜背景'].includes(draft.bg_type) && <input disabled={!isArtist || inquiry.status !== 'submitted'} className="draft-input" placeholder="請輸入背景需求" value={draft.bg_type} onChange={(e) => setDraft({...draft, bg_type: e.target.value})} />}</div>
            <div><label style={{ fontSize: '12px', fontWeight: 'bold', color: '#5D4A3E', display: 'block', marginBottom: '6px' }}>委託用途</label><input disabled={!isArtist || inquiry.status !== 'submitted'} className="draft-input" value={draft.usage_type} onChange={(e) => setDraft({...draft, usage_type: e.target.value})} /></div>
            <div><label style={{ fontSize: '12px', fontWeight: 'bold', color: '#5D4A3E', display: 'block', marginBottom: '6px' }}>快速標籤 / 加選項目</label><textarea disabled={!isArtist || inquiry.status !== 'submitted'} className="draft-input" rows={3} style={{ resize: 'none' }} value={draft.add_ons} onChange={(e) => setDraft({...draft, add_ons: e.target.value})} /></div>
          </div>
        </div>

        <div style={{ padding: '20px', backgroundColor: '#FFFFFF', borderTop: '1px solid #EAE6E1', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {isArtist && inquiry.status === 'submitted' && (
            <><button onClick={handleSaveDraft} style={{ width: '100%', padding: '12px', borderRadius: '8px', background: '#FBFBF9', color: '#5D4A3E', border: '1px solid #DED9D3', fontWeight: 'bold', cursor: 'pointer' }}>💾 儲存協議草稿</button>
            <button onClick={handlePropose} style={{ width: '100%', padding: '12px', borderRadius: '8px', background: '#5D4A3E', color: '#FFFFFF', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>🚀 送出正式提案</button></>
          )}
          {!isArtist && inquiry.status === 'proposed' && (
            <button onClick={() => setShowFinalModal(true)} style={{ width: '100%', padding: '16px', borderRadius: '8px', background: '#4E7A5A', color: '#FFFFFF', border: 'none', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer' }}>✅ 同意並正式建立委託單</button>
          )}
          {inquiry.status === 'proposed' && isArtist && (
            <div style={{ textAlign: 'center', color: '#A67B3E', fontSize: '13px', fontWeight: 'bold', backgroundColor: '#FDF4E6', padding: '12px', borderRadius: '8px', border: '1px solid #FDE0B5' }}>⏳ 已送出提案，等待案主確認中...</div>
          )}
        </div>
      </aside>

      {/* 🌟 最終合約確認彈窗 (案主專用) */}
      {showFinalModal && (
        <div className="modal-overlay">
          <div className="modal-content-paper" style={{ maxWidth: '650px', padding: '0', display: 'flex', flexDirection: 'column', height: '90vh' }}>
            <div className="paper-deco"></div>
            
            <div className="custom-scrollbar" style={{ padding: '30px 40px', overflowY: 'auto', flex: 1 }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#5D4A3E', marginBottom: '20px', textAlign: 'center' }}>📄 最終委託合約確認</h2>
              
              <div style={{ background: '#FBFBF9', border: '1px solid #EAE6E1', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
                <h4 style={{ color: '#A67B3E', borderBottom: '1px solid #FDE0B5', paddingBottom: '8px', marginBottom: '12px', fontWeight: 'bold', margin: '0 0 12px 0' }}>本次委託規格摘要</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '14px', color: '#5D4A3E' }}>
                  <p style={{ margin: 0 }}><strong>項目名稱：</strong> {draft.project_name}</p>
                  <p style={{ margin: 0 }}><strong>最終金額：</strong> NT$ {draft.total_price}</p>
                  <p style={{ margin: 0 }}><strong>繪製範圍：</strong> {draft.draw_scope}</p>
                  <p style={{ margin: 0 }}><strong>人物數量：</strong> {draft.char_count} 人</p>
                  <p style={{ margin: 0 }}><strong>背景類型：</strong> {draft.bg_type}</p>
                  <p style={{ margin: 0 }}><strong>急件需求：</strong> {draft.is_rush}</p>
                </div>
              </div>

              <div style={{ border: '1px solid #EAE6E1', borderRadius: '12px', padding: '20px', backgroundColor: '#FFFFFF' }}>
                <h4 style={{ color: '#5D4A3E', marginBottom: '12px', fontWeight: 'bold', margin: '0 0 12px 0' }}>繪師專屬協議條款 (TOS)</h4>
                <div 
                  style={{ fontSize: '13px', color: '#7A7269', lineHeight: '1.7', whiteSpace: 'pre-wrap' }}
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(artistTos) }}
                />
              </div>
            </div>

            <div style={{ padding: '20px 40px', borderTop: '1px solid #EAE6E1', backgroundColor: '#FDFDFB' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginBottom: '20px' }}>
                <input type="checkbox" checked={agreedToTerms} onChange={(e) => setAgreedToTerms(e.target.checked)} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                <span style={{ fontSize: '14px', color: '#5D4A3E', fontWeight: 'bold' }}>我已詳細閱讀並同意以上委託規格與繪師協議。</span>
              </label>
              
              <div style={{ display: 'flex', gap: '15px' }}>
                <button className="btn-paper-cancel" onClick={() => setShowFinalModal(false)} style={{ flex: 1 }}>再考慮一下</button>
                <button 
                  className="btn-paper-submit" 
                  disabled={!agreedToTerms} 
                  onClick={handleFinalize}
                  style={{ flex: 2, opacity: agreedToTerms ? 1 : 0.5, cursor: agreedToTerms ? 'pointer' : 'not-allowed' }}
                >
                  正式簽署並建立委託 ➔
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div> 
  );
};