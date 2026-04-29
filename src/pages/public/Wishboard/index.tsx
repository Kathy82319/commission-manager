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

  const [postForm, setPostForm] = useState({
    title: '', content: '', tags: [] as string[], payment_methods: [] as string[],
    budget_min: '', budget_max: '', schedule_type: 'flexible', specific_date: '', 
    ref_images: [] as string[], 
    question_template: '',
    commission_items: [] as { name: string, price: string }[],
    selection_type: 'fcfs' as 'fcfs' | 'curated',
    max_slots: '1',
    payment_timing: 'prepaid',
    payment_timing_detail: ''
  });

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
    return `https://pub-1d4bcc7f19324c0d95d7bfdfeb1a69e2.r2.dev/${ticketData.fileName}`;
  };

  const handlePostImageUpload = async (resultBlobs: { preview: Blob }) => {
    if (postForm.ref_images.length >= 5) return showToast("最多 5 張圖片", "error");
    if (resultBlobs.preview.size > 3 * 1024 * 1024) return showToast("單張不能超過 3MB", "error");
    setIsUploading(true);
    try {
      const url = await uploadToR2(resultBlobs.preview, 'wishboard');
      setPostForm(prev => ({ ...prev, ref_images: [...prev.ref_images, url] }));
      showToast("上傳成功");
    } catch (err) { showToast("上傳失敗", "error"); } finally { setIsUploading(false); }
  };

  const handleInquireImageUpload = async (resultBlobs: { preview: Blob }) => {
    if (inquireDraft.images.length >= 3) return showToast("最多 3 張", "error");
    setInquireUploading(true);
    try {
      const url = await uploadToR2(resultBlobs.preview, 'proposals');
      setInquireDraft(prev => ({ ...prev, images: [...prev.images, url] }));
      showToast("附件成功");
    } catch (err) { showToast("失敗", "error"); } finally { setInquireUploading(false); }
  };

  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return showToast("請先登入", "error");
    try {
      const res = await apiClient.post('/api/bulletins', { 
        ...postForm, 
        category: activeTab,
        ref_image_key: JSON.stringify(postForm.ref_images) 
      });
      if (res.success) {
        showToast("發布成功");
        setShowPostModal(false);
        setPostForm({ title: '', content: '', tags: [], payment_methods: [], budget_min: '', budget_max: '', schedule_type: 'flexible', specific_date: '', ref_images: [], question_template: '', commission_items: [], selection_type: 'fcfs', max_slots: '1', payment_timing: 'prepaid', payment_timing_detail: '' });
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
          userShowcase={userShowcase}
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