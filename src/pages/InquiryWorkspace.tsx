// src/pages/Inquiry/InquiryWorkspace.tsx
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import DOMPurify from 'dompurify';
import '../styles/Workspace.css';

const R2_PUBLIC_URL = "https://pub-1d4bcc7f19324c0d95d7bfdfeb1a69e2.r2.dev";

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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // 🌟 捲動狀態相關 Refs 與 State
  const chatMainRef = useRef<HTMLElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [isScrolledUp, setIsScrolledUp] = useState(false);
  
  const isFirstLoad = useRef(true);
  const [isAccepted, setIsAccepted] = useState(false);

  const [artistQuota, setArtistQuota] = useState<{ used_quota: number; max_quota: number; plan_type: string } | null>(null);

  const [draft, setDraft] = useState<any>({
    project_name: '', 
    total_price: 0, 
    usage_type: '非商用', 
    is_rush: '否', 
    draw_scope: '大頭', 
    bg_type: '無背景', 
    char_count: 1, 
    add_ons: '',
    agreed_memo: ''
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
        
        if (data.status === 'accepted') setIsAccepted(true);

        if (isFirstLoad.current || !currentUserIsArtist || (data.status !== 'submitted' && data.status !== 'pending')) {
          if (data.negotiation_draft) {
            setDraft(JSON.parse(data.negotiation_draft));
          } else if (isFirstLoad.current) {
             let defaultName = data.bulletin_title;
             
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
                 } catch(e) {
                   defaultName = "許願池委託";
                 }
               }
             }
            setDraft((prev: any) => ({ ...prev, project_name: defaultName || "" }));
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
       return alert('抱歉，您本月的建單額度 (3張) 已滿。請升級為專業版以解鎖無限接案次數！');
    }
    if (!window.confirm('送出正式提案後將鎖定內容，直到案主回覆。確定送出？')) return;
    try {
      await apiClient.patch(`/api/${apiPrefix}/${id}/draft`, { draft_json: JSON.stringify(draft) });
      const res = await apiClient.post(`/api/${apiPrefix}/${id}/propose`, {});
      if (res.success) {
        alert('已送出正式提案給案主！');
        setShowMobileAside(false); 
        fetchData();
      } else alert(res.message || '送出提案失敗');
    } catch (error: any) { alert('送出提案失敗：' + error.message); }
  };

  const handleFinalize = async () => {
    if (!agreedToTerms) return alert('請先勾選同意委託協議。');
    try {
      const res = await apiClient.post(`/api/${apiPrefix}/${id}/finalize`, {});
      if (res.success) {
        setShowFinalModal(false);
        fetchData();
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
      if (settings.terms_of_service && settings.terms_of_service.trim() !== '') {
        artistTos = settings.terms_of_service;
      }
    } catch(e) {}
  }

  const isQuotaFull = !!(isArtist && artistQuota && artistQuota.max_quota !== -1 && artistQuota.used_quota >= artistQuota.max_quota);

  const isEditableByArtist = isArtist && (
    (isDirectInquiry && inquiry.status === 'pending') ||
    (!isDirectInquiry && inquiry.status === 'submitted') 
  );

  // 🌟 動態產出標題與對象資訊 (參考 Notebook 顯示邏輯)
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
              <div className="iw-role-badge" style={{ padding: '4px 12px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', backgroundColor: isArtist ? '#EBF2F7' : '#FDF4E6', color: isArtist ? '#4A7294' : '#A67B3E', border: isArtist ? '1px solid #C1D6E8' : '1px solid #FDE0B5' }}>{isArtist ? '🎨 繪師' : '👤 委託人'}</div>
            </div>
          </header>

          <main ref={chatMainRef} onScroll={handleScroll} className="iw-chat-main custom-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', backgroundColor: '#FBFBF9', position: 'relative' }}>
            
            {isAccepted && (
              <div style={{ backgroundColor: '#EBF5EB', color: '#4E7A5A', padding: '12px', borderRadius: '8px', textAlign: 'center', fontSize: '13px', fontWeight: 'bold', border: '1px solid #C8E6C9', marginBottom: '8px' }}>
                🎉 委託單已正式成立！右側合約面板已隱藏，您可以繼續在此與對方討論後續進度與草稿。
              </div>
            )}

            {messages.map((msg) => {
              const isMe = msg.sender_id === currentUserId;
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

          <footer className="iw-chat-footer" style={{ backgroundColor: '#FFFFFF', padding: '16px 20px', borderTop: '1px solid #EAE6E1', display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
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
            <button onClick={handleSendMessage} disabled={!newMessage.trim() && !isUploadingImage} style={{ padding: '12px 24px', borderRadius: '99px', backgroundColor: (newMessage.trim() || isUploadingImage) ? '#5D4A3E' : '#DED9D3', color: '#FFFFFF', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>傳送</button>
          </footer>
        </div>

        {!isAccepted && (
          <aside className={`iw-aside-section custom-scrollbar ${showMobileAside ? 'mobile-open' : ''}`} style={{ width: '440px', borderLeft: '1px solid #EAE6E1', backgroundColor: '#FDFDFB', display: 'flex', flexDirection: 'column', zIndex: 20 }}>
            <div style={{ padding: '20px', borderBottom: '1px solid #EAE6E1', backgroundColor: '#FFFFFF' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#5D4A3E', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>📝 最終規格與合約確認</span>
                <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '6px', backgroundColor: '#FBFBF9', border: '1px solid #EAE6E1', color: '#7A7269' }}>
                  {isDirectInquiry 
                    ? (inquiry.status === 'pending' ? '草稿編修中' : inquiry.status === 'proposed' ? '待案主同意' : '已成單')
                    : (inquiry.status === 'submitted' ? '草稿編修中' : inquiry.status === 'proposed' ? '待案主同意' : '已成單')
                  }
                </span>
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' }}>
                <p style={{ margin: 0, fontSize: '12px', color: '#A0978D', lineHeight: '1.5' }}>{isArtist ? '請在此填寫最終規格，確認後送出提案。' : '繪師送出提案後，您可在此確認並建立委託。'}</p> 
                {isArtist && artistQuota && (
                   <span style={{ fontSize: '11px', fontWeight: 'bold', color: artistQuota.max_quota !== -1 && artistQuota.used_quota >= artistQuota.max_quota ? '#A05C5C' : '#4A7294', backgroundColor: artistQuota.max_quota !== -1 && artistQuota.used_quota >= artistQuota.max_quota ? '#FDF4F4' : '#EBF2F7', padding: '2px 6px', borderRadius: '4px', border: artistQuota.max_quota !== -1 && artistQuota.used_quota >= artistQuota.max_quota ? '1px solid #E8C1C1' : '1px solid #C1D6E8' }}>{artistQuota.max_quota === -1 ? '專業版無限額度' : `本月建單：${artistQuota.used_quota} / ${artistQuota.max_quota}`}</span>
                )}
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
              <div style={{ backgroundColor: '#FBFBF9', border: '1px solid #EAE6E1', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 'bold', color: '#7A7269', display: 'flex', alignItems: 'center', gap: '6px', margin: '0 0 12px 0' }}>🔍 初始需求單 (不可篡改的原始填寫)</h4>
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
                        {!isOffer && (parsedSnapshot.specialties || parsedSnapshot.no_gos) && (
                          <div style={{ marginTop: '6px' }}>
                            {parsedSnapshot.specialties && <div style={{ color: '#ff8c00', marginBottom: '2px' }}>舒適圈：{parsedSnapshot.specialties}</div>}
                            {parsedSnapshot.no_gos && <div style={{ color: '#e11d48' }}>雷點：{parsedSnapshot.no_gos}</div>}
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
                <h4 style={{ fontSize: '13px', fontWeight: 'bold', color: '#7A7269', margin: '0 0 12px 0' }}>⚙️ 系統核心參數 (影響計價與排單)</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div><label style={{ fontSize: '12px', fontWeight: 'bold', color: '#5D4A3E', display: 'block', marginBottom: '6px' }}>項目名稱</label><input disabled={!isEditableByArtist} className="draft-input" value={draft.project_name} onChange={(e) => setDraft({...draft, project_name: e.target.value})} /></div>
                  
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ flex: 2 }}><label style={{ fontSize: '12px', fontWeight: 'bold', color: '#5D4A3E', display: 'block', marginBottom: '6px' }}>委託總金額 (NT$)</label><input type="number" disabled={!isEditableByArtist} className="draft-input" style={{ borderColor: '#A67B3E', backgroundColor: '#FDF4E6' }} value={draft.total_price} onChange={(e) => setDraft({...draft, total_price: Number(e.target.value)})} /></div>
                    <div style={{ flex: 1 }}><label style={{ fontSize: '12px', fontWeight: 'bold', color: '#5D4A3E', display: 'block', marginBottom: '6px' }}>是否急件</label><select disabled={!isEditableByArtist} className="draft-input" value={draft.is_rush} onChange={(e) => setDraft({...draft, is_rush: e.target.value})}><option value="否">否</option><option value="是">是</option></select></div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ flex: 1 }}><label style={{ fontSize: '12px', fontWeight: 'bold', color: '#5D4A3E', display: 'block', marginBottom: '6px' }}>人物數量</label><input type="number" disabled={!isEditableByArtist} className="draft-input" value={draft.char_count} onChange={(e) => setDraft({...draft, char_count: Number(e.target.value)})} /></div>
                    <div style={{ flex: 1 }}><label style={{ fontSize: '12px', fontWeight: 'bold', color: '#5D4A3E', display: 'block', marginBottom: '6px' }}>委託用途</label><input disabled={!isEditableByArtist} className="draft-input" placeholder="如: 商用/非商用" value={draft.usage_type} onChange={(e) => setDraft({...draft, usage_type: e.target.value})} /></div>
                  </div>

                  <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ flex: 1 }}><label style={{ fontSize: '12px', fontWeight: 'bold', color: '#5D4A3E', display: 'block', marginBottom: '6px' }}>繪畫範圍</label>
                      <select disabled={!isEditableByArtist} className="draft-input" style={{ marginBottom: '8px' }} value={['大頭', '半身', '全身'].includes(draft.draw_scope) ? draft.draw_scope : 'other'} onChange={(e) => setDraft({...draft, draw_scope: e.target.value === 'other' ? '' : e.target.value})}>
                        <option value="大頭">大頭</option><option value="半身">半身</option><option value="全身">全身</option><option value="other">自行輸入...</option>
                      </select>
                      {!['大頭', '半身', '全身'].includes(draft.draw_scope) && <input disabled={!isEditableByArtist} className="draft-input" placeholder="請輸入範圍" value={draft.draw_scope} onChange={(e) => setDraft({...draft, draw_scope: e.target.value})} />}
                    </div>
                    <div style={{ flex: 1 }}><label style={{ fontSize: '12px', fontWeight: 'bold', color: '#5D4A3E', display: 'block', marginBottom: '6px' }}>背景類型</label>
                      <select disabled={!isEditableByArtist} className="draft-input" style={{ marginBottom: '8px' }} value={['無背景', '簡單/色塊', '複雜背景'].includes(draft.bg_type) ? draft.bg_type : 'other'} onChange={(e) => setDraft({...draft, bg_type: e.target.value === 'other' ? '' : e.target.value})}>
                        <option value="無背景">無背景</option><option value="簡單/色塊">簡單/色塊</option><option value="複雜背景">複雜背景</option><option value="other">自行輸入...</option>
                      </select>
                      {!['無背景', '簡單/色塊', '複雜背景'].includes(draft.bg_type) && <input disabled={!isEditableByArtist} className="draft-input" placeholder="請輸入背景需求" value={draft.bg_type} onChange={(e) => setDraft({...draft, bg_type: e.target.value})} />}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #EAE6E1', borderRadius: '12px', padding: '16px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 'bold', color: '#7A7269', margin: '0 0 8px 0' }}>📝 最終確認規格 / 備忘錄 (雙方共識)</h4>
                <p style={{ fontSize: '11px', color: '#A0978D', margin: '0 0 12px 0', lineHeight: '1.5' }}>
                  {isArtist ? "請將左側聊天室討論出的修改統整於此，送出提案後將作為正式合約依據。" : "繪師會將討論好的最終修改與細節註記在這裡。"}
                </p>
                <textarea 
                  disabled={!isEditableByArtist} 
                  className="draft-input" 
                  style={{ minHeight: '150px', resize: 'vertical', fontSize: '13px', lineHeight: '1.6' }} 
                  value={draft.agreed_memo || ''} 
                  onChange={(e) => setDraft({...draft, agreed_memo: e.target.value})} 
                  placeholder="輸入最終確認的備註細節..." 
                />
              </div>
            </div>

            <div style={{ padding: '20px', backgroundColor: '#FFFFFF', borderTop: '1px solid #EAE6E1', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {isEditableByArtist && (
                <>
                  <button onClick={handleSaveDraft} style={{ width: '100%', padding: '12px', borderRadius: '8px', background: '#FBFBF9', color: '#5D4A3E', border: '1px solid #DED9D3', fontWeight: 'bold', cursor: 'pointer' }}>💾 儲存協議草稿</button>
                  <button onClick={handlePropose} disabled={isQuotaFull} style={{ width: '100%', padding: '12px', borderRadius: '8px', background: isQuotaFull ? '#DED9D3' : '#5D4A3E', color: '#FFFFFF', border: 'none', fontWeight: 'bold', cursor: isQuotaFull ? 'not-allowed' : 'pointer' }}>{isQuotaFull ? '❌ 額度已滿，無法提案' : '🚀 送出正式提案'}</button>
                </>
              )}
              {!isArtist && inquiry.status === 'proposed' && (
                <button onClick={() => { setShowMobileAside(false); setShowFinalModal(true); }} style={{ width: '100%', padding: '16px', borderRadius: '8px', background: '#4E7A5A', color: '#FFFFFF', border: 'none', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer' }}>✅ 同意並正式建立委託單</button>
              )}
              {inquiry.status === 'proposed' && isArtist && (
                <div style={{ textAlign: 'center', color: '#A67B3E', fontSize: '13px', fontWeight: 'bold', backgroundColor: '#FDF4E6', padding: '12px', borderRadius: '8px', border: '1px solid #FDE0B5' }}>⏳ 已送出提案，等待案主確認中...</div>
              )}
            </div>
          </aside>
        )}

        {showFinalModal && (
          <div className="iw-modal-overlay" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(26, 20, 18, 0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10001, padding: '20px' }}>
            <div className="iw-modal-content-paper" style={{ backgroundColor: '#FDFDFB', width: '100%', maxWidth: '650px', borderRadius: '16px', boxShadow: '0 25px 50px -12px rgba(93, 74, 62, 0.25)', position: 'relative', overflow: 'hidden', border: '1px solid #EAE6E1', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '8px', background: 'repeating-linear-gradient(45deg, #C27A7A 0, #C27A7A 20px, #FDFDFB 20px, #FDFDFB 40px, #7A93AC 40px, #7A93AC 60px, #FDFDFB 60px, #FDFDFB 80px)' }}></div>
              
              <div className="custom-scrollbar" style={{ padding: '30px', overflowY: 'auto', flex: 1, marginTop: '8px' }}>
                <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#5D4A3E', marginBottom: '20px', textAlign: 'center' }}>📄 最終委託合約確認</h2>
                
                <div style={{ background: '#FBFBF9', border: '1px solid #EAE6E1', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
                  <h4 style={{ color: '#A67B3E', borderBottom: '1px solid #FDE0B5', paddingBottom: '8px', marginBottom: '12px', fontWeight: 'bold', margin: '0 0 12px 0' }}>本次委託核心參數摘要</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '14px', color: '#5D4A3E' }}>
                    <p style={{ margin: 0 }}><strong>項目名稱：</strong> {draft.project_name}</p>
                    <p style={{ margin: 0 }}><strong>最終金額：</strong> <span style={{ color: '#A05C5C', fontWeight: 'bold' }}>NT$ {draft.total_price}</span></p>
                    <p style={{ margin: 0 }}><strong>繪製範圍：</strong> {draft.draw_scope}</p>
                    <p style={{ margin: 0 }}><strong>人物數量：</strong> {draft.char_count} 人</p>
                    <p style={{ margin: 0 }}><strong>背景類型：</strong> {draft.bg_type}</p>
                    <p style={{ margin: 0 }}><strong>急件需求：</strong> {draft.is_rush}</p>
                    <p style={{ margin: 0, gridColumn: '1 / -1' }}><strong>委託用途：</strong> {draft.usage_type}</p>
                  </div>
                </div>

                {draft.agreed_memo && (
                  <div style={{ background: '#FDFDFB', border: '1px solid #EAE6E1', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
                    <h4 style={{ color: '#4A7294', borderBottom: '1px solid #C1D6E8', paddingBottom: '8px', marginBottom: '12px', fontWeight: 'bold', margin: '0 0 12px 0' }}>📝 最終確認規格 / 備忘錄</h4>
                    <div style={{ fontSize: '13px', color: '#5D4A3E', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{draft.agreed_memo}</div>
                  </div>
                )}

                {!isDirectInquiry && isOffer && (
                  <div style={{ background: '#FDFDFB', border: '1px solid #EAE6E1', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
                    <h4 style={{ color: '#4A7294', borderBottom: '1px solid #C1D6E8', paddingBottom: '8px', marginBottom: '12px', fontWeight: 'bold', margin: '0 0 12px 0' }}>繪師接案基本規範</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px', color: '#5D4A3E' }}>
                      {parsedBulletin.payment_timing && (
                        <p style={{ margin: 0 }}>
                          <strong>支付時機與說明：</strong> {getPaymentTimingLabel(parsedBulletin.payment_timing)} 
                          {parsedBulletin.payment_timing_detail ? ` (${parsedBulletin.payment_timing_detail})` : ''}
                        </p>
                      )}
                      {parsedBulletin.payment_methods && parsedBulletin.payment_methods.length > 0 && (
                        <p style={{ margin: 0 }}><strong>可接受收款方式：</strong> {parsedBulletin.payment_methods.join('、')}</p>
                      )}
                    </div>
                  </div>
                )}

                <div style={{ border: '1px solid #EAE6E1', borderRadius: '12px', padding: '20px', backgroundColor: '#FFFFFF' }}>
                  <h4 style={{ color: '#5D4A3E', marginBottom: '12px', fontWeight: 'bold', margin: '0 0 12px 0' }}>繪師專屬協議條款 (TOS)</h4>
                  <div style={{ fontSize: '13px', color: '#7A7269', lineHeight: '1.7', whiteSpace: 'pre-wrap' }} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(artistTos) }} />
                </div>
              </div>

              <div style={{ padding: '20px 30px', borderTop: '1px solid #EAE6E1', backgroundColor: '#FDFDFB' }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', marginBottom: '20px' }}>
                  <input type="checkbox" checked={agreedToTerms} onChange={(e) => setAgreedToTerms(e.target.checked)} style={{ width: '18px', height: '18px', cursor: 'pointer', marginTop: '2px' }} />
                  <span style={{ fontSize: '14px', color: '#5D4A3E', fontWeight: 'bold', lineHeight: '1.4' }}>我已詳細閱讀並同意以上委託規格與繪師協議。</span>
                </label>
                <div className="iw-modal-actions" style={{ display: 'flex', gap: '15px' }}>
                  <button style={{ flex: 1, color: '#A0978D', fontWeight: 'bold', border: '1px solid #EAE6E1', background: '#FFFFFF', cursor: 'pointer', padding: '12px', borderRadius: '8px' }} onClick={() => setShowFinalModal(false)}>再考慮一下</button>
                  <button disabled={!agreedToTerms} onClick={handleFinalize} style={{ flex: 2, background: '#4E7A5A', color: 'white', padding: '12px', borderRadius: '8px', fontWeight: 'bold', border: 'none', opacity: agreedToTerms ? 1 : 0.5, cursor: agreedToTerms ? 'pointer' : 'not-allowed' }}>正式簽署並建立委託 ➔</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div> 
  );
};