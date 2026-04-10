import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';


export function ClientForm() {
  const { id } = useParams();
  const [orderData, setOrderData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAgreed, setIsAgreed] = useState(false); // 控制是否已送出
  const navigate = useNavigate();

  // 1. 網頁載入時，去跟後端要這筆訂單的資料
  useEffect(() => {
    fetch(`/api/commissions/${id}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setOrderData(data.data);
          // 如果狀態已經不是剛建立的報價單，代表已經確認過了
          if (data.data.status !== 'quote_created') {
            setIsAgreed(true);
          }
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  // 2. 委託人按下同意按鈕
  const handleAgree = async () => {
    try {
      // 呼叫我們之前寫好的 PATCH API，把狀態推進到「待匯款」
      const res = await fetch(`/api/commissions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'unpaid' }) 
      });
      const data = await res.json();
      
      if (data.success) {
        setIsAgreed(true);
        alert('✅ 委託成立！請截圖此畫面並依約定方式匯款。');
      } else {
        alert('發生錯誤：' + data.error);
      }
    } catch (error) {
      alert('連線失敗');
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '50px' }}>載入委託資料中...</div>;
  if (!orderData) return <div style={{ textAlign: 'center', padding: '50px', color: 'red' }}>❌ 找不到這筆委託單，或連結已失效。</div>;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f0f2f5', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
      <div style={{ backgroundColor: '#fff', padding: '40px', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', maxWidth: '600px', width: '100%' }}>
        
        <h2 style={{ textAlign: 'center', color: '#333', marginBottom: '10px' }}>委託確認與協議書</h2>
        <p style={{ textAlign: 'center', color: '#888', fontSize: '14px', marginBottom: '30px', fontFamily: 'monospace' }}>單號：{id}</p>

        {/* 動態顯示真實的金額與備註 */}
        <div style={{ padding: '20px', backgroundColor: '#f8f9fa', borderLeft: '4px solid #1976d2', borderRadius: '4px', marginBottom: '30px' }}>
          <h3 style={{ marginTop: 0, fontSize: '16px' }}>委託內容摘要</h3>
          <p style={{ margin: '5px 0' }}><strong>總金額：</strong> <span style={{ color: '#d32f2f', fontWeight: 'bold' }}>NT$ {orderData.total_price}</span></p>
          <p style={{ margin: '5px 0', fontSize: '14px', color: '#555' }}>
            <strong>規格紀要：</strong> {orderData.artist_note}
          </p>
        </div>

        <div style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '8px', height: '150px', overflowY: 'scroll', marginBottom: '20px' }}>
          <h4 style={{ margin: '0 0 10px 0' }}>委託協議書 (TOS)</h4>
          <p style={{ fontSize: '14px', color: '#555', lineHeight: '1.6' }}>
            1. 本委託為客製化商品，不適用七天鑑賞期。<br/>
            2. 繪師保有展示作品作為作品集之權利。<br/>
            3. 完稿後若非繪師方失誤，僅提供兩次微調修改。<br/>
            (此處未來會強制客人滑到底部才能勾選同意)
          </p>
        </div>

        {/* 根據狀態改變按鈕 */}
        {!isAgreed ? (
          <button 
            onClick={handleAgree}
            style={{ width: '100%', padding: '15px', backgroundColor: '#1976d2', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            ☑ 我已詳細閱讀，並同意委託協議 (確認送出)
          </button>
        ) : (
          <div style={{ textAlign: 'center', padding: '15px', backgroundColor: '#e8f5e9', color: '#2e7d32', borderRadius: '8px', fontWeight: 'bold' }}>
            🎉 您已成功同意此委託！狀態已更新為「待匯款」。
          </div>
        )}
        {/* 新增進入工作區的按鈕 */}
            <button 
              onClick={() => navigate(`/workspace/${id}?role=client`)}
              style={{ padding: '12px 25px', backgroundColor: '#333', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              進入專屬工作區 / 聊天室 ➔
            </button>
      </div>
    </div>
  );
}