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

export const Wishboard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation(); 
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [bulletins, setBulletins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState<'request' | 'offer' | 'other'>(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    return (tabParam === 'offer' || tabParam === 'other') ? tabParam : 'request';
  });
  
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [showPostModal, setShowPostModal] = useState(false);
  const [showInquireModal, setShowInquireModal] = useState(false);
  const [selectedBulletin, setSelectedBulletin] = useState<any | null>(null);
  const [showUpgradeGuide, setShowUpgradeGuide] = useState<{ show: boolean, type: 'post' | 'inquire' }>({ show: false, type: 'post' });
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [inquireUploading, setInquireUploading] = useState(false); 
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [userShowcase, setUserShowcase] = useState<any[]>([]);
  const [wishQuota, setWishQuota] = useState<{ 
    is_pro: boolean, 
    offer_used: number, offer_max: number, 
    request_inquire_used: number, request_inquire_max: number 
  } | null>(null);

  const initialRequestForm = {
    title: '', content: '', tags: [] as string[], payment_methods: [] as string[],
    budget_min: '', budget_max: '', schedule_type: 'flexible', specific_date: '', 
    ref_image: '' 
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
      // 🛡️ 如果是 other，就不用去後端撈資料了，節省資源
      if (activeTab !== 'other') {
        const resBulletins = await apiClient.get(`/api/bulletins?category=${activeTab}`);
        if (resBulletins.success) setBulletins(resBulletins.data);
      }
      
      const resUser = await apiClient.get('/api/users/me');
      if (resUser.success) {
        setCurrentUser(resUser.data);
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

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    if (tabParam === 'offer' || tabParam === 'request' || tabParam === 'other') {
      setActiveTab(tabParam);
    }
  }, [location.search]);

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

  const handlePostTrigger = () => {
    if (!currentUser) return navigate('/login');

    // 如果在「其他」分類下按發布，直接阻擋
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
           showToast('免費版每月僅能發佈 1 則接委託，您的額度已用盡。', 'error');
           return;
       }
    }
    setShowPostModal(true);
  };

  const openInquireModal = (bulletin: any) => {
    if (!currentUser) return navigate('/login');

    if (currentUser.role === 'client') {
      setShowUpgradeGuide({ show: true, type: 'inquire' });
      return;
    }

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
        payload = { ...payload, ...requestForm, ref_image_key: requestForm.ref_image };
      } else {
        payload = {
          ...payload, ...offerForm,
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
        initData();
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
        initData();
      } else {
        showToast(res.message || res.error || "投遞失敗", "error");
      }
    } catch (error: any) { 
      const errorMsg = error.response?.data?.message || error.message || "操作發生錯誤，請稍後再試";
      showToast(errorMsg, "error"); 
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

      {/* 🌟 修復 Z-Index 疊層：加入 position: relative 與 zIndex: 20，確保不會被隱形遮罩覆蓋 */}
      {currentUser && wishQuota && !wishQuota.is_pro && (
        <div style={{ position: 'relative', zIndex: 20, padding: '10px 20px', backgroundColor: '#FDF4E6', borderBottom: '1px solid #FDE0B5', color: '#A67B3E', fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
        onPostTrigger={handlePostTrigger} 
      />

      <main className="wish-grid">
        {/* 🌟 新增：針對「其他」分頁的建置中攔截畫面 */}
        {activeTab === 'other' ? (
          <div style={{ 
            gridColumn: '1 / -1', 
            display: 'flex',             // 🌟 設為 flex 容器
            flexDirection: 'column',     // 🌟 直向排列
            alignItems: 'center',        // 🌟 水平置中
            justifyContent: 'center',    // 🌟 垂直置中
            minHeight: '40vh',           // 🌟 給予足夠的高度讓它能在畫面中間
            padding: '40px 20px', 
            textAlign: 'center', 
            backgroundColor: '#FBFBF9', 
            borderRadius: '16px', 
            border: '2px dashed #EAE6E1', 
            marginTop: '20px' 
          }}>
            <span style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}>🚧</span>
            <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#7A7269', marginBottom: '12px' }}>其他許願種類</h3>
            <p style={{ color: '#A0978D', fontSize: '15px', margin: 0 }}>建置中，敬請期待！工程師正在努力趕工中 🛠️</p>
          </div>
        ) : loading ? (
          <div className="loading">載入中...</div>
        ) : (
          bulletins
            .filter(b => selectedFilters.length === 0 || selectedFilters.every(f => JSON.parse(b.tags || '[]').includes(f)))
            .map(b => <WishCard key={b.id} bulletin={b} currentUser={currentUser} onInquire={openInquireModal} wishQuota={wishQuota} />)
        )}
      </main>

      <button className="rules-floating-btn" onClick={() => setShowRulesModal(true)} title="查看許願池規則">
        <ScrollText size={20} />
        <span>許願規則</span>
      </button>

      {showRulesModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '20px' }} onClick={() => setShowRulesModal(false)}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', width: '100%', maxWidth: '500px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '85vh' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ScrollText size={20} color="#3b82f6" /> 創作許願池 規範與約定
              </h2>
              <button onClick={() => setShowRulesModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={24} />
              </button>
            </div>
            
            <div className="custom-scrollbar" style={{ padding: '20px', overflowY: 'auto', color: '#334155', fontSize: '14px', lineHeight: '1.6' }}>
              <div style={{ marginBottom: '16px' }}>
                <strong style={{ color: '#ef4444', display: 'block', marginBottom: '4px' }}>🚫 嚴禁 AI 製圖</strong>
                為保護創作者價值，許願池全面禁止發布任何 AI 生成作品之接稿或販售貼文。由社群共同監督，若遭檢舉且查證屬實將下架處理。
              </div>
              <div style={{ marginBottom: '16px' }}>
                <strong style={{ color: '#ef4444', display: 'block', marginBottom: '4px' }}>🚫 禁止 R18 限制級內容</strong>
                本平台介面為全齡向，嚴禁發布色情、血腥等限制級圖文，違者一律移除。如有需要發布 R18 相關委託，請在私訊中洽談，並在貼文中標明「此為 R18 委託，請在私訊內洽談」，請勿直接將例圖放在許願池上。
              </div>
              <div style={{ marginBottom: '16px' }}>
                <strong style={{ color: '#f59e0b', display: 'block', marginBottom: '4px' }}>⚠️ 授權與版權證明</strong>
                嚴禁盜圖、侵權二創、抄襲等行為。若使用他人作品作為例圖，請在貼文中清楚標明「已獲原作者授權使用此圖」，並建議保留相關授權證明。
              </div>
              <div style={{ marginBottom: '16px' }}>
                <strong style={{ color: '#3b82f6', display: 'block', marginBottom: '4px' }}>⚠️ 透明度與實名</strong>
                為維護交易誠信，所有貼文與投遞皆會顯示您在這個平台上的唯一 ID ，請大家務必對自己的行為負責。本平台僅提供媒合，不涉入雙方爭議，若對方發生除了上述違規行為以外的行為(如跑單、作品不如預期等)，請善用黑單功能屏蔽對方，請勿濫用檢舉功能。
              </div>
              <div style={{ marginBottom: '16px' }}>
                <strong style={{ color: '#3b82f6', display: 'block', marginBottom: '4px' }}>🌟 僅開放繪圖相關</strong>
                目前許願池僅限繪圖相關的徵稿與接委託貼文，請先不要發佈與繪圖無關的內容（如手作、圖換物、販售等），請稍待Arti小幫手建置，敬請期待！
              </div>
              <div style={{ marginTop: '24px', padding: '12px', backgroundColor: '#f1f5f9', borderRadius: '8px', fontSize: '13px' }}>
                <strong style={{ color: '#475569', display: 'block', marginBottom: '4px' }}>⚖️ 違規處置說明</strong>
                初犯將移除貼文並給予系統警告；再犯者將 <strong>禁止使用許願池 28 天</strong>；情節嚴重或三犯者，將永久限制許願池使用權限。<br/><br/>
                <span style={{ color: '#64748b' }}>※ 貼文若檢舉達一定門檻，系統將自動暫時隱藏，發文者需向管理員提出證明以利重新上架。</span>
              </div>
            </div>
            
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
              {showUpgradeGuide.type === 'post' ? '發布接案貼文需要先開通創作者身分，這將解鎖您的作品集與排單表功能。' : '主動向案主投遞應徵需要創作者身分，以便案主查看您的作品集並與您洽談。'}
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
          onClose={() => setShowPostModal(false)} 
          onSubmit={handlePostSubmit} 
          onImageUpload={handleRequestImageUpload} 
        />
      )}

      {showPostModal && activeTab === 'offer' && (
        <OfferModal 
          form={offerForm} 
          setForm={setOfferForm} 
          isUploading={isUploading} 
          onClose={() => setShowPostModal(false)} 
          onSubmit={handlePostSubmit} 
          onImageUpload={handleOfferImageUpload} 
          userShowcase={userShowcase} 
          onSaveDraft={saveDraft} 
          onLoadDraft={loadSavedDraft} 
        />
      )}

      {showInquireModal && (
        <InquireModal 
          selectedBulletin={selectedBulletin} 
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
    </div>
  );
};