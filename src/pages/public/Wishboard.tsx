import React, { useEffect, useState } from 'react';
import { apiClient } from '../../api/client';
import '../../styles/Wishboard.css';
import { Calendar, DollarSign, Tag, Clock, Send, Plus, X, User, AlertCircle, CheckCircle2 } from 'lucide-react';
import { ImageUploader } from '../../components/ImageUploader'; 

const REQ_TAGS = ['不限', '頭貼', '半身', '全身', 'Q圖', '韓式', '日系', '美式', '夢向', '黑白', '單人', '雙人', '背景', '立繪', '厚塗', '塗鴉', '插圖', '服設', '包時'];
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
  
  const [isUploading, setIsUploading] = useState(false);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  
  const [customTagInput, setCustomTagInput] = useState('');
  const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

  const [inquireDraft, setInquireDraft] = useState({
    message: '', specialties: '', no_gos: '', payment_methods: '', question_template: '', images: [] as string[]
  });
  
  // 🌟 新增：提案卡標籤輸入框的暫存狀態
  const [inquireTagInputs, setInquireTagInputs] = useState({
    specialties: '',
    no_gos: '',
    payment_methods: ''
  });
  
  const [inquireUploading, setInquireUploading] = useState(false);

  const [postForm, setPostForm] = useState({
    title: '', content: '', tags: [] as string[], payment_methods: [] as string[],
    budget_min: '', budget_max: '', schedule_type: 'flexible', specific_date: '', ref_image_key: '' 
  });

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

  const handleImageUpload = async (resultBlobs: { preview: Blob }) => {
    setIsUploading(true);
    try {
      const fileType = resultBlobs.preview.type || 'image/jpeg';
      const fileExt = fileType.split('/')[1] || 'jpg';
      const ticketRes = await fetch(`${API_BASE}/api/r2/upload-url`, {
        method: 'POST', 
        credentials: 'include', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          contentType: fileType, 
          bucketType: 'public', 
          originalName: `wishboard_${Date.now()}.${fileExt}`, 
          folder: 'wishboard' 
        }) 
      });
      const ticketData = await ticketRes.json();
      if (!ticketData.success) throw new Error(ticketData.error || "無法取得上傳通行證");
      
      const uploadRes = await fetch(ticketData.uploadUrl, { 
        method: 'PUT', 
        body: resultBlobs.preview, 
        headers: { 'Content-Type': fileType } 
      });
      if (!uploadRes.ok) throw new Error("上傳遭拒絕");
      
      const finalUrl = `https://pub-1d4bcc7f19324c0d95d7bfdfeb1a69e2.r2.dev/${ticketData.fileName}`;
      setPostForm(prev => ({ ...prev, ref_image_key: finalUrl }));
      showToast("圖片上傳成功！");
    } catch (err: any) { 
      showToast(err.message || "圖片上傳失敗", "error"); 
    } finally { 
      setIsUploading(false); 
    }
  };

  const handleInquireImageUpload = async (resultBlobs: { preview: Blob }) => {
    if (inquireDraft.images.length >= 3) {
      showToast("最多只能上傳 3 張參考圖", "error");
      return;
    }
    setInquireUploading(true);
    try {
      const fileType = resultBlobs.preview.type || 'image/jpeg';
      const fileExt = fileType.split('/')[1] || 'jpg';
      const ticketRes = await fetch(`${API_BASE}/api/r2/upload-url`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentType: fileType, bucketType: 'public', originalName: `proposal_${Date.now()}.${fileExt}`, folder: 'proposals' }) 
      });
      const ticketData = await ticketRes.json();
      if (!ticketData.success) throw new Error(ticketData.error || "無法取得上傳通行證");
      
      const uploadRes = await fetch(ticketData.uploadUrl, { method: 'PUT', body: resultBlobs.preview, headers: { 'Content-Type': fileType } });
      if (!uploadRes.ok) throw new Error("上傳遭拒絕");
      
      const finalUrl = `https://pub-1d4bcc7f19324c0d95d7bfdfeb1a69e2.r2.dev/${ticketData.fileName}`;
      setInquireDraft(prev => ({ ...prev, images: [...prev.images, finalUrl] }));
      showToast("參考圖上傳成功！");
    } catch (err: any) { 
      showToast(err.message || "圖片上傳失敗", "error"); 
    } finally { 
      setInquireUploading(false); 
    }
  };

  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return showToast("請先登入才能發布", "error");
    try {
      const res = await apiClient.post('/api/bulletins', { ...postForm, category: activeTab });
      if (res.success) {
        showToast("許願單發布成功！");
        setShowPostModal(false);
        setPostForm({ title: '', content: '', tags: [], payment_methods: [], budget_min: '', budget_max: '', schedule_type: 'flexible', specific_date: '', ref_image_key: '' });
        initData();
      }
    } catch (err) { showToast("發布失敗，請稍後再試", "error"); }
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

  const removeCustomTag = (tag: string) => {
    setPostForm(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));
  };

  // 🌟 處理提案卡內的標籤新增 (Enter 或 空格觸發)
  const handleInquireTagAdd = (field: 'specialties' | 'no_gos' | 'payment_methods') => {
    const value = inquireTagInputs[field].trim();
    if (!value) return;

    setInquireDraft(prev => {
      const currentTags = prev[field] ? prev[field].split(' ').filter(t => t) : [];
      if (currentTags.includes(value)) return prev;
      return { ...prev, [field]: [...currentTags, value].join(' ') };
    });
    setInquireTagInputs(prev => ({ ...prev, [field]: '' }));
  };

  // 🌟 處理提案卡內的標籤刪除
  const handleInquireTagRemove = (field: 'specialties' | 'no_gos' | 'payment_methods', tagToRemove: string) => {
    setInquireDraft(prev => {
      const currentTags = prev[field].split(' ').filter(t => t !== tagToRemove);
      return { ...prev, [field]: currentTags.join(' ') };
    });
  };

  const openInquireModal = (bulletinId: string) => {
    setSelectedBulletin(bulletinId);
    let settings: any = {};
    if (currentUser && currentUser.profile_settings) {
      try {
        settings = typeof currentUser.profile_settings === 'string' 
          ? JSON.parse(currentUser.profile_settings) 
          : currentUser.profile_settings;
      } catch(e) {}
    }
    
    const card = settings.bulletin_card || {};

    setInquireDraft({
      message: '', 
      specialties: card.specialties || '', 
      no_gos: card.no_gos || '', 
      payment_methods: card.payment_methods || '',
      question_template: settings.question_template || '',
      images: card.images || [] 
    });
    
    // 重置標籤輸入框狀態
    setInquireTagInputs({ specialties: '', no_gos: '', payment_methods: '' });
    
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
      } else { showToast(res.message || '投遞發生錯誤', "error"); }
    } catch (error: any) { showToast('投遞發生錯誤: ' + (error.message || ''), "error"); }
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
                <div className="wish-card-image-wrapper">
                  {b.ref_image_key ? (
                    <img src={b.ref_image_key} alt="範例圖" className="wish-card-img" />
                  ) : (
                    <div className="fallback-placeholder">
                      <User size={64} opacity={0.3} />
                      <span style={{marginTop: '10px'}}>無提供範例圖</span>
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
                      我有興趣 (發送履歷)
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </main>

      {/* 發布需求 Modal */}
      {showPostModal && (
        <div className="modal-overlay">
          <div className="post-modal" style={{ maxWidth: '800px' }}>
            <div className="modal-header">
              <h2>發布徵委託需求</h2>
              <button 
                type="button" 
                className="close-modal-btn" 
                onClick={() => setShowPostModal(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex' }}
              >
                <X size={24} color="#999" />
              </button>
            </div>
            
            <form onSubmit={handlePostSubmit} className="post-form" style={{ padding: '24px', gap: '20px' }}>
              <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                <div className="form-group" style={{ width: '240px', flexShrink: 0 }}>
                  <label>範例參考圖 (建議 1MB 內)</label>
                  {postForm.ref_image_key ? (
                    <div style={{ position: 'relative', width: '100%', height: '320px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #ddd' }}>
                      <img src={postForm.ref_image_key} alt="預覽" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button type="button" onClick={() => setPostForm({...postForm, ref_image_key: ''})} style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', cursor: 'pointer', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={16}/></button>
                    </div>
                  ) : (
                    <div style={{ width: '100%', height: '320px', borderRadius: '8px', overflow: 'hidden' }}>
                      <ImageUploader 
                        onUpload={handleImageUpload} 
                        targetWidth={800} 
                        buttonText={isUploading ? "上傳中..." : "選擇圖片"} 
                        maxSizeMB={5} 
                      />
                    </div>
                  )}
                </div>

                <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div className="form-group">
                    <label>標題</label>
                    <input type="text" placeholder="簡單描述你的需求" value={postForm.title} onChange={e => setPostForm({...postForm, title: e.target.value})} required style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                  </div>
                  
                  <div className="form-group">
                    <label>預算範圍</label>
                    <div className="budget-inputs" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <input type="number" placeholder="最低" value={postForm.budget_min} onChange={e => setPostForm({...postForm, budget_min: e.target.value})} style={{ width: '110px', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                      <span style={{ color: '#94a3b8', fontWeight: 'bold' }}>~</span>
                      <input type="number" placeholder="最高" value={postForm.budget_max} onChange={e => setPostForm({...postForm, budget_max: e.target.value})} style={{ width: '110px', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                    </div>
                  </div>

                  <div className="form-group" style={{ width: '100%' }}>
                    <label>排單需求</label>
                    <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap', minHeight: '42px' }}>
                      <label style={{ fontWeight: 'normal', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', whiteSpace: 'nowrap', color: '#475569' }}>
                        <input 
                          type="radio" 
                          name="schedule" 
                          checked={postForm.schedule_type === 'flexible'} 
                          onChange={() => setPostForm({...postForm, schedule_type: 'flexible', specific_date: ''})} 
                          style={{ width: '18px', height: '18px', margin: 0, cursor: 'pointer' }}
                        /> 可接受排單
                      </label>
                      <label style={{ fontWeight: 'normal', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', whiteSpace: 'nowrap', color: '#475569' }}>
                        <input 
                          type="radio" 
                          name="schedule" 
                          checked={postForm.schedule_type === 'fixed'} 
                          onChange={() => setPostForm({...postForm, schedule_type: 'fixed'})} 
                          style={{ width: '18px', height: '18px', margin: 0, cursor: 'pointer' }}
                        /> 指定完成日期：
                      </label>
                      {postForm.schedule_type === 'fixed' && (
                        <input 
                          type="date" 
                          value={postForm.specific_date} 
                          onChange={e => setPostForm({...postForm, specific_date: e.target.value})} 
                          style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', flexShrink: 0 }}
                          required
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>付款方式</label>
                <div className="tag-selector">
                  {PAY_TAGS.map(t => (
                    <span key={t} className={`selectable-tag ${postForm.payment_methods.includes(t) ? 'selected' : ''}`} onClick={() => toggleTag(t, 'payment_methods')}>{t}</span>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>需求標籤 (複選)</label>
                <div className="tag-selector">
                  {REQ_TAGS.map(t => (
                    <span key={t} className={`selectable-tag ${postForm.tags.includes(t) ? 'selected' : ''}`} onClick={() => toggleTag(t, 'tags')}>{t}</span>
                  ))}
                  
                  {postForm.tags.filter(t => !REQ_TAGS.includes(t)).map(t => (
                    <span key={t} className="selectable-tag selected custom-tag" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {t} <X size={12} style={{ cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); removeCustomTag(t); }} />
                    </span>
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
                    style={{ width: '160px', padding: '6px 12px', borderRadius: '20px', border: '1px dashed #aaa' }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>詳細需求說明</label>
                <textarea rows={3} value={postForm.content} onChange={e => setPostForm({...postForm, content: e.target.value})} required style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }}></textarea>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '8px' }}>
                <button type="submit" className="submit-post-btn" disabled={isUploading} style={{ background: '#ff8c00', color: 'white', padding: '12px 28px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px', boxShadow: '0 4px 12px rgba(255, 140, 0, 0.3)' }}>發布許願單</button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* 投遞意向 Modal (提案卡) */}
      {showInquireModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '650px', maxHeight: '90vh', overflowY: 'auto', background: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: '15px', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '20px', color: '#333' }}>發送專屬提案卡</h2>
              <button onClick={() => setShowInquireModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: '50%' }}><X color="#999" /></button>
            </div>
            
            <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '20px', lineHeight: '1.6' }}>
              與其丟文字履歷，不如直接給案主看您的作品！<br/>
              您可以上傳精美的價目表或排版圖，讓案主一目了然。
            </p>

            <div className="form-group" style={{ marginBottom: '25px' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', color: '#334155' }}>附上參考圖 / 價目表 (最多 3 張)</label>
              <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                {inquireDraft.images.map((imgUrl, idx) => (
                  <div key={idx} style={{ position: 'relative', width: '120px', height: '120px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                    <img src={imgUrl} alt={`附件 ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button type="button" onClick={() => setInquireDraft(prev => ({...prev, images: prev.images.filter((_, i) => i !== idx)}))} style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', cursor: 'pointer', padding: '4px', display: 'flex' }}><X size={14}/></button>
                  </div>
                ))}
                {inquireDraft.images.length < 3 && (
                  <div style={{ width: '120px', height: '120px', flexShrink: 0 }}>
                    <ImageUploader 
                      onUpload={handleInquireImageUpload} 
                      targetWidth={1000} 
                      buttonText={inquireUploading ? "上傳中..." : "+ 新增附圖"} 
                      maxSizeMB={3} 
                    />
                  </div>
                )}
              </div>
            </div>

            <div style={{ borderTop: '1px dashed #e2e8f0', margin: '25px 0' }}></div>

            <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '15px' }}>以下資訊已由您的「接案設定」自動帶入，若要新增請輸入後按下enter會自動變成標籤</p>

{/* 🌟 修正後的標籤化輸入區塊：舒適圈、雷點、付款方式 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
              {/* 舒適圈標籤輸入 */}
              <div className="form-group">
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px', fontSize: '13px', color: '#ff8c00' }}>您的舒適圈 / 擅長題材</label>
                <div className="tag-selector" style={{ border: '1px solid #cbd5e1', padding: '6px', borderRadius: '6px', background: '#fff', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {inquireDraft.specialties.split(' ').filter(t => t).map((tag, i) => (
                    <span key={i} className="selectable-tag selected custom-tag" style={{ margin: 0, padding: '4px 8px', fontSize: '12px', backgroundColor: '#fff5eb', color: '#ff8c00', borderColor: '#ffd2a6' }}>
                      {tag} <X size={12} onClick={() => handleInquireTagRemove('specialties', tag)} style={{ cursor: 'pointer' }} />
                    </span>
                  ))}
                  <input 
                    type="text" 
                    placeholder="+ 項目"
                    value={inquireTagInputs.specialties}
                    onChange={(e) => setInquireTagInputs({...inquireTagInputs, specialties: e.target.value})}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleInquireTagAdd('specialties');
                      }
                    }}
                    style={{ flex: 1, border: 'none', padding: '4px', fontSize: '12px', outline: 'none', minWidth: '60px' }}
                  />
                </div>
              </div>
              
              {/* 雷點標籤輸入 */}
              <div className="form-group">
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px', fontSize: '13px', color: '#e65c5c' }}>不擅長 / 雷點</label>
                <div className="tag-selector" style={{ border: '1px solid #cbd5e1', padding: '6px', borderRadius: '6px', background: '#fff', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {inquireDraft.no_gos.split(' ').filter(t => t).map((tag, i) => (
                    <span key={i} className="selectable-tag selected custom-tag" style={{ margin: 0, padding: '4px 8px', fontSize: '12px', backgroundColor: '#fff0f0', color: '#e65c5c', borderColor: '#f1a9a9' }}>
                      {tag} <X size={12} onClick={() => handleInquireTagRemove('no_gos', tag)} style={{ cursor: 'pointer' }} />
                    </span>
                  ))}
                  <input 
                    type="text" 
                    placeholder="+ 項目"
                    value={inquireTagInputs.no_gos}
                    onChange={(e) => setInquireTagInputs({...inquireTagInputs, no_gos: e.target.value})}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleInquireTagAdd('no_gos');
                      }
                    }}
                    style={{ flex: 1, border: 'none', padding: '4px', fontSize: '12px', outline: 'none', minWidth: '60px' }}
                  />
                </div>
              </div>
            </div>

            {/* 付款方式標籤輸入 */}
            <div className="form-group" style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px', fontSize: '13px', color: '#4E7A5A' }}>接受的付款方式</label>
              <div className="tag-selector" style={{ border: '1px solid #cbd5e1', padding: '6px', borderRadius: '6px', background: '#fff', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {inquireDraft.payment_methods.split(' ').filter(t => t).map((tag, i) => (
                  <span key={i} className="selectable-tag selected custom-tag" style={{ margin: 0, padding: '4px 8px', fontSize: '12px', backgroundColor: '#f2f5f3', color: '#4e7a5a', borderColor: '#b5c9bc' }}>
                    {tag} <X size={12} onClick={() => handleInquireTagRemove('payment_methods', tag)} style={{ cursor: 'pointer' }} />
                  </span>
                ))}
                <input 
                  type="text" 
                  placeholder="+ 方式"
                  value={inquireTagInputs.payment_methods}
                  onChange={(e) => setInquireTagInputs({...inquireTagInputs, payment_methods: e.target.value})}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleInquireTagAdd('payment_methods');
                    }
                  }}
                  style={{ flex: 1, border: 'none', padding: '4px', fontSize: '12px', outline: 'none', minWidth: '60px' }}
                />
              </div>
            </div>

            {/* 提問模板 */}
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px', fontSize: '14px', color: '#9333ea' }}>
                初步細節提問單 <span style={{ fontWeight: 'normal', color: '#94a3b8' }}>(若案主按下邀請詳談，系統將請他填寫)</span>
              </label>
              <p style={{ fontSize: '13px', color: '#64748b', marginTop: '0', marginBottom: '10px', lineHeight: '1.5' }}>
                💡 <strong>功能說明：</strong>請在此填寫您想請案主預先回答的問題（例如：人物設定、是否需要加急、預計用途）。當案主回覆後，這份回覆將會成為後續洽談與正式委託單的基礎參考。
              </p>
              <textarea 
                value={inquireDraft.question_template} 
                onChange={(e) => setInquireDraft({...inquireDraft, question_template: e.target.value})} 
                rows={4} 
                placeholder={`1. 角色是否有設定圖？\n2. 是否為商用？\n3. 目前手上排單狀況說明...`}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} 
              />
            </div>

            <div className="modal-actions" style={{ marginTop: '25px', display: 'flex', gap: '12px', justifyContent: 'flex-end', borderTop: '1px solid #eee', paddingTop: '20px' }}>
              <button onClick={() => setShowInquireModal(false)} style={{ padding: '10px 20px', border: '1px solid #cbd5e1', borderRadius: '8px', background: 'white', color: '#64748b', fontWeight: 'bold', cursor: 'pointer' }}>取消</button>
              <button onClick={handleInquire} disabled={inquireUploading} style={{ padding: '10px 24px', border: 'none', borderRadius: '8px', background: '#ff8c00', color: 'white', fontWeight: 'bold', cursor: inquireUploading ? 'not-allowed' : 'pointer', opacity: inquireUploading ? 0.7 : 1 }}>發送專屬提案</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};