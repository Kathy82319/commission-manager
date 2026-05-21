// src/pages/Inquiry/InquiryWorkspace.tsx
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import DOMPurify from 'dompurify';
import ReactQuill from 'react-quill-new'; 
import 'react-quill-new/dist/quill.snow.css'; 
import '../styles/Workspace.css';
import { BookUser, Maximize2, X, Image as ImageIcon } from 'lucide-react';
import { OCDetailCard } from '../components/OC/OCDetailCard';

const R2_PUBLIC_URL = "https://pub-1d4bcc7f19324c0d95d7bfdfeb1a69e2.r2.dev";

const customQuillModules = {
  toolbar: [
    [{ 'header': [1, 2, 3, false] }], 
    ['bold', 'italic', 'underline', 'strike'], 
    [{ 'color': [] }, { 'background': [] }], 
    [{ 'list': 'ordered'}, { 'list': 'bullet' }], 
    ['clean'] 
  ]
};

export const InquiryWorkspace: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

  const [inquiry, setInquiry] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  
  const [isArtist, setIsArtist] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [actualArtistId, setActualArtistId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [focusedField, setFocusedField] = useState(false);
  
  const [isTrajectoryExpanded, setIsTrajectoryExpanded] = useState(false);
  const [showFinalModal, setShowFinalModal] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showMobileAside, setShowMobileAside] = useState(false);
  
  const [isBannerExpanded, setIsBannerExpanded] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const chatMainRef = useRef<HTMLElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [isScrolledUp, setIsScrolledUp] = useState(false);
  
  const isFirstLoad = useRef(true);
  const [isAccepted, setIsAccepted] = useState(false);
  
  const prevStatusRef = useRef<string | null>(null);

  const [artistQuota, setArtistQuota] = useState<{ used_quota: number; max_quota: number; plan_type: string } | null>(null);
  const [paymentPresets, setPaymentPresets] = useState<string[]>([]);

  const [showOCSelection, setShowOCSelection] = useState(false);
  const [myOCs, setMyOCs] = useState<any[]>([]);
  const [isLoadingOCs, setIsLoadingOCs] = useState(false);
  const [viewingOCSnapshot, setViewingOCSnapshot] = useState<any | null>(null);

  useEffect(() => {
    const savedPresets = localStorage.getItem('payment_timing_presets');
    if (savedPresets) {
      try {
        setPaymentPresets(JSON.parse(savedPresets));
      } catch (e) {
        setPaymentPresets(['全額付清後動筆', '需先付定金', '草稿確認後付款', '完稿後付款']);
      }
    } else {
      setPaymentPresets(['全額付清後動筆', '需先付定金', '草稿確認後付款', '完稿後付款']);
    }
  }, []);

  const handleSavePaymentPreset = () => {
    const currentVal = draft.payment_timing?.trim();
    if (!currentVal) return;
    if (paymentPresets.includes(currentVal)) return; 
    const newPresets = [...paymentPresets, currentVal];
    setPaymentPresets(newPresets);
    localStorage.setItem('payment_timing_presets', JSON.stringify(newPresets));
    alert('已將此付款方式加入常用標籤！');
  };

  const handleDeletePaymentPreset = (val: string) => {
    const newPresets = paymentPresets.filter(p => p !== val);
    setPaymentPresets(newPresets);
    localStorage.setItem('payment_timing_presets', JSON.stringify(newPresets));
  };

  const [draft, setDraft] = useState<any>({
    project_name: '', 
    total_price: 0, 
    usage_type: '非商用', 
    is_rush: '否', 
    draw_scope: '大頭', 
    bg_type: '無背景', 
    char_count: 1, 
    payment_timing: '全額付清後動筆', 
    add_ons: '',
    agreed_memo: '',
    custom_tos: undefined,
    oc_snapshot: null
  });

  const formatLocalTime = (dateStr: string) => {
    if (!dateStr) return '';
    const utcStr = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T') + 'Z';
    return new Date(utcStr).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const getPaymentTimingLabel = (val: string) => {
    const map: Record<string, string> = {
      prepaid: '全額付清後動筆',
      deposit: '需先付定金',
      after_draft: '草稿確認後付款',
      after_completion: '完稿後付款',
      other: '其他'
    };
    return map[val] || val;
  };

  const isDirectInquiry = id?.startsWith('di-') || false;
  const apiPrefix = isDirectInquiry ? 'direct-inquiries' : 'inquiries';

  const fetchData = async () => {
    try {
      const resInquiry = await apiClient.get(`/api/${apiPrefix}/${id}`);

      if (resInquiry.success) {
        const data = resInquiry.data;
        setInquiry(data);
        if (resInquiry.quota) setArtistQuota(resInquiry.quota);

        const resUser = await apiClient.get('/api/users/me');
        const myId = resUser.data.id;
        setCurrentUserId(myId);

        const isOfferCat = data.bulletin_category === 'offer';
        const targetArtistId = (isDirectInquiry || !isOfferCat) ? data.artist_id : data.bulletin_client_id;
        setActualArtistId(targetArtistId);
        
        const currentUserIsArtist = (myId === targetArtistId);
        setIsArtist(currentUserIsArtist);
        
        if (prevStatusRef.current && prevStatusRef.current !== 'accepted' && data.status === 'accepted') {
          setIsAccepted(true);
        }
        prevStatusRef.current = data.status;

        if (data.status === 'accepted') setIsAccepted(true);

        if (isFirstLoad.current || !currentUserIsArtist || (data.status !== 'submitted' && data.status !== 'pending')) {
          if (data.negotiation_draft) {
            setDraft(JSON.parse(data.negotiation_draft));
          } else if (isFirstLoad.current) {
             let defaultName = data.bulletin_title;
             let defaultPaymentTiming = '全額付清後動筆';
             
             if (!defaultName) {
               if (isDirectInquiry) {
                 defaultName = "客製化委託單"; 
               } else {
                 try {
                   const parsedContent = JSON.parse(data.bulletin_content);
                   if (parsedContent.title) defaultName = parsedContent.title;
                   else if (parsedContent.commission_items?.length > 0) defaultName = parsedContent.commission_items[0].name;
                   else if (parsedContent.description) defaultName = parsedContent.description.substring(0, 30);
                   else defaultName = "許願池委託";
                   
                   if (parsedContent.payment_timing) defaultPaymentTiming = getPaymentTimingLabel(parsedContent.payment_timing);
                 } catch(e) {
                   defaultName = "許願池委託";
                 }
               }
             }
            setDraft((prev: any) => ({ ...prev, project_name: defaultName || "", payment_timing: defaultPaymentTiming }));
          }
        }
      }

      const resMsgs = await apiClient.get(`/api/${apiPrefix}/${id}/messages`);
      if (resMsgs.success) {
        setMessages(resMsgs.data);
      }

    } catch (e) { 
      console.error("讀取洽談室失敗:", e); 
    } finally { 
      setLoading(false);
      if (isFirstLoad.current) {
        setTimeout(() => {
          chatEndRef.current?.scrollIntoView({ behavior: 'auto' });
        }, 100);
      }
      isFirstLoad.current = false;
    }
  };

  useEffect(() => {
    fetchData();
    const timer = setInterval(fetchData, 5000);
    return () => clearInterval(timer);
  }, [id, apiPrefix]);

  useEffect(() => { 
    if (!isScrolledUp && !isFirstLoad.current) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); 
    }
  }, [messages]);

  const handleScroll = () => {
    if (!chatMainRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatMainRef.current;
    const isUp = scrollHeight - scrollTop - clientHeight > 50;
    setIsScrolledUp(isUp);
  };

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setIsScrolledUp(false);
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newMessage.trim()) return;
    await apiClient.post(`/api/${apiPrefix}/${id}/messages`, { content: newMessage });
    setNewMessage('');
    setIsScrolledUp(false); 
    fetchData();
  };

  const handleOpenOCSelection = async () => {
    setShowOCSelection(true);
    setIsLoadingOCs(true);
    try {
      const res = await apiClient.get('/api/oc');
      if (res.success) {
        setMyOCs(res.data || []);
      }
    } catch (e) {
      console.error("無法讀取角色卡", e);
    } finally {
      setIsLoadingOCs(false);
    }
  };

  const handleSendOC = async (ocId: string) => {
    if (!window.confirm('確定要發送這張角色卡到洽談室嗎？發送後系統將會建立快照，對方會看到卡片當下的設定。')) return;
    setShowOCSelection(false);
    try {
      await apiClient.post(`/api/${apiPrefix}/${id}/messages`, {
        oc_id: ocId,
        message_type: 'oc_snapshot'
      });
      setIsScrolledUp(false);
      fetchData();
    } catch (e: any) {
      alert('發送角色卡失敗：' + e.message);
    }
  };

  const silentCompressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_DIMENSION = 1600; 
          let { width, height } = img;
          
          if (width > height && width > MAX_DIMENSION) {
            height = Math.round((height * MAX_DIMENSION) / width);
            width = MAX_DIMENSION;
          } else if (height > MAX_DIMENSION) {
            width = Math.round((width * MAX_DIMENSION) / height);
            height = MAX_DIMENSION;
          }
          
          canvas.width = width; canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob((blob) => {
              if (blob) resolve(blob);
              else reject(new Error('壓縮失敗'));
            }, 'image/jpeg', 0.82 
          );
        };
        img.onerror = () => reject(new Error('圖片解析失敗'));
        img.src = event.target?.result as string;
      };
      reader.onerror = () => reject(new Error('檔案讀取失敗'));
      reader.readAsDataURL(file);
    });
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('只能上傳圖片喔！');
      return;
    }
    
    setIsUploadingImage(true);
    try {
      const compressedBlob = await silentCompressImage(file);
      if (compressedBlob.size > 1.5 * 1024 * 1024) {
        alert('您的圖片尺寸過於龐大或比例極端，為保護空間資源請縮小後再傳！');
        return;
      }
      const ticketRes = await fetch(`${API_BASE}/api/r2/upload-url`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentType: 'image/jpeg', bucketType: 'public', originalName: `chat_${Date.now()}.jpg`, folder: 'chat-images' })
      });
      const ticketData = await ticketRes.json();
      if (!ticketData.success) throw new Error(ticketData.error);

      const putRes = await fetch(ticketData.uploadUrl, { method: 'PUT', body: compressedBlob, headers: { 'Content-Type': 'image/jpeg' } });
      if (!putRes.ok) throw new Error('上傳至雲端失敗');

      await apiClient.post(`/api/${apiPrefix}/${id}/messages`, { content: `![image](${ticketData.fileName})` });
      setIsScrolledUp(false);
      fetchData(); 
    } catch (err: any) {
      alert('圖片上傳失敗：' + err.message);
    } finally {
      setIsUploadingImage(false);
      if (e.target) e.target.value = ''; 
    }
  };

  const renderMessageContent = (content: string) => {
    const imgRegex = /!\[image\]\((.*?)\)/g;
    const parts = [];
    let lastIndex = 0;
    let match;
    
    while ((match = imgRegex.exec(content)) !== null) {
      if (match.index > lastIndex) parts.push(<span key={lastIndex}>{content.substring(lastIndex, match.index)}</span>);
      const imgUrl = match[1];
      const fullUrl = imgUrl.startsWith('http') ? imgUrl : `${R2_PUBLIC_URL}/${imgUrl}`;
      parts.push(
        <div key={match.index} style={{ margin: '8px 0' }}>
          <img src={fullUrl} alt="chat-upload" style={{ maxWidth: '100%', maxHeight: '250px', borderRadius: '8px', cursor: 'zoom-in', display: 'block', border: '1px solid rgba(0,0,0,0.1)' }} onClick={() => window.open(fullUrl, '_blank')} />
        </div>
      );
      lastIndex = imgRegex.lastIndex;
    }
    if (lastIndex < content.length) parts.push(<span key={lastIndex}>{content.substring(lastIndex)}</span>);
    return parts.length > 0 ? parts : content;
  };

  const handleSaveDraft = async () => {
    await apiClient.patch(`/api/${apiPrefix}/${id}/draft`, { draft_json: JSON.stringify(draft) });
    alert('協議草稿已儲存！');
  };

  const handlePropose = async () => {
    if (artistQuota && artistQuota.max_quota !== -1 && artistQuota.used_quota >= artistQuota.max_quota) {
       return alert('抱歉，您的活躍委託單已達免費版上限。請先結案舊訂單或升級專業版以解鎖！');
    }
    if (!window.confirm('送出正式提案後將鎖定內容，直到委託人回覆。確定送出？')) return;
    try {
      await apiClient.patch(`/api/${apiPrefix}/${id}/draft`, { draft_json: JSON.stringify(draft) });
      
      await apiClient.post(`/api/${apiPrefix}/${id}/messages`, { content: '【系統提示】繪師已送出正式提案，請委託人確認合約規格與報價。' });
      
      const res = await apiClient.post(`/api/${apiPrefix}/${id}/propose`, {});
      if (res.success) {
        alert('已送出正式提案給委託人！');
        setShowMobileAside(false); 
        fetchData();
      } else alert(res.message || '送出提案失敗');
    } catch (error: any) { alert('送出提案失敗：' + error.message); }
  };

  const handleRejectProposal = async () => {
    if (!window.confirm("確定要退回提案，讓繪師重新修改合約與規格嗎？")) return;
    try {
      await apiClient.post(`/api/${apiPrefix}/${id}/messages`, { content: '【系統提示】委託人已將提案退回，請繪師重新確認合約規格與報價，修改後可再次送出。' });
      
      const res = await apiClient.post(`/api/${apiPrefix}/${id}/reject-proposal`, {});
      if (res.success) {
        alert('已將提案退回，繪師現在可以重新編輯並送出了。');
        fetchData();
      } else alert('操作失敗：' + (res.message || res.error));
    } catch (e) {
      alert('系統異常，無法退回。請確認後端是否已新增對應的 API 路由。');
    }
  };

  const handleFinalize = async () => {
    if (!agreedToTerms) return alert('請先勾選同意委託協議。');
    try {
      await apiClient.post(`/api/${apiPrefix}/${id}/messages`, { content: '【系統提示】委託人已確認同意協議書，委託單正式成立！' });
      
      const res = await apiClient.post(`/api/${apiPrefix}/${id}/finalize`, {});
      if (res.success) {
        await fetchData(); 
        
        const commId = res.commission_id || res.id;
        alert('🎉 委託單已成功建立！系統將為您跳轉至管理頁面。');
        setShowFinalModal(false);
        if (isArtist) {
          navigate(`/artist/notebook?id=${commId}`);
        } else {
          navigate(`/client/orders?id=${commId}`);
        }
      } else alert('成單失敗：' + (res.message || res.error));
    } catch (error: any) { alert('系統異常，成單失敗'); }
  };

  if (loading || !inquiry) return (
    <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#EAE6E1', color: '#5D4A3E', fontSize: '15px' }}>
      載入洽談室中...
    </div>
  );

  let parsedBulletin: any = {};
  let displayTitle = inquiry.bulletin_title || "未命名委託";
  let displayContent = inquiry.bulletin_content || "";
  let parsedFormAnswers: any[] = [];

  if (isDirectInquiry) {
    displayTitle = inquiry.showcase_title || "客製化委託單";
    try { parsedFormAnswers = JSON.parse(inquiry.form_answers || '[]'); } catch(e) {}
  } else {
    try {
      parsedBulletin = JSON.parse(inquiry.bulletin_content);
      if (!inquiry.bulletin_title && parsedBulletin.title) displayTitle = parsedBulletin.title;
      if (parsedBulletin.content) displayContent = parsedBulletin.content;
      else if (parsedBulletin.description) displayContent = parsedBulletin.description;
    } catch (e) {}
  }

  let parsedSnapshot: any = {};
  try {
    if (inquiry.artist_snapshot) {
      parsedSnapshot = typeof inquiry.artist_snapshot === 'string' ? JSON.parse(inquiry.artist_snapshot) : inquiry.artist_snapshot;
    }
  } catch (e) {}

  const isOffer = inquiry.bulletin_category === 'offer'; 

  let artistTos = "繪師未提供額外協議說明。";
  if (isDirectInquiry && inquiry.tos_snapshot) {
    artistTos = inquiry.tos_snapshot;
  } else if (parsedBulletin && parsedBulletin.tos_content && parsedBulletin.tos_content.trim() !== '') {
    artistTos = parsedBulletin.tos_content;
  } else {
    try {
      const settings = JSON.parse(inquiry.artist_settings || '{}');
      if (settings.rules && settings.rules.trim() !== '') {
        artistTos = settings.rules;
      } else if (settings.terms_of_service && settings.terms_of_service.trim() !== '') {
        artistTos = settings.terms_of_service;
      }
    } catch(e) {}
  }

  const finalDisplayTos = draft.custom_tos !== undefined ? draft.custom_tos : artistTos;

  const isClosedOrDeclined = inquiry.status === 'closed' || inquiry.status === 'declined' || inquiry.status === 'cancelled';

  const isQuotaFull = !!(isArtist && artistQuota && artistQuota.max_quota !== -1 && artistQuota.used_quota >= artistQuota.max_quota);

  const isEditableByArtist = !isClosedOrDeclined && isArtist && (
    (isDirectInquiry && inquiry.status === 'pending') ||
    (!isDirectInquiry && inquiry.status === 'submitted') 
  );

  const projectNameStr = draft?.project_name || inquiry?.project_name || displayTitle || '';
  const commissionIdStr = inquiry?.commission_id ? `(${inquiry.commission_id})` : '';
  const headerProjectName = projectNameStr ? `${projectNameStr} ${commissionIdStr}`.trim() : commissionIdStr;
  
  let otherPartyName = "未知對象";
  let otherPartyId = "";

  if (isArtist) {
    const cName = inquiry?.client_name;
    const cMemo = inquiry?.contact_memo || inquiry?.guest_contact_info;
    
    if (inquiry?.client_id === 'guest' || !inquiry?.client_id) {
      otherPartyName = cMemo || "訪客";
      otherPartyId = "Guest";
    } else {
      if (cName && cMemo) {
         otherPartyName = `${cName} (${cMemo})`;
      } else {
         otherPartyName = cName || cMemo || "委託人";
      }
      otherPartyId = inquiry?.client_public_id || inquiry?.client_id || "未知 ID";
    }
  } else {
    otherPartyName = inquiry?.artist_name || "繪師";
    otherPartyId = inquiry?.artist_public_id || actualArtistId || inquiry?.artist_id || "未知 ID";
  }


  return (
    <div className="inquiry-workspace-container" style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', backgroundColor: '#EAE6E1', overflow: 'hidden', justifyContent: 'center' }}>
      
      <style>{`
        @media (max-width: 768px) {
          .oc-snapshot-bubble { width: 100% !important; max-width: 100% !important; box-sizing: border-box; }
          .oc-selection-item { flex-direction: column !important; align-items: stretch !important; gap: 12px !important; }
          .oc-selection-item button { width: 100% !important; }
          .oc-selection-info { width: 100% !important; }
          .oc-view-modal-container { padding: 10px !important; align-items: flex-start !important; padding-top: 50px !important; overflow-y: auto; }
          .oc-view-close-btn { 
            top: 10px !important; 
            right: 10px !important; 
            background: rgba(0,0,0,0.7) !important; 
            padding: 8px 16px !important; 
            border-radius: 20px !important; 
            position: fixed !important; 
            z-index: 10005 !important;
          }
        }
      `}</style>

      <div style={{ display: 'flex', width: '100%', maxWidth: '1200px', backgroundColor: '#FFFFFF', boxShadow: '0 0 20px rgba(0,0,0,0.05)', position: 'relative' }}>
        
        <div className="iw-chat-section" style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#FFFFFF', position: 'relative' }}>
          <header className="iw-chat-header" style={{ backgroundColor: '#FFFFFF', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #EAE6E1', zIndex: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
              <button className="iw-back-btn" onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: '#A0978D', fontSize: '15px', cursor: 'pointer', fontWeight: 'bold', flexShrink: 0 }}>← 返回</button>
              <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <h2 className="iw-chat-title" style={{ margin: 0, fontSize: '15px', color: '#5D4A3E', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  洽談：{headerProjectName}
                </h2>
                <span style={{ fontSize: '11px', color: '#A0978D', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  洽談對象：{otherPartyName} (ID: {otherPartyId})
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, marginLeft: '8px' }}>
              {!isAccepted && (
                <button className="iw-mobile-toggle-btn" onClick={() => setShowMobileAside(!showMobileAside)} style={{ display: 'none', padding: '6px 12px', borderRadius: '8px', background: '#5D4A3E', color: 'white', border: 'none', fontWeight: 'bold', fontSize: '12px' }}>{showMobileAside ? '✕ 關閉' : '📝 合約/草稿'}</button>
              )}
              <div className="iw-role-badge" style={{ padding: '4px 12px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', backgroundColor: isArtist ? '#EBF2F7' : '#FDF4E6', color: isArtist ? '#4A7294' : '#A67B3E', border: isArtist ? '1px solid #C1D6E8' : '1px solid #FDE0B5', whiteSpace: 'nowrap', flexShrink: 0 }}>{isArtist ? '🎨 繪師' : '👤 委託人'}</div>
            </div>
          </header>

          {isClosedOrDeclined && (
            <div style={{ backgroundColor: '#F3F4F6', borderBottom: '1px solid #D1D5DB', flexShrink: 0, zIndex: 9 }}>
              <div style={{ padding: '10px 20px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#6B7280', fontSize: '13px', fontWeight: 'bold' }}>
                🗄️ 此洽談已終止或撤銷，目前為歷史唯讀模式。
              </div>
            </div>
          )}

          {!isClosedOrDeclined && isAccepted && (
            <div style={{ backgroundColor: '#EBF5EB', borderBottom: '1px solid #C8E6C9', flexShrink: 0, zIndex: 9, transition: 'all 0.3s' }}>
              <div 
                onClick={() => setIsBannerExpanded(!isBannerExpanded)}
                style={{ padding: '10px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', color: '#4E7A5A', fontSize: '13px', fontWeight: 'bold' }}
              >
                <span>🎉 委託單已正式成立！</span>
                <span style={{ fontSize: '10px' }}>{isBannerExpanded ? '▲ 收起' : '▼ 展開'}</span>
              </div>
              
              {isBannerExpanded && (
                <div style={{ padding: '0 20px 12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '12px', color: '#4E7A5A' }}>您可以繼續在此與對方討論，或前往單據頁面更新進度。</span>
                  <button onClick={() => isArtist ? navigate(`/artist/notebook?id=${inquiry.commission_id}`) : navigate(`/client/orders?id=${inquiry.commission_id}`)} style={{ background: '#4E7A5A', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                    前往管理單據
                  </button>
                </div>
              )}
            </div>
          )}

          <main ref={chatMainRef} onScroll={handleScroll} className="iw-chat-main custom-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', backgroundColor: '#FBFBF9', position: 'relative' }}>
            
            {messages.map((msg) => {
              const isSystemMsg = typeof msg.content === 'string' && (msg.content.startsWith('【系統提示】') || msg.content.startsWith('[系統代理]'));
              const isMe = msg.sender_id === currentUserId;

              if (msg.message_type === 'oc_snapshot') {
                let ocData: any = null;
                try { ocData = JSON.parse(msg.content); } catch (e) {}

                return (
                  <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                    <div style={{ display: 'flex', gap: '6px', marginBottom: '4px', fontSize: '11px', color: '#A0978D', flexDirection: isMe ? 'row-reverse' : 'row' }}>
                      <span>{msg.sender_id === actualArtistId ? '繪師' : '委託人'}</span>
                      <span>{formatLocalTime(msg.created_at)}</span>
                    </div>
                    <div className="iw-chat-bubble oc-snapshot-bubble" style={{ padding: '16px', backgroundColor: isMe ? '#5D4A3E' : '#FFFFFF', color: isMe ? '#FFFFFF' : '#5D4A3E', borderRadius: isMe ? '16px 4px 16px 16px' : '4px 16px 16px 16px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: isMe ? 'none' : '1px solid #EAE6E1', width: '280px' }}>
                      {ocData ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold', borderBottom: isMe ? '1px solid rgba(255,255,255,0.2)' : '1px solid #EAE6E1', paddingBottom: '8px', fontSize: '13px' }}>
                            <BookUser size={16} /> 角色設定卡快照
                          </div>
                          
                          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
<div style={{ width: '48px', height: '48px', borderRadius: '6px', backgroundColor: isMe ? 'rgba(255,255,255,0.1)' : '#F4F0EB', overflow: 'hidden', flexShrink: 0 }}>
  {(() => {
    // 關鍵修正：確保對話歷史中發送的角色卡圖片也能對齊正確網域
    let bubbleImgUrl = null;
    if (ocData && ocData.images && ocData.images.length > 0) {
      const rawUrl = ocData.images[0].previewUrl || ocData.images[0].url || '';
      bubbleImgUrl = rawUrl.startsWith('http') ? rawUrl : `${R2_PUBLIC_URL}/${rawUrl.replace(/^\//, '')}`;
    }
    return bubbleImgUrl ? (
      <img src={bubbleImgUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
    ) : (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ImageIcon size={20} opacity={0.5} /></div>
    );
  })()}
</div>
                            <div style={{ overflow: 'hidden' }}>
                              <div style={{ fontWeight: 'bold', fontSize: '16px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ocData.name || '未命名角色'}</div>
                              <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '2px' }}>{ocData.gender} {ocData.body_type}</div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                            <button
                              onClick={() => setViewingOCSnapshot(ocData)}
                              style={{ width: '100%', padding: '8px 0', backgroundColor: isMe ? 'rgba(255,255,255,0.2)' : '#F4F0EB', color: isMe ? '#FFF' : '#5D4A3E', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.2s' }}
                              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
                              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                            >
                              <Maximize2 size={14} /> 檢視設定卡內容
                            </button>

                            {isArtist && isEditableByArtist && (
                              <button
                                onClick={() => {
                                  setDraft({ ...draft, oc_snapshot: ocData });
                                  alert('已將此角色設定卡帶入合約草稿！');
                                  if (window.innerWidth < 1024) setShowMobileAside(true);
                                }}
                                style={{ width: '100%', padding: '8px 0', backgroundColor: '#8CB369', color: '#FFF', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.2s' }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#7A9E58'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#8CB369'}
                              >
                                📌 帶入合約草稿
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span style={{ fontSize: '13px', color: '#A05C5C' }}>[角色設定卡資料損毀或解析失敗]</span>
                      )}
                    </div>
                  </div>
                );
              }

              if (isSystemMsg) {
                return (
                  <div key={msg.id} style={{ display: 'flex', justifyContent: 'center', margin: '8px 0' }}>
                    <div style={{ backgroundColor: 'rgba(93, 74, 62, 0.08)', color: '#7A7269', fontSize: '12px', padding: '6px 16px', borderRadius: '20px', textAlign: 'center', maxWidth: '85%', lineHeight: '1.5' }}>
                      {msg.content}
                      <span style={{ fontSize: '10px', marginLeft: '8px', opacity: 0.6 }}>{formatLocalTime(msg.created_at)}</span>
                    </div>
                  </div>
                );
              }

              return (
                <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                  <div style={{ display: 'flex', gap: '6px', marginBottom: '4px', fontSize: '11px', color: '#A0978D', flexDirection: isMe ? 'row-reverse' : 'row' }}>
                    <span>{msg.sender_id === actualArtistId ? '繪師' : '委託人'}</span>
                    <span>{formatLocalTime(msg.created_at)}</span>
                  </div>
                  <div className="iw-chat-bubble" style={{ maxWidth: '80%', padding: '10px 14px', fontSize: '14px', backgroundColor: isMe ? '#5D4A3E' : '#FFFFFF', color: isMe ? '#FFFFFF' : '#5D4A3E', borderRadius: isMe ? '16px 4px 16px 16px' : '4px 16px 16px 16px', boxShadow: '0 2px 4px rgba(0,0,0,0.04)', border: isMe ? 'none' : '1px solid #EAE6E1', wordBreak: 'break-word', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                    {renderMessageContent(msg.content)}
                  </div>
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </main>

          {isScrolledUp && (
            <button 
              onClick={scrollToBottom}
              style={{ position: 'absolute', bottom: '90px', right: '20px', width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#FFFFFF', color: '#5D4A3E', border: '1px solid #EAE6E1', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 100, fontSize: '18px' }}
              title="回到最新訊息"
            >
              ⬇️
            </button>
          )}

          {isClosedOrDeclined ? (
            <footer className="iw-chat-footer" style={{ backgroundColor: '#F9FAFB', padding: '16px 20px', borderTop: '1px solid #EAE6E1', display: 'flex', justifyContent: 'center', color: '#9CA3AF', fontSize: '13px' }}>
              無法傳送訊息：此洽談室已關閉
            </footer>
          ) : (
            <footer className="iw-chat-footer" style={{ backgroundColor: '#FFFFFF', padding: '16px 20px', borderTop: '1px solid #EAE6E1', display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
              {!isArtist && inquiry?.status !== 'accepted' && (
                <button 
                  onClick={handleOpenOCSelection}
                  style={{ padding: '10px', background: '#FDF4E6', border: '1px solid #FDE0B5', borderRadius: '50%', color: '#A67B3E', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '44px', height: '44px', flexShrink: 0, transition: 'all 0.2s' }}
                  title="傳送專屬角色設定卡 (OC)"
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <span style={{ fontSize: '20px' }}>📇</span>
                </button>
              )}

              <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageSelect} style={{ display: 'none' }} />
              <button 
                onClick={() => fileInputRef.current?.click()} 
                disabled={isUploadingImage}
                style={{ padding: '10px', background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: '50%', color: '#64748B', cursor: isUploadingImage ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '44px', height: '44px', flexShrink: 0, opacity: isUploadingImage ? 0.5 : 1 }}
                title="上傳圖片 (建議 1MB 內)"
              >
                <span style={{ fontSize: '20px' }}>{isUploadingImage ? '⏳' : '🖼️'}</span>
              </button>

              <textarea value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onFocus={() => setFocusedField(true)} onBlur={() => setFocusedField(false)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(e as any); } }} placeholder="請輸入訊息..." style={{ flex: 1, padding: '12px 16px', borderRadius: '16px', border: focusedField ? '1.5px solid #5D4A3E' : '1px solid #DED9D3', backgroundColor: '#FBFBF9', fontSize: '14px', color: '#5D4A3E', minHeight: '44px', maxHeight: '120px', outline: 'none', resize: 'none' }} />
              <button onClick={handleSendMessage} disabled={!newMessage.trim() && !isUploadingImage} style={{ padding: '12px 24px', borderRadius: '99px', backgroundColor: (newMessage.trim() || isUploadingImage) ? '#5D4A3E' : '#DED9D3', color: '#FFFFFF', border: 'none', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>傳送</button>
            </footer>
          )}
        </div>

        {showMobileAside && (
          <div 
            className="iw-mobile-overlay-bg" 
            onClick={() => setShowMobileAside(false)} 
            style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 15 }}
          />
        )}

        {!isAccepted && (
          <aside className={`iw-aside-section custom-scrollbar ${showMobileAside ? 'mobile-open' : ''}`} style={{ width: '440px', borderLeft: '1px solid #EAE6E1', backgroundColor: '#FDFDFB', display: 'flex', flexDirection: 'column', zIndex: 20 }}>
            <div style={{ padding: '20px', borderBottom: '1px solid #EAE6E1', backgroundColor: '#FFFFFF' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#5D4A3E', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>📝 最終規格與合約確認</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '6px', backgroundColor: isClosedOrDeclined ? '#F3F4F6' : '#FBFBF9', border: `1px solid ${isClosedOrDeclined ? '#D1D5DB' : '#EAE6E1'}`, color: isClosedOrDeclined ? '#6B7280' : '#7A7269', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {isClosedOrDeclined ? '已歸檔' : inquiry.status === 'proposed' ? '待委託人同意' : '草稿編修中'}
                  </span>
                  <button className="iw-mobile-close-btn" onClick={() => setShowMobileAside(false)} style={{ display: 'none', background: 'none', border: 'none', color: '#A05C5C', fontSize: '16px', fontWeight: 'bold', padding: 0 }}>✕</button>
                </div>
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'space-between', marginTop: '8px' }}>
                <p style={{ margin: 0, fontSize: '12px', color: '#A0978D', lineHeight: '1.5' }}>
                  {isClosedOrDeclined ? '此洽談已終止，以下為當時留存的歷史規格。' : isArtist ? '請在此填寫最終規格，確認後送出提案。' : '繪師送出提案後，您可在此確認並建立委託。'}
                </p> 
                {!isClosedOrDeclined && isArtist && artistQuota && (
                   <span style={{ fontSize: '11px', fontWeight: 'bold', color: artistQuota.max_quota !== -1 && artistQuota.used_quota >= artistQuota.max_quota ? '#A05C5C' : '#4A7294', backgroundColor: artistQuota.max_quota !== -1 && artistQuota.used_quota >= artistQuota.max_quota ? '#FDF4F4' : '#EBF2F7', padding: '2px 6px', borderRadius: '4px', border: artistQuota.max_quota !== -1 && artistQuota.used_quota >= artistQuota.max_quota ? '1px solid #E8C1C1' : '1px solid #C1D6E8', whiteSpace: 'nowrap', flexShrink: 0 }}>{artistQuota.max_quota === -1 ? '專業版無限額度' : `活躍訂單：${artistQuota.used_quota} / ${artistQuota.max_quota}`}</span>
                )}
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
              <div style={{ backgroundColor: '#FBFBF9', border: '1px solid #EAE6E1', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 'bold', color: '#7A7269', display: 'flex', alignItems: 'center', gap: '6px', margin: '0 0 12px 0' }}>🔍 初始需求單 (不可篡改)</h4>
                <div className={isTrajectoryExpanded ? "" : "line-clamp-3"} style={{ fontSize: '12px', color: '#5D4A3E', lineHeight: '1.6', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                  {isDirectInquiry ? (
                    <div style={{ paddingBottom: '8px' }}>
                      {parsedFormAnswers.length > 0 ? parsedFormAnswers.map((qa, i) => (
                        <div key={i} style={{ marginBottom: '10px' }}>
                          <strong style={{ color: '#A67B3E' }}>Q: {qa.question}</strong><br/>
                          <span style={{ whiteSpace: 'pre-wrap' }}>A: {Array.isArray(qa.answer) ? qa.answer.join(', ') : (qa.answer || '(未填寫)')}</span>
                        </div>
                      )) : (
                        <div style={{ color: '#A0978D', fontStyle: 'italic' }}>委託人未填寫任何客製化問答。</div>
                      )}
                    </div>
                  ) : (
                    <>
                      <div style={{ paddingBottom: '8px', borderBottom: '1px dashed #DED9D3', marginBottom: '8px' }}>
                        <strong style={{ color: '#A67B3E' }}>【{isOffer ? '繪師' : '委託方'}的原始貼文設定】</strong><br/>
                        <span style={{ whiteSpace: 'pre-wrap' }}>{displayContent}</span>
                      </div>
                      <div>
                        <strong style={{ color: '#4A7294' }}>【{isOffer ? '委託方' : '繪師'}的投遞回覆】</strong><br/>
                        {parsedSnapshot.answers && parsedSnapshot.answers.length > 0 && (
                          <div style={{ marginTop: '4px', marginBottom: '8px' }}>
                            {parsedSnapshot.answers.map((ans: any, idx: number) => (
                              <div key={idx} style={{ marginTop: '4px' }}>
                                <strong style={{ color: '#A0978D' }}>Q: {ans.question}</strong><br/>
                                <span style={{ whiteSpace: 'pre-wrap' }}>A: {ans.answer || '(未填寫)'}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {parsedSnapshot.message && (
                          <div style={{ marginTop: '4px' }}>
                            <strong style={{ color: '#A0978D' }}>備註留言：</strong><br/>
                            <span style={{ whiteSpace: 'pre-wrap' }}>{parsedSnapshot.message}</span>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
                <button onClick={() => setIsTrajectoryExpanded(!isTrajectoryExpanded)} style={{ background: 'none', border: 'none', color: '#A67B3E', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', marginTop: '8px', padding: 0, width: '100%', textAlign: 'center' }}>
                  {isTrajectoryExpanded ? "▲ 收起完整內容" : "▼ 展開完整內容"}
                </button>
              </div>

              <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #EAE6E1', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 'bold', color: '#7A7269', margin: '0 0 12px 0' }}>⚙️ 系統核心參數</h4>
                
                <div style={{ padding: '12px', backgroundColor: '#FDFDFB', borderRadius: '8px', border: '1px solid #EAE6E1', marginBottom: '16px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#5D4A3E', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><BookUser size={14} /> 綁定角色設定卡</span>
                    {isEditableByArtist && draft.oc_snapshot && (
                      <button onClick={() => { if(window.confirm('確定要從合約中移除此角色卡嗎？')) { const newDraft = {...draft}; delete newDraft.oc_snapshot; setDraft(newDraft); } }} style={{ background: 'none', border: 'none', color: '#A05C5C', fontSize: '11px', cursor: 'pointer', padding: 0, fontWeight: 'bold' }}>✕ 移除</button>
                    )}
                  </label>
                  {draft.oc_snapshot ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '6px', backgroundColor: '#F4F0EB', overflow: 'hidden', border: '1px solid #EAE6E1', flexShrink: 0 }}>
{(() => {
  // 關鍵修正：從小快照中取出預覽圖並補上 R2 網域
  let snapshotImgUrl = null;
  try {
    const imgs = draft.oc_snapshot.images;
    if (imgs && imgs.length > 0) {
      const rawUrl = imgs[0].previewUrl || imgs[0].url || '';
      snapshotImgUrl = rawUrl.startsWith('http') ? rawUrl : `${R2_PUBLIC_URL}/${rawUrl.replace(/^\//, '')}`;
    }
  } catch(e){}

  return snapshotImgUrl ? (
    <img src={snapshotImgUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
  ) : <ImageIcon size={16} style={{ margin: '12px auto', display: 'block', color: '#A0978D' }} />;
})()}
                      </div>
                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#332D28', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{draft.oc_snapshot.name}</div>
                        <button onClick={() => setViewingOCSnapshot(draft.oc_snapshot)} style={{ background: 'none', border: 'none', color: '#4A7294', fontSize: '11px', cursor: 'pointer', padding: 0, marginTop: '2px', fontWeight: 'bold' }}>檢視設定卡內容</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: '12px', color: '#A0978D', lineHeight: '1.5' }}>
                      {isArtist ? '尚未綁定。若委託人有在聊天室發送角色卡，可點擊「帶入合約」按鈕進行綁定。' : '繪師尚未將您的角色卡綁定入合約中。'}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div><label style={{ fontSize: '12px', fontWeight: 'bold', color: '#5D4A3E', display: 'block', marginBottom: '6px' }}>項目名稱</label><input disabled={!isEditableByArtist} className="draft-input" value={draft.project_name} onChange={(e) => setDraft({...draft, project_name: e.target.value})} /></div>
                  
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ flex: 2 }}><label style={{ fontSize: '12px', fontWeight: 'bold', color: '#5D4A3E', display: 'block', marginBottom: '6px' }}>委託總金額 (NT$)</label><input type="number" disabled={!isEditableByArtist} className="draft-input" style={{ borderColor: '#A67B3E', backgroundColor: '#FDF4E6' }} value={draft.total_price} onChange={(e) => setDraft({...draft, total_price: Number(e.target.value)})} /></div>
                    <div style={{ flex: 1 }}><label style={{ fontSize: '12px', fontWeight: 'bold', color: '#5D4A3E', display: 'block', marginBottom: '6px' }}>急件</label><select disabled={!isEditableByArtist} className="draft-input" value={draft.is_rush} onChange={(e) => setDraft({...draft, is_rush: e.target.value})}><option value="否">否</option><option value="是">是</option></select></div>
                  </div>

                  <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ flex: 1 }}><label style={{ fontSize: '12px', fontWeight: 'bold', color: '#5D4A3E', display: 'block', marginBottom: '6px' }}>繪製範圍</label><input disabled={!isEditableByArtist} className="draft-input" value={draft.draw_scope} onChange={(e) => setDraft({...draft, draw_scope: e.target.value})} /></div>
                    <div style={{ flex: 1 }}><label style={{ fontSize: '12px', fontWeight: 'bold', color: '#5D4A3E', display: 'block', marginBottom: '6px' }}>背景設定</label><input disabled={!isEditableByArtist} className="draft-input" value={draft.bg_type} onChange={(e) => setDraft({...draft, bg_type: e.target.value})} /></div>
                  </div>

                  <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ flex: 1 }}><label style={{ fontSize: '12px', fontWeight: 'bold', color: '#5D4A3E', display: 'block', marginBottom: '6px' }}>人物數量</label><input type="number" disabled={!isEditableByArtist} className="draft-input" value={draft.char_count} onChange={(e) => setDraft({...draft, char_count: Number(e.target.value)})} /></div>
                    <div style={{ flex: 1 }}><label style={{ fontSize: '12px', fontWeight: 'bold', color: '#5D4A3E', display: 'block', marginBottom: '6px' }}>委託用途</label><input disabled={!isEditableByArtist} className="draft-input" value={draft.usage_type} onChange={(e) => setDraft({...draft, usage_type: e.target.value})} /></div>
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#5D4A3E', display: 'block', marginBottom: '6px' }}>付款階段與說明</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input 
                        type="text" 
                        disabled={!isEditableByArtist} 
                        className="draft-input" 
                        value={draft.payment_timing || ''} 
                        onChange={(e) => setDraft({...draft, payment_timing: e.target.value})} 
                        placeholder="例如：訂金 30%、完稿 70%"
                      />
                      {isEditableByArtist && (
                        <button 
                          onClick={handleSavePaymentPreset}
                          style={{ padding: '0 12px', background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: '8px', color: '#4A7294', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
                          title="儲存為常用付款方式"
                        >
                          儲存
                        </button>
                      )}
                    </div>
                    {isEditableByArtist && paymentPresets.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                        {paymentPresets.map(preset => (
                          <div 
                            key={preset}
                            onClick={() => setDraft({ ...draft, payment_timing: preset })}
                            style={{ padding: '4px 10px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '50px', fontSize: '11px', color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }}
                          >
                            <span>{preset}</span>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleDeletePaymentPreset(preset); }}
                              style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 0, fontSize: '13px', lineHeight: 1 }}
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              </div>

              <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #EAE6E1', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 'bold', color: '#7A7269', margin: '0 0 8px 0' }}>📝 最終確認規格 / 備忘錄</h4>
                <textarea 
                  disabled={!isEditableByArtist} 
                  className="draft-input" 
                  style={{ minHeight: '120px', resize: 'vertical', fontSize: '13px', lineHeight: '1.6' }} 
                  value={draft.agreed_memo || ''} 
                  onChange={(e) => setDraft({...draft, agreed_memo: e.target.value})} 
                  placeholder="輸入最終確認的備註細節..." 
                />
              </div>

              <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #EAE6E1', borderRadius: '12px', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', gap: '8px' }}>
                  <h4 style={{ fontSize: '13px', fontWeight: 'bold', color: '#7A7269', margin: 0, flexShrink: 0 }}>📜 繪師專屬協議條款 (TOS)</h4>
                  {isEditableByArtist && (
                    <button 
                      onClick={() => setDraft({...draft, custom_tos: artistTos})}
                      style={{ fontSize: '11px', padding: '4px 8px', background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: '4px', cursor: 'pointer', color: '#4A7294', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', flexShrink: 0  }}
                    >
                      帶入個人範本
                    </button>
                  )}
                </div>
                {isEditableByArtist ? (
                  <div className="quote-quill-wrapper" style={{ margin: 0 }}>
                    <ReactQuill 
                      theme="snow" 
                      value={draft.custom_tos !== undefined ? draft.custom_tos : artistTos} 
                      onChange={(val) => setDraft({...draft, custom_tos: val})} 
                      modules={customQuillModules} 
                    />
                  </div>
                ) : (
                  <div className="tos-read-only-content" style={{ fontSize: '13px', color: '#7A7269', lineHeight: '1.7', whiteSpace: 'pre-wrap', backgroundColor: '#FBFBF9', padding: '12px', borderRadius: '8px', border: '1px solid #EAE6E1' }} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(finalDisplayTos) }} />
                )}
              </div>

            </div>

            {!isClosedOrDeclined && (
              <div style={{ padding: '20px', backgroundColor: '#FFFFFF', borderTop: '1px solid #EAE6E1', display: 'flex', flexDirection: 'column', gap: '10px', flexShrink: 0 }}>
                {isEditableByArtist && (
                  <>
                    <button onClick={handleSaveDraft} style={{ width: '100%', padding: '12px', borderRadius: '8px', background: '#FBFBF9', color: '#5D4A3E', border: '1px solid #DED9D3', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>💾 儲存協議草稿</button>
                    <button onClick={handlePropose} disabled={isQuotaFull} style={{ width: '100%', padding: '12px', borderRadius: '8px', background: isQuotaFull ? '#DED9D3' : '#5D4A3E', color: '#FFFFFF', border: 'none', fontWeight: 'bold', cursor: isQuotaFull ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>{isQuotaFull ? '❌ 額度已滿' : '🚀 送出正式提案'}</button>
                  </>
                )}

                {!isArtist && inquiry.status === 'proposed' && (
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={handleRejectProposal} style={{ flex: 1, padding: '16px', borderRadius: '8px', background: '#FFFFFF', color: '#A05C5C', border: '1px solid #E8C1C1', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>退回修正</button>
                    <button onClick={() => { setShowMobileAside(false); setShowFinalModal(true); }} style={{ flex: 2, padding: '16px', borderRadius: '8px', background: '#4E7A5A', color: '#FFFFFF', border: 'none', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>✅ 同意並建立委託</button>
                  </div>
                )}

                {inquiry.status === 'proposed' && isArtist && (
                  <div style={{ textAlign: 'center', color: '#A67B3E', fontSize: '13px', fontWeight: 'bold', backgroundColor: '#FDF4E6', padding: '12px', borderRadius: '8px', border: '1px solid #FDE0B5' }}>⏳ 已送出提案，等待委託人確認中...</div>
                )}
              </div>
            )}
          </aside>
        )}

        {showFinalModal && (
          <div className="iw-modal-overlay" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(26, 20, 18, 0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10001, padding: '20px' }}>
            <div className="iw-modal-content-paper" style={{ backgroundColor: '#FDFDFB', width: '100%', maxWidth: '650px', borderRadius: '16px', boxShadow: '0 25px 50px -12px rgba(93, 74, 62, 0.25)', position: 'relative', overflow: 'hidden', border: '1px solid #EAE6E1', display: 'flex', flexDirection: 'column', maxHeight: '90vh', minHeight: 0 }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '8px', background: 'repeating-linear-gradient(45deg, #C27A7A 0, #C27A7A 20px, #FDFDFB 20px, #FDFDFB 40px, #7A93AC 40px, #7A93AC 60px, #FDFDFB 60px, #FDFDFB 80px)' }}></div>
              
              <div className="custom-scrollbar" style={{ padding: '30px', overflowY: 'auto', flex: 1, marginTop: '8px', minHeight: 0 }}>
                <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#5D4A3E', marginBottom: '20px', textAlign: 'center' }}>📄 最終委託合約確認</h2>
                
                <div style={{ background: '#FBFBF9', border: '1px solid #EAE6E1', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
                  <h4 style={{ color: '#A67B3E', borderBottom: '1px solid #FDE0B5', paddingBottom: '8px', marginBottom: '12px', fontWeight: 'bold', margin: '0 0 12px 0' }}>本次委託核心參數摘要</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '14px', color: '#5D4A3E' }}>
                    <p style={{ margin: 0 }}><strong>項目名稱：</strong> {draft.project_name}</p>
                    <p style={{ margin: 0 }}><strong>最終金額：</strong> <span style={{ color: '#A05C5C', fontWeight: 'bold' }}>NT$ {draft.total_price}</span></p>
                    <p style={{ margin: 0, gridColumn: '1 / -1' }}><strong>付款階段：</strong> {draft.payment_timing || '(未填寫)'}</p>
                    <p style={{ margin: 0 }}><strong>繪製範圍：</strong> {draft.draw_scope}</p>
                    <p style={{ margin: 0 }}><strong>人物數量：</strong> {draft.char_count} 人</p>
                    <p style={{ margin: 0 }}><strong>背景類型：</strong> {draft.bg_type}</p>
                    <p style={{ margin: 0 }}><strong>急件需求：</strong> {draft.is_rush}</p>
                    <p style={{ margin: 0 }}><strong>委託用途：</strong> {draft.usage_type}</p>
                    {draft.oc_snapshot && (
                      <p style={{ margin: 0, gridColumn: '1 / -1' }}>
                        <strong>綁定角色設定卡：</strong> <span style={{ color: '#4A7294', fontWeight: 'bold' }}>{draft.oc_snapshot.name}</span>
                      </p>
                    )}
                  </div>
                </div>

                {draft.agreed_memo && (
                  <div style={{ background: '#FDFDFB', border: '1px solid #EAE6E1', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
                    <h4 style={{ color: '#4A7294', borderBottom: '1px solid #C1D6E8', paddingBottom: '8px', marginBottom: '12px', fontWeight: 'bold', margin: '0 0 12px 0' }}>📝 最終確認規格 / 備忘錄</h4>
                    <div style={{ fontSize: '13px', color: '#5D4A3E', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{draft.agreed_memo}</div>
                  </div>
                )}

                <div style={{ border: '1px solid #EAE6E1', borderRadius: '12px', padding: '20px', backgroundColor: '#FFFFFF' }}>
                  <h4 style={{ color: '#5D4A3E', marginBottom: '12px', fontWeight: 'bold', margin: '0 0 12px 0' }}>繪師專屬協議條款 (TOS)</h4>
                  <div className="tos-read-only-content" style={{ fontSize: '13px', color: '#7A7269', lineHeight: '1.7', whiteSpace: 'pre-wrap' }} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(finalDisplayTos) }} />
                </div>
              </div>

              <div style={{ padding: '20px 30px', borderTop: '1px solid #EAE6E1', backgroundColor: '#FDFDFB', flexShrink: 0 }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', marginBottom: '20px' }}>
                  <input type="checkbox" checked={agreedToTerms} onChange={(e) => setAgreedToTerms(e.target.checked)} style={{ width: '18px', height: '18px', cursor: 'pointer', marginTop: '2px' }} />
                  <span style={{ fontSize: '14px', color: '#5D4A3E', fontWeight: 'bold', lineHeight: '1.4' }}>我已詳細閱讀並同意以上委託規格與繪師協議。</span>
                </label>
                <div className="iw-modal-actions" style={{ display: 'flex', gap: '15px' }}>
                  <button style={{ flex: 1, color: '#A0978D', fontWeight: 'bold', border: '1px solid #EAE6E1', background: '#FFFFFF', cursor: 'pointer', padding: '12px', borderRadius: '8px' }} onClick={() => setShowFinalModal(false)}>再考慮一下</button>
                  <button disabled={!agreedToTerms} onClick={handleFinalize} style={{ flex: 2, background: '#4E7A5A', color: 'white', padding: '12px', borderRadius: '8px', fontWeight: 'bold', border: 'none', opacity: agreedToTerms ? 1 : 0.5, cursor: agreedToTerms ? 'pointer' : 'not-allowed', whiteSpace: 'nowrap' }}>正式簽署並建立委託 ➔</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showOCSelection && (
          <div className="iw-modal-overlay" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(26, 20, 18, 0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10002, padding: '20px', animation: 'fadeIn 0.2s ease-in-out' }}>
            <div className="iw-modal-content-paper" style={{ backgroundColor: '#FDFDFB', width: '100%', maxWidth: '500px', borderRadius: '16px', padding: '24px', boxShadow: '0 25px 50px -12px rgba(93, 74, 62, 0.25)', position: 'relative' }}>
               <h3 style={{ marginTop: 0, color: '#5D4A3E', borderBottom: '1px solid #EAE6E1', paddingBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                 選擇要發送的角色卡
                 <button onClick={() => setShowOCSelection(false)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#A0978D' }}>✕</button>
               </h3>

               <div style={{ maxHeight: '60vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
                 {isLoadingOCs ? (
                   <div style={{ textAlign: 'center', color: '#A0978D', padding: '20px' }}>讀取您的角色庫中...</div>
                 ) : myOCs.length === 0 ? (
                   <div style={{ textAlign: 'center', color: '#A0978D', padding: '30px 20px', backgroundColor: '#F4F0EB', borderRadius: '8px' }}>
                     您還沒有建立 any 專屬角色卡喔！<br/>請先前往「我的角色卡 (OC)」介面建立。
                   </div>
                 ) : (
                   myOCs.map(oc => {
                     let firstImage = null;
                     try {
    // 關鍵修正：將可能為字串的 oc.images 解析，並動態補上 R2 網域
    const images = typeof oc.images === 'string' ? JSON.parse(oc.images || '[]') : (oc.images || []);
    if (images.length > 0) {
      const rawUrl = images[0].previewUrl || images[0].url || '';
      firstImage = rawUrl.startsWith('http') ? rawUrl : `${R2_PUBLIC_URL}/${rawUrl.replace(/^\//, '')}`;
    }
  } catch(e) { console.error(e); }

                     return (
                       <div key={oc.id} className="oc-selection-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', border: '1px solid #EAE6E1', borderRadius: '8px', backgroundColor: '#FFF' }}>
                          <div className="oc-selection-info" style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden' }}>
                            <div style={{ width: '48px', height: '48px', borderRadius: '6px', backgroundColor: '#F4F0EB', overflow: 'hidden', flexShrink: 0 }}>
                              {firstImage ? (
                                <img src={firstImage} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#DED9D3' }}><ImageIcon size={20} /></div>
                              )}
                            </div>
                            <div style={{ overflow: 'hidden' }}>
                              <div style={{ fontWeight: 'bold', color: '#5D4A3E', fontSize: '15px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{oc.name || '未命名角色'}</div>
                              <div style={{ fontSize: '12px', color: '#A0978D', marginTop: '2px' }}>{oc.gender || '無性別'} {oc.body_type || ''}</div>
                            </div>
                          </div>
                          <button
                            onClick={() => handleSendOC(oc.id)}
                            style={{ padding: '8px 16px', backgroundColor: '#8CB369', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', flexShrink: 0, transition: 'background 0.2s' }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#7A9E58'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#8CB369'}
                          >
                            發送快照
                          </button>
                       </div>
                     );
                   })
                 )}
               </div>
            </div>
          </div>
        )}

        {viewingOCSnapshot && (
          <div className="oc-view-modal-container" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.6)', zIndex: 10003, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', animation: 'fadeIn 0.2s ease-in-out' }}>
            <div style={{ width: '100%', maxWidth: '900px', maxHeight: '90vh', backgroundColor: 'transparent', position: 'relative', display: 'flex', flexDirection: 'column' }}>
              <button
                className="oc-view-close-btn"
                onClick={() => setViewingOCSnapshot(null)}
                style={{ position: 'absolute', top: '-40px', right: 0, background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 'bold', zIndex: 10004 }}
              >
                關閉 <X size={20} />
              </button>
              <div style={{ overflowY: 'auto', borderRadius: '12px', backgroundColor: '#FDFDFB' }}>
                <OCDetailCard ocData={viewingOCSnapshot} />
              </div>
            </div>
          </div>
        )}

      </div>
    </div> 
  );
};