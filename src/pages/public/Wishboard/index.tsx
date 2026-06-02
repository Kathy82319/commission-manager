// src/pages/public/Wishboard/index.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { apiClient } from '../../../api/client';
import '../../../styles/Wishboard.css'; 
import { AlertCircle, CheckCircle2, ShieldAlert, ScrollText, X } from 'lucide-react';

import { API_BASE } from './constants';
import { WishCard } from './WishCard';
import { FilterBar } from './FilterBar';
import { RequestModal } from './PostModals/RequestModal';
import { OfferModal } from './PostModals/OfferModal';
import { InquireModal } from './InquireModals'; 
import { OCDetailCard } from '../../../components/OC/OCDetailCard';

export const Wishboard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation(); 
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [bulletins, setBulletins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState<'request' | 'offer' | 'other'>(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    return (tabParam === 'request' || tabParam === 'other') ? tabParam : 'offer';
  });
  
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [showPostModal, setShowPostModal] = useState(false);
  const [showInquireModal, setShowInquireModal] = useState(false);
  const [selectedBulletin, setSelectedBulletin] = useState<any | null>(null);
  const [showUpgradeGuide, setShowUpgradeGuide] = useState<{ show: boolean, type: 'post' | 'inquire' }>({ show: false, type: 'post' });
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [rulesTab, setRulesTab] = useState<'info' | 'rules'>('info');
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [inquireUploading, setInquireUploading] = useState(false); 
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [userPortfolio, setUserPortfolio] = useState<string[]>([]);
  const [wishQuota, setWishQuota] = useState<{ 
    is_pro: boolean, 
    offer_used: number, offer_max: number, 
    request_inquire_used: number, request_inquire_max: number 
  } | null>(null);

  const [viewingOCSnapshot, setViewingOCSnapshot] = useState<any | null>(null);
  const [editingBulletin, setEditingBulletin] = useState<any | null>(null);

  const initialRequestForm = {
    title: '', content: '', tags: [] as string[], payment_methods: [] as string[],
    budget_min: '', budget_max: '', schedule_type: 'flexible', specific_date: '', 
    ref_image: '', oc_snapshot: null 
  };
  const [requestForm, setRequestForm] = useState(initialRequestForm);

  const getInitialOfferForm = () => ({
    title: '', content: '', tags: [] as string[], payment_methods: [] as string[],
    schedule_type: 'flexible', specific_date: '', ref_images: [] as string[],
    questions: [''] as string[], tos_content: '',
    commission_items: [] as { name: string, price: string }[],
    selection_type: 'fcfs' as 'fcfs' | 'curated', max_slots: '1',
    payment_timing: 'prepaid', payment_timing_detail: ''
  });
  const [offerForm, setOfferForm] = useState(getInitialOfferForm());

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
      const {
        title, content,
        tos_content, questions,
        payment_timing, payment_timing_detail, payment_methods,
        tags, commission_items,
        schedule_type, specific_date,
        max_slots, selection_type
      } = offerForm;
      localStorage.setItem('wishboard_offer_draft', JSON.stringify({
        title, content,
        tos_content, questions,
        payment_timing, payment_timing_detail, payment_methods,
        tags, commission_items,
        schedule_type, specific_date,
        max_slots, selection_type
      }));
      showToast('設定已儲存在瀏覽器！');
    } catch (e) { showToast('儲存失敗', 'error'); }
  };

  const initData = async () => {
    setLoading(true);
    try {
      if (activeTab !== 'other') {
        const resBulletins = await apiClient.get(`/api/bulletins?category=${activeTab}`);
        if (resBulletins.success) setBulletins(resBulletins.data);
      }
      
      const resUser = await apiClient.get('/api/users/me');
      if (resUser.success) {
        setCurrentUser(resUser.data);
        loadUserPortfolio(resUser.data);
        const resQuota = await apiClient.get('/api/bulletins/quota');
        if (resQuota.success) setWishQuota(resQuota.data);
      }
    } catch (e) { 
      console.log("訪客模式"); 
    } finally { 
      setLoading(false); 
    }
  };

  const loadUserPortfolio = (userData: any) => {
    try {
      const settings = JSON.parse(userData?.profile_settings || '{}');
      setUserPortfolio(Array.isArray(settings.portfolio) ? settings.portfolio : []);
    } catch { setUserPortfolio([]); }
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    if (tabParam === 'offer' || tabParam === 'request' || tabParam === 'other') {
      setActiveTab(tabParam);
    } else {
      setActiveTab('offer');
    }
  }, [location.search]);

  useEffect(() => { initData(); }, [activeTab]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const idParam = params.get('id');
    if (!idParam || loading) return;
    setHighlightedId(idParam);
    const el = document.getElementById(`card-${idParam}`);
    if (el) {
      setTimeout(() => {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
    const timer = setTimeout(() => setHighlightedId(null), 4000);
    return () => clearTimeout(timer);
  }, [location.search, loading]);


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

  const handlePostTrigger = () => {
    if (!currentUser) return navigate('/portal', { state: { returnTo: location.pathname + location.search } });

    if (activeTab === 'other') {
      showToast("該分類建置中，暫不開放發布。", "error");
      return;
    }

    if (activeTab === 'offer' && currentUser.role === 'client') {
      setShowUpgradeGuide({ show: true, type: 'post' });
      return;
    }

    if (activeTab === 'offer' && wishQuota && !wishQuota.is_pro) {
       if (wishQuota.offer_used >= wishQuota.offer_max) {
           showToast('免費版每月僅能發佈 3 則接委託，您的額度已用盡。', 'error');
           return;
       }
    }
    setShowPostModal(true);
  };

  const openInquireModal = (bulletin: any) => {
    if (!currentUser) return navigate('/portal', { state: { returnTo: location.pathname + location.search } });

    if (currentUser.role === 'client') {
      setShowUpgradeGuide({ show: true, type: 'inquire' });
      return;
    }

    if (bulletin.category === 'request' && wishQuota && !wishQuota.is_pro) {
       if (wishQuota.request_inquire_used >= wishQuota.request_inquire_max) {
           showToast('免費版每月僅能主動投遞 5 次委託人委託，您的額度已用盡。', 'error');
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
        payload = { ...payload, ...requestForm, ref_image_key: requestForm.ref_image };
      } else {
        payload = {
          ...payload, ...offerForm,
          ref_image_key: JSON.stringify(offerForm.ref_images),
          questions: offerForm.questions.filter(q => q.trim() !== '') 
        };
      }

      let res;
      if (editingBulletin) {
        res = await apiClient.patch(`/api/bulletins/${editingBulletin.id}`, payload);
      } else {
        res = await apiClient.post('/api/bulletins', payload);
      }
      if (res.success) {
        showToast(editingBulletin ? "更新成功！" : "發布成功！");
        setShowPostModal(false);
        setEditingBulletin(null);
        if (activeTab === 'request') setRequestForm(initialRequestForm);
        else setOfferForm(getInitialOfferForm());
        initData();
      } else showToast(res.message || (editingBulletin ? "更新失敗" : "發布失敗"), "error");
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
        initData();
      } else {
        showToast(res.message || res.error || "投遞失敗", "error");
      }
    } catch (error: any) { 
      const errorMsg = error.response?.data?.message || error.message || "操作發生錯誤，請稍後再試";
      showToast(errorMsg, "error"); 
    }
  };

  const handleViewOCSnapshot = (snapshotData: any) => {
    setViewingOCSnapshot(snapshotData);
  };

  const myActivePost = bulletins.find(b => currentUser && b.client_id === currentUser.id) ?? null;

  const handleScrollToMyPost = () => {
    if (!myActivePost) return;
    const el = document.getElementById(`card-${myActivePost.id}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleEditTrigger = (bulletin: any) => {
    setEditingBulletin(bulletin);
    let contentObj: any = {};
    try { contentObj = JSON.parse(bulletin.content || '{}'); } catch {}

    if (bulletin.category === 'offer') {
      let images: string[] = [];
      try { images = JSON.parse(bulletin.ref_image_key || '[]'); } catch {}
      setOfferForm({
        title: bulletin.title || '',
        content: contentObj.description || '',
        tags: JSON.parse(bulletin.tags || '[]'),
        payment_methods: JSON.parse(bulletin.payment_methods || '[]'),
        schedule_type: bulletin.schedule_type || 'flexible',
        specific_date: bulletin.specific_date || '',
        ref_images: images,
        questions: contentObj.questions?.length ? contentObj.questions : [''],
        tos_content: contentObj.tos_content || '',
        commission_items: contentObj.commission_items || [],
        selection_type: bulletin.selection_type || contentObj.selection_type || 'fcfs',
        max_slots: String(bulletin.max_slots || contentObj.max_slots || 1),
        payment_timing: bulletin.payment_timing || contentObj.payment_timing || 'prepaid',
        payment_timing_detail: bulletin.payment_timing_detail || contentObj.payment_timing_detail || ''
      });
    } else {
      setRequestForm({
        title: bulletin.title || '',
        content: contentObj.description || '',
        tags: JSON.parse(bulletin.tags || '[]'),
        payment_methods: JSON.parse(bulletin.payment_methods || '[]'),
        budget_min: bulletin.budget_min || '',
        budget_max: bulletin.budget_max || '',
        schedule_type: bulletin.schedule_type || 'flexible',
        specific_date: bulletin.specific_date || '',
        ref_image: bulletin.ref_image_key || '',
        oc_snapshot: null
      });
    }
    setShowPostModal(true);
  };

  return (
    <div className="wishboard-page">
      {toast && (
        <div className={`toast-notification ${toast.type}`}>
          {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {currentUser && wishQuota && !wishQuota.is_pro && (
        <div style={{ position: 'relative', zIndex: 20, padding: '10px 20px', backgroundColor: '#FDF4E6', borderBottom: '1px solid #FDE0B5', color: '#A67B3E', fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>
            ⭐ <strong>免費版額度提醒：</strong>本月發佈接委託 ({wishQuota.offer_used}/{wishQuota.offer_max}) | 投遞徵委託 ({wishQuota.request_inquire_used}/{wishQuota.request_inquire_max})
          </span>
            <button onClick={() => navigate('/artist/settings?tab=subscription')} style={{ background: '#A67B3E', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>            升級專業版解鎖限制
          </button>
        </div>
      )}

      <FilterBar
        activeTab={activeTab} setActiveTab={setActiveTab}
        selectedFilters={selectedFilters}
        toggleTag={(tag) => {
          if (tag === '不限') {
            setSelectedFilters([]);
          } else {
            setSelectedFilters(prev =>
              prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
            );
          }
        }}
        currentUser={currentUser}
        onPostTrigger={handlePostTrigger}
        myPostId={myActivePost?.id ?? null}
        onScrollToMyPost={handleScrollToMyPost}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      <main className="wish-grid">
        {activeTab === 'other' ? (
          <div style={{ 
            gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', 
            alignItems: 'center', justifyContent: 'center', minHeight: '40vh', 
            padding: '40px 20px', textAlign: 'center', backgroundColor: '#FBFBF9', 
            borderRadius: '16px', border: '2px dashed #EAE6E1', marginTop: '20px' 
          }}>
            <span style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}>🚧</span>
            <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#7A7269', marginBottom: '12px' }}>其他許願種類</h3>
            <p style={{ color: '#A0978D', fontSize: '15px', margin: 0 }}>建置中，敬請期待！小幫手正在努力趕工中 🛠️</p>
          </div>
        ) : loading ? (
          <div className="loading">載入中...</div>
        ) : (
          bulletins
            .filter(b => selectedFilters.length === 0 || selectedFilters.every(f => JSON.parse(b.tags || '[]').includes(f)))
            .filter(b => {
              if (!searchQuery.trim()) return true;
              const q = searchQuery.trim().toLowerCase();
              const title = (b.title || '').toLowerCase();
              const tags = (b.tags || '').toLowerCase();
              const name = (b.client_name || '').toLowerCase();
              return title.includes(q) || tags.includes(q) || name.includes(q);
            })
            .map(b => <WishCard key={b.id} bulletin={b} currentUser={currentUser} onInquire={openInquireModal} wishQuota={wishQuota} onViewOC={handleViewOCSnapshot} onEditTrigger={handleEditTrigger} highlightedId={highlightedId} />)
        )}
      </main>

      <button className="rules-floating-btn" onClick={() => setShowRulesModal(true)} title="查看許願池規則">
        <ScrollText size={20} />
        <span>許願規則</span>
      </button>

{showRulesModal && (
  <div 
    style={{ 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      right: 0, 
      bottom: 0, 
      backgroundColor: 'rgba(15, 23, 42, 0.6)',
      backdropFilter: 'blur(4px)', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      zIndex: 10000, 
      padding: '20px',
      overflowY: 'auto', 
      WebkitOverflowScrolling: 'touch'
    }} 
    onClick={() => setShowRulesModal(false)}
  >
    <div 
      style={{ 
        backgroundColor: '#ffffff', 
        borderRadius: '16px', 
        width: '100%', 
        maxWidth: '500px', 
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', 
        overflow: 'hidden', 
        display: 'flex', 
        flexDirection: 'column',
        margin: 'auto' 
      }} 
      onClick={e => e.stopPropagation()}
    >
      {/* 標題列 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ScrollText size={20} color="#3b82f6" /> 創作許願池
        </h2>
        <button onClick={() => setShowRulesModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}>
          <X size={24} />
        </button>
      </div>

      {/* 頁籤切換 */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0' }}>
        {(['info', 'rules'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setRulesTab(tab)}
            style={{
              flex: 1, padding: '12px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px',
              borderBottom: rulesTab === tab ? '2px solid #3b82f6' : '2px solid transparent',
              color: rulesTab === tab ? '#3b82f6' : '#64748b',
              backgroundColor: rulesTab === tab ? '#eff6ff' : '#f8fafc',
              transition: 'all 0.15s'
            }}
          >
            {tab === 'info' ? '📖 說明' : '📋 規則'}
          </button>
        ))}
      </div>

      {/* 說明頁 */}
      {rulesTab === 'info' && (
        <div style={{ padding: '20px', color: '#334155', fontSize: '14px', lineHeight: '1.8', overflowY: 'auto', maxHeight: '60vh' }}>
          <p style={{ margin: '0 0 20px 0', color: '#475569' }}>歡迎來到許願池！這裡是繪師與委託人的媒合空間，分為兩個區塊：</p>

          <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
            <div style={{ flex: 1, padding: '14px', backgroundColor: '#eff6ff', borderRadius: '10px', border: '1px solid #bfdbfe' }}>
              <strong style={{ color: '#1d4ed8', display: 'block', marginBottom: '6px' }}>🎨 接委託</strong>
              由<strong>繪師</strong>發佈，說明自己的接案風格、價格與條件，委託人可以直接投遞需求與他洽談。
            </div>
            <div style={{ flex: 1, padding: '14px', backgroundColor: '#f0fdf4', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
              <strong style={{ color: '#15803d', display: 'block', marginBottom: '6px' }}>📝 徵委託</strong>
              由<strong>委託人</strong>發佈，描述自己的需求與預算，有興趣的繪師可以投遞提案給對方。
            </div>
          </div>

          <div style={{ marginBottom: '20px', padding: '14px', backgroundColor: '#fafafa', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <strong style={{ color: '#475569', display: 'block', marginBottom: '6px' }}>📮 怎麼投遞？</strong>
            看到喜歡的貼文後，點選「我要投遞」，填寫需求或附上設定資料送出即可。對方收到後會在收件匣中看到你的提案，雙方確認後可進入聊天室討論細節。
          </div>

          <div style={{ marginBottom: '20px', padding: '14px', backgroundColor: '#fafafa', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <strong style={{ color: '#475569', display: 'block', marginBottom: '8px' }}>⏳ 貼文時效</strong>
            <div style={{ marginBottom: '8px' }}>免費版貼文將在發佈後 <strong style={{ color: '#ef4444' }}>30 天自動下架</strong>，確保看板上的貼文都是近期有效的需求。貼文剩餘時間<strong style={{ color: '#ef4444' }}>不足 12 小時</strong>時，會亮起紅燈提示。</div>
            <div style={{ padding: '10px', backgroundColor: '#fef9c3', borderRadius: '8px', border: '1px solid #fde68a', fontSize: '13px' }}>
              💎 <strong style={{ color: '#92400e' }}>專業版</strong>用戶貼文<strong>不受 30 天限制</strong>，可長期刊登直到主動下架為止
            </div>
          </div>

          <div style={{ padding: '14px', backgroundColor: '#fafafa', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <strong style={{ color: '#475569', display: 'block', marginBottom: '8px' }}>🔀 排序方式</strong>
            <div style={{ marginBottom: '8px' }}>許願池以<strong>每日亂數</strong>方式排列，每天更換順序，確保每位創作者都有公平的曝光機會。</div>
            <div style={{ padding: '10px', backgroundColor: '#fef9c3', borderRadius: '8px', border: '1px solid #fde68a', fontSize: '13px' }}>
              💎 <strong style={{ color: '#92400e' }}>專業版</strong>及<strong style={{ color: '#92400e' }}>試用版</strong>用戶的貼文享有<strong>優先置頂</strong>，顯示於一般貼文前方，同樣以每日亂數輪替排列。
            </div>
          </div>
        </div>
      )}

      {/* 規則頁 */}
      {rulesTab === 'rules' && (
        <div style={{ padding: '20px', color: '#334155', fontSize: '14px', lineHeight: '1.6', overflowY: 'auto', maxHeight: '60vh' }}>
          <div style={{ marginBottom: '16px' }}>
            <strong style={{ color: '#ef4444', display: 'block', marginBottom: '4px' }}>🚫 嚴禁 AI 製圖</strong>
            為保護創作者價值，許願池全面禁止發布任何 AI 生成作品之接稿 or 販售貼文。由社群共同監督，若遭檢舉且查證屬實將下架處理。
          </div>
          <div style={{ marginBottom: '16px' }}>
            <strong style={{ color: '#ef4444', display: 'block', marginBottom: '4px' }}>🚫 禁止 R18 限制級內容</strong>
            本平台介面為全齡向，嚴禁發布色情、血腥等限制級圖文，違者一律移除。如有需要發布 R18 相關委託，請在私訊中洽談，並在貼文中標明「此為 R18 委託，請在私訊內洽談」，請勿直接將例圖放在許願池上。
          </div>
          <div style={{ marginBottom: '16px' }}>
            <strong style={{ color: '#f59e0b', display: 'block', marginBottom: '4px' }}>⚠️ 授權與版權證明</strong>
            嚴禁盜圖、侵權二創、<strong>描圖（Tracing）</strong>、抄襲等行為。若使用他人作品作為例圖，請在貼文中清楚標明「已獲原作者授權使用此圖」，並建議保留相關授權證明。
          </div>
          <div style={{ marginBottom: '16px' }}>
            <strong style={{ color: '#3b82f6', display: 'block', marginBottom: '4px' }}>⚠️ 透明度與實名</strong>
            為維護交易誠信，所有貼文與投遞皆會顯示您在這個平台上的唯一 ID，請大家務必對自己的行為負責。本平台僅提供媒合，不涉入雙方爭議，若對方發生除了上述違規行為以外的行為（如跑單、作品不如預期等），請善用黑單功能屏蔽對方，請勿濫用檢舉功能。
          </div>
          <div style={{ marginBottom: '16px' }}>
            <strong style={{ color: '#3b82f6', display: 'block', marginBottom: '4px' }}>🌟 僅開放繪圖相關</strong>
            目前許願池僅限繪圖相關的徵委託與接委託貼文，請先不要發佈與繪圖無關的內容（如手作、圖換物、販售等），請稍待 Arti 小幫手建置，敬請期待！
          </div>
          <div style={{ padding: '12px', backgroundColor: '#f1f5f9', borderRadius: '8px', fontSize: '13px' }}>
            <strong style={{ color: '#475569', display: 'block', marginBottom: '4px' }}>⚖️ 違規處置說明</strong>
            初犯將移除貼文並給予系統警告；再犯者將 <strong>禁止使用許願池 28 天</strong>；情節嚴重或三犯者，將永久限制許願池使用權限。<br/><br/>
            <span style={{ color: '#64748b' }}>※ 貼文若檢舉達一定門檻，系統將自動暫時隱藏，發文者需向管理員提出證明以利重新上架。</span>
          </div>
        </div>
      )}

      <div style={{ padding: '16px 20px', borderTop: '1px solid #e2e8f0', textAlign: 'right', backgroundColor: '#f8fafc' }}>
        <button onClick={() => setShowRulesModal(false)} style={{ backgroundColor: '#3b82f6', color: 'white', border: 'none', padding: '8px 24px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
          我知道了
        </button>
      </div>
    </div>
  </div>
)}

      {showUpgradeGuide.show && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '20px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '20px', padding: '32px 24px', width: '100%', maxWidth: '380px', textAlign: 'center', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
            <ShieldAlert size={56} color="#3b82f6" style={{ margin: '0 auto 16px auto', opacity: 0.9 }} />
            <h2 style={{ margin: '0 0 12px 0', color: '#1e293b', fontSize: '20px', fontWeight: 'bold' }}>需要開通創作者身分</h2>
            <p style={{ color: '#64748b', fontSize: '15px', lineHeight: '1.6', margin: '0 0 28px 0' }}>
              {showUpgradeGuide.type === 'post' ? '發布接案貼文需要先開通創作者身分，這將解鎖您的作品集與排單表功能。' : '主動向委託人投遞應徵需要創作者身分，以便委託人查看您的作品集並與您洽談。'}
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button onClick={() => setShowUpgradeGuide({ ...showUpgradeGuide, show: false })} style={{ flex: 1, padding: '12px 0', borderRadius: '10px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#475569', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}>
                先不用
              </button>
              <button onClick={() => navigate('/portal')} style={{ flex: 1, padding: '12px 0', borderRadius: '10px', border: 'none', backgroundColor: '#3b82f6', color: '#ffffff', fontSize: '15px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.3)' }}>
                前往開通
              </button>
            </div>
          </div>
        </div>
      )}

      {showPostModal && activeTab === 'request' && (
        <RequestModal
          form={requestForm}
          setForm={setRequestForm}
          isUploading={isUploading}
          onClose={() => { setShowPostModal(false); setEditingBulletin(null); }}
          onSubmit={handlePostSubmit}
          onImageUpload={handleRequestImageUpload}
        />
      )}

      {showPostModal && activeTab === 'offer' && (
        <OfferModal
          form={offerForm}
          setForm={setOfferForm}
          isUploading={isUploading}
          onClose={() => { setShowPostModal(false); setEditingBulletin(null); }}
          onSubmit={handlePostSubmit}
          onImageUpload={handleOfferImageUpload}
          userPortfolio={userPortfolio}
          onSaveDraft={saveDraft}
          onLoadDraft={loadSavedDraft}
          isEditing={!!editingBulletin}
        />
      )}

      {showInquireModal && (
        <InquireModal 
          selectedBulletin={selectedBulletin} 
          withOC={true}
          inquireDraft={inquireDraft} 
          setInquireDraft={setInquireDraft} 
          inquireTagInputs={inquireTagInputs} 
          setInquireTagInputs={setInquireTagInputs} 
          inquireUploading={inquireUploading} 
          onClose={() => setShowInquireModal(false)} 
          onSubmit={handleInquireSubmit} 
          onImageUpload={handleInquireImageUpload} 
        />
      )}

      
      {viewingOCSnapshot && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.65)', backdropFilter: 'blur(8px)', zIndex: 10005, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ width: '100%', maxWidth: '900px', maxHeight: '90vh', position: 'relative', display: 'flex', flexDirection: 'column' }}>
            <button
              onClick={() => setViewingOCSnapshot(null)}
              style={{ position: 'absolute', top: '-42px', right: 0, background: 'rgba(0,0,0,0.5)', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: 'bold', padding: '8px 16px', borderRadius: '20px', zIndex: 10006 }}
            >
              關閉 <X size={18} />
            </button>
            <div style={{ overflowY: 'auto', borderRadius: '16px', backgroundColor: '#FDFDFB', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
              
              <OCDetailCard ocData={viewingOCSnapshot} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};