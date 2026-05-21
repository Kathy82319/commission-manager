// src/pages/Workspace.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { BookUser, Maximize2, X, Image as ImageIcon } from 'lucide-react';
import { OCDetailCard } from '../components/OC/OCDetailCard';

const R2_PUBLIC_URL = "https://pub-1d4bcc7f19324c0d95d7bfdfeb1a69e2.r2.dev";

interface Message {
  id: string;
  sender_role: string;
  content: string;
  created_at: string;
  is_history?: boolean; 
  message_type?: string;
}

interface OrderData {
  id: string;
  client_name: string;
  status: string;
  total_price: number;
  origin_source?: string;
}

const unescapeHtml = (str: any) => {
  if (typeof str !== 'string') return str;
  if (!str) return '';
  return str.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#039;/g, "'");
};

const safeParse = (data: any) => {
  if (typeof data !== 'string') return data;
  try {
    const unescaped = unescapeHtml(data);
    if (unescaped.trim().startsWith('{') || unescaped.trim().startsWith('[')) {
      return JSON.parse(unescaped);
    }
    return unescaped;
  } catch (e) {
    return data;
  }
};

export function Workspace() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const role = searchParams.get('role') || 'client'; 
  const navigate = useNavigate();
  const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || '';
  
  const [order, setOrder] = useState<OrderData | null>(null);
  
  const [historyMessages, setHistoryMessages] = useState<Message[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [focusedField, setFocusedField] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // OC 相關 State
  const [showOCSelection, setShowOCSelection] = useState(false);
  const [myOCs, setMyOCs] = useState<any[]>([]);
  const [isLoadingOCs, setIsLoadingOCs] = useState(false);
  const [viewingOCSnapshot, setViewingOCSnapshot] = useState<any | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesLengthRef = useRef<number>(0); 

  const formatLocalTime = (dateStr: string) => {
    if (!dateStr) return '';
    const utcStr = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T') + 'Z';
    return new Date(utcStr).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const getOriginData = (currentOrder: OrderData | null) => {
    if (!currentOrder || !currentOrder.origin_source) return null;
    try {
      const parsed = safeParse(currentOrder.origin_source);
      if (!parsed) return null;

      if (parsed.source_type === 'showcase_form') {
        return {
          type: 'showcase_form',
          inquiry_id: parsed.inquiry_id,
          ...parsed
        };
      }

      if (parsed.source_type === 'bulletin') {
        const isOffer = parsed.bulletin_category === 'offer';
        const bulletinContent = safeParse(parsed.bulletin_content);
        
        let rawSnapshot = parsed.artist_initial_snapshot || parsed.artist_snapshot;
        if (!rawSnapshot || (typeof rawSnapshot === 'object' && Object.keys(rawSnapshot).length === 0)) {
          rawSnapshot = parsed.client_initial_response || '{}';
        }
        
        let parsedSnapshot = safeParse(rawSnapshot);
        if (typeof parsedSnapshot === 'string') parsedSnapshot = safeParse(parsedSnapshot);
        if (typeof parsedSnapshot !== 'object' || parsedSnapshot === null) parsedSnapshot = { message: parsedSnapshot };
        if (parsedSnapshot.answers && typeof parsedSnapshot.answers === 'string') parsedSnapshot.answers = safeParse(parsedSnapshot.answers);

        let questions = [];
        if (bulletinContent && bulletinContent.questions) questions = bulletinContent.questions;
        else if (parsed.questions) questions = safeParse(parsed.questions);

        return {
          type: 'bulletin',
          inquiry_id: parsed.inquiry_id,
          description: bulletinContent?.description || parsed.description || parsed.bulletin_content || '',
          questions: Array.isArray(questions) ? questions : [],
          isOffer,
          parsedSnapshot,
          ...parsed
        };
      }
    } catch (e) {
      console.error("來源解析失敗", e);
    }
    return null;
  };

  const updateReadTime = async () => {
    if (!id) return;
    const field = role === 'artist' ? 'last_read_at_artist' : 'last_read_at_client';
    try {
      await fetch(`${API_BASE}/api/commissions/${id}`, {
        method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: new Date().toISOString() })
      });
    } catch (error) {}
  };

  const fetchOrderData = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/commissions/${id}`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setOrder(data.data);
        
        const originData = getOriginData(data.data);
        if (originData && originData.inquiry_id) {
            fetchHistoryMessages(originData.inquiry_id);
        }
      }
    } catch (error) { console.error("無法讀取訂單", error); }
  };

  const fetchHistoryMessages = async (inquiryId: string) => {
    try {
        const apiPrefix = inquiryId.startsWith('di-') ? 'direct-inquiries' : 'inquiries';
        const res = await fetch(`${API_BASE}/api/${apiPrefix}/${inquiryId}/messages`, { credentials: 'include' });
        
        const data = await res.json();
        if (data.success) {
            const historyMsgs = data.data.map((msg: any) => ({
                ...msg,
                is_history: true
            }));
            
            const userRes = await fetch(`${API_BASE}/api/users/me`, { credentials: 'include' });
            const userData = await userRes.json();
            const myUserId = userData.data.id;
            
            const processedHistory = historyMsgs.map((msg: any) => {
                const senderRole = msg.sender_id === myUserId ? role : (role === 'artist' ? 'client' : 'artist');
                return { ...msg, sender_role: senderRole };
            });

            setHistoryMessages(processedHistory);
        }
    } catch (e) {
        console.error("無法讀取歷史訊息", e);
    }
  }

  const fetchMessages = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/commissions/${id}/messages`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setMessages(prev => {
           if (prev.length !== data.data.length) {
               if (data.data.length > messagesLengthRef.current) {
                   updateReadTime();
                   messagesLengthRef.current = data.data.length;
               }
               return data.data;
           }
           return prev;
        });
      }
    } catch (error) {}
  };

  useEffect(() => {
    const initData = async () => {
      await fetchOrderData(); await fetchMessages(); await updateReadTime(); 
      setLoading(false);
    };
    initData();
    const intervalId = setInterval(fetchMessages, 3000);
    return () => clearInterval(intervalId);
  }, [id, role]);

  useEffect(() => {
    if (!loading && (messages.length > 0 || historyMessages.length > 0)) {
      const timer = setTimeout(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, 150); 
      return () => clearTimeout(timer);
    }
  }, [messages, historyMessages, loading]);

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/api/commissions/${id}/messages`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender_role: role, content: inputText })
      });
      const data = await res.json();
      if (data.success) {
        setInputText(''); fetchMessages(); 
      } else alert("發送失敗：" + data.error);
    } catch (error) { alert('發送失敗，網路連線異常'); }
  };

  const handleOpenOCSelection = async () => {
    setShowOCSelection(true);
    setIsLoadingOCs(true);
    try {
      const res = await fetch(`${API_BASE}/api/oc`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setMyOCs(data.data || []);
      }
    } catch (e) {
      console.error("無法讀取角色卡", e);
    } finally {
      setIsLoadingOCs(false);
    }
  };

  const handleSendOC = async (ocId: string) => {
    if (!window.confirm('確定要發送這張角色卡到聊天室嗎？發送後系統將會建立快照，對方會看到卡片當下的設定。')) return;
    setShowOCSelection(false);
    try {
      const res = await fetch(`${API_BASE}/api/commissions/${id}/messages`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sender_role: role, 
          oc_id: ocId, 
          message_type: 'oc_snapshot' 
        })
      });
      const data = await res.json();
      if (data.success) {
        fetchMessages();
      } else {
        alert('發送角色卡失敗：' + data.error);
      }
    } catch (e: any) {
      alert('發送角色卡失敗，網路異常');
    }
  };

  const handleBindOC = async (ocData: any) => {
    if (!window.confirm('確定要將此角色設定卡綁定至委託單中嗎？')) return;
    try {
      const res = await fetch(`${API_BASE}/api/commissions/${id}`, {
        method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oc_snapshot: JSON.stringify(ocData) }) 
      });
      const data = await res.json();
      if (data.success) {
        alert('✅ 已成功綁定角色設定卡！請至「委託單管理」分頁查看。');
      } else {
        alert('綁定失敗：' + data.error);
      }
    } catch (e) {
      alert('綁定失敗，網路異常');
    }
  };

  const silentCompressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_DIMENSION = 1600; 
          let { width, height } = img;
          
          if (width > height && width > MAX_DIMENSION) {
            height = Math.round((height * MAX_DIMENSION) / width);
            width = MAX_DIMENSION;
          } else if (height > MAX_DIMENSION) {
            width = Math.round((width * MAX_DIMENSION) / height);
            height = MAX_DIMENSION;
          }
          
          canvas.width = width; canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob((blob) => {
              if (blob) resolve(blob); else reject(new Error('壓縮失敗'));
            }, 'image/jpeg', 0.82 
          );
        };
        img.onerror = () => reject(new Error('圖片解析失敗'));
        img.src = event.target?.result as string;
      };
      reader.onerror = () => reject(new Error('檔案讀取失敗'));
      reader.readAsDataURL(file);
    });
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('只能上傳圖片喔！');
      return;
    }
    
    setIsUploadingImage(true);
    try {
      const compressedBlob = await silentCompressImage(file);
      
      if (compressedBlob.size > 1.5 * 1024 * 1024) {
        alert('您的圖片尺寸過於龐大或比例極端，為保護空間資源請縮小後再傳！');
        return;
      }

      const ticketRes = await fetch(`${API_BASE}/api/r2/upload-url`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          contentType: 'image/jpeg', bucketType: 'public', 
          originalName: `chat_${Date.now()}.jpg`, folder: 'chat-images' 
        })
      });
      const ticketData = await ticketRes.json();
      if (!ticketData.success) throw new Error(ticketData.error);

      const putRes = await fetch(ticketData.uploadUrl, {
        method: 'PUT', body: compressedBlob, headers: { 'Content-Type': 'image/jpeg' }
      });
      if (!putRes.ok) throw new Error('上傳至雲端失敗');

      await fetch(`${API_BASE}/api/commissions/${id}/messages`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender_role: role, content: `![image](${ticketData.fileName})` })
      });
      fetchMessages(); 

    } catch (err: any) {
      alert('圖片上傳失敗：' + err.message);
    } finally {
      setIsUploadingImage(false);
      if (e.target) e.target.value = ''; 
    }
  };

  const renderMessageContent = (content: string) => {
    const imgRegex = /!\[image\]\((.*?)\)/g;
    const parts = [];
    let lastIndex = 0;
    let match;
    
    while ((match = imgRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push(<span key={lastIndex}>{content.substring(lastIndex, match.index)}</span>);
      }
      const imgUrl = match[1];
      const fullUrl = imgUrl.startsWith('http') ? imgUrl : `${R2_PUBLIC_URL}/${imgUrl}`;
      parts.push(
        <div key={match.index} style={{ margin: '8px 0' }}>
          <img 
            src={fullUrl} alt="chat-upload" 
            style={{ maxWidth: '100%', maxHeight: '250px', borderRadius: '8px', cursor: 'zoom-in', display: 'block', border: '1px solid rgba(0,0,0,0.1)' }} 
            onClick={() => window.open(fullUrl, '_blank')}
          />
        </div>
      );
      lastIndex = imgRegex.lastIndex;
    }
    if (lastIndex < content.length) {
      parts.push(<span key={lastIndex}>{content.substring(lastIndex)}</span>);
    }
    return parts.length > 0 ? parts : content;
  };

  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#FBFBF9', color: '#5D4A3E', fontSize: '15px' }}>
      載入聊天室中...
    </div>
  );

  if (!order) return (
    <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#FBFBF9', color: '#A05C5C', fontSize: '15px' }}>
      找不到此委託空間，或發生異常。
    </div>
  );

  const originData = getOriginData(order);
  const allMessages = [...historyMessages, ...messages];

  return (
    <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', backgroundColor: '#FBFBF9', overflow: 'hidden' }}>
      <style>{`
        @media (max-width: 600px) {
          .chat-main-area { padding: 15px 10px !important; }
          .message-wrapper { max-width: 92% !important; }
          .header-title { font-size: 14px !important; }
        }
        .oc-snapshot-bubble { width: 280px; }
        @media (max-width: 768px) {
          .oc-snapshot-bubble { width: 100% !important; max-width: 100% !important; box-sizing: border-box; }
          .oc-selection-item { flex-direction: column !important; align-items: stretch !important; gap: 12px !important; }
          .oc-selection-item button { width: 100% !important; }
          .oc-selection-info { width: 100% !important; }
          .oc-view-modal-container { padding: 10px !important; align-items: flex-start !important; padding-top: 50px !important; overflow-y: auto; }
          .oc-view-close-btn { 
            top: 10px !important; 
            right: 10px !important; 
            background: rgba(0,0,0,0.7) !important; 
            padding: 8px 16px !important; 
            border-radius: 20px !important; 
            position: fixed !important; 
            z-index: 10005 !important;
          }
        }
      `}</style>

      <div style={{ width: '100%', maxWidth: '800px', display: 'flex', flexDirection: 'column', backgroundColor: '#FFFFFF', position: 'relative' }}>
        <header style={{ backgroundColor: '#FFFFFF', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #EAE6E1', position: 'sticky', top: 0, zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: '#A0978D', fontSize: '18px', cursor: 'pointer', padding: '5px' }}>←返回</button>
            <div>
              <h2 className="header-title" style={{ margin: 0, fontSize: '16px', color: '#5D4A3E' }}>{order.client_name || '未命名委託人'}</h2>
              <div style={{ fontSize: '10px', color: '#A0978D' }}>單號: {order.id}</div>
            </div>
          </div>
          <div style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', backgroundColor: role === 'artist' ? '#EAE6E1' : '#EBF2F7', color: '#5D4A3E' }}>
            {role === 'artist' ? '🎨 繪師' : '👤 委託人'}
          </div>
        </header>

        <main className="chat-main-area" style={{ flex: 1, overflowY: 'auto', padding: '20px 15px', display: 'flex', flexDirection: 'column', gap: '16px', backgroundColor: '#FBFBF9' }}>
          
          {originData && originData.type === 'bulletin' && (
            <div style={{ backgroundColor: '#FDFBFE', border: '1px solid #E9D5FF', borderRadius: '12px', padding: '16px', marginBottom: '10px', fontSize: '13px', color: '#4B5563', lineHeight: '1.6', boxShadow: '0 2px 4px rgba(147, 51, 234, 0.05)', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
              <div style={{ color: '#9333EA', fontWeight: 'bold', borderBottom: '1px solid #F3E8FF', paddingBottom: '8px', marginBottom: '10px', fontSize: '14px' }}>
                🔍 許願池媒合軌跡
              </div>
              
              <div style={{ paddingBottom: '12px', borderBottom: '1px dashed #E9D5FF', marginBottom: '12px' }}>
                <strong style={{ color: '#A67B3E' }}>【{originData.isOffer ? '繪師' : '委託方'}的原始貼文設定】</strong><br/>
                <span style={{ whiteSpace: 'pre-wrap' }}>{originData.description}</span>
                {originData.questions && originData.questions.length > 0 && (
                  <div style={{ marginTop: '6px' }}>
                    <strong style={{ color: '#A0978D' }}>提問設定：</strong>
                    <ol style={{ margin: '4px 0 0 0', paddingLeft: '16px', color: '#7A7269' }}>
                      {originData.questions.map((q: string, idx: number) => <li key={idx}>{q}</li>)}
                    </ol>
                  </div>
                )}
              </div>

              <div>
                <strong style={{ color: '#4A7294' }}>【{originData.isOffer ? '委託方' : '繪師'}的投遞回覆】</strong><br/>
                
                {originData.parsedSnapshot?.answers && originData.parsedSnapshot.answers.length > 0 && (
                  <div style={{ marginTop: '4px', marginBottom: '8px' }}>
                    {originData.parsedSnapshot.answers.map((ans: any, idx: number) => (
                      <div key={idx} style={{ marginTop: '8px' }}>
                        <strong style={{ color: '#A0978D' }}>Q: {ans.question}</strong><br/>
                        <span style={{ whiteSpace: 'pre-wrap' }}>A: {ans.answer || '(未填寫)'}</span>
                      </div>
                    ))}
                  </div>
                )}

                {originData.parsedSnapshot?.message && (
                  <div style={{ marginTop: '8px' }}>
                    <strong style={{ color: '#A0978D' }}>備註留言：</strong><br/>
                    <span style={{ whiteSpace: 'pre-wrap' }}>{originData.parsedSnapshot.message}</span>
                  </div>
                )}

                {!originData.isOffer && (originData.parsedSnapshot?.specialties || originData.parsedSnapshot?.no_gos) && (
                  <div style={{ marginTop: '10px' }}>
                    {originData.parsedSnapshot?.specialties && <div style={{ color: '#ff8c00', marginBottom: '4px' }}>舒適圈：{originData.parsedSnapshot.specialties}</div>}
                    {originData.parsedSnapshot?.no_gos && <div style={{ color: '#e11d48' }}>雷點：{originData.parsedSnapshot.no_gos}</div>}
                  </div>
                )}
              </div>
            </div>
          )}

          {originData && originData.type === 'showcase_form' && (
            <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: '12px', padding: '16px', marginBottom: '10px', fontSize: '13px', color: '#4B5563', lineHeight: '1.6', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
              <div style={{ color: '#4A7294', fontWeight: 'bold', borderBottom: '1px solid #E2E8F0', paddingBottom: '8px', marginBottom: '10px', fontSize: '14px' }}>
                🔍 客製化表單需求
              </div>
              {originData.answers && originData.answers.length > 0 ? originData.answers.map((qa: any, i: number) => (
                <div key={i} style={{ marginTop: '8px' }}>
                  <strong style={{ color: '#A67B3E' }}>Q: {qa.question}</strong><br/>
                  <span style={{ whiteSpace: 'pre-wrap' }}>A: {Array.isArray(qa.answer) ? qa.answer.join(', ') : (qa.answer || '(未填寫)')}</span>
                </div>
              )) : (
                <div style={{ color: '#9CA3AF', fontStyle: 'italic' }}>未填寫客製化問答。</div>
              )}
            </div>
          )}

          {allMessages.map((msg, index) => {
            const isMe = msg.sender_role === role;
            const isFirstNewMessage = !msg.is_history && index > 0 && allMessages[index - 1].is_history;

            if (msg.message_type === 'oc_snapshot') {
              let ocData: any = null;
              try { ocData = JSON.parse(msg.content); } catch (e) {}

              return (
                <React.Fragment key={msg.id || index}>
                  {isFirstNewMessage && (
                    <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0', opacity: 0.7 }}>
                      <div style={{ flex: 1, height: '1px', backgroundColor: '#EAE6E1' }}></div>
                      <span style={{ padding: '0 12px', fontSize: '12px', color: '#A0978D', fontWeight: 'bold' }}>以上為成單前洽談紀錄</span>
                      <div style={{ flex: 1, height: '1px', backgroundColor: '#EAE6E1' }}></div>
                    </div>
                  )}
                  
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', opacity: msg.is_history ? 0.85 : 1 }}>
                    <div style={{ display: 'flex', gap: '6px', marginBottom: '4px', fontSize: '11px', color: '#A0978D', flexDirection: isMe ? 'row-reverse' : 'row' }}>
                      <span>{msg.sender_role === 'artist' ? '繪師' : '委託人'}</span>
                      <span style={{ color: '#C4BDB5' }}>{formatLocalTime(msg.created_at)}</span>
                    </div>
                    <div className="oc-snapshot-bubble" style={{ padding: '16px', backgroundColor: isMe ? '#5D4A3E' : '#FFFFFF', color: isMe ? '#FFFFFF' : '#5D4A3E', borderRadius: isMe ? '16px 4px 16px 16px' : '4px 16px 16px 16px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: isMe ? 'none' : '1px solid #EAE6E1' }}>
                      {ocData ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold', borderBottom: isMe ? '1px solid rgba(255,255,255,0.2)' : '1px solid #EAE6E1', paddingBottom: '8px', fontSize: '13px' }}>
                            <BookUser size={16} /> 角色設定卡快照
                          </div>
                          
                          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <div style={{ width: '48px', height: '48px', borderRadius: '6px', backgroundColor: isMe ? 'rgba(255,255,255,0.1)' : '#F4F0EB', overflow: 'hidden', flexShrink: 0 }}>
                              {ocData.images && ocData.images.length > 0 ? (
                                <img src={ocData.images[0].previewUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ImageIcon size={20} opacity={0.5} /></div>
                              )}
                            </div>
                            <div style={{ overflow: 'hidden' }}>
                              <div style={{ fontWeight: 'bold', fontSize: '16px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ocData.name || '未命名角色'}</div>
                              <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '2px' }}>{ocData.gender} {ocData.body_type}</div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                            <button
                              onClick={() => setViewingOCSnapshot(ocData)}
                              style={{ width: '100%', padding: '8px 0', backgroundColor: isMe ? 'rgba(255,255,255,0.2)' : '#F4F0EB', color: isMe ? '#FFF' : '#5D4A3E', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.2s' }}
                            >
                              <Maximize2 size={14} /> 檢視設定卡內容
                            </button>

                            {role === 'artist' && (
                              <button
                                onClick={() => handleBindOC(ocData)}
                                style={{ width: '100%', padding: '8px 0', backgroundColor: '#8CB369', color: '#FFF', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.2s' }}
                              >
                                📌 綁定至委託單
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span style={{ fontSize: '13px', color: '#A05C5C' }}>[角色設定卡資料損毀或解析失敗]</span>
                      )}
                    </div>
                  </div>
                </React.Fragment>
              );
            }

            return (
              <React.Fragment key={msg.id || index}>
                {isFirstNewMessage && (
                   <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0', opacity: 0.7 }}>
                     <div style={{ flex: 1, height: '1px', backgroundColor: '#EAE6E1' }}></div>
                     <span style={{ padding: '0 12px', fontSize: '12px', color: '#A0978D', fontWeight: 'bold' }}>以上為成單前洽談紀錄</span>
                     <div style={{ flex: 1, height: '1px', backgroundColor: '#EAE6E1' }}></div>
                   </div>
                )}
                
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', opacity: msg.is_history ? 0.85 : 1 }}>
                  <div style={{ display: 'flex', gap: '6px', marginBottom: '4px', fontSize: '11px', color: '#A0978D', flexDirection: isMe ? 'row-reverse' : 'row' }}>
                    <span>{msg.sender_role === 'artist' ? '繪師' : '委託人'}</span>
                    <span style={{ color: '#C4BDB5' }}>{formatLocalTime(msg.created_at)}</span>
                  </div>
                  <div className="message-wrapper" style={{ maxWidth: '85%', padding: '10px 14px', fontSize: '15px', backgroundColor: isMe ? '#5D4A3E' : '#FFFFFF', color: isMe ? '#FFFFFF' : '#4A4A4A', borderRadius: isMe ? '16px 4px 16px 16px' : '4px 16px 16px 16px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', border: isMe ? 'none' : '1px solid #EAE6E1', wordBreak: 'break-word', whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>
                    {renderMessageContent(msg.content)}
                  </div>
                </div>
              </React.Fragment>
            );
          })}
          <div ref={messagesEndRef} />
        </main>

        <footer style={{ backgroundColor: '#FFFFFF', padding: '12px 12px 24px 12px', borderTop: '1px solid #EAE6E1', display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
          {role === 'client' && (
            <button
              onClick={handleOpenOCSelection}
              style={{ padding: '10px', background: '#FDF4E6', border: '1px solid #FDE0B5', borderRadius: '50%', color: '#A67B3E', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '44px', height: '44px', flexShrink: 0, transition: 'all 0.2s' }}
              title="傳送專屬角色設定卡 (OC)"
            >
              <span style={{ fontSize: '20px' }}>📇</span>
            </button>
          )}
          
          <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageSelect} style={{ display: 'none' }} />
          <button 
            onClick={() => fileInputRef.current?.click()} 
            disabled={isUploadingImage}
            style={{ padding: '10px', background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: '50%', color: '#64748B', cursor: isUploadingImage ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '44px', height: '44px', flexShrink: 0, opacity: isUploadingImage ? 0.5 : 1 }}
            title="上傳圖片 (建議 1MB 內)"
          >
            <span style={{ fontSize: '20px' }}>{isUploadingImage ? '⏳' : '🖼️'}</span>
          </button>

          <textarea 
            value={inputText} onChange={(e) => setInputText(e.target.value)} onFocus={() => setFocusedField(true)} onBlur={() => setFocusedField(false)} 
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
            placeholder="請輸入訊息..."
            style={{ flex: 1, padding: '10px 14px', borderRadius: '20px', border: focusedField ? '1.5px solid #5D4A3E' : '1px solid #DED9D3', backgroundColor: '#FBFBF9', fontSize: '15px', minHeight: '40px', maxHeight: '120px', outline: 'none', resize: 'none', lineHeight: '1.4' }}
          />
          <button onClick={handleSendMessage} disabled={!inputText.trim()} style={{ padding: '10px 18px', borderRadius: '20px', backgroundColor: inputText.trim() ? '#5D4A3E' : '#DED9D3', color: '#FFFFFF', border: 'none', fontWeight: 'bold', cursor: 'pointer', marginBottom: '2px' }}>傳送</button>
        </footer>
      </div>

      
{showOCSelection && (
  <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(26, 20, 18, 0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10002, padding: '20px' }}>
    <div style={{ backgroundColor: '#FDFDFB', width: '100%', maxWidth: '500px', borderRadius: '16px', padding: '24px', boxShadow: '0 25px 50px -12px rgba(93, 74, 62, 0.25)', position: 'relative' }}>
      <h3 style={{ marginTop: 0, color: '#5D4A3E', borderBottom: '1px solid #EAE6E1', paddingBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        選擇要發送的角色卡
        <button onClick={() => setShowOCSelection(false)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#A0978D' }}>✕</button>
      </h3>

      <div style={{ maxHeight: '60vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
        {isLoadingOCs ? (
          <div style={{ textAlign: 'center', color: '#A0978D', padding: '20px' }}>讀取您的角色庫中...</div>
        ) : myOCs.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#A0978D', padding: '30px 20px', backgroundColor: '#F4F0EB', borderRadius: '8px' }}>
            您還沒有建立任何專屬角色卡喔！<br/>請先前往「我的角色卡 (OC)」介面建立。
          </div>
        ) : (
          myOCs.map(oc => {
            let imageUrl = null;
            try {
              const images = JSON.parse(oc.images || '[]');
              if (images.length > 0) {
                const rawUrl = images[0].previewUrl || images[0].url || '';
                // 若非完整網址則補上 R2_PUBLIC_URL
                imageUrl = rawUrl.startsWith('http') 
                  ? rawUrl 
                  : `${R2_PUBLIC_URL}/${rawUrl.replace(/^\//, '')}`;
              }
            } catch(e) { console.error("圖片解析失敗", e); }

            return (
              <div key={oc.id} className="oc-selection-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', border: '1px solid #EAE6E1', borderRadius: '8px', backgroundColor: '#FFF' }}>
                <div className="oc-selection-info" style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '6px', backgroundColor: '#F4F0EB', overflow: 'hidden', flexShrink: 0 }}>
                    {imageUrl ? (
                      <img 
                        src={imageUrl} 
                        alt="avatar" 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                        onError={(e) => { e.currentTarget.style.display = 'none'; }} 
                      />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#DED9D3' }}>
                        <ImageIcon size={20} />
                      </div>
                    )}
                  </div>
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ fontWeight: 'bold', color: '#5D4A3E', fontSize: '15px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{oc.name || '未命名角色'}</div>
                    <div style={{ fontSize: '12px', color: '#A0978D', marginTop: '2px' }}>{oc.gender || '無性別'} {oc.body_type || ''}</div>
                  </div>
                </div>
                <button
                  onClick={() => handleSendOC(oc.id)}
                  style={{ padding: '8px 16px', backgroundColor: '#8CB369', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', flexShrink: 0 }}
                >
                  發送快照
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  </div>
)}

      
      {viewingOCSnapshot && (
        <div className="oc-view-modal-container" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.6)', zIndex: 10003, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ width: '100%', maxWidth: '900px', maxHeight: '90vh', backgroundColor: 'transparent', position: 'relative', display: 'flex', flexDirection: 'column' }}>
            <button
              className="oc-view-close-btn"
              onClick={() => setViewingOCSnapshot(null)}
              style={{ position: 'absolute', top: '-40px', right: 0, background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 'bold', zIndex: 10004 }}
            >
              關閉 <X size={20} />
            </button>
            <div style={{ overflowY: 'auto', borderRadius: '12px', backgroundColor: '#FDFDFB' }}>
              <OCDetailCard ocData={viewingOCSnapshot} />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}