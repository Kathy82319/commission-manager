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

  const [order, setOrder] = useState<OrderData | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [focusedField, setFocusedField] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesLengthRef = useRef<number>(0); // 🌟 用來追蹤訊息數量，判斷是否來了新訊息

  // 🌟 新增：更新目前角色的已讀時間
  const updateReadTime = async () => {
    if (!id) return;
    const field = role === 'artist' ? 'last_read_at_artist' : 'last_read_at_client';
    try {
      await fetch(`/api/commissions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: new Date().toISOString() })
      });
    } catch (error) {
      console.error("更新已讀時間失敗", error);
    }
  };

  const fetchOrderData = async () => {
    try {
      const res = await fetch(`/api/commissions/${id}`);
      const data = await res.json();
      if (data.success) setOrder(data.data);
    } catch (error) {
      console.error("無法讀取訂單", error);
    }
  };

  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/commissions/${id}/messages`);
      const data = await res.json();
      if (data.success) {
        // 🌟 如果偵測到新訊息，就觸發已讀更新
        if (data.data.length > messagesLengthRef.current) {
          updateReadTime();
          messagesLengthRef.current = data.data.length;
        }
        setMessages(data.data);
      }
    } catch (error) {
      console.error("無法讀取訊息", error);
    }
  };

  useEffect(() => {
    const initData = async () => {
      await fetchOrderData();
      await fetchMessages();
      await updateReadTime(); // 🌟 第一次進入頁面時強制更新已讀
      setLoading(false);
    };
    initData();

    // 每 3 秒拉取一次最新訊息
    const intervalId = setInterval(() => {
      fetchMessages();
    }, 3000);

    return () => clearInterval(intervalId);
  }, [id, role]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    try {
      const res = await fetch(`/api/commissions/${id}/messages`, {
        method: 'POST',
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

// --- 載入中狀態 ---
if (loading) return (
  <div style={{ 
    height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', 
    backgroundColor: '#FBFBF9', 
    color: '#5D4A3E', fontSize: '15px' 
  }}>
    載入工作區中...
  </div>
);

// --- 錯誤狀態 ---
if (!order) return (
  <div style={{ 
    height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', 
    backgroundColor: '#FBFBF9', 
    color: '#A05C5C', fontSize: '15px' 
  }}>
    找不到此委託空間，或發生異常。
  </div>
);

// --- 正常渲染狀態 ---
return (
  <div style={{ 
    height: '100vh', display: 'flex', justifyContent: 'center', 
    backgroundColor: '#FBFBF9', 
    fontFamily: 'sans-serif' 
  }}>
    <div style={{ 
      width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', 
      backgroundColor: '#FBFBF9', 
      boxShadow: 'none', 
      position: 'relative' 
    }}>
        <header style={{ backgroundColor: '#FFFFFF', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #EAE6E1', zIndex: 10, position: 'sticky', top: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button 
              onClick={() => navigate(-1)} 
              style={{ background: 'none', border: 'none', color: '#A0978D', fontSize: '15px', padding: 0, fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
              ← 返回
            </button>
            <div>
              <h2 style={{ margin: '0 0 4px 0', fontSize: '18px', color: '#5D4A3E' }}>
                {order.client_name || '未命名委託人'} 的工作區
              </h2>
              <div style={{ fontSize: '12px', color: '#A0978D', fontFamily: 'monospace' }}>
                訂單編號：{order.id}
              </div>
            </div>
          </div>
          <div style={{ backgroundColor: role === 'artist' ? '#EAE6E1' : '#EBF2F7', color: role === 'artist' ? '#5D4A3E' : '#4A7294', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>
            {role === 'artist' ? '🎨 繪師' : '👤 委託人'}
          </div>
        </header>

        <main style={{ flex: 1, overflowY: 'auto', padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '20px', backgroundColor: '#FBFBF9' }}>
          <div style={{ textAlign: 'center', margin: '10px 0 20px 0' }}>
            <span style={{ backgroundColor: '#EAE6E1', color: '#7A7269', padding: '6px 16px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold' }}>
              雙方已確認委託，專屬工作區已建立
            </span>
          </div>
          
          {messages.map(msg => {
            const isMe = msg.sender_role === role;
            
            return (
              <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', animation: 'fadeIn 0.3s ease' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexDirection: isMe ? 'row-reverse' : 'row' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: msg.sender_role === 'artist' ? '#EAE6E1' : '#EBF2F7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: msg.sender_role === 'artist' ? '#5D4A3E' : '#4A7294', fontWeight: 'bold' }}>
                    {msg.sender_role === 'artist' ? '繪' : '客'}
                  </div>
                  <span style={{ fontSize: '12px', color: '#A0978D', fontWeight: 'bold' }}>
                    {msg.sender_role === 'artist' ? '繪師' : '委託人'}
                  </span>
                  <span style={{ fontSize: '10px', color: '#C4BDB5' }}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div style={{ 
                  maxWidth: '75%', padding: '12px 16px', lineHeight: '1.6', fontSize: '15px',
                  backgroundColor: isMe ? '#5D4A3E' : '#FFFFFF',
                  color: isMe ? '#FFFFFF' : '#4A4A4A',
                  borderRadius: isMe ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                  wordBreak: 'break-word', whiteSpace: 'pre-wrap',
                  border: isMe ? 'none' : '1px solid #EAE6E1'
                }}>
                  {msg.content}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} style={{ height: '10px' }} /> 
        </main>

        <footer style={{ backgroundColor: '#FFFFFF', padding: '16px 20px', borderTop: '1px solid #EAE6E1', display: 'flex', gap: '12px', alignItems: 'flex-end', position: 'sticky', bottom: 0 }}>
          <textarea 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onFocus={() => setFocusedField(true)}
            onBlur={() => setFocusedField(false)}
            placeholder="請輸入訊息..."
            style={{ 
              flex: 1, padding: '12px 16px', borderRadius: '12px', resize: 'none', 
              minHeight: '24px', maxHeight: '120px', fontFamily: 'inherit', fontSize: '15px',
              border: focusedField ? '2px solid #5D4A3E' : '1px solid #DED9D3',
              backgroundColor: '#FBFBF9', color: '#5D4A3E', outline: 'none',
              transition: 'border-color 0.2s ease', lineHeight: '1.5'
            }}
            onKeyDown={(e) => { 
              if (e.key === 'Enter' && !e.shiftKey) { 
                e.preventDefault(); 
                handleSendMessage(); 
              } 
            }}
          />
          <button 
            onClick={handleSendMessage}
            disabled={!inputText.trim()}
            style={{ 
              padding: '14px 24px', backgroundColor: inputText.trim() ? '#5D4A3E' : '#DED9D3', 
              color: '#FFFFFF', border: 'none', borderRadius: '12px', fontWeight: 'bold', 
              cursor: inputText.trim() ? 'pointer' : 'not-allowed', transition: 'all 0.2s',
              boxShadow: inputText.trim() ? '0 4px 12px rgba(93,74,62,0.2)' : 'none',
              height: '48px', display: 'flex', alignItems: 'center'
            }}
          >
            傳送
          </button>
        </footer>
      </div>
    </div>
  );
}