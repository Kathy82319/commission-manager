import React, { useEffect, useState, useRef } from 'react';
import { apiClient } from '../../api/client';
import '../../styles/Wishboard.css';
import { Calendar, DollarSign, Tag, Clock, Send, Plus, X, Upload, User, AlertCircle, CheckCircle2 } from 'lucide-react';

const REQ_TAGS = ['不限', '頭貼', '半身', '全身', 'Q圖', '韓式', '日式', '美式', '夢向', '黑白', '單人', '雙人', '背景', '立繪', '厚塗', '塗鴉', '插圖', '服設', '包時', '包日'];
const PAY_TAGS = ['皆可配合', '無卡', '匯款', '空包', '超商'];

export const Wishboard: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [bulletins, setBulletins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'request' | 'offer' | 'other'>('request');
  
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [showPostModal, setShowPostModal] = useState(false);
  const [showInquireModal, setShowInquireModal] = useState(false);
  const [selectedBulletin, setSelectedBulletin] = useState<string | null>(null);
  
  // 上傳預覽與 Toast 狀態
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 🌟 將 customTag 獨立出來，解決 Enter 狀態覆蓋問題
  const [customTagInput, setCustomTagInput] = useState('');

  const [inquireDraft, setInquireDraft] = useState({
    title: '', specialties: '', no_gos: '', payment_methods: '', price_list: '', question_template: ''
  });

  const [postForm, setPostForm] = useState({
    title: '', content: '', tags: [] as string[], payment_methods: [] as string[],
    budget_min: '', budget_max: '', schedule_type: 'flexible', specific_date: '', ref_image_key: ''
  });

  // 讀取 R2 公開網址 (請確保 .env 有設定 VITE_R2_PUBLIC_URL，例如 https://pub-xxxx.r2.dev)
  const R2_PUBLIC_URL = import.meta.env.VITE_R2_PUBLIC_URL || '';

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const initData = async () => {
    setLoading(true);
    try {
      const resBulletins = await apiClient.get(`/api/bulletins?category=${activeTab}`);
      if (resBulletins.success) setBulletins(resBulletins.data);
      const resUser = await apiClient.get('/api/users/me');
      if (resUser.success) setCurrentUser(resUser.data);
    } catch (e) { 
      console.log("訪客模式"); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { initData(); }, [activeTab]);

  // 🌟 圖片上傳與本地預覽
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1 * 1024 * 1024) { 
      showToast("檔案大小不得超過 1MB", "error"); 
      return; 
    }

    // 產生安全的本地預覽圖
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setIsUploading(true);

    try {
      const fileName = `wishboard/${Date.now()}_${Math.random().toString(36).substring(7)}_${file.name}`;
      const res = await apiClient.post('/api/r2/upload-url', {
        bucketType: 'public',
        fileName: fileName,
        contentType: file.type
      });

      if (!res.success) throw new Error("取得上傳網址失敗");

      const uploadRes = await fetch(res.uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type }
      });

      if (!uploadRes.ok) throw new Error("檔案上傳到 R2 失敗");

      setPostForm(prev => ({ ...prev, ref_image_key: fileName }));
      showToast("圖片上傳成功！");
    } catch (err) {
      showToast("上傳失敗，請檢查網路狀態", "error");
      setPreviewUrl(null); // 失敗則還原預覽
    } finally {
      setIsUploading(false);
    }
  };

  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return showToast("請先登入才能發布", "error");
    try {
      const res = await apiClient.post('/api/bulletins', {
        ...postForm, category: activeTab
      });
      if (res.success) {
        showToast("許願單發布成功！");
        setShowPostModal(false);
        setPostForm({ title: '', content: '', tags: [], payment_methods: [], budget_min: '', budget_max: '', schedule_type: 'flexible', specific_date: '', ref_image_key: '' });
        setPreviewUrl(null);
        initData();
      }
    } catch (err) { 
      showToast("發布失敗，請稍後再試", "error"); 
    }
  };

  const toggleTag = (tag: string, field: 'tags' | 'payment_methods' | 'filters') => {
    if (field === 'filters') {
      setSelectedFilters(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
      return;
    }
    setPostForm(prev => {
      let list = prev[field];
      const exclusiveTag = field === 'tags' ? '不限' : '皆可配合';

      if (tag === exclusiveTag) {
        list = list.includes(tag) ? [] : [tag];
      } else {
        list = list.includes(tag) ? list.filter(t => t !== tag) : [...list.filter(t => t !== exclusiveTag), tag];
      }
      return { ...prev, [field]: list };
    });
  };

  const openInquireModal = (bulletinId: string) => {
    setSelectedBulletin(bulletinId);
    let settings: any = {};
    if (currentUser && currentUser.profile_settings) {
      try { settings = typeof currentUser.profile_settings === 'string' ? JSON.parse(currentUser.profile_settings) : currentUser.profile_settings; } catch(e) {}
    }
    const card = settings.bulletin_card || {};
    setInquireDraft({
      title: `${currentUser?.display_name || '繪師'} 的客製化服務`,
      specialties: card.specialties || '', no_gos: card.no_gos || '', payment_methods: card.payment_methods || '',
      price_list: card.price_list || '', question_template: settings.question_template || ''
    });
    setShowInquireModal(true);
  };

  const handleInquire = async () => {
    if (!selectedBulletin) return;
    try {
      const res = await apiClient.post(`/api/bulletins/${selectedBulletin}/inquire`, { artist_snapshot: JSON.stringify(inquireDraft) });
      if (res.success) {
        showToast('已成功發送投遞意向！');
        setShowInquireModal(false);
        initData();
      } else { 
        showToast(res.message || '投遞發生錯誤', "error"); 
      }
    } catch (error: any) { 
      showToast('投遞發生錯誤: ' + (error.message || ''), "error"); 
    }
  };

  const getTimeRemaining = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - new Date().getTime();
    if (diff <= 0) return '已結束';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    return hours > 24 ? `剩餘 ${Math.floor(hours / 24)}天` : `剩餘 ${hours}小時`;
  };

  const filteredBulletins = bulletins.filter(b => {
    if (selectedFilters.length === 0) return true;
    const bTags = JSON.parse(b.tags || '[]');
    return selectedFilters.every(f => bTags.includes(f));
  });

  return (
    <div className="wishboard-page">
      {/* 🌟 Toast 通知系統 */}
      {toast && (
        <div className={`toast-notification ${toast.type}`}>
          {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      <header className="wishboard-hero">
        <div className="hero-content">
          <h1>✨ 創作許願池</h1>
          <p>在這裡遇見你的命定畫師，或為案主實現願望</p>
          <div className="tab-group">
            <button className={activeTab === 'request' ? 'active' : ''} onClick={() => setActiveTab('request')}># 徵委託</button>
            <button className={activeTab === 'offer' ? 'active' : ''} onClick={() => setActiveTab('offer')}># 接委託</button>
            <button className={activeTab === 'other' ? 'active' : ''} onClick={() => setActiveTab('other')}># 其他</button>
          </div>
        </div>
      </header>

      <div className="filter-section">
        <div className="filter-label"><Tag size={16} /> 熱門篩選：</div>
        <div className="filter-tags">
          {REQ_TAGS.map(tag => (
            <button key={tag} className={selectedFilters.includes(tag) ? 'active' : ''} onClick={() => toggleTag(tag, 'filters')}>{tag}</button>
          ))}
        </div>
        {currentUser && (
          <button className="post-trigger-btn" onClick={() => setShowPostModal(true)}>
            <Plus size={20} /> 發布需求
          </button>
        )}
      </div>

      <main className="wish-grid">
        {loading ? <div className="loading">載入中...</div> : (
          filteredBulletins.map(b => {
            const isMyOwnPost = currentUser && b.client_id === currentUser.id;
            const hasApplied = currentUser && b.applied_artist_ids && b.applied_artist_ids.includes(currentUser.id);

            return (
              <div key={b.id} className="wish-card-wide">
                {/* 🌟 滿版左側區塊：動態適應高度 */}
                <div className="wish-card-image-wrapper">
                  {b.ref_image_key && R2_PUBLIC_URL ? (
                    <img 
                      src={`${R2_PUBLIC_URL}/${b.ref_image_key}`} 
                      alt="範例圖" 
                      className="wish-card-img"
                      onError={(e) => {
                        // 圖片載入失敗時切換為備用顯示
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.parentElement?.classList.add('fallback-mode');
                      }}
                    />
                  ) : (
                    <div className="fallback-placeholder">
                      <User size={64} opacity={0.3} />
                      <span>無提供範例圖</span>
                    </div>
                  )}
                  <div className="wish-countdown"><Clock size={12} /> {getTimeRemaining(b.expires_at)}</div>
                </div>
                
                <div className="wish-card-info">
                  <div className="wish-card-header">
                    <h3>{b.title || '無標題'}</h3>
                    <span className="category-badge">{b.category === 'request' ? '徵委託' : '其他'}</span>
                  </div>

                  <div className="wish-metadata">
                    <div className="meta-item">
                      <Tag size={14} />
                      <div className="tag-cloud">
                        {JSON.parse(b.tags || '[]').map((t: string) => <span key={t} className="tag-chip">{t}</span>)}
                      </div>
                    </div>
                    <div className="meta-row">
                      <span className="meta-item"><DollarSign size={14} /> 預算：<span className="price">{b.budget_min}~{b.budget_max}</span></span>
                      <span className="meta-item"><Calendar size={14} /> 排單：<span>{b.schedule_type === 'flexible' ? '可接受排單' : b.specific_date}</span></span>
                    </div>
                    <div className="meta-item"><Send size={14} /> 付款：<span>{JSON.parse(b.payment_methods || '[]').join(', ')}</span></div>
                  </div>

                  <div className="wish-description">
                    <strong>詳細需求：</strong>
                    <p>{b.content}</p>
                  </div>

                  {isMyOwnPost ? (
                    <button disabled className="inquire-btn disabled-btn">這是您發布的許願單</button>
                  ) : hasApplied ? (
                    <button disabled className="inquire-btn applied-btn">已投遞</button>
                  ) : (
                    <button className="inquire-btn" onClick={() => openInquireModal(b.id)}>
                      我有興趣 (發送投遞意向)
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </main>

      {/* 發布彈窗 */}
      {showPostModal && (
        <div className="modal-overlay">
          <div className="post-modal">
            <div className="modal-header">
              <h2>發布徵委託需求</h2>
              <button onClick={() => setShowPostModal(false)}><X /></button>
            </div>
            
            <form onSubmit={handlePostSubmit} className="post-form">
              <div className="form-row">
                <div className="form-group flex-2">
                  <label>標題</label>
                  <input type="text" placeholder="簡單描述你的需求" value={postForm.title} onChange={e => setPostForm({...postForm, title: e.target.value})} required />
                </div>
                <div className="form-group flex-1">
                  <label>範例參考圖 (1MB內)</label>
                  {/* 🌟 上傳預覽區塊 */}
                  <div className={`upload-box ${previewUrl ? 'has-preview' : ''}`} onClick={() => fileInputRef.current?.click()}>
                    {isUploading ? (
                      <span className="upload-text">上傳中...</span>
                    ) : previewUrl ? (
                      <img src={previewUrl} alt="預覽" className="upload-preview-img" />
                    ) : (
                      <span className="upload-text"><Upload size={16}/> 點擊選擇圖片</span>
                    )}
                  </div>
                  <input type="file" ref={fileInputRef} hidden onChange={handleImageUpload} accept="image/*" />
                </div>
              </div>

              <div className="form-group">
                <label>需求標籤 (複選)</label>
                <div className="tag-selector">
                  {REQ_TAGS.map(t => (
                    <span key={t} className={`selectable-tag ${postForm.tags.includes(t) ? 'selected' : ''}`} onClick={() => toggleTag(t, 'tags')}>{t}</span>
                  ))}
                  <input 
                    type="text" 
                    className="inline-tag-input" 
                    placeholder="+ 自定義 (按 Enter 加入)" 
                    value={customTagInput} 
                    onChange={e => setCustomTagInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault(); 
                        if (customTagInput.trim()) {
                          toggleTag(customTagInput.trim(), 'tags');
                          setCustomTagInput('');
                        }
                      }
                    }}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group flex-2">
                  <label>付款方式</label>
                  <div className="tag-selector">
                    {PAY_TAGS.map(t => (
                      <span key={t} className={`selectable-tag ${postForm.payment_methods.includes(t) ? 'selected' : ''}`} onClick={() => toggleTag(t, 'payment_methods')}>{t}</span>
                    ))}
                  </div>
                </div>
                <div className="form-group flex-1">
                  <label>預算範圍</label>
                  <div className="budget-inputs">
                    <input type="number" placeholder="最低" value={postForm.budget_min} onChange={e => setPostForm({...postForm, budget_min: e.target.value})} style={{ width: '80px' }} />
                    <span>~</span>
                    <input type="number" placeholder="最高" value={postForm.budget_max} onChange={e => setPostForm({...postForm, budget_max: e.target.value})} style={{ width: '80px' }} />
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>詳細需求說明</label>
                <textarea rows={4} value={postForm.content} onChange={e => setPostForm({...postForm, content: e.target.value})} required style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }}></textarea>
              </div>

              <div className="modal-footer" style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="submit-post-btn" disabled={isUploading} style={{ background: '#ff8c00', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>發布許願單</button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* 投遞意向 Modal */}
      {showInquireModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px', maxHeight: '85vh', overflowY: 'auto', background: 'white', padding: '24px', borderRadius: '16px' }}>
            <h2>投遞意向預覽與微調</h2>
            <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '20px' }}>
              以下內容將會發送給該案主。您可以針對本次委託進行暫時性的文字微調。
            </p>

            <div className="form-group"><label>標題 / 稱呼</label><input type="text" value={inquireDraft.title} onChange={(e) => setInquireDraft({...inquireDraft, title: e.target.value})} className="w-full border p-2 rounded" /></div>
            <div className="form-group" style={{ marginTop: '15px' }}><label>擅長題材</label><input type="text" value={inquireDraft.specialties} onChange={(e) => setInquireDraft({...inquireDraft, specialties: e.target.value})} className="w-full border p-2 rounded" /></div>
            <div className="form-group" style={{ marginTop: '15px' }}><label>不擅長 / 雷點</label><input type="text" value={inquireDraft.no_gos} onChange={(e) => setInquireDraft({...inquireDraft, no_gos: e.target.value})} className="w-full border p-2 rounded" /></div>
            <div className="form-group" style={{ marginTop: '15px' }}><label>接受的付款方式</label><input type="text" value={inquireDraft.payment_methods} onChange={(e) => setInquireDraft({...inquireDraft, payment_methods: e.target.value})} className="w-full border p-2 rounded" /></div>
            <div className="form-group" style={{ marginTop: '15px' }}><label>簡易價目表預覽</label><textarea value={inquireDraft.price_list} onChange={(e) => setInquireDraft({...inquireDraft, price_list: e.target.value})} className="w-full border p-2 rounded" rows={3} /></div>
            <div className="form-group" style={{ marginTop: '15px' }}><label style={{ color: '#9333ea' }}>要求案主回填的提問模板</label><textarea value={inquireDraft.question_template} onChange={(e) => setInquireDraft({...inquireDraft, question_template: e.target.value})} className="w-full border p-2 rounded" rows={4} /></div>

            <div className="modal-actions" style={{ marginTop: '25px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowInquireModal(false)} style={{ padding: '8px 16px', border: '1px solid #ddd', borderRadius: '6px', background: 'white' }}>取消</button>
              <button onClick={handleInquire} style={{ padding: '8px 16px', border: 'none', borderRadius: '6px', background: '#16a34a', color: 'white', fontWeight: 'bold' }}>確認並送出投遞</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};