// src/public/Wishboard/WishCard.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, DollarSign, Tag, Clock, Send, User, 
  ChevronLeft, ChevronRight, AlertTriangle, CheckCircle2, 
  Maximize2, X, Users, Heart, Flag, BookUser 
} from 'lucide-react';
import { STYLE_WARNINGS, LICENSE_TAGS, R2_PUBLIC_URL, PAYMENT_TIMING } from './constants';

interface WishCardProps {
  bulletin: any;
  currentUser: any;
  onInquire: (bulletin: any) => void;
  wishQuota?: { 
    is_pro: boolean, 
    offer_used: number, offer_max: number, 
    request_inquire_used: number, request_inquire_max: number 
  } | null;
  onViewOC?: (snapshotData: any) => void; // 修正：補上對齊大廳大腦的屬性宣告
}

const unescapeHtml = (str: string) => {
  if (!str) return '';
  return str.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#039;/g, "'");
};

export const WishCard: React.FC<WishCardProps> = ({ bulletin, currentUser, onInquire, wishQuota, onViewOC }) => {
  const navigate = useNavigate();
  const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

  const isMyOwnPost = currentUser && bulletin.client_id === currentUser.id;
  const hasApplied = currentUser && bulletin.applied_artist_ids && String(bulletin.applied_artist_ids).split(',').includes(currentUser.id);
  
  const isQuotaFull = !isMyOwnPost && bulletin.category === 'request' && wishQuota && !wishQuota.is_pro && (wishQuota.request_inquire_used >= wishQuota.request_inquire_max);

  const [currentImageIdx, setCurrentImageIdx] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState(0);

  const [isFavorited, setIsFavorited] = useState(false);

  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportType, setReportType] = useState('洗版與重複發文');
  const [reportText, setReportText] = useState('');
  const [isReporting, setIsReporting] = useState(false);
  
  const [isRevoking, setIsRevoking] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  let contentObj: any = {};
  let rawDescription = bulletin.content;
  try {
    const rawContent = unescapeHtml(bulletin.content);
    contentObj = JSON.parse(rawContent);
    rawDescription = contentObj.description || '';
  } catch {
    rawDescription = unescapeHtml(bulletin.content);
  }

  const appliedCount = bulletin.inquiry_count || (bulletin.applied_artist_ids ? String(bulletin.applied_artist_ids).split(',').length : 0);

  useEffect(() => {
    let isMounted = true;
    const checkFavoriteStatus = async () => {
      if (!currentUser || isMyOwnPost || !bulletin.client_id) return;
      try {
        const res = await fetch(`${API_BASE}/api/relations`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          if (data.success && isMounted) {
            const myRel = data.data.find((r: any) => r.target_user_id === bulletin.client_id);
            if (myRel && myRel.relation_type === 'favorite') {
              setIsFavorited(true);
            }
          }
        }
      } catch (e) {
        console.error('無法讀取收藏狀態', e);
      }
    };
    checkFavoriteStatus();
    return () => { isMounted = false; };
  }, [currentUser, bulletin.client_id, isMyOwnPost, API_BASE]);

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) {
      alert("請先登入系統後再進行操作喔！");
      return;
    }
    try {
      if (isFavorited) {
        const res = await fetch(`${API_BASE}/api/relations/${bulletin.client_id}`, {
          method: 'DELETE',
          credentials: 'include'
        });
        if (res.ok) setIsFavorited(false);
      } else {
        const res = await fetch(`${API_BASE}/api/relations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetId: bulletin.client_id, type: 'favorite', note: '' }),
          credentials: 'include'
        });
        if (res.ok) setIsFavorited(true);
      }
    } catch (err) {
      console.error("更新收藏狀態失敗", err);
    }
  };

  const handleReportSubmit = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) return;
    if (isReporting) return;

    setIsReporting(true);
    try {
      const finalReason = `[${reportType}] ${reportText}`.trim().substring(0, 200);
      
      const res = await fetch(`${API_BASE}/api/bulletins/${bulletin.id}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: finalReason }),
        credentials: 'include'
      });
      
      const data = await res.json();
      if (res.ok && data.success) {
        alert('檢舉已送出，感謝您協助維護社群環境。');
        setIsReportModalOpen(false);
        setReportText(''); 
      } else {
        alert(`檢舉失敗: ${data.error || '發生未知錯誤'}`);
      }
    } catch (err) {
      alert('系統連線異常，請稍後再試。');
    } finally {
      setIsReporting(false);
    }
  };

  const handleRevokeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (appliedCount > 0) {
      setIsCancelModalOpen(true);
    } else {
      if (window.confirm("確定要撤銷這篇許願發佈嗎？\n\n因為目前尚無繪師投遞，貼文將直接下架。")) {
        executeCancel('已撤銷許願 / 結束徵件');
      }
    }
  };

  const executeCancel = async (reason: string) => {
    setIsRevoking(true);
    try {
      const res = await fetch(`${API_BASE}/api/bulletins/${bulletin.id}/close`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decline_reason: reason }),
        credentials: 'include'
      });
      const data = await res.json();
      
      if (res.ok && data.success) {
        alert('貼文已成功撤銷！');
        window.location.reload(); 
      } else {
        alert(`撤銷失敗: ${data.error || data.message || '發生未知錯誤'}`);
      }
    } catch (err) {
      alert('系統連線異常，撤銷失敗，請稍後再試。');
    } finally {
      setIsRevoking(false);
      setIsCancelModalOpen(false);
    }
  };

  const getTimeRemaining = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - new Date().getTime();
    if (diff <= 0) return '已結束';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    return hours > 24 ? `剩餘 ${Math.floor(hours / 24)}天` : `剩餘 ${hours}小時`;
  };

  const tags = JSON.parse(bulletin.tags || '[]');
  const paymentMethods = JSON.parse(bulletin.payment_methods || '[]');
  
  const paymentTimingValue = bulletin.payment_timing || contentObj.payment_timing || '';
  const paymentTimingDetail = bulletin.payment_timing_detail || contentObj.payment_timing_detail || '';
  const paymentTimingObj = PAYMENT_TIMING.find(t => t.value === paymentTimingValue);
  const paymentTimingLabel = paymentTimingObj ? paymentTimingObj.label : paymentTimingValue;
  
  let images: string[] = [];
  try {
    const parsed = JSON.parse(unescapeHtml(bulletin.ref_image_key || '[]'));
    images = Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    images = bulletin.ref_image_key ? [unescapeHtml(bulletin.ref_image_key)] : [];
  }
  const getFullUrl = (url: string) => url.startsWith('http') ? url : `${R2_PUBLIC_URL}/${url}`;
  const validImages = images.filter(url => url).map(getFullUrl);

  const warningTags = tags.filter((t: string) => STYLE_WARNINGS.includes(t) || t.startsWith('[預警]'));
  const licenseTags = tags.filter((t: string) => LICENSE_TAGS.includes(t) || t.startsWith('[授權]'));
  const styleTags = tags.filter((t: string) => !STYLE_WARNINGS.includes(t) && !LICENSE_TAGS.includes(t) && !t.startsWith('[預警]') && !t.startsWith('[授權]'));

  const selectionType = bulletin.selection_type || contentObj.selection_type || 'fcfs';
  const maxSlots = parseInt(bulletin.max_slots || contentObj.max_slots || 1, 10);

  const isFull = bulletin.category === 'offer' && selectionType === 'fcfs' && appliedCount >= maxSlots;

  const posterName = bulletin.client_name || '匿名使用者';
  const posterId = bulletin.client_public_id || bulletin.client_id || 'unknown';
  const posterAvatar = bulletin.client_avatar || null;

  const handleProfileClick = (e: React.MouseEvent) => {
    e.stopPropagation(); 
    if (bulletin.category === 'offer' && posterId !== 'unknown') {
      navigate(`/${posterId}`); 
    }
  };

  const openLightbox = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLightboxIdx(currentImageIdx);
    setIsLightboxOpen(true);
  };

  const navigateLightbox = (dir: 'prev' | 'next', e: React.MouseEvent) => {
    e.stopPropagation();
    if (dir === 'prev') {
      setLightboxIdx(prev => (prev === 0 ? validImages.length - 1 : prev - 1));
    } else {
      setLightboxIdx(prev => (prev === validImages.length - 1 ? 0 : prev + 1));
    }
  };

  // 處理點擊檢視角色卡按鈕邏輯
  const handleViewOCClick = () => {
    if (!bulletin.oc_snapshot || !onViewOC) return;
    try {
      const parsedSnapshot = JSON.parse(bulletin.oc_snapshot);
      onViewOC(parsedSnapshot);
    } catch (e) {
      alert("角色設定卡快照資料解析失敗");
    }
  };

  return (
    <>
      <div className="wish-card-wide">
        
        <div className="wish-card-image-wrapper">
          
          <div className="wish-expiry-standalone">
            <Clock size={14} style={{ marginRight: '6px' }} /> {getTimeRemaining(bulletin.expires_at)}
          </div>

          {validImages.length > 0 ? (
            <div className="wish-card-img-inner">
              <img 
                src={validImages[currentImageIdx]} 
                alt="預覽圖" 
                className="wish-card-img" 
                onClick={openLightbox}
                referrerPolicy="no-referrer"
              />
              <div className="zoom-hint">
                <Maximize2 size={18} />
              </div>
              
              {validImages.length > 1 && (
                <div className="card-image-nav">
                  <ChevronLeft 
                    className="nav-btn" 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      setCurrentImageIdx(prev => prev === 0 ? validImages.length - 1 : prev - 1); 
                    }} 
                  />
                  <span>{currentImageIdx + 1} / {validImages.length}</span>
                  <ChevronRight 
                    className="nav-btn" 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      setCurrentImageIdx(prev => prev === validImages.length - 1 ? 0 : prev + 1); 
                    }} 
                  />
                </div>
              )}

              <div className="wish-expiry-overlay">
                <Clock size={12} /> {getTimeRemaining(bulletin.expires_at)}
              </div>
            </div>
          ) : (
            <div className="wish-card-img-inner">
              <div className="empty-image-placeholder">
                <User size={64} opacity={0.3} />
                <span>無提供範例圖</span>
              </div>
              <div className="wish-expiry-overlay">
                <Clock size={12} /> {getTimeRemaining(bulletin.expires_at)}
              </div>
            </div>
          )}

          <div className="desktop-author-block">
            <div className="desktop-author-avatar" onClick={handleProfileClick} style={{ cursor: bulletin.category === 'offer' && posterId !== 'unknown' ? 'pointer' : 'default' }}>
              {posterAvatar ? (
                <img src={getFullUrl(posterAvatar)} alt={posterName} referrerPolicy="no-referrer" />
              ) : (
                <User size={28} color="#94a3b8" />
              )}
            </div>
            
            <div className="desktop-author-info">
              <div className="desktop-author-name" onClick={handleProfileClick} style={{ cursor: bulletin.category === 'offer' && posterId !== 'unknown' ? 'pointer' : 'default' }}>
                {posterName}
              </div>
              <div className="desktop-author-id">@{posterId}</div>
              
              <div className="desktop-author-actions">
                {bulletin.creator_role === 'admin' && (
                  <span className="admin-badge-ui">管理員</span>
                )}

                {!isMyOwnPost && bulletin.client_id && (
                  <button className="icon-action-btn" onClick={handleToggleFavorite} title={isFavorited ? "取消收藏" : "加入收藏"}>
                    <Heart size={16} fill={isFavorited ? '#ef4444' : 'none'} color={isFavorited ? '#ef4444' : '#94a3b8'} />
                  </button>
                )}

                {!isMyOwnPost && currentUser && (
                  <button className="icon-action-btn report-btn" onClick={(e) => { e.stopPropagation(); setIsReportModalOpen(true); }} title="檢舉此貼文">
                    <Flag size={15} color="#94a3b8" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="wish-card-info">
          <div className="wish-card-header">
            <div className="flex-1 min-w-0 pr-4">
              <h3 className="truncate">{unescapeHtml(bulletin.title) || '無標題'}</h3>
              
              <div className="wish-card-author-wrapper mobile-author-block">
                <User size={14} className="wish-card-author-icon" />
                
                {bulletin.category === 'offer' && posterId !== 'unknown' ? (
                  <div className="wish-card-author-link" onClick={handleProfileClick} title="前往繪師個人頁">
                    <span className="wish-card-author-name">{posterName}</span>
                    <span className="wish-card-author-id">@{posterId}</span>
                  </div>
                ) : (
                  <div className="wish-card-author-text">
                    <span className="wish-card-author-name">{posterName}</span>
                    <span className="wish-card-author-id">@{posterId}</span>
                  </div>
                )}
                
                {bulletin.creator_role === 'admin' && (
                  <span style={{
                    backgroundColor: '#FFD700', color: '#5D4A3E', fontSize: '11px',
                    padding: '2px 6px', borderRadius: '4px', marginRight: '6px',
                    fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', lineHeight: '1'
                  }}>
                    管理員
                  </span>
                )}

                {!isMyOwnPost && bulletin.client_id && (
                  <button
                    onClick={handleToggleFavorite}
                    style={{ background: 'none', border: 'none', padding: '0 0 0 6px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: isFavorited ? '#ef4444' : '#cbd5e1', outline: 'none' }}
                    title={isFavorited ? "取消收藏" : "加入收藏"}
                  >
                    <Heart size={16} fill={isFavorited ? '#ef4444' : 'none'} />
                  </button>
                )}

                {!isMyOwnPost && currentUser && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setIsReportModalOpen(true); }}
                    style={{ background: 'none', border: 'none', padding: '0 0 0 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#cbd5e1', outline: 'none' }}
                    title="檢舉此貼文"
                  >
                    <Flag size={15} />
                  </button>
                )}
              </div>
            </div>

            <span className={`category-badge ${bulletin.category}`}>
              {bulletin.category === 'request' ? '徵委託' : bulletin.category === 'offer' ? '接委託' : '其他'}
            </span>
          </div>

          <div className="wish-card-meta-list">
            <div className="meta-tag-row">
              <Tag size={16} className="meta-icon" />
              <div className="tag-container">
                {warningTags.length > 0 && (
                  <div className="tag-sub-group">
                    <span className="group-label warning"><AlertTriangle size={14}/> 預警：</span>
                    {warningTags.map((t: string) => (
                      <span key={t} className="tag-chip tag-warning">{t.replace('[預警]', '')}</span>
                    ))}
                  </div>
                )}
                {licenseTags.length > 0 && (
                  <div className="tag-sub-group">
                    <span className="group-label license"><CheckCircle2 size={14}/> 範圍：</span>
                    {licenseTags.map((t: string) => (
                      <span key={t} className="tag-chip tag-license">{t.replace('[授權]', '')}</span>
                    ))}
                  </div>
                )}
                {styleTags.length > 0 && (
                  <div className="tag-sub-group">
                    {styleTags.map((t: string) => (
                      <span key={t} className="tag-chip tag-style">{t}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="meta-info-grid">
              {bulletin.category === 'request' && (
                <div className="meta-item" style={{ display: 'flex', alignItems: 'center', flexWrap: 'nowrap', minWidth: 0 }}>
                  <DollarSign size={16} className="meta-icon" style={{ flexShrink: 0, marginRight: '4px' }} />
                  <span style={{ flexShrink: 0, whiteSpace: 'nowrap' }}>預算：</span>
                  <span className="highlight-price" style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    ${bulletin.budget_min} ~ ${bulletin.budget_max}
                  </span>
                </div>
              )}
              
              <div className="meta-item" style={{ display: 'flex', alignItems: 'center', flexWrap: 'nowrap', minWidth: 0 }}>
                <Calendar size={16} className="meta-icon" style={{ flexShrink: 0, marginRight: '4px' }} />
                <span style={{ flexShrink: 0, whiteSpace: 'nowrap' }}>排單狀況：</span>
                <span 
                  className="text-dark-600" 
                  style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} 
                  title={bulletin.schedule_type === 'flexible' ? (bulletin.category === 'offer' ? '目前空閒可排單' : '可接受排單') : `預計排單至 ${unescapeHtml(bulletin.specific_date)} 之後`}
                >
                  {bulletin.schedule_type === 'flexible' 
                    ? (bulletin.category === 'offer' ? '目前空閒可排單' : '可接受排單') 
                    : `預計排單至 ${unescapeHtml(bulletin.specific_date)} 之後`}
                </span>
              </div>
              
              <div className="meta-item" style={{ display: 'flex', alignItems: 'center', flexWrap: 'nowrap', minWidth: 0 }}>
                <Send size={16} className="meta-icon" style={{ flexShrink: 0, marginRight: '4px' }} />
                <span style={{ flexShrink: 0, whiteSpace: 'nowrap' }}>付款方式：</span>
                <span 
                  className="text-dark-600" 
                  style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} 
                  title={paymentMethods.join(', ')}
                >
                  {paymentMethods.join(', ')}
                </span>
              </div>

              {bulletin.category === 'offer' && paymentTimingLabel && (
                <div className="meta-item" style={{ display: 'flex', alignItems: 'center', flexWrap: 'nowrap', minWidth: 0, gridColumn: '1 / -1' }}>
                  <DollarSign size={16} className="meta-icon text-[#059669]" style={{ flexShrink: 0, marginRight: '4px' }} />
                  <span style={{ flexShrink: 0, whiteSpace: 'nowrap' }}>支付時機：</span>
                  <span 
                    className="font-bold text-[#059669]" 
                    style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} 
                    title={`${paymentTimingLabel}${paymentTimingDetail ? ` - ${paymentTimingDetail}` : ''}`}
                  >
                    {paymentTimingLabel} {paymentTimingDetail && <span style={{ fontWeight: 'normal', fontSize: '13px', opacity: 0.9 }}>({paymentTimingDetail})</span>}
                  </span>
                </div>
              )}

              {bulletin.category === 'offer' && selectionType && (
                <div className="meta-item" style={{ display: 'flex', alignItems: 'center', flexWrap: 'nowrap', minWidth: 0, gridColumn: '1 / -1' }}>
                  <Users size={16} className="meta-icon text-[#b45309]" style={{ flexShrink: 0, marginRight: '4px' }} />
                  <span style={{ flexShrink: 0, whiteSpace: 'nowrap' }}>徵集名額：</span>
                  <span 
                    className="font-bold text-[#b45309]" 
                    style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} 
                    title={selectionType === 'curated' ? `預計收 ${maxSlots} 名 (繪師選設定接搞)` : `目前已投遞人數 ${appliedCount} / 預計招收名額 ${maxSlots}`}
                  >
                    {selectionType === 'curated' 
                      ? `預計收 ${maxSlots} 名 (💡繪師選設定接稿)` 
                      : `目前已投遞人數 ${appliedCount} / 預計招收名額 ${maxSlots}`
                    }
                  </span>
                </div>
              )}
            </div>

            {bulletin.category === 'offer' && contentObj.commission_items && contentObj.commission_items.length > 0 && (
              <div className="commission-items-preview">
                <span className="section-small-title">接案項目：</span>
                <div className="items-pills">
                  {contentObj.commission_items.map((item: any, idx: number) => (
                    <span key={idx} className="item-pill">
                      {item.name} <strong>${item.price}</strong>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="wish-description-box">
            <strong className="description-label">{bulletin.category === 'offer' ? '接案說明：' : '詳細需求：'}</strong>
            <p className="description-text">{rawDescription}</p>
          </div>

          {/* 動作按鈕區 */}
          <div className="card-actions" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* 新增：如果此徵委託含有 OC 設定卡快照，渲染一個精緻的點擊查看按鈕 */}
            {bulletin.oc_snapshot && (
              <button 
                type="button"
                className="submit-post-btn full-width" 
                onClick={handleViewOCClick}
                style={{ backgroundColor: '#FDF4E6', border: '1px solid #FDE0B5', color: '#A67B3E', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <BookUser size={16} /> 查看綁定的角色設定卡 (OC)
              </button>
            )}

            {isMyOwnPost ? (
              <button 
                className="submit-post-btn full-width" 
                onClick={handleRevokeClick}
                disabled={isRevoking}
                style={{ backgroundColor: '#A05C5C', borderColor: '#A05C5C', opacity: isRevoking ? 0.7 : 1 }}
              >
                {isRevoking ? '撤銷中...' : '撤銷發佈的慢許願'}
              </button>
            ) : isQuotaFull ? (
              <button disabled className="btn-status-disabled" style={{ opacity: 0.8, cursor: 'not-allowed', color: '#f1abab', backgroundColor: '#FDF4F4', border: '1px solid #E8C1C1' }}>本月投遞額度已滿，請升級專業版</button>
            ) : hasApplied ? (
              <button disabled className="btn-status-disabled">已投遞過此案件</button>
            ) : isFull ? (
              <button disabled className="btn-status-disabled" style={{ opacity: 0.9, cursor: 'not-allowed', color: '#78716c', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1' }}>名額已滿</button>
            ) : (
              <button className="submit-post-btn full-width" onClick={() => onInquire(bulletin)}>
                {bulletin.category === 'offer' ? '我想委託 (閱讀條款並填寫需求)' : '我有興趣 (發送提案卡)'}
              </button>
            )}
          </div>
        </div>
      </div>

      
      {isCancelModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }} onClick={() => setIsCancelModalOpen(false)}>
          <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '12px', width: '90%', maxWidth: '400px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0, marginBottom: '16px', color: '#EF4444', fontSize: '18px', fontWeight: 'bold' }}>
              ⚠️ 撤銷許願與婉拒提案
            </h3>
            <p style={{ color: '#A05C5C', fontSize: '13px', marginBottom: '20px', padding: '12px', backgroundColor: '#FEF2F2', borderRadius: '8px', border: '1px solid #FECACA' }}>
              目前已有 {appliedCount} 位繪師投遞！撤銷貼文將一併婉拒這些尚未確認的提案。建議附上簡單理由以示尊重。
            </p>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '8px', color: '#374151' }}>統一婉拒留言 (選填)</label>
              <textarea 
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                placeholder="例如：預算不符、已找到合適人選..."
                maxLength={200}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', outline: 'none', height: '100px', resize: 'none', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button 
                onClick={() => setIsCancelModalOpen(false)}
                style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #d1d5db', backgroundColor: '#fff', cursor: 'pointer', fontWeight: 'bold', color: '#4b5563' }}
              >
                再想想
              </button>
              <button 
                onClick={() => executeCancel(cancelReason || '已撤銷許願 / 結束徵件')}
                disabled={isRevoking}
                style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', backgroundColor: '#EF4444', color: '#fff', cursor: isRevoking ? 'not-allowed' : 'pointer', fontWeight: 'bold', opacity: isRevoking ? 0.7 : 1 }}
              >
                {isRevoking ? '處理中...' : '確認撤銷並婉拒'}
              </button>
            </div>
          </div>
        </div>
      )}

      
      {isReportModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }} onClick={() => setIsReportModalOpen(false)}>
          <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '12px', width: '90%', maxWidth: '400px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', color: '#111827', fontSize: '18px' }}>
              <Flag size={20} color="#ef4444" /> 檢舉此貼文
            </h3>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '8px', color: '#374151' }}>選擇檢舉原因</label>
              <select 
                value={reportType} 
                onChange={e => setReportType(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', outline: 'none', backgroundColor: '#f9fafb' }}
              >
                <option value="AI製圖">AI製圖</option>
                <option value="侵害版權、盜圖、抄襲等等">侵害版權、盜圖、抄襲等等</option>
                <option value="含有色情或暴力等不當內容">含有色情或暴力等不當內容</option>
                <option value="內容不實、惡意攻擊、與徵委託/接委託不相關">內容不實、惡意攻擊、與徵稿/接委託不相關</option>
                <option value="其他原因">其他原因</option>
              </select>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '8px', color: '#374151' }}>補充說明 (選填)</label>
              <textarea 
                value={reportText}
                onChange={e => setReportText(e.target.value)}
                placeholder="請簡短描述具體違規情況（最多 150 字）..."
                maxLength={150}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', outline: 'none', height: '80px', resize: 'none', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button 
                onClick={() => setIsReportModalOpen(false)}
                style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #d1d5db', backgroundColor: '#fff', cursor: 'pointer', fontWeight: 'bold', color: '#4b5563' }}
              >
                取消
              </button>
              <button 
                onClick={handleReportSubmit}
                disabled={isReporting}
                style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', backgroundColor: '#ef4444', color: '#fff', cursor: isReporting ? 'not-allowed' : 'pointer', fontWeight: 'bold', opacity: isReporting ? 0.7 : 1 }}
              >
                {isReporting ? '送出中...' : '確認檢舉'}
              </button>
            </div>
          </div>
        </div>
      )}

      
      {isLightboxOpen && (
        <div className="lightbox-overlay" onClick={() => setIsLightboxOpen(false)}>
          <button className="lightbox-close" onClick={() => setIsLightboxOpen(false)}>
            <X size={32} />
          </button>
          
          {validImages.length > 1 && (
            <>
              <button className="lightbox-nav-btn prev" onClick={(e) => navigateLightbox('prev', e)}>
                <ChevronLeft size={48} />
              </button>
              <button className="lightbox-nav-btn next" onClick={(e) => navigateLightbox('next', e)}>
                <ChevronRight size={48} />
              </button>
            </>
          )}

          <div className="lightbox-content" onClick={e => e.stopPropagation()}>
            <img src={validImages[lightboxIdx]} alt="大圖查看" className="lightbox-img" referrerPolicy="no-referrer" />
            {validImages.length > 1 && (
              <div className="lightbox-counter">{lightboxIdx + 1} / {validImages.length}</div>
            )}
          </div>
        </div>
      )}
    </>
  );
};