// src/pages/public/Wishboard/index.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../../api/client';
import '../../../styles/Wishboard.css'; 
import { AlertCircle, CheckCircle2 } from 'lucide-react';

import { API_BASE } from './constants';
import { WishCard } from './WishCard';
import { FilterBar } from './FilterBar';
import { RequestModal } from './PostModals/RequestModal';
import { OfferModal } from './PostModals/OfferModal';
import { InquireModal } from './InquireModals'; 

export const Wishboard: React.FC = () => {
  const navigate = useNavigate();
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

  // 🌟 新增：儲存本月許願池相關的額度使用量
  const [wishQuota, setWishQuota] = useState<{ 
    is_pro: boolean, 
    offer_used: number, offer_max: number, 
    request_inquire_used: number, request_inquire_max: number 
  } | null>(null);

  // 徵委託狀態
  const initialRequestForm = {
    title: '', content: '', tags: [] as string[], payment_methods: [] as string[],
    budget_min: '', budget_max: '', schedule_type: 'flexible', specific_date: '', 
    ref_image: '' 
  };
  const [requestForm, setRequestForm] = useState(initialRequestForm);

  // 接委託狀態
  const getInitialOfferForm = () => ({
    title: '', content: '', tags: [] as string[], payment_methods: [] as string[],
    schedule_type: 'flexible', specific_date: '', ref_images: [] as string[],
    questions: [''] as string[], tos_content: '',
    commission_items: [] as { name: string, price: string }[],
    selection_type: 'fcfs' as 'fcfs' | 'curated', max_slots: '1',
    payment_timing: 'prepaid', payment_timing_detail: ''
  });
  const [offerForm, setOfferForm] = useState(getInitialOfferForm());

  // 投單狀態
  const [inquireDraft, setInquireDraft] = useState({
    message: '', specialties: '', no_gos: '', payment_methods: '', 
    question_template: '', images: [] as string[]
  });
  const [inquireTagInputs, setInquireTagInputs] = useState({ 
    specialties: '', no_gos: '', payment_methods: '' 
  });

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadSavedDraft = () => {
    try {
      const saved = localStorage.getItem('wishboard_offer_draft');
      if (saved) {
        const parsed = JSON.parse(saved);
        setOfferForm(prev => ({ ...prev, ...parsed, ref_images: [] }));
        showToast('已載入您上次儲存的預設設定！');
      }
    } catch (e) { console.error('載入草稿失敗', e); }
  };

  const saveDraft = () => {
    try {
      const { tos_content, questions, payment_timing, payment_timing_detail, payment_methods, tags, commission_items } = offerForm;
      localStorage.setItem('wishboard_offer_draft', JSON.stringify({
        tos_content, questions, payment_timing, payment_timing_detail, payment_methods, tags, commission_items
      }));
      showToast('設定已儲存在瀏覽器！');
    } catch (e) { showToast('儲存失敗', 'error'); }
  };

  const initData = async () => {
    setLoading(true);
    try {
      const resBulletins = await apiClient.get(`/api/bulletins?category=${activeTab}`);
      if (resBulletins.success) setBulletins(resBulletins.data);
      
      const resUser = await apiClient.get('/api/users/me');
      if (resUser.success) {
        setCurrentUser(resUser.data);
        // 🌟 登入狀態下，額外請求一次本月額度資訊
        const resQuota = await apiClient.get('/api/bulletins/quota');
        if (resQuota.success) setWishQuota(resQuota.data);
      }
    } catch (e) { 
      console.log("訪客模式"); 
    } finally { 
      setLoading(false); 
    }
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
    if (showPostModal && activeTab === 'offer' && currentUser) fetchUserShowcase();
  }, [showPostModal, activeTab, currentUser]);

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
    return ticketData.fileName;
  };

  const handleRequestImageUpload = async (resultBlobs: { preview: Blob }) => {
    if (requestForm.ref_image) return showToast("徵委託只能上傳 1 張圖片", "error");
    if (resultBlobs.preview.size > 3 * 1024 * 1024) return showToast("單張不能超過 3MB", "error");
    setIsUploading(true);
    try {
      const fileName = await uploadToR2(resultBlobs.preview, 'wishboard');
      setRequestForm(prev => ({ ...prev, ref_image: fileName }));
      showToast("上傳成功");
    } catch (err) { showToast("上傳失敗", "error"); } finally { setIsUploading(false); }
  };

  const handleOfferImageUpload = async (resultBlobs: { preview: Blob }) => {
    if (offerForm.ref_images.length >= 5) return showToast("最多上傳 5 張圖片", "error");
    if (resultBlobs.preview.size > 3 * 1024 * 1024) return showToast("單張不能超過 3MB", "error");
    setIsUploading(true);
    try {
      const fileName = await uploadToR2(resultBlobs.preview, 'wishboard');
      setOfferForm(prev => ({ ...prev, ref_images: [...prev.ref_images, fileName] }));
      showToast("上傳成功");
    } catch (err) { showToast("上傳失敗", "error"); } finally { setIsUploading(false); }
  };

  const handleInquireImageUpload = async (resultBlobs: { preview: Blob }) => {
    if (inquireDraft.images.length >= 3) return showToast("最多上傳 3 張", "error");
    if (resultBlobs.preview.size > 3 * 1024 * 1024) return showToast("單張不能超過 3MB", "error");
    
    setInquireUploading(true);
    try {
      const fileName = await uploadToR2(resultBlobs.preview, 'proposals');
      setInquireDraft(prev => ({ ...prev, images: [...prev.images, fileName] }));
      showToast("附件上傳成功");
    } catch (err) { 
      showToast("上傳失敗", "error"); 
    } finally { 
      setInquireUploading(false); 
    }
  };

  // 🌟 新增：攔截發布按鈕，進行發佈額度判斷
  const handlePostTrigger = () => {
    if (activeTab === 'offer' && wishQuota && !wishQuota.is_pro) {
       if (wishQuota.offer_used >= wishQuota.offer_max) {
           showToast('免費版每月僅能發佈 1 則接委託，您的額度已用盡。', 'error');
           return;
       }
    }
    setShowPostModal(true);
  };

  // 🌟 新增：攔截投遞按鈕，進行投遞額度判斷
  const openInquireModal = (bulletin: any) => {
    if (bulletin.category === 'request' && wishQuota && !wishQuota.is_pro) {
       if (wishQuota.request_inquire_used >= wishQuota.request_inquire_max) {
           showToast('免費版每月僅能主動投遞 5 次案主委託，您的額度已用盡。', 'error');
           return;
       }
    }
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

  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return showToast("請先登入才能發布", "error");

    try {
      let payload: any = { category: activeTab };

      if (activeTab === 'request') {
        if (Number(requestForm.budget_min) < 0 || Number(requestForm.budget_max) < 0) {
          return showToast("金額不可為負數", "error");
        }
        payload = { 
          ...payload, 
          ...requestForm, 
          ref_image_key: requestForm.ref_image,
        };
      } else {
        payload = {
          ...payload, 
          ...offerForm,
          ref_image_key: JSON.stringify(offerForm.ref_images),
          questions: offerForm.questions.filter(q => q.trim() !== '') 
        };
      }

      const res = await apiClient.post('/api/bulletins', payload);
      if (res.success) {
        showToast("發布成功！");
        setShowPostModal(false);
        if (activeTab === 'request') setRequestForm(initialRequestForm);
        else setOfferForm(getInitialOfferForm());
        initData(); // 重新整理資料，包含最新額度
      } else showToast(res.message || "發布失敗", "error");
    } catch (err: any) { 
      showToast(err.message || "發布發生錯誤", "error"); 
    }
  };

  const handleInquireSubmit = async () => {
    try {
      const res = await apiClient.post(`/api/bulletins/${selectedBulletin.id}/inquire`, { 
        artist_snapshot: JSON.stringify(inquireDraft) 
      });
      
      if (res.success) {
        showToast("投遞成功！");
        setShowInquireModal(false);
        initData(); // 重新整理資料，包含最新額度
      } else {
        showToast(res.message || res.error || "投遞失敗", "error");
      }
    } catch (error: any) { 
      const errorMsg = error.response?.data?.message || error.message || "操作發生錯誤，請稍後再試";
      if (errorMsg === 'Failed to fetch') {
        showToast("網路連線異常，請檢查您的網路狀態", "error");
      } else {
        showToast(errorMsg, "error"); 
      }
    }
  };

  return (
    <div className="wishboard-page">
      {toast && (
        <div className={`toast-notification ${toast.type}`}>
          {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* 🌟 新增：免費版額度提示橫幅 */}
      {currentUser && wishQuota && !wishQuota.is_pro && (
        <div style={{ padding: '10px 20px', backgroundColor: '#FDF4E6', borderBottom: '1px solid #FDE0B5', color: '#A67B3E', fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>
            ⭐ <strong>免費版額度提醒：</strong>本月發佈接委託 ({wishQuota.offer_used}/{wishQuota.offer_max}) | 投遞徵委託 ({wishQuota.request_inquire_used}/{wishQuota.request_inquire_max})
          </span>
          <button onClick={() => navigate('/artist/settings')} style={{ background: '#A67B3E', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>
            升級專業版解鎖限制
          </button>
        </div>
      )}

      <FilterBar 
        activeTab={activeTab} setActiveTab={setActiveTab} 
        selectedFilters={selectedFilters} 
        toggleTag={(tag) => setSelectedFilters(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])} 
        currentUser={currentUser} 
        onPostTrigger={handlePostTrigger} // 🌟 替換為攔截函式
      />

      <main className="wish-grid">
        {loading ? <div className="loading">載入中...</div> : (
          bulletins
            .filter(b => selectedFilters.length === 0 || selectedFilters.every(f => JSON.parse(b.tags || '[]').includes(f)))
            .map(b => <WishCard key={b.id} bulletin={b} currentUser={currentUser} onInquire={openInquireModal} />)
        )}
      </main>

      {showPostModal && activeTab === 'request' && (
        <RequestModal 
          form={requestForm} setForm={setRequestForm} isUploading={isUploading}
          onClose={() => setShowPostModal(false)} onSubmit={handlePostSubmit} onImageUpload={handleRequestImageUpload}
        />
      )}

      {showPostModal && activeTab === 'offer' && (
        <OfferModal 
          form={offerForm} setForm={setOfferForm} isUploading={isUploading}
          onClose={() => setShowPostModal(false)} onSubmit={handlePostSubmit} onImageUpload={handleOfferImageUpload}
          userShowcase={userShowcase} onSaveDraft={saveDraft} onLoadDraft={loadSavedDraft}
        />
      )}

      {showInquireModal && (
        <InquireModal 
          selectedBulletin={selectedBulletin} inquireDraft={inquireDraft} setInquireDraft={setInquireDraft}
          inquireTagInputs={inquireTagInputs} setInquireTagInputs={setInquireTagInputs} inquireUploading={inquireUploading}
          onClose={() => setShowInquireModal(false)} onSubmit={handleInquireSubmit} 
          onImageUpload={handleInquireImageUpload} 
        />
      )}
    </div>
  );
};