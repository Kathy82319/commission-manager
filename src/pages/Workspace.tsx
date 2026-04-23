import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';

interface Message {
  id: string;
  sender_role: string;
  content: string;
  created_at: string;
}

interface OrderData {
  id: string;
  client_name: string;
  status: string;
  total_price: number;
}

export function Workspace() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const role = searchParams.get('role') || 'client'; 
  const navigate = useNavigate();
  const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || '';
  const [order, setOrder] = useState<OrderData | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [focusedField, setFocusedField] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesLengthRef = useRef<number>(0); 

  // 🌟 新增：統一的時間轉換函式，確保將資料庫的 UTC 時間轉為本地時間
  const formatLocalTime = (dateStr: string) => {
    if (!dateStr) return '';
    // 如果字串中沒有 T 或 Z，手動補上以確保瀏覽器將其視為 UTC
    const utcStr = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T') + 'Z';
    return new Date(utcStr).toLocaleTimeString('zh-TW', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false // 使用 24 小時制，若要 12 小時制可改為 true 或移除
    });
  };

  const updateReadTime = async () => {
    if (!id) return;
    const field = role === 'artist' ? 'last_read_at_artist' : 'last_read_at_client';
    try {
      await fetch(`${API_BASE}/api/commissions/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: new Date().toISOString() })
      });
    } catch (error) {
      console.error("更新已讀時間失敗", error);
    }
  };

  const fetchOrderData = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/commissions/${id}`, {
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) setOrder(data.data);
    } catch (error) {
      console.error("無法讀取訂單", error);
    }
  };

  const fetchMessages = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/commissions/${id}/messages`, {
        credentials: 'include'
      });
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
    } catch (error) {
      console.error("無法讀取訊息", error);
    }
  };

  useEffect(() => {
    const initData = async () => {
      await fetchOrderData();
      await fetchMessages();
      await updateReadTime(); 
      setLoading(false);
    };
    initData();

    const intervalId = setInterval(() => {
      fetchMessages();
    }, 3000);

    return () => clearInterval(intervalId);
  }, [id, role]);

  useEffect(() => {
    if (!loading && messages.length > 0) {
      const timer = setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }, 150); 
      return () => clearTimeout(timer);
    }
  }, [messages, loading]);

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    try {
      const res = await fetch(`${API_BASE}/api/commissions/${id}/messages`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender_role: role, content: inputText })
      });
      const data = await res.json();
      
      if (data.success) {
        setInputText('');
        fetchMessages(); 
      } else {
        alert("發送失敗：" + data.error);
      }
    } catch (error) {
      alert('發送失敗，網路連線異常');
    }
  };

  if (loading) return (
    <div style={{ 
      height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', 
      backgroundColor: '#FBFBF9', 
      color: '#5D4A3E', fontSize: '15px' 
    }}>
      載入聊天室中...
    </div>
  );

  if (!order) return (
    <div style={{ 
      height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', 
      backgroundColor: '#FBFBF9', 
      color: '#A05C5C', fontSize: '15px' 
    }}>
      找不到此委託空間，或發生異常。
    </div>
  );

  return (
    <div style={{ 
      height: '100vh', 
      display: 'flex', 
      justifyContent: 'center', 
      backgroundColor: '#FBFBF9',
      overflow: 'hidden' 
    }}>
      <style>{`
        @media (max-width: 600px) {
          .chat-main-area { padding: 15px 10px !important; }
          .message-wrapper { max-width: 92% !important; }
          .header-title { font-size: 14px !important; }
        }
      `}</style>

      <div style={{ 
        width: '100%', 
        maxWidth: '800px',
        display: 'flex', 
        flexDirection: 'column', 
        backgroundColor: '#FFFFFF', 
        position: 'relative' 
      }}>
        <header style={{ 
          backgroundColor: '#FFFFFF', 
          padding: '10px 16px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          borderBottom: '1px solid #EAE6E1', 
          position: 'sticky', 
          top: 0, 
          zIndex: 10 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button 
              onClick={() => navigate(-1)} 
              style={{ background: 'none', border: 'none', color: '#A0978D', fontSize: '18px', cursor: 'pointer', padding: '5px' }}
            >
              ←
            </button>
            <div>
              <h2 className="header-title" style={{ margin: 0, fontSize: '16px', color: '#5D4A3E' }}>
                {order.client_name || '未命名委託人'}
              </h2>
              <div style={{ fontSize: '10px', color: '#A0978D' }}>單號: {order.id}</div>
            </div>
          </div>
          <div style={{ 
            padding: '4px 10px', 
            borderRadius: '12px', 
            fontSize: '11px', 
            fontWeight: 'bold', 
            backgroundColor: role === 'artist' ? '#EAE6E1' : '#EBF2F7',
            color: '#5D4A3E'
          }}>
            {role === 'artist' ? '🎨 繪師' : '👤 委託人'}
          </div>
        </header>

        <main className="chat-main-area" style={{ 
          flex: 1, 
          overflowY: 'auto', 
          padding: '20px 15px', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '16px',
          backgroundColor: '#FBFBF9' 
        }}>
          {messages.map(msg => {
            const isMe = msg.sender_role === role;
            return (
              <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                <div style={{ 
                  display: 'flex', 
                  gap: '6px', 
                  marginBottom: '4px', 
                  fontSize: '11px', 
                  color: '#A0978D', 
                  flexDirection: isMe ? 'row-reverse' : 'row' 
                }}>
                  <span>{msg.sender_role === 'artist' ? '繪師' : '委託人'}</span>
                  {/* 🌟 這裡使用了修正後的本地時間轉換函式 */}
                  <span style={{ color: '#C4BDB5' }}>
                    {formatLocalTime(msg.created_at)}
                  </span>
                </div>
                <div className="message-wrapper" style={{ 
                  maxWidth: '85%', 
                  padding: '10px 14px', 
                  fontSize: '15px',
                  backgroundColor: isMe ? '#5D4A3E' : '#FFFFFF',
                  color: isMe ? '#FFFFFF' : '#4A4A4A',
                  borderRadius: isMe ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                  border: isMe ? 'none' : '1px solid #EAE6E1',
                  wordBreak: 'break-word',
                  whiteSpace: 'pre-wrap',
                  lineHeight: '1.4'
                }}>
                  {msg.content}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </main>

        <footer style={{ 
          backgroundColor: '#FFFFFF', 
          padding: '12px 12px 24px 12px', 
          borderTop: '1px solid #EAE6E1', 
          display: 'flex', 
          gap: '8px', 
          alignItems: 'flex-end' 
        }}>
          <textarea 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onFocus={() => setFocusedField(true)}
            onBlur={() => setFocusedField(false)}
            onKeyDown={(e) => { 
              if (e.key === 'Enter' && !e.shiftKey) { 
                e.preventDefault(); 
                handleSendMessage(); 
              } 
            }}
            placeholder="請輸入訊息..."
            style={{ 
              flex: 1, 
              padding: '10px 14px', 
              borderRadius: '20px', 
              border: focusedField ? '1.5px solid #5D4A3E' : '1px solid #DED9D3',
              backgroundColor: '#FBFBF9', 
              fontSize: '15px', 
              minHeight: '40px', 
              maxHeight: '120px', 
              outline: 'none',
              resize: 'none',
              lineHeight: '1.4'
            }}
          />
          <button 
            onClick={handleSendMessage}
            disabled={!inputText.trim()}
            style={{ 
              padding: '10px 18px', 
              borderRadius: '20px', 
              backgroundColor: inputText.trim() ? '#5D4A3E' : '#DED9D3',
              color: '#FFFFFF',
              border: 'none',
              fontWeight: 'bold',
              cursor: 'pointer',
              marginBottom: '2px'
            }}
          >
            傳送
          </button>
        </footer>
      </div>
    </div>
  );
}