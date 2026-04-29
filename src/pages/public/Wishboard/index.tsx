// src/pages/public/Wishboard/index.tsx
import React, { useEffect, useState } from 'react';
import { apiClient } from '../../../api/client';
import '../../../styles/Wishboard.css';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

import { API_BASE } from './constants';
import { WishCard } from './WishCard';
import { FilterBar } from './FilterBar';
import { PostModal } from './PostModals';
import { InquireModal } from './InquireModals';

export const Wishboard: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [bulletins, setBulletins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'request' | 'offer' | 'other'>('request');
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [showPostModal, setShowPostModal] = useState(false);
  const [showInquireModal, setShowInquireModal] = useState(false);
  const [selectedBulletin, setSelectedBulletin] = useState<any | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [inquireUploading, setInquireUploading] = useState(false);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [userShowcase, setUserShowcase] = useState<any[]>([]);

  // 🌟 初始狀態定義 (從 localStorage 讀取或給預設值)
  const getInitialPostForm = () => {
    return {
      title: '', content: '', tags: [] as string[], payment_methods: [] as string[],
      budget_min: '', budget_max: '', schedule_type: 'flexible', specific_date: '', 
      ref_images: [] as string[], 
      
      // 🌟 新增：提問模板改為陣列，最多三題
      questions: [''] as string[], 
      
      // 🌟 新增：服務條款
      tos_content: '',

      commission_items: [] as { name: string, price: string }[],
      selection_type: 'fcfs' as 'fcfs' | 'curated',
      max_slots: '1',
      payment_timing: 'prepaid',
      payment_timing_detail: ''
    };
  };

  const [postForm, setPostForm] = useState(getInitialPostForm());

  const [inquireDraft, setInquireDraft] = useState({
    message: '', specialties: '', no_gos: '', payment_methods: '', question_template: '', images: [] as string[]
  });
  const [inquireTagInputs, setInquireTagInputs] = useState({
    specialties: '', no_gos: '', payment_methods: ''
  });

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // 🌟 新增：載入與儲存草稿的功能
  const loadSavedDraft = () => {
    try {
      const saved = localStorage.getItem('wishboard_offer_draft');
      if (saved) {
        const parsed = JSON.parse(saved);
        // 合併已存的設定與初始的乾淨設定
        setPostForm(prev => ({ ...prev, ...parsed, ref_images: [] })); // 圖片不記，避免網址失效
        showToast('已載入您上次儲存的預設設定！');
      }
    } catch (e) {
      console.error('載入草稿失敗', e);
    }
  };

  const saveDraft = () => {
    try {
      // 只儲存常態性的設定，不存標題與內容
      const { tos_content, questions, payment_timing, payment_timing_detail, payment_methods, tags, commission_items } = postForm;
      localStorage.setItem('wishboard_offer_draft', JSON.stringify({
        tos_content, questions, payment_timing, payment_timing_detail, payment_methods, tags, commission_items
      }));
      showToast('設定已儲存在瀏覽器！');
    } catch (e) {
      showToast('儲存失敗', 'error');
    }
  };

  const initData = async () => {
    setLoading(true);
    try {
      const resBulletins = await apiClient.get(`/api/bulletins?category=${activeTab}`);
      if (resBulletins.success) setBulletins(resBulletins.data);
      const resUser = await apiClient.get('/api/users/me');
      if (resUser.success) setCurrentUser(resUser.data);
    } catch (e) { console.log("訪客模式"); } finally { setLoading(false); }
  };

  const fetchUserShowcase = async () => {
    if (!currentUser) return;
    try {
      const res = await apiClient.get('/api/showcase');
      if (res.success) setUserShowcase(res.data);
    } catch (e) { console.error("作品集載入失敗"); }
  };

  useEffect(() => { initData(); }, [activeTab]);

  useEffect(() => {
    if (showPostModal && activeTab === 'offer' && currentUser) {
      fetchUserShowcase();
    }
  }, [showPostModal, activeTab, currentUser]);

  const toggleTag = (tag: string, field: 'tags' | 'payment_methods' | 'filters') => {
    if (field === 'filters') {
      if (tag === '不限') setSelectedFilters([]);
      else setSelectedFilters(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
      return;
    }
    setPostForm(prev => {
      let list = prev[field];
      const exclusiveTag = field === 'tags' ? '不限' : '皆可配合';
      if (tag === exclusiveTag) list = list.includes(tag) ? [] : [tag];
      else list = list.includes(tag) ? list.filter(t => t !== tag) : [...list.filter(t => t !== exclusiveTag), tag];
      return { ...prev, [field]: list };
    });
  };

  const uploadToR2 = async (blob: Blob, folder: string) => {
    const fileType = blob.type || 'image/jpeg';
    const fileExt = fileType.split('/')[1] || 'jpg';
    const ticketRes = await fetch(`${API_BASE}/api/r2/upload-url`, {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contentType: fileType, bucketType: 'public', originalName: `${folder}_${Date.now()}.${fileExt}`, folder }) 
    });
    const ticketData = await ticketRes.json();
    if (!ticketData.success) throw new Error(ticketData.error);
    await fetch(ticketData.uploadUrl, { method: 'PUT', body: blob, headers: { 'Content-Type': fileType } });
    
    // 🌟 修正：只回傳檔案名稱，由前端統一加上 R2_PUBLIC_URL 顯示，避免路徑重複
    return ticketData.fileName;
  };

  const handlePostImageUpload = async (resultBlobs: { preview: Blob }) => {
    // 🌟 修正：判斷目前的分頁模式，徵委託 1 張，接委託 5 張
    const limit = activeTab === 'request' ? 1 : 5;
    if (postForm.ref_images.length >= limit) {
      return showToast(`此模式最多只能上傳 ${limit} 張圖片`, "error");
    }

    if (resultBlobs.preview.size > 3 * 1024 * 1024) return showToast("單張不能超過 3MB", "error");
    
    setIsUploading(true);
    try {
      const fileName = await uploadToR2(resultBlobs.preview, 'wishboard');
      setPostForm(prev => ({ ...prev, ref_images: [...prev.ref_images, fileName] }));
      showToast("上傳成功");
    } catch (err) { showToast("上傳失敗", "error"); } finally { setIsUploading(false); }
  };

  const handleInquireImageUpload = async (resultBlobs: { preview: Blob }) => {
    if (inquireDraft.images.length >= 3) return showToast("最多 3 張", "error");
    setInquireUploading(true);
    try {
      const fileName = await uploadToR2(resultBlobs.preview, 'proposals');
      setInquireDraft(prev => ({ ...prev, images: [...prev.images, fileName] }));
      showToast("附件成功");
    } catch (err) { showToast("失敗", "error"); } finally { setInquireUploading(false); }
  };

  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return showToast("請先登入", "error");
    
    if (activeTab === 'request') {
      if (Number(postForm.budget_min) < 0 || Number(postForm.budget_max) < 0) {
        return showToast("預算金額不可以是負數喔！", "error");
      }
    }

    try {
      // 🌟 處理發布資料：若為接委託，我們將整個陣列轉成 JSON 字串存入資料庫
      const payload = {
        ...postForm,
        category: activeTab,
        // 如果是接委託，用 JSON 存圖片陣列；如果是徵委託且只有一張，直接存字串（為相容舊資料）
        ref_image_key: activeTab === 'offer' 
          ? JSON.stringify(postForm.ref_images) 
          : (postForm.ref_images[0] || ''),
        // 打包複雜內容存入 content 欄位 (可依照你的後端設計調整)
        content: activeTab === 'offer' ? JSON.stringify({
          description: postForm.content,
          commission_items: postForm.commission_items,
          tos_content: postForm.tos_content,
          payment_timing: postForm.payment_timing,
          payment_timing_detail: postForm.payment_timing_detail,
          questions: postForm.questions.filter(q => q.trim() !== '') // 濾掉空白問題
        }) : postForm.content
      };

      const res = await apiClient.post('/api/bulletins', payload);
      
      if (res.success) {
        showToast("發布成功");
        setShowPostModal(false);
        setPostForm(getInitialPostForm()); // 重置為初始狀態
        initData();
      } else showToast(res.message, "error");
    } catch (err: any) { showToast(err.message, "error"); }
  };

  const openInquireModal = (bulletin: any) => {
    setSelectedBulletin(bulletin);
    if (bulletin.category === 'offer') {
      setInquireDraft({ message: '', specialties: '', no_gos: '', payment_methods: '', question_template: '', images: [] });
    } else {
      let settings = JSON.parse(currentUser?.profile_settings || '{}');
      const card = settings.bulletin_card || {};
      setInquireDraft({ message: '', specialties: card.specialties || '', no_gos: card.no_gos || '', payment_methods: card.payment_methods || '', question_template: settings.question_template || '', images: card.images || [] });
    }
    setShowInquireModal(true);
  };

  const handleInquireSubmit = async () => {
    try {
      const res = await apiClient.post(`/api/bulletins/${selectedBulletin.id}/inquire`, { artist_snapshot: JSON.stringify(inquireDraft) });
      if (res.success) {
        showToast("已送出");
        setShowInquireModal(false);
        initData();
      } else showToast("失敗", "error");
    } catch (error) { showToast("發生錯誤", "error"); }
  };

  return (
    <div className="wishboard-page">
      {toast && (
        <div className={`toast-notification ${toast.type}`}>
          {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      <FilterBar 
        activeTab={activeTab} setActiveTab={setActiveTab} 
        selectedFilters={selectedFilters} toggleTag={toggleTag} 
        currentUser={currentUser} onPostTrigger={() => setShowPostModal(true)} 
      />

      <main className="wish-grid">
        {loading ? <div className="loading">載入中...</div> : (
          bulletins.filter(b => selectedFilters.length === 0 || selectedFilters.every(f => JSON.parse(b.tags || '[]').includes(f))).map(b => (
            <WishCard key={b.id} bulletin={b} currentUser={currentUser} onInquire={openInquireModal} />
          ))
        )}
      </main>

      {showPostModal && (
        <PostModal 
          activeTab={activeTab} postForm={postForm} setPostForm={setPostForm} isUploading={isUploading}
          onClose={() => setShowPostModal(false)} onSubmit={handlePostSubmit} onImageUpload={handlePostImageUpload} toggleTag={toggleTag}
          userShowcase={userShowcase} onSaveDraft={saveDraft} onLoadDraft={loadSavedDraft}
        />
      )}

      {showInquireModal && (
        <InquireModal 
          selectedBulletin={selectedBulletin} inquireDraft={inquireDraft} setInquireDraft={setInquireDraft}
          inquireTagInputs={inquireTagInputs} setInquireTagInputs={setInquireTagInputs} inquireUploading={inquireUploading}
          onClose={() => setShowInquireModal(false)} onSubmit={handleInquireSubmit} onImageUpload={handleInquireImageUpload}
        />
      )}
    </div>
  );
};