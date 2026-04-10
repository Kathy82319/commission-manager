import { useState, useEffect } from 'react';

const MOCK_ARTIST_ID = 'u-artist-01';

interface ArtistProfile {
  display_name: string;
  avatar_url: string;
  bio: string;
  tos_content: string;
  about_me: string;
  portfolio_urls: string[];
  commission_process: string;
  payment_info: string;
  usage_rules: string;
  custom_1_title: string;
  custom_1_content: string;
  custom_2_title: string;
  custom_2_content: string;
  custom_3_title: string;
  custom_3_content: string;
}

export function Settings() {
  const [formData, setFormData] = useState<ArtistProfile>({
    display_name: '', avatar_url: '', bio: '', tos_content: '',
    about_me: '', portfolio_urls: [], commission_process: '',
    payment_info: '', usage_rules: '', custom_1_title: '',
    custom_1_content: '', custom_2_title: '', custom_2_content: '',
    custom_3_title: '', custom_3_content: ''
  });
  
  const [portfolioInput, setPortfolioInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/artist-profile/${MOCK_ARTIST_ID}`);
        const data = await res.json();
        if (data.success) {
          const parsedUrls = typeof data.data.portfolio_urls === 'string' 
            ? JSON.parse(data.data.portfolio_urls) 
            : (data.data.portfolio_urls || []);
            
          setFormData({
            display_name: data.data.display_name || '',
            avatar_url: data.data.avatar_url || '',
            bio: data.data.bio || '',
            tos_content: data.data.tos_content || '',
            about_me: data.data.about_me || '',
            portfolio_urls: parsedUrls,
            commission_process: data.data.commission_process || '',
            payment_info: data.data.payment_info || '',
            usage_rules: data.data.usage_rules || '',
            custom_1_title: data.data.custom_1_title || '',
            custom_1_content: data.data.custom_1_content || '',
            custom_2_title: data.data.custom_2_title || '',
            custom_2_content: data.data.custom_2_content || '',
            custom_3_title: data.data.custom_3_title || '',
            custom_3_content: data.data.custom_3_content || ''
          });
          setPortfolioInput(parsedUrls.join('\n'));
        }
      } catch (error) {
        console.error("讀取設定失敗", error);
      }
    };
    fetchData();
  }, []);

  const handleChange = (field: keyof ArtistProfile, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsProcessing(true);
    
    const payload = {
      ...formData,
      portfolio_urls: portfolioInput.split('\n').filter(url => url.trim() !== '')
    };

    try {
      const res = await fetch(`/api/artist-profile/${MOCK_ARTIST_ID}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        alert('設定已儲存');
      } else {
        alert('儲存失敗：' + data.error);
      }
    } catch (error) {
      alert('系統錯誤');
    } finally {
      setIsProcessing(false);
    }
  };

  const inputStyle = { width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' as const };
  const textareaStyle = { ...inputStyle, minHeight: '120px', resize: 'vertical' as const };
  const sectionStyle = { backgroundColor: '#fff', padding: '20px', borderRadius: '8px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' };

// 在組件內新增這個函式
const publicUrl = `${window.location.origin}/u/${MOCK_ARTIST_ID}`;

const copyLink = () => {
  navigator.clipboard.writeText(publicUrl);
  alert('連結已複製！');
};

// 在 return 的 <h2>個人設定</h2> 下方加入這段：
<div style={{ backgroundColor: '#e3f2fd', padding: '15px', borderRadius: '8px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
  <div>
    <span style={{ fontSize: '14px', color: '#1976d2', fontWeight: 'bold' }}>您的公開主頁網址：</span>
    <code style={{ marginLeft: '10px', backgroundColor: '#fff', padding: '2px 5px' }}>{publicUrl}</code>
  </div>
  <div style={{ display: 'flex', gap: '10px' }}>
    <button onClick={() => window.open(publicUrl, '_blank')} style={{ padding: '5px 10px', cursor: 'pointer' }}>預覽頁面</button>
    <button onClick={copyLink} style={{ padding: '5px 10px', cursor: 'pointer' }}>複製連結</button>
  </div>
</div>


  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0 }}>個人設定</h2>
        <button 
          onClick={handleSave} 
          disabled={isProcessing}
          style={{ padding: '10px 20px', backgroundColor: '#333', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}
        >
          {isProcessing ? '儲存中...' : '儲存變更'}
        </button>
      </div>

      <div style={sectionStyle}>
        <h3>基本資料</h3>
        <div style={{ display: 'grid', gap: '15px' }}>
          <div>
            <label>顯示名稱</label>
            <input type="text" value={formData.display_name} onChange={e => handleChange('display_name', e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label>大頭貼網址</label>
            <input type="text" value={formData.avatar_url} onChange={e => handleChange('avatar_url', e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label>簡短自我介紹</label>
            <input type="text" value={formData.bio} onChange={e => handleChange('bio', e.target.value)} style={inputStyle} />
          </div>
        </div>
      </div>

      <div style={sectionStyle}>
        <h3>詳細內容編輯</h3>
        <div style={{ display: 'grid', gap: '20px' }}>
          <div>
            <label>詳細介紹</label>
            <textarea value={formData.about_me} onChange={e => handleChange('about_me', e.target.value)} style={textareaStyle} />
          </div>
          <div>
            <label>委託條款 (TOS)</label>
            <textarea value={formData.tos_content} onChange={e => handleChange('tos_content', e.target.value)} style={textareaStyle} />
          </div>
          <div>
            <label>委託流程說明</label>
            <textarea value={formData.commission_process} onChange={e => handleChange('commission_process', e.target.value)} style={textareaStyle} />
          </div>
          <div>
            <label>付款方式</label>
            <textarea value={formData.payment_info} onChange={e => handleChange('payment_info', e.target.value)} style={textareaStyle} />
          </div>
          <div>
            <label>使用規範與範圍</label>
            <textarea value={formData.usage_rules} onChange={e => handleChange('usage_rules', e.target.value)} style={textareaStyle} />
          </div>
        </div>
      </div>

      <div style={sectionStyle}>
        <h3>作品展示區</h3>
        <p style={{ fontSize: '13px', color: '#666', marginTop: 0 }}>請貼上圖片網址，每行一個網址。</p>
        <textarea value={portfolioInput} onChange={e => setPortfolioInput(e.target.value)} style={textareaStyle} placeholder="https://..." />
      </div>

      <div style={sectionStyle}>
        <h3>自訂項目 (選填)</h3>
        <div style={{ display: 'grid', gap: '20px' }}>
          {[1, 2, 3].map(num => (
            <div key={num} style={{ border: '1px solid #eee', padding: '15px', borderRadius: '4px' }}>
              <div style={{ marginBottom: '10px' }}>
                <label>自訂項目 {num} 標題</label>
                <input 
                  type="text" 
                  value={formData[`custom_${num}_title` as keyof ArtistProfile] as string} 
                  onChange={e => handleChange(`custom_${num}_title` as keyof ArtistProfile, e.target.value)} 
                  style={inputStyle} 
                />
              </div>
              <div>
                <label>內容</label>
                <textarea 
                  value={formData[`custom_${num}_content` as keyof ArtistProfile] as string} 
                  onChange={e => handleChange(`custom_${num}_content` as keyof ArtistProfile, e.target.value)} 
                  style={{ ...textareaStyle, minHeight: '80px' }} 
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}