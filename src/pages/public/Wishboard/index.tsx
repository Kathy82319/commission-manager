// src/pages/public/Wishboard/index.tsx
import React, { useEffect, useState } from 'react';
import { apiClient } from '../../../api/client';
import '../../../styles/Wishboard.css';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

import { API_BASE } from './constants';
import { WishCard } from './WishCard';
import { FilterBar } from './FilterBar'; // 🌟 引入新拆分的篩選列
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

  const [postForm, setPostForm] = useState({
    title: '', content: '', tags: [] as string[], payment_methods: [] as string[],
    budget_min: '', budget_max: '', schedule_type: 'flexible', specific_date: '', ref_image_key: '', question_template: ''
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

  useEffect(() => { initData(); }, [activeTab]);

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
    if (!ticketData.success) throw new Error(ticketData.error || "無法取得上傳通行證");
    await fetch(ticketData.uploadUrl, { method: 'PUT', body: blob, headers: { 'Content-Type': fileType } });
    return `https://pub-1d4bcc7f19324c0d95d7bfdfeb1a69e2.r2.dev/${ticketData.fileName}`;
  };

  const handlePostImageUpload = async (resultBlobs: { preview: Blob }) => {
    setIsUploading(true);
    try {
      const url = await uploadToR2(resultBlobs.preview, 'wishboard');
      setPostForm(prev => ({ ...prev, ref_image_key: url }));
      showToast("圖片上傳成功！");
    } catch (err: any) { showToast(err.message || "圖片上傳失敗", "error"); } finally { setIsUploading(false); }
  };

  const handleInquireImageUpload = async (resultBlobs: { preview: Blob }) => {
    if (inquireDraft.images.length >= 3) return showToast("最多只能上傳 3 張參考圖", "error");
    setInquireUploading(true);
    try {
      const url = await uploadToR2(resultBlobs.preview, 'proposals');
      setInquireDraft(prev => ({ ...prev, images: [...prev.images, url] }));
      showToast("參考圖上傳成功！");
    } catch (err: any) { showToast(err.message || "圖片上傳失敗", "error"); } finally { setInquireUploading(false); }
  };

  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return showToast("請先登入才能發布", "error");
    try {
      const res = await apiClient.post('/api/bulletins', { ...postForm, category: activeTab });
      if (res.success) {
        showToast("發布成功！");
        setShowPostModal(false);
        setPostForm({ title: '', content: '', tags: [], payment_methods: [], budget_min: '', budget_max: '', schedule_type: 'flexible', specific_date: '', ref_image_key: '', question_template: '' });
        initData();
      }
    } catch (err) { showToast("發布失敗", "error"); }
  };

  const openInquireModal = (bulletin: any) => {
    setSelectedBulletin(bulletin);
    if (bulletin.category === 'offer') {
      setInquireDraft({ message: '', specialties: '', no_gos: '', payment_methods: '', question_template: '', images: [] });
    } else {
      let settings: any = {};
      try { settings = JSON.parse(currentUser?.profile_settings || '{}'); } catch(e) {}
      const card = settings.bulletin_card || {};
      setInquireDraft({
        message: '', specialties: card.specialties || '', no_gos: card.no_gos || '', payment_methods: card.payment_methods || '',
        question_template: settings.question_template || '', images: card.images || [] 
      });
    }
    setShowInquireModal(true);
  };

  const handleInquireSubmit = async () => {
    const finalDraft = { ...inquireDraft };
    if (selectedBulletin.category !== 'offer') {
      (['specialties', 'no_gos', 'payment_methods'] as const).forEach(field => {
        const val = inquireTagInputs[field].trim();
        if (val) {
          const current = finalDraft[field] ? finalDraft[field].split(' ').filter(t => t) : [];
          if (!current.includes(val)) finalDraft[field] = [...current, val].join(' ');
        }
      });
    }
    try {
      const res = await apiClient.post(`/api/bulletins/${selectedBulletin.id}/inquire`, { artist_snapshot: JSON.stringify(finalDraft) });
      if (res.success) {
        showToast(selectedBulletin.category === 'offer' ? '已成功送出需求單！' : '已成功發送投遞意向！');
        setShowInquireModal(false);
        initData();
      } else showToast(res.message || '操作失敗', "error");
    } catch (error) { showToast('操作發生錯誤', "error"); }
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
          <span>{toast.message}</span>
        </div>
      )}

      {/* 🌟 指揮 FilterBar 運作 */}
      <FilterBar 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedFilters={selectedFilters}
        toggleTag={toggleTag}
        currentUser={currentUser}
        onPostTrigger={() => setShowPostModal(true)}
      />

      <main className="wish-grid">
        {loading ? <div className="loading">載入中...</div> : (
          filteredBulletins.map(b => (
            <WishCard key={b.id} bulletin={b} currentUser={currentUser} onInquire={openInquireModal} />
          ))
        )}
      </main>

      {showPostModal && (
        <PostModal 
          activeTab={activeTab} postForm={postForm} setPostForm={setPostForm} isUploading={isUploading}
          onClose={() => setShowPostModal(false)} onSubmit={handlePostSubmit} onImageUpload={handlePostImageUpload} toggleTag={toggleTag}
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