// src/pages/public/Wishboard/WishCard.tsx
import React, { useState } from 'react';
// 🌟 引入 Users icon 作為徵集機制的圖示
import { Calendar, DollarSign, Tag, Clock, Send, User, ChevronLeft, ChevronRight, AlertTriangle, CheckCircle2, Maximize2, X, Users } from 'lucide-react';
import { STYLE_WARNINGS, LICENSE_TAGS, R2_PUBLIC_URL } from './constants';

interface WishCardProps {
  bulletin: any;
  currentUser: any;
  onInquire: (bulletin: any) => void;
}

const unescapeHtml = (str: string) => {
  if (!str) return '';
  return str.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#039;/g, "'");
};

export const WishCard: React.FC<WishCardProps> = ({ bulletin, currentUser, onInquire }) => {
  const isMyOwnPost = currentUser && bulletin.client_id === currentUser.id;
  const hasApplied = currentUser && bulletin.applied_artist_ids && bulletin.applied_artist_ids.includes(currentUser.id);
  
  const [currentImageIdx, setCurrentImageIdx] = useState(0);
  
  // 🌟 燈箱索引狀態
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState(0);

  const getTimeRemaining = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - new Date().getTime();
    if (diff <= 0) return '已結束';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    return hours > 24 ? `剩餘 ${Math.floor(hours / 24)}天` : `剩餘 ${hours}小時`;
  };

  let contentObj: any = {};
  let rawDescription = bulletin.content;
  try {
    const rawContent = unescapeHtml(bulletin.content);
    contentObj = JSON.parse(rawContent);
    rawDescription = contentObj.description || '';
  } catch {
    rawDescription = unescapeHtml(bulletin.content);
  }

  const tags = JSON.parse(bulletin.tags || '[]');
  const paymentMethods = JSON.parse(bulletin.payment_methods || '[]');
  
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

  // 🌟 提取投遞人數與機制狀態 (增強兼容性：同時檢查直屬欄位與 JSON 物件)
  const appliedCount = bulletin.inquiry_count || (bulletin.applied_artist_ids ? String(bulletin.applied_artist_ids).split(',').length : 0);
  const selectionType = bulletin.selection_type || contentObj.selection_type || 'fcfs'; // 預設給個先搶先贏
  const maxSlots = bulletin.max_slots || contentObj.max_slots || 1;

  // 🌟 打開燈箱並定位到目前這張
  const openLightbox = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLightboxIdx(currentImageIdx);
    setIsLightboxOpen(true);
  };

  // 🌟 燈箱導覽
  const navigateLightbox = (dir: 'prev' | 'next', e: React.MouseEvent) => {
    e.stopPropagation();
    if (dir === 'prev') {
      setLightboxIdx(prev => (prev === 0 ? validImages.length - 1 : prev - 1));
    } else {
      setLightboxIdx(prev => (prev === validImages.length - 1 ? 0 : prev + 1));
    }
  };

  return (
    <>
      <div className="wish-card-wide">
        <div className="wish-card-image-wrapper">
          {validImages.length > 0 ? (
            <div style={{ position: 'relative', width: '100%', height: '100%' }}>
              <img 
                src={validImages[currentImageIdx]} 
                alt="預覽圖" 
                className="wish-card-img" 
                onClick={openLightbox}
                referrerPolicy="no-referrer"
              />
              <div className="zoom-hint"><Maximize2 size={18} /></div>
              
              {validImages.length > 1 && (
                <div className="card-image-nav">
                  <ChevronLeft className="nav-btn" onClick={(e) => { e.stopPropagation(); setCurrentImageIdx(prev => prev === 0 ? validImages.length - 1 : prev - 1); }} />
                  <span>{currentImageIdx + 1} / {validImages.length}</span>
                  <ChevronRight className="nav-btn" onClick={(e) => { e.stopPropagation(); setCurrentImageIdx(prev => prev === validImages.length - 1 ? 0 : prev + 1); }} />
                </div>
              )}
            </div>
          ) : (
            <div className="empty-image-placeholder">
              <User size={64} opacity={0.3} />
              <span>無提供範例圖</span>
            </div>
          )}
          <div className="wish-expiry-badge">
            <Clock size={12} /> {getTimeRemaining(bulletin.expires_at)}
          </div>
        </div>

        <div className="wish-card-info">
          <div className="wish-card-header">
            <h3>{unescapeHtml(bulletin.title) || '無標題'}</h3>
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
                    <span className="group-label warning"><AlertTriangle size={12}/> 預警：</span>
                    {warningTags.map((t: string) => <span key={t} className="tag-chip tag-warning">{t.replace('[預警]', '')}</span>)}
                  </div>
                )}
                {licenseTags.length > 0 && (
                  <div className="tag-sub-group">
                    <span className="group-label license"><CheckCircle2 size={12}/> 範圍：</span>
                    {licenseTags.map((t: string) => <span key={t} className="tag-chip tag-license">{t.replace('[授權]', '')}</span>)}
                  </div>
                )}
                {styleTags.length > 0 && (
                  <div className="tag-sub-group">
                    {styleTags.map((t: string) => <span key={t} className="tag-chip tag-style">{t}</span>)}
                  </div>
                )}
              </div>
            </div>

<div className="meta-info-grid">
              {bulletin.category === 'request' && (
                <div className="meta-item items-start">
                  <DollarSign size={16} className="meta-icon mt-0.5 flex-shrink-0" />
                  <span className="flex-shrink-0">預算：</span>
                  <span className="highlight-price break-words min-w-0">${bulletin.budget_min} ~ ${bulletin.budget_max}</span>
                </div>
              )}
              
              {/* 🌟 修復：防止標籤被擠壓斷行，並允許長日期優雅換行 */}
              <div className="meta-item items-start">
                <Calendar size={16} className="meta-icon mt-0.5 flex-shrink-0" />
                <span className="flex-shrink-0">排單狀況：</span>
                <span className="text-dark-600 break-words min-w-0 leading-snug">
                  {bulletin.schedule_type === 'flexible' 
                    ? (bulletin.category === 'offer' ? '目前空閒可排單' : '可接受排單') 
                    : `預計排單至 ${unescapeHtml(bulletin.specific_date)} 之後`}
                </span>
              </div>
              
              <div className="meta-item items-start">
                <Send size={16} className="meta-icon mt-0.5 flex-shrink-0" />
                <span className="flex-shrink-0">付款方式：</span>
                <span className="text-dark-600 break-words min-w-0 leading-snug">{paymentMethods.join(', ')}</span>
              </div>

              {/* 🌟 名額與徵集機制顯示區塊 */}
              {bulletin.category === 'offer' && selectionType && (
                <div className="meta-item items-start" style={{ gridColumn: '1 / -1' }}>
                  <Users size={16} className="meta-icon text-[#b45309] mt-0.5 flex-shrink-0" />
                  <span className="flex-shrink-0">徵集名額：</span>
                  <span className="font-bold text-[#b45309] flex flex-wrap items-center gap-2 min-w-0 leading-snug">
                    {selectionType === 'curated' 
                      ? (
                        <>
                          預計招收 {maxSlots} 名 <span className="text-[12px] bg-[#FEF3C7] px-2 py-0.5 rounded text-[#92400E] font-normal mt-1 sm:mt-0">💡 繪師會選擇適恰設定來接單</span>
                        </>
                      ) 
                      : (
                        `目前已投遞人數 ${appliedCount} / 預計招收名額 ${maxSlots}`
                      )
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

          <div className="card-actions">
            {isMyOwnPost ? (
              <button disabled className="btn-status-disabled">這是您發布的貼文</button>
            ) : hasApplied ? (
              <button disabled className="btn-status-disabled">已投遞過此案件</button>
            ) : (
              <button className="submit-post-btn full-width" onClick={() => onInquire(bulletin)}>
                {bulletin.category === 'offer' ? '我想委託 (閱讀條款並填寫需求)' : '我有興趣 (發送提案卡)'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 🌟 增強版燈箱：支援左右導覽 */}
      {isLightboxOpen && (
        <div className="lightbox-overlay" onClick={() => setIsLightboxOpen(false)}>
          <button className="lightbox-close" onClick={() => setIsLightboxOpen(false)}><X size={32} /></button>
          
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