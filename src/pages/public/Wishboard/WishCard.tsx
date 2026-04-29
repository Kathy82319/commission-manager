// src/pages/public/Wishboard/WishCard.tsx
import React, { useState } from 'react';
import { Calendar, DollarSign, Tag, Clock, Send, User, ChevronLeft, ChevronRight, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { STYLE_WARNINGS, LICENSE_TAGS, R2_PUBLIC_URL } from './constants';

interface WishCardProps {
  bulletin: any;
  currentUser: any;
  onInquire: (bulletin: any) => void;
}

// 🌟 新增：把後端防 XSS 轉譯的字元還原，拯救 JSON 破圖
const unescapeHtml = (str: string) => {
  if (!str) return '';
  return str.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#039;/g, "'");
};

export const WishCard: React.FC<WishCardProps> = ({ bulletin, currentUser, onInquire }) => {
  const isMyOwnPost = currentUser && bulletin.client_id === currentUser.id;
  const hasApplied = currentUser && bulletin.applied_artist_ids && bulletin.applied_artist_ids.includes(currentUser.id);
  
  const [currentImageIdx, setCurrentImageIdx] = useState(0);

  const getTimeRemaining = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - new Date().getTime();
    if (diff <= 0) return '已結束';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    return hours > 24 ? `剩餘 ${Math.floor(hours / 24)}天` : `剩餘 ${hours}小時`;
  };

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

  const warningTags = tags.filter((t: string) => STYLE_WARNINGS.includes(t));
  const licenseTags = tags.filter((t: string) => LICENSE_TAGS.includes(t));
  const styleTags = tags.filter((t: string) => !STYLE_WARNINGS.includes(t) && !LICENSE_TAGS.includes(t));

  return (
    <div className="wish-card-wide">
      <div className="wish-card-image-wrapper">
        {validImages.length > 0 ? (
          <>
            <img src={validImages[currentImageIdx]} alt="預覽圖" className="wish-card-img" />
            {validImages.length > 1 && (
              <div style={{ position: 'absolute', bottom: '10px', right: '10px', background: 'rgba(0,0,0,0.6)', color: 'white', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ChevronLeft size={16} style={{ cursor: 'pointer' }} onClick={() => setCurrentImageIdx(prev => prev === 0 ? validImages.length - 1 : prev - 1)} />
                {currentImageIdx + 1} / {validImages.length}
                <ChevronRight size={16} style={{ cursor: 'pointer' }} onClick={() => setCurrentImageIdx(prev => prev === validImages.length - 1 ? 0 : prev + 1)} />
              </div>
            )}
          </>
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1' }}>
            <User size={64} opacity={0.5} />
            <span style={{ marginTop: '10px', fontSize: '14px' }}>無提供範例圖</span>
          </div>
        )}
        <div style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(0,0,0,0.6)', color: 'white', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', zIndex: 10 }}>
          <Clock size={12} /> {getTimeRemaining(bulletin.expires_at)}
        </div>
      </div>

      <div className="wish-card-info">
        <div className="wish-card-header">
          <h3>{unescapeHtml(bulletin.title) || '無標題'}</h3>
          <span style={{ background: bulletin.category === 'offer' ? '#fef3c7' : '#f1f5f9', color: bulletin.category === 'offer' ? '#d97706' : '#475569', padding: '6px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold' }}>
            {bulletin.category === 'request' ? '徵委託' : bulletin.category === 'offer' ? '接委託' : '其他'}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px', color: '#64748b' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
            <Tag size={16} style={{ marginTop: '2px', color: '#94a3b8' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {warningTags.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#e11d48' }}><AlertTriangle size={12} style={{ display: 'inline' }}/> 預警：</span>
                  {warningTags.map((t: string) => <span key={t} className="tag-chip tag-warning">{t}</span>)}
                </div>
              )}
              {licenseTags.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#16a34a' }}><CheckCircle2 size={12} style={{ display: 'inline' }}/> 範圍：</span>
                  {licenseTags.map((t: string) => <span key={t} className="tag-chip tag-license">{t}</span>)}
                </div>
              )}
              {styleTags.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {styleTags.map((t: string) => <span key={t} className="tag-chip tag-style">{t}</span>)}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <DollarSign size={16} color="#94a3b8" /> 
              <span>{bulletin.category === 'offer' ? '接案底價' : '預算'}：</span>
              <span style={{ color: '#ff8c00', fontWeight: 'bold', fontSize: '16px' }}>${bulletin.budget_min} ~ ${bulletin.budget_max}</span>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={16} color="#94a3b8" /> 
              <span>排單狀況：</span>
              <span style={{ fontWeight: '600', color: '#334155' }}>
                {bulletin.schedule_type === 'flexible' 
                  ? (bulletin.category === 'offer' ? '目前空閒可排單' : '可接受排單') 
                  : `預計排單至 ${unescapeHtml(bulletin.specific_date)} 之後`}
              </span>
            </span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Send size={16} color="#94a3b8" /> 
            <span>付款方式：</span>
            <span style={{ fontWeight: '600', color: '#334155' }}>{paymentMethods.join(', ')}</span>
          </div>
        </div>

        <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #f1f5f9', marginTop: 'auto' }}>
          <strong style={{ color: '#0f172a' }}>{bulletin.category === 'offer' ? '接案說明：' : '詳細需求：'}</strong>
          <p style={{ margin: '8px 0 0 0', lineHeight: '1.6', color: '#475569', fontSize: '14px', whiteSpace: 'pre-wrap' }}>
            {(() => {
              try {
                // 🌟 核心修正：將後端的字串解碼後，再讓 JSON 去解析
                const rawContent = unescapeHtml(bulletin.content);
                const contentObj = JSON.parse(rawContent);
                return contentObj.description || '';
              } catch {
                return unescapeHtml(bulletin.content);
              }
            })()}
          </p>
        </div>

        <div style={{ marginTop: '16px' }}>
          {isMyOwnPost ? (
            <button disabled className="submit-post-btn" style={{ width: '100%', background: '#f1f5f9', color: '#94a3b8', boxShadow: 'none' }}>這是您發布的貼文</button>
          ) : hasApplied ? (
            <button disabled className="submit-post-btn" style={{ width: '100%', background: '#e2e8f0', color: '#64748b', boxShadow: 'none' }}>已投遞過此案件</button>
          ) : (
            <button className="submit-post-btn" style={{ width: '100%' }} onClick={() => onInquire(bulletin)}>
              {bulletin.category === 'offer' ? '我想委託 (閱讀條款並填寫需求)' : '我有興趣 (發送提案卡)'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};