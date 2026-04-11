import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface Commission {
  id: string; client_name: string; type_name: string; status: string; is_external: number; project_name?: string;
}
interface UserProfile {
  id: string; display_name: string; avatar_url: string; bio: string;
}

const statusMap: Record<string, string> = {
  quote_created: '已建報價單', form_submitted: '委託已送出', unpaid: '待匯款',
  paid: '已匯款(排隊)', wip_sketch: '草稿階段', wip_coloring: '線稿階段', completed: '已結案', cancelled: '已作廢'
};

const TEST_CLIENT_ID = 'u-client-test';

export function ClientHome() {
  const navigate = useNavigate();
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ display_name: '', avatar_url: '', bio: '' });
  const [isProcessing, setIsProcessing] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const fetchAllData = async () => {
    fetch('/api/commissions')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
           // 只過濾掉被取消/作廢的單子，讓客戶能看到所有自己名下的單
           setCommissions(data.data.filter((c: Commission) => c.status !== 'cancelled' && c.is_external === 0));
        }
      });

    const res = await fetch(`/api/users/${TEST_CLIENT_ID}`);
    const data = await res.json();
    if (data.success) {
      setProfile(data.data);
      setEditForm({ display_name: data.data.display_name, avatar_url: data.data.avatar_url, bio: data.data.bio });
    } else {
      const defaultProfile = { id: TEST_CLIENT_ID, display_name: '測試委託人', avatar_url: '', bio: '這是一段預設的自我介紹...' };
      setProfile(defaultProfile);
      setEditForm(defaultProfile);
    }
  };

  useEffect(() => { fetchAllData(); }, []);

  const handleSaveProfile = async () => {
    setIsProcessing(true);
    const res = await fetch(`/api/users/${TEST_CLIENT_ID}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm)
    });
    const data = await res.json();
    setIsProcessing(false);

    if (data.success) {
      setIsEditing(false);
      fetchAllData();
    } else {
      alert('更新失敗：' + data.error);
    }
  };

  const inputStyle = (fieldName: string) => ({
    width: '100%', padding: '12px', borderRadius: '8px', 
    border: focusedField === fieldName ? '2px solid #4A7294' : '1px solid #c5cfd9',
    backgroundColor: '#d9dfe9', color: '#475569', fontSize: '15px', outline: 'none',
    boxSizing: 'border-box' as const, transition: 'all 0.2s ease',
    boxShadow: focusedField === fieldName ? '0 0 0 3px rgba(74,114,148,0.1)' : 'none'
  });

  return (
    <div style={{ backgroundColor: '#778ca4', minHeight: '100vh', display: 'flex', justifyContent: 'center', padding: '40px 16px', fontFamily: 'sans-serif' }}>
      <div style={{ width: '100%', maxWidth: '500px', display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative' }}>
        
        {/* 個人檔案區塊 */}
        <div style={{ backgroundColor: '#e8ecf3', padding: '30px 24px', borderRadius: '16px', textAlign: 'center', boxShadow: '0 8px 24px rgba(100,120,140,0.08)', border: '1px solid #d0d8e4' }}>
          <div style={{ 
            width: '90px', height: '90px', backgroundColor: '#d9dfe9', borderRadius: '50%', margin: '0 auto 16px auto', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', color: '#556577',
            backgroundImage: profile?.avatar_url ? `url(${profile.avatar_url})` : 'none',
            backgroundSize: 'cover', backgroundPosition: 'center', border: '3px solid #FFFFFF',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
          }}>
            {!profile?.avatar_url && '無頭像'}
          </div>
          <h2 style={{ margin: '0 0 8px 0', color: '#475569', fontSize: '22px' }}>{profile?.display_name || '載入中...'}</h2>
          <p style={{ color: '#556577', fontSize: '14px', lineHeight: '1.6', marginBottom: '24px', whiteSpace: 'pre-wrap', padding: '0 10px' }}>
            {profile?.bio || '尚未填寫自我介紹'}
          </p>
          <button 
            onClick={() => setIsEditing(true)}
            style={{ padding: '12px 24px', backgroundColor: '#d0d8e4', color: '#475569', border: '1px solid #c5cfd9', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', width: '100%', fontSize: '14px', transition: 'all 0.2s', boxShadow: '0 2px 8px rgba(100,120,140,0.1)' }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#475569'; e.currentTarget.style.color = '#FFF'; e.currentTarget.style.borderColor = '#475569'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#d0d8e4'; e.currentTarget.style.color = '#475569'; e.currentTarget.style.borderColor = '#c5cfd9'; }}
          >
            ✏️ 編輯個人資料
          </button>
        </div>

        {/* 委託單列表區塊 */}
        <div style={{ padding: '0 4px' }}>
          <h3 style={{ fontSize: '15px', color: '#475569', marginBottom: '16px', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            我的委託單
            <span style={{ fontSize: '12px', backgroundColor: '#d9dfe9', padding: '4px 10px', borderRadius: '12px', color: '#4A7294', fontWeight: 'bold', boxShadow: '0 2px 4px rgba(100,120,140,0.08)' }}>
              共 {commissions.length} 筆
            </span>
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {commissions.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#556577', padding: '40px 20px', backgroundColor: '#e8ecf3', borderRadius: '16px', border: '1px dashed #d0d8e4' }}>
                您目前尚無進行中的委託單
              </div>
            ) : (
              commissions.map(order => {
                // 判斷是否為結案狀態，調整視覺
                const isCompleted = order.status === 'completed';
                return (
                  <div 
                    key={order.id} 
                    onClick={() => navigate(`/client/order/${order.id}`)} 
                    style={{ 
                      backgroundColor: '#e8ecf3', padding: '20px', borderRadius: '16px', 
                      boxShadow: '0 4px 16px rgba(100,120,140,0.08)', 
                      borderLeft: isCompleted ? '4px solid #4E7A5A' : '4px solid #4A7294', 
                      cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s',
                      opacity: isCompleted ? 0.8 : 1
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.06)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(100,120,140,0.08)'; }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <div>
                        <div style={{ fontWeight: 'bold', color: '#475569', fontSize: '16px', marginBottom: '4px' }}>{order.project_name || order.type_name || '未命名項目'}</div>
                        <div style={{ fontSize: '11px', color: '#556577', fontFamily: 'monospace' }}>單號：{order.id.split('-')[0]}</div>
                      </div>
                      <span style={{ 
                        fontSize: '12px', padding: '6px 12px', borderRadius: '20px', fontWeight: 'bold', whiteSpace: 'nowrap',
                        backgroundColor: isCompleted ? '#E8F3EB' : '#EBF2F7', 
                        color: isCompleted ? '#4E7A5A' : '#4A7294' 
                      }}>
                        {statusMap[order.status] || order.status}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 編輯個人資料彈出視窗 */}
        {isEditing && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(93,74,62,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
            <div style={{ backgroundColor: '#e8ecf3', padding: '30px', borderRadius: '20px', width: '90%', maxWidth: '420px', boxShadow: '0 20px 40px rgba(100,120,140,0.2)', animation: 'fadeIn 0.2s ease' }}>
              <h3 style={{ margin: '0 0 20px 0', color: '#5D4A3E', fontSize: '20px', textAlign: 'center' }}>編輯個人資料</h3>
              
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold', color: '#556577' }}>顯示名稱</label>
                <input 
                  type="text" value={editForm.display_name} onChange={e => setEditForm({...editForm, display_name: e.target.value})}
                  onFocus={() => setFocusedField('name')} onBlur={() => setFocusedField(null)}
                  style={inputStyle('name')} placeholder="請輸入對外顯示的暱稱"
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold', color: '#556577' }}>大頭貼網址 <span style={{fontSize: '12px', fontWeight: 'normal', color: '#8a95a8'}}>(請輸入圖片 URL)</span></label>
                <input 
                  type="text" placeholder="https://..." value={editForm.avatar_url} onChange={e => setEditForm({...editForm, avatar_url: e.target.value})}
                  onFocus={() => setFocusedField('avatar')} onBlur={() => setFocusedField(null)}
                  style={inputStyle('avatar')} 
                />
              </div>

              <div style={{ marginBottom: '30px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold', color: '#556577' }}>自我介紹</label>
                <textarea 
                  value={editForm.bio} onChange={e => setEditForm({...editForm, bio: e.target.value})}
                  onFocus={() => setFocusedField('bio')} onBlur={() => setFocusedField(null)}
                  placeholder="簡單介紹一下自己吧..."
                  style={{ ...inputStyle('bio'), minHeight: '100px', resize: 'vertical' }} 
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={() => setIsEditing(false)} style={{ flex: 1, padding: '14px', backgroundColor: '#FFFFFF', color: '#556577', border: '1px solid #d0d8e4', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = '#d9dfe9'} onMouseLeave={e => e.currentTarget.style.backgroundColor = '#FFFFFF'}>取消</button>
                <button onClick={handleSaveProfile} disabled={isProcessing} style={{ flex: 1, padding: '14px', backgroundColor: '#4A7294', color: '#FFFFFF', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: isProcessing ? 'not-allowed' : 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(74,114,148,0.2)' }} onMouseEnter={e => !isProcessing && (e.currentTarget.style.transform = 'translateY(-2px)')} onMouseLeave={e => !isProcessing && (e.currentTarget.style.transform = 'translateY(0)')}>
                  {isProcessing ? '儲存中...' : '確認儲存'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}