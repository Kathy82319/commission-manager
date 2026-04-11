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
      const res = await fetch(`/api/commissions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'unpaid' })
      });
      const data = await res.json();
      
      if (data.success) {
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

  const hasAlreadyAgreed = order.status !== 'quote_created';

  return (
    <div style={{ backgroundColor: '#778ca4', minHeight: '100vh', padding: '40px 16px', fontFamily: 'sans-serif', display: 'flex', justifyContent: 'center' }}>
      {/* 限制最大寬度為 500px，手機版自然滿版，電腦版則置中呈現卡片狀 */}
      <div style={{ width: '100%', maxWidth: '500px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* 標題區塊 */}
        <div style={{ backgroundColor: '#e8ecf3', padding: '30px 24px', borderRadius: '16px', textAlign: 'center', border: '1px solid #d0d8e4', boxShadow: '0 8px 24px rgba(100,120,140,0.08)' }}>
          <div style={{ width: '48px', height: '48px', backgroundColor: '#d9dfe9', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
            <span style={{ fontSize: '20px' }}>📄</span>
          </div>
          <h1 style={{ margin: '0 0 12px 0', fontSize: '22px', color: '#475569', letterSpacing: '0.5px' }}>委託確認與協議書</h1>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#4A7294', marginBottom: '8px' }}>
            {order.project_name || '未命名委託項目'}
          </div>
          <div style={{ color: '#556577', fontSize: '13px', fontFamily: 'monospace' }}>單號：{order.id.split('-')[0]}</div>
        </div>

        {/* 委託規格明細 */}
        <div style={{ backgroundColor: '#e8ecf3', padding: '24px', borderRadius: '16px', border: '1px solid #d0d8e4', boxShadow: '0 4px 16px rgba(100,120,140,0.06)' }}>
          <h2 style={{ margin: '0 0 20px 0', fontSize: '16px', color: '#475569', borderBottom: '1px solid #d0d8e4', paddingBottom: '12px' }}>委託內容明細</h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', fontSize: '14px', lineHeight: '1.5' }}>
            <div style={detailItemStyle}>
              <span style={detailLabelStyle}>委託用途</span>
              <span style={detailValueStyle}>{order.usage_type || '未填寫'}</span>
            </div>
            <div style={detailItemStyle}>
              <span style={detailLabelStyle}>是否急件</span>
              <span style={{ ...detailValueStyle, color: order.is_rush === '是' ? '#A05C5C' : '#475569' }}>{order.is_rush || '否'}</span>
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
            <div style={{ ...detailItemStyle, gridColumn: '1 / -1' }}>
              <span style={detailLabelStyle}>背景設定</span>
              <span style={detailValueStyle}>{order.bg_type || '未填寫'}</span>
            </div>
          </div>

          {/* 總金額獨立區塊 */}
          <div style={{ marginTop: '20px', padding: '16px', backgroundColor: '#d9dfe9', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px dashed #c5cfd9' }}>
            <span style={{ color: '#556577', fontWeight: 'bold', fontSize: '14px' }}>總金額</span>
            <span style={{ color: '#4E7A5A', fontWeight: '900', fontSize: '20px' }}>NT$ {order.total_price.toLocaleString()}</span>
          </div>

          <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #F0ECE7' }}>
            <span style={detailLabelStyle}>附加選項標籤</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
              {order.add_ons ? order.add_ons.split(',').map((addon, index) => (
                <span key={index} style={{ backgroundColor: '#EBF2F7', color: '#4A7294', padding: '6px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold' }}>
                  {addon.trim()}
                </span>
              )) : <span style={{ color: '#C4BDB5', fontSize: '13px' }}>無附加選項</span>}
            </div>
          </div>
        </div>

        {/* 委託協議書 */}
        <div style={{ backgroundColor: '#e8ecf3', padding: '24px', borderRadius: '16px', border: '1px solid #d0d8e4', boxShadow: '0 4px 16px rgba(100,120,140,0.06)' }}>
          <h2 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#475569', borderBottom: '1px solid #d0d8e4', paddingBottom: '12px' }}>委託協議書</h2>
          <div style={{ backgroundColor: '#d9dfe9', padding: '20px', borderRadius: '12px', fontSize: '14px', color: '#556577', lineHeight: '1.9', height: '180px', overflowY: 'auto', border: '1px solid #c5cfd9' }}>
            1. 本委託為客製化商品，確認送出後即代表雙方成立合作關係，不適用七天鑑賞期。<br/>
            2. 繪師保有展示作品作為作品集之權利，若需買斷或延遲公開請於事前提出。<br/>
            3. 完稿後若非繪師方失誤，僅提供協議內約定之微調修改次數。<br/>
            4. 若有延遲交稿情形，繪師將主動告知並依雙方協議處理。<br/>
            5. 確認委託後，請依約定時間內完成款項支付，逾期視同放棄委託。<br/>
            6. 草稿階段退件重畫以三次為限，超出次數需視情況增加費用。<br/>
          </div>

          {!hasAlreadyAgreed ? (
            <div style={{ marginTop: '24px' }}>
              <label 
                style={{ 
                  display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', fontSize: '14px', 
                  fontWeight: 'bold', color: isAgreed ? '#4E7A5A' : '#556577', padding: '16px', 
                  backgroundColor: isAgreed ? '#e0f0e5' : '#e8ecf3', border: isAgreed ? '2px solid #4E7A5A' : '1px solid #d0d8e4', 
                  borderRadius: '12px', transition: 'all 0.2s ease' 
                }}
              >
                <input 
                  type="checkbox" 
                  checked={isAgreed} 
                  onChange={(e) => setIsAgreed(e.target.checked)}
                  style={{ width: '20px', height: '20px', accentColor: '#4E7A5A' }}
                />
                我已詳細閱讀上方明細，並同意委託協議。
              </label>
              
              <button 
                onClick={handleSubmit} 
                disabled={!isAgreed || isSubmitting}
                style={{ 
                  width: '100%', padding: '16px', marginTop: '20px', 
                  backgroundColor: isAgreed ? '#5D4A3E' : '#c5cfd9', color: '#FFFFFF', 
                  border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 'bold', 
                  cursor: isAgreed ? 'pointer' : 'not-allowed', transition: 'all 0.2s ease',
                  boxShadow: isAgreed ? '0 4px 16px rgba(93,74,62,0.2)' : 'none'
                }}
                onMouseEnter={e => isAgreed && !isSubmitting && (e.currentTarget.style.transform = 'translateY(-2px)')}
                onMouseLeave={e => isAgreed && !isSubmitting && (e.currentTarget.style.transform = 'translateY(0)')}
              >
                {isSubmitting ? '處理中...' : '確認無誤，送出委託單'}
              </button>
            </div>
          ) : (
            <div style={{ marginTop: '24px', textAlign: 'center' }}>
              <div style={{ padding: '16px', backgroundColor: '#E8F3EB', color: '#4E7A5A', borderRadius: '12px', fontWeight: 'bold', marginBottom: '20px', border: '1px solid #C8E6C9' }}>
                您已成功同意此委託！狀態已更新。
              </div>
              <button 
                onClick={() => navigate(`/client/order/${order.id}`)}
                style={{ width: '100%', padding: '16px', backgroundColor: '#4A7294', color: '#FFFFFF', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s ease', boxShadow: '0 4px 16px rgba(74,114,148,0.2)' }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
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

const centerStyle = { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#556577', fontSize: '15px' };
const detailItemStyle = { display: 'flex', flexDirection: 'column' as const };
const detailLabelStyle = { color: '#556577', fontSize: '13px', marginBottom: '6px', fontWeight: 'bold' };
const detailValueStyle = { color: '#475569', fontWeight: 'bold', fontSize: '15px' };