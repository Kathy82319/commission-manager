import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface Commission {
  id: string; client_name: string; type_name: string; status: string; is_external: number;
}
interface UserProfile {
  id: string; display_name: string; avatar_url: string; bio: string;
}

const statusMap: Record<string, string> = {
  quote_created: '已建報價單', form_submitted: '委託已送出', unpaid: '待匯款',
  paid: '已匯款(排隊)', wip_sketch: '草稿階段', wip_coloring: '線稿階段', completed: '已結案'
};

// 測試用的假 Client ID (實際情況會從登入 Session 取得)
const TEST_CLIENT_ID = 'u-client-test';

export function ClientHome() {
  const navigate = useNavigate();
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  
  // 編輯模式狀態
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ display_name: '', avatar_url: '', bio: '' });
  const [isProcessing, setIsProcessing] = useState(false);

  // 初始化資料
  const fetchAllData = async () => {
    // 1. 取得委託單列表
    fetch('/api/commissions')
      .then(res => res.json())
      .then(data => {
        if (data.success) setCommissions(data.data.filter((c: Commission) => c.is_external === 0));
      });

    // 2. 取得個人資料
    const res = await fetch(`/api/users/${TEST_CLIENT_ID}`);
    const data = await res.json();
    if (data.success) {
      setProfile(data.data);
      setEditForm({ display_name: data.data.display_name, avatar_url: data.data.avatar_url, bio: data.data.bio });
    } else {
      // 測試環境防呆：如果沒有這個測試帳號，就在前端先顯示預設值 (實務上不會這樣做)
      const defaultProfile = { id: TEST_CLIENT_ID, display_name: '測試委託人', avatar_url: '', bio: '這是一段預設的自我介紹...' };
      setProfile(defaultProfile);
      setEditForm(defaultProfile);
    }
  };

  useEffect(() => { fetchAllData(); }, []);

  // 儲存個人資料
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
      alert('個人資料已更新！');
      setIsEditing(false);
      fetchAllData();
    } else {
      alert('更新失敗：' + data.error);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '480px', margin: '0 auto', position: 'relative' }}>
      
      {/* 個人檔案區塊 */}
      <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', marginBottom: '20px' }}>
        <div style={{ 
          width: '80px', height: '80px', backgroundColor: '#e0e0e0', borderRadius: '50%', margin: '0 auto 15px auto', 
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', color: '#888',
          backgroundImage: profile?.avatar_url ? `url(${profile.avatar_url})` : 'none',
          backgroundSize: 'cover', backgroundPosition: 'center'
        }}>
          {!profile?.avatar_url && '頭像'}
        </div>
        <h2 style={{ margin: '0 0 10px 0' }}>{profile?.display_name || '載入中...'}</h2>
        <p style={{ color: '#666', fontSize: '14px', lineHeight: '1.5', marginBottom: '20px', whiteSpace: 'pre-wrap' }}>
          {profile?.bio || '尚未填寫自我介紹'}
        </p>
        <button 
          onClick={() => setIsEditing(true)}
          style={{ padding: '8px 20px', backgroundColor: '#f0f2f5', color: '#333', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', width: '100%' }}
        >
          ✏️ 編輯個人資料
        </button>
      </div>

      {/* 委託單列表區塊 */}
      <h3 style={{ fontSize: '16px', color: '#555', marginBottom: '15px' }}>目前委託單</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {commissions.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#999', padding: '20px' }}>尚無委託單</div>
        ) : (
          commissions.map(order => (
            <div key={order.id} onClick={() => navigate(`/client/order/${order.id}`)} style={{ backgroundColor: '#fff', padding: '15px', borderRadius: '8px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', borderLeft: '4px solid #1976d2', cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontWeight: 'bold' }}>{order.type_name}</span>
                <span style={{ fontSize: '12px', backgroundColor: '#e3f2fd', color: '#1976d2', padding: '2px 8px', borderRadius: '4px' }}>{statusMap[order.status]}</span>
              </div>
              <div style={{ fontSize: '12px', color: '#888' }}>單號：{order.id.split('-')[0]}...</div>
            </div>
          ))
        )}
      </div>

      {/* 編輯個人資料彈出視窗 */}
      {isEditing && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', width: '90%', maxWidth: '400px' }}>
            <h3 style={{ margin: '0 0 15px 0' }}>編輯個人資料</h3>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', color: '#666' }}>顯示名稱</label>
              <input 
                type="text" value={editForm.display_name} onChange={e => setEditForm({...editForm, display_name: e.target.value})}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }} 
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', color: '#666' }}>大頭貼網址 (目前以輸入網址模擬上傳)</label>
              <input 
                type="text" placeholder="https://..." value={editForm.avatar_url} onChange={e => setEditForm({...editForm, avatar_url: e.target.value})}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }} 
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', color: '#666' }}>自我介紹</label>
              <textarea 
                value={editForm.bio} onChange={e => setEditForm({...editForm, bio: e.target.value})}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box', minHeight: '80px', resize: 'vertical' }} 
              />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setIsEditing(false)} style={{ flex: 1, padding: '10px', backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '6px', cursor: 'pointer' }}>取消</button>
              <button onClick={handleSaveProfile} disabled={isProcessing} style={{ flex: 1, padding: '10px', backgroundColor: '#333', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
                {isProcessing ? '儲存中...' : '儲存變更'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}