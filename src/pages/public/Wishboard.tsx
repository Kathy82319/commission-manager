import React, { useEffect, useState } from 'react';
import { apiClient } from '../../api/client';
import '../../styles/Wishboard.css';
import { Calendar, DollarSign, Tag, Clock, Send, Plus, X, User, AlertCircle, CheckCircle2 } from 'lucide-react';
import { ImageUploader } from '../../components/ImageUploader'; // 🌟 引入你的上傳元件

const REQ_TAGS = ['不限', '頭貼', '半身', '全身', 'Q圖', '韓式', '日式', '美式', '夢向', '黑白', '單人', '雙人', '背景', '立繪', '厚塗', '塗鴉', '插圖', '服設', '包時'];
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
    title: '', specialties: '', no_gos: '', payment_methods: '', price_list: '', question_template: ''
  });

  const [postForm, setPostForm] = useState({
    title: '', content: '', tags: [] as string[], payment_methods: [] as string[],
    budget_min: '', budget_max: '', schedule_type: 'flexible', specific_date: '', ref_image_key: '' // 這裡現在會存完整的 URL
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

  // 🌟 使用與大頭貼一致的上傳邏輯
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
      
      // 存入完整的公開網址
      const finalUrl = `https://pub-1d4bcc7f19324c0d95d7bfdfeb1a69e2.r2.dev/${ticketData.fileName}`;
      setPostForm(prev => ({ ...prev, ref_image_key: finalUrl }));
      showToast("圖片上傳成功！");
    } catch (err: any) { 
      showToast(err.message || "圖片上傳失敗", "error"); 
    } finally { 
      setIsUploading(false); 
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

      {/* 🌟 修正 CSS 排版：左右不壓縮，中間可換行 */}
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
                    // 🌟 因為現在存的是完整 URL，所以直接吃 b.ref_image_key
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
                  <label>範例參考圖 (建議 1MB 內)</label>
                  {/* 🌟 改用 ImageUploader */}
                  {postForm.ref_image_key ? (
                    <div style={{ position: 'relative', width: '100%', height: '100px', borderRadius: '8px', overflow: 'hidden' }}>
                      <img src={postForm.ref_image_key} alt="預覽" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button type="button" onClick={() => setPostForm({...postForm, ref_image_key: ''})} style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', cursor: 'pointer' }}><X size={16}/></button>
                    </div>
                  ) : (
                    <ImageUploader 
                      onUpload={handleImageUpload} 
                      targetWidth={800} 
                      buttonText={isUploading ? "上傳中..." : "選擇圖片"} 
                      maxSizeMB={5} 
                    />
                  )}
                </div>
              </div>

              <div className="form-group">
                <label>需求標籤 (複選)</label>
                <div className="tag-selector">
                  {REQ_TAGS.map(t => (
                    <span key={t} className={`selectable-tag ${postForm.tags.includes(t) ? 'selected' : ''}`} onClick={() => toggleTag(t, 'tags')}>{t}</span>
                  ))}
                  
                  {/* 🌟 渲染自定義標籤 */}
                  {postForm.tags.filter(t => !REQ_TAGS.includes(t)).map(t => (
                    <span key={t} className="selectable-tag selected custom-tag">
                      {t} <X size={12} onClick={(e) => { e.stopPropagation(); removeCustomTag(t); }} />
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
                    <input type="number" placeholder="最低" value={postForm.budget_min} onChange={e => setPostForm({...postForm, budget_min: e.target.value})} />
                    <span>~</span>
                    <input type="number" placeholder="最高" value={postForm.budget_max} onChange={e => setPostForm({...postForm, budget_max: e.target.value})} />
                  </div>
                </div>
              </div>

              {/* 🌟 補上排單邏輯欄位 */}
              <div className="form-row">
                <div className="form-group" style={{ width: '100%' }}>
                  <label>排單需求</label>
                  <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                    <label style={{ fontWeight: 'normal', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                      <input 
                        type="radio" 
                        name="schedule" 
                        checked={postForm.schedule_type === 'flexible'} 
                        onChange={() => setPostForm({...postForm, schedule_type: 'flexible', specific_date: ''})} 
                      /> 可接受排單
                    </label>
                    <label style={{ fontWeight: 'normal', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                      <input 
                        type="radio" 
                        name="schedule" 
                        checked={postForm.schedule_type === 'fixed'} 
                        onChange={() => setPostForm({...postForm, schedule_type: 'fixed'})} 
                      /> 指定完成日期：
                    </label>
                    {postForm.schedule_type === 'fixed' && (
                      <input 
                        type="date" 
                        value={postForm.specific_date} 
                        onChange={e => setPostForm({...postForm, specific_date: e.target.value})} 
                        style={{ padding: '6px', borderRadius: '6px', border: '1px solid #ddd' }}
                        required
                      />
                    )}
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
      
      {/* 投遞意向 Modal (保持不變) */}
      {showInquireModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px', maxHeight: '85vh', overflowY: 'auto', background: 'white', padding: '24px', borderRadius: '16px' }}>
            <h2>投遞意向預覽與微調</h2>
            <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '20px' }}>以下內容將會發送給該案主。您可以針對本次委託進行暫時性的文字微調。</p>

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