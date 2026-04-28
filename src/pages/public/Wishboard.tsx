// src/pages/public/Wishboard.tsx
import React, { useEffect, useState, useRef } from 'react';
import { apiClient } from '../../api/client';
import '../../styles/Wishboard.css';
import { Calendar, DollarSign, Tag, Clock, Send, Plus, X, Upload } from 'lucide-react';

// 定義標籤常數
const REQ_TAGS = ['不限', '頭貼', '半身', '全身', 'Q圖', '韓式', '日式', '美式', '夢向', '黑白', '單人', '雙人', '背景', '立繪', '厚塗', '塗鴉', '插圖', '服設', '包時'];
const PAY_TAGS = ['皆可配合', '無卡', '匯款', '空包', '超商'];

export const Wishboard: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [bulletins, setBulletins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'request' | 'offer' | 'other'>('request');
  
  // 篩選狀態
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);

  // Modal 狀態
  const [showPostModal, setShowPostModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // 發布表單狀態
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [postForm, setPostForm] = useState({
    title: '',
    content: '',
    tags: [] as string[],
    customTag: '',
    payment_methods: [] as string[],
    budget_min: '',
    budget_max: '',
    schedule_type: 'flexible',
    specific_date: '',
    ref_image_key: ''
  });

  const initData = async () => {
    setLoading(true);
    try {
      const resBulletins = await apiClient.get('/api/bulletins');
      if (resBulletins.success) {
        setBulletins(resBulletins.data);
      }
      const resUser = await apiClient.get('/api/users/me');
      if (resUser.success) setCurrentUser(resUser.data);
    } catch (error) {
      console.error("載入失敗", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { initData(); }, []);

  // 🛡️ 資安提醒：前端檢查僅為 UX，後端必須同樣驗證 1MB 限制
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1 * 1024 * 1024) {
      alert("檔案大小不得超過 1MB");
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      // 這裡假設你有一個 /api/upload 端點處理 R2 上傳
      const res = await apiClient.post('/api/upload', formData);
      if (res.success) {
        setPostForm(prev => ({ ...prev, ref_image_key: res.key }));
      }
    } catch (err) {
      alert("上傳失敗");
    } finally {
      setIsUploading(false);
    }
  };

  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return alert("請先登入");

    try {
      const res = await apiClient.post('/api/bulletins', {
        ...postForm,
        category: activeTab,
        tags: postForm.tags,
        payment_methods: postForm.payment_methods
      });
      if (res.success) {
        alert("發布成功");
        setShowPostModal(false);
        initData();
      }
    } catch (err) {
      alert("發布失敗");
    }
  };

  const toggleTag = (tag: string, field: 'tags' | 'payment_methods' | 'filters') => {
    if (field === 'filters') {
      setSelectedFilters(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
      return;
    }
    setPostForm(prev => {
      const list = prev[field];
      return {
        ...prev,
        [field]: list.includes(tag) ? list.filter(t => t !== tag) : [...list, tag]
      };
    });
  };

  const getTimeRemaining = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - new Date().getTime();
    if (diff <= 0) return '已結束';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    return hours > 24 ? `剩餘 ${Math.floor(hours / 24)}天` : `剩餘 ${hours}小時`;
  };

  // 篩選邏輯
  const filteredBulletins = bulletins.filter(b => {
    const matchTab = b.category === activeTab;
    if (!matchTab) return false;
    if (selectedFilters.length === 0) return true;
    const bTags = JSON.parse(b.tags || '[]');
    return selectedFilters.every(f => bTags.includes(f));
  });

  return (
    <div className="wishboard-page">
      {/* 頂部篩選區 */}
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
          {REQ_TAGS.slice(0, 10).map(tag => (
            <button 
              key={tag} 
              className={selectedFilters.includes(tag) ? 'active' : ''}
              onClick={() => toggleTag(tag, 'filters')}
            >
              {tag}
            </button>
          ))}
        </div>
        {currentUser && (
          <button className="post-trigger-btn" onClick={() => setShowPostModal(true)}>
            <Plus size={20} /> 發布需求
          </button>
        )}
      </div>

      {/* 許願牆主體 - 滿版卡片 */}
      <main className="wish-grid">
        {loading ? <div className="loading">載入中...</div> : (
          filteredBulletins.map(b => (
            <div key={b.id} className="wish-card-wide">
              <div className="wish-card-image">
                <img src={b.ref_image_key ? `https://pub-r2.your-domain.com/${b.ref_image_key}` : '/placeholder-img.jpg'} alt="範例圖" />
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

                <button className="inquire-btn" onClick={() => {/* 跳轉或打開投遞 Modal */}}>
                  我有興趣 (發送投遞意向)
                </button>
              </div>
            </div>
          ))
        )}
      </main>

      {/* 發布彈窗 (簡化演示核心欄位) */}
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
                  <div className="upload-box" onClick={() => fileInputRef.current?.click()}>
                    {postForm.ref_image_key ? '已上傳' : <><Upload size={16}/> 選擇檔案</>}
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
                  <input type="text" className="inline-tag-input" placeholder="+ 自定義" value={postForm.customTag} 
                    onChange={e => setPostForm({...postForm, customTag: e.target.value})}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && postForm.customTag) {
                        e.preventDefault();
                        toggleTag(postForm.customTag, 'tags');
                        setPostForm({...postForm, customTag: ''});
                      }
                    }}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>付款方式</label>
                  <div className="tag-selector">
                    {PAY_TAGS.map(t => (
                      <span key={t} className={`selectable-tag ${postForm.payment_methods.includes(t) ? 'selected' : ''}`} onClick={() => toggleTag(t, 'payment_methods')}>{t}</span>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label>預算範圍</label>
                  <div className="budget-inputs">
                    <input type="number" placeholder="Min" value={postForm.budget_min} onChange={e => setPostForm({...postForm, budget_min: e.target.value})} />
                    <span>~</span>
                    <input type="number" placeholder="Max" value={postForm.budget_max} onChange={e => setPostForm({...postForm, budget_max: e.target.value})} />
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>詳細需求說明</label>
                <textarea rows={4} value={postForm.content} onChange={e => setPostForm({...postForm, content: e.target.value})} required></textarea>
              </div>

              <div className="modal-footer">
                <button type="submit" className="submit-post-btn" disabled={isUploading}>發布許願單</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};