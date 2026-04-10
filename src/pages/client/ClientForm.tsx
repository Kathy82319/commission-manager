import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

interface Commission {
  id: string;
  project_name: string;
  client_name: string;
  total_price: number;
  status: string;
  payment_status: string;
  usage_type: string;
  is_rush: string;
  delivery_method: string;
  payment_method: string;
  draw_scope: string;
  char_count: number;
  bg_type: string;
  add_ons: string;
}

export function ClientForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [order, setOrder] = useState<Commission | null>(null);
  const [isAgreed, setIsAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await fetch(`/api/commissions/${id}`);
        const data = await res.json();
        if (data.success) {
          setOrder(data.data);
        } else {
          setErrorMsg('找不到這筆委託單，或連結已失效。');
        }
      } catch (err) {
        setErrorMsg('系統連線異常，請稍後再試。');
      }
    };
    if (id) fetchOrder();
  }, [id]);

  const handleSubmit = async () => {
    if (!isAgreed) return alert('請先勾選同意委託協議書。');
    setIsSubmitting(true);
    
    try {
      // 客人同意後，狀態變更為待匯款 (unpaid)
      const res = await fetch(`/api/commissions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'unpaid' })
      });
      const data = await res.json();
      
      if (data.success) {
        // 重新讀取訂單狀態以更新畫面
        const updatedRes = await fetch(`/api/commissions/${id}`);
        const updatedData = await updatedRes.json();
        if (updatedData.success) setOrder(updatedData.data);
      } else {
        alert('送出失敗：' + data.error);
      }
    } catch (err) {
      alert('連線異常。');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (errorMsg) return <div style={centerStyle}>{errorMsg}</div>;
  if (!order) return <div style={centerStyle}>載入委託單資料中...</div>;

  // 判斷是否已經同意過 (只要狀態不是 quote_created 或是已經有付款狀態)
  const hasAlreadyAgreed = order.status !== 'quote_created';

  return (
    <div style={{ backgroundColor: '#f0f2f5', minHeight: '100vh', padding: '20px 10px', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* 標題區塊 */}
        <div style={{ backgroundColor: '#fff', padding: '25px 20px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <h1 style={{ margin: '0 0 10px 0', fontSize: '22px', color: '#333' }}>委託確認與協議書</h1>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1976d2', marginBottom: '5px' }}>
            {order.project_name || '未命名委託項目'}
          </div>
          <div style={{ color: '#888', fontSize: '13px' }}>單號：{order.id.split('-')[0]}</div>
        </div>

        {/* 委託規格明細 */}
        <div style={{ backgroundColor: '#fff', padding: '25px 20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <h2 style={{ margin: '0 0 15px 0', fontSize: '18px', borderBottom: '2px solid #f0f0f0', paddingBottom: '10px' }}>委託內容明細</h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', fontSize: '14px', lineHeight: '1.5' }}>
            <div style={detailItemStyle}>
              <span style={detailLabelStyle}>委託用途</span>
              <span style={detailValueStyle}>{order.usage_type || '未填寫'}</span>
            </div>
            <div style={detailItemStyle}>
              <span style={detailLabelStyle}>是否急件</span>
              <span style={detailValueStyle}>{order.is_rush || '否'}</span>
            </div>
            <div style={detailItemStyle}>
              <span style={detailLabelStyle}>交稿方式</span>
              <span style={detailValueStyle}>{order.delivery_method || '未填寫'}</span>
            </div>
            <div style={detailItemStyle}>
              <span style={detailLabelStyle}>交易方式</span>
              <span style={detailValueStyle}>{order.payment_method || '未填寫'}</span>
            </div>
            <div style={detailItemStyle}>
              <span style={detailLabelStyle}>繪畫範圍</span>
              <span style={detailValueStyle}>{order.draw_scope || '未填寫'}</span>
            </div>
            <div style={detailItemStyle}>
              <span style={detailLabelStyle}>人物數量</span>
              <span style={detailValueStyle}>{order.char_count || 1} 人</span>
            </div>
            <div style={detailItemStyle}>
              <span style={detailLabelStyle}>背景設定</span>
              <span style={detailValueStyle}>{order.bg_type || '未填寫'}</span>
            </div>
            <div style={detailItemStyle}>
              <span style={detailLabelStyle}>總金額</span>
              <span style={{ ...detailValueStyle, color: '#d32f2f', fontWeight: 'bold' }}>NT$ {order.total_price}</span>
            </div>
          </div>

          <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #f0f0f0' }}>
            <span style={detailLabelStyle}>附加選項</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
              {order.add_ons ? order.add_ons.split(',').map((addon, index) => (
                <span key={index} style={{ backgroundColor: '#e3f2fd', color: '#1976d2', padding: '4px 10px', borderRadius: '15px', fontSize: '13px' }}>
                  {addon.trim()}
                </span>
              )) : <span style={{ color: '#999', fontSize: '13px' }}>無附加選項</span>}
            </div>
          </div>
        </div>

        {/* 委託協議書 */}
        <div style={{ backgroundColor: '#fff', padding: '25px 20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <h2 style={{ margin: '0 0 15px 0', fontSize: '18px', borderBottom: '2px solid #f0f0f0', paddingBottom: '10px' }}>委託協議書</h2>
          <div style={{ backgroundColor: '#f9f9f9', padding: '15px', borderRadius: '8px', fontSize: '13px', color: '#555', lineHeight: '1.8', height: '150px', overflowY: 'auto', border: '1px solid #eee' }}>
            1. 本委託為客製化商品，確認送出後即代表雙方成立合作關係，不適用七天鑑賞期。<br/>
            2. 繪師保有展示作品作為作品集之權利，若需買斷或延遲公開請於事前提出。<br/>
            3. 完稿後若非繪師方失誤，僅提供協議內約定之微調修改次數。<br/>
            4. 若有延遲交稿情形，繪師將主動告知並依雙方協議處理。<br/>
            5. 確認委託後，請依約定時間內完成款項支付，逾期視同放棄委託。<br/>
            6. 草稿階段退件重畫以三次為限，超出次數需視情況增加費用。<br/>
          </div>

          {!hasAlreadyAgreed ? (
            <div style={{ marginTop: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '15px', fontWeight: 'bold', color: '#333', padding: '10px', backgroundColor: isAgreed ? '#e8f5e9' : '#fff', border: isAgreed ? '1px solid #4caf50' : '1px solid #ccc', borderRadius: '6px' }}>
                <input 
                  type="checkbox" 
                  checked={isAgreed} 
                  onChange={(e) => setIsAgreed(e.target.checked)}
                  style={{ width: '18px', height: '18px' }}
                />
                我已詳細閱讀上方明細，並同意委託協議。
              </label>
              
              <button 
                onClick={handleSubmit} 
                disabled={!isAgreed || isSubmitting}
                style={{ width: '100%', padding: '15px', marginTop: '15px', backgroundColor: isAgreed ? '#1976d2' : '#ccc', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: isAgreed ? 'pointer' : 'not-allowed' }}
              >
                {isSubmitting ? '處理中...' : '確認無誤，送出委託單'}
              </button>
            </div>
          ) : (
            <div style={{ marginTop: '20px', textAlign: 'center' }}>
              <div style={{ padding: '15px', backgroundColor: '#e8f5e9', color: '#2e7d32', borderRadius: '8px', fontWeight: 'bold', marginBottom: '15px', border: '1px solid #c8e6c9' }}>
                您已成功同意此委託！狀態已更新。
              </div>
              <button 
                onClick={() => navigate(`/client/order/${order.id}`)}
                style={{ width: '100%', padding: '15px', backgroundColor: '#333', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                進入委託單管理與工作區
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

const centerStyle = { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#666' };
const detailItemStyle = { display: 'flex', flexDirection: 'column' as const };
const detailLabelStyle = { color: '#888', fontSize: '12px', marginBottom: '4px' };
const detailValueStyle = { color: '#333', fontWeight: 'bold', fontSize: '15px' };