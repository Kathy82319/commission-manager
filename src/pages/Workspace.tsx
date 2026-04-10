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
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. 讀取訂單基本資料 (只需讀取一次)
  const fetchOrderData = async () => {
    try {
      const res = await fetch(`/api/commissions/${id}`);
      const data = await res.json();
      if (data.success) setOrder(data.data);
    } catch (error) {
      console.error("無法讀取訂單", error);
    }
  };

  // 2. 獨立的「讀取訊息」函數 (用來每 3 秒自動執行)
  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/commissions/${id}/messages`);
      const data = await res.json();
      if (data.success) setMessages(data.data);
    } catch (error) {
      console.error("無法讀取訊息", error);
    }
  };

  // 初始載入與設定自動輪詢 (Polling)
  useEffect(() => {
    const initData = async () => {
      await fetchOrderData();
      await fetchMessages();
      setLoading(false);
    };
    initData();

    // 🌟 核心升級：每 3 秒自動去後台抓最新訊息
    const intervalId = setInterval(() => {
      fetchMessages();
    }, 3000);

    // 離開這個頁面時，關閉計時器
    return () => clearInterval(intervalId);
  }, [id]);

  // 當訊息有更新時，畫面自動往下滾
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
        fetchMessages(); // 自己發完馬上更新畫面
      } else {
        alert("發送失敗：" + data.error);
      }
    } catch (error) {
      alert('發送失敗，網路連線異常');
    }
  };

  if (loading) return <div style={{ padding: '50px', textAlign: 'center' }}>載入工作區中...</div>;
  if (!order) return <div style={{ padding: '50px', textAlign: 'center', color: 'red' }}>找不到此委託空間</div>;

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f0f2f5' }}>
      
      <header style={{ backgroundColor: '#fff', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button onClick={() => navigate(-1)} style={{ padding: '6px 12px', cursor: 'pointer', borderRadius: '4px', border: '1px solid #ddd' }}>
            ← 返回
          </button>
          <div>
            <h2 style={{ margin: '0 0 5px 0', fontSize: '18px' }}>
              專屬工作區：{order.client_name || '委託人'}
            </h2>
            <div style={{ fontSize: '13px', color: '#666' }}>
              單號：{id?.split('-')[0]}... | 狀態：<span style={{ color: '#1976d2', fontWeight: 'bold' }}>{order.status}</span>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: role === 'artist' ? '#333' : '#1976d2', color: '#fff', padding: '4px 10px', borderRadius: '4px', fontSize: '12px' }}>
          目前身分：{role === 'artist' ? '🎨 繪師' : '👤 委託人'}
        </div>
      </header>

      <main style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div style={{ textAlign: 'center', color: '#888', fontSize: '12px', marginBottom: '20px' }}>
          -- 雙方已確認委託，專屬工作區已建立 --
        </div>
        
        {messages.map(msg => {
          const isMe = msg.sender_role === role;
          return (
            <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
              <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>
                {msg.sender_role === 'artist' ? '🎨 繪師' : '👤 委託人'}
              </div>
              <div style={{ 
                maxWidth: '70%', padding: '12px 16px', borderRadius: '12px', lineHeight: '1.5',
                backgroundColor: isMe ? '#dcf8c6' : '#fff',
                boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                wordBreak: 'break-word'
              }}>
                {msg.content}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} /> 
      </main>

      <footer style={{ backgroundColor: '#fff', padding: '15px', borderTop: '1px solid #ddd', display: 'flex', gap: '10px' }}>
        <textarea 
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="輸入訊息..."
          style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #ccc', resize: 'none', height: '50px', fontFamily: 'inherit' }}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
        />
        <button 
          onClick={handleSendMessage}
          style={{ padding: '0 25px', backgroundColor: '#1976d2', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
        >
          發送
        </button>
      </footer>
    </div>
  );
}