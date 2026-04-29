// src/pages/public/Wishboard/WishCard.tsx
import React, { useState } from 'react';
import { Calendar, DollarSign, Tag, Clock, Send, User, ChevronLeft, ChevronRight, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { STYLE_WARNINGS, LICENSE_TAGS, R2_PUBLIC_URL } from './constants';

interface WishCardProps {
  bulletin: any;
  currentUser: any;
  onInquire: (bulletin: any) => void;
}

export const WishCard: React.FC<WishCardProps> = ({ bulletin, currentUser, onInquire }) => {
  const isMyOwnPost = currentUser && bulletin.client_id === currentUser.id;
  const hasApplied = currentUser && bulletin.applied_artist_ids && bulletin.applied_artist_ids.includes(currentUser.id);
  
  // 🌟 多圖輪播狀態
  const [currentImageIdx, setCurrentImageIdx] = useState(0);

  const getTimeRemaining = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - new Date().getTime();
    if (diff <= 0) return '已結束';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    return hours > 24 ? `剩餘 ${Math.floor(hours / 24)}天` : `剩餘 ${hours}小時`;
  };

  // 🌟 解析資料：處理 JSON 字串的標籤與圖片
  const tags = JSON.parse(bulletin.tags || '[]');
  const paymentMethods = JSON.parse(bulletin.payment_methods || '[]');
  
  // 處理圖片來源 (防錯與 R2 路徑拼接)
  let images: string[] = [];
  try {
    const parsed = JSON.parse(bulletin.ref_image_key || '[]');
    images = Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    images = bulletin.ref_image_key ? [bulletin.ref_image_key] : [];
  }
  const getFullUrl = (url: string) => url.startsWith('http') ? url : `${R2_PUBLIC_URL}/${url}`;
  const validImages = images.filter(url => url).map(getFullUrl);

  // 🌟 標籤分類：區分風格、預警、授權
  const warningTags = tags.filter((t: string) => STYLE_WARNINGS.includes(t));
  const licenseTags = tags.filter((t: string) => LICENSE_TAGS.includes(t));
  const styleTags = tags.filter((t: string) => !STYLE_WARNINGS.includes(t) && !LICENSE_TAGS.includes(t));

  return (
    <div className="wish-card-wide">
      
      {/* 🖼️ 左側圖片區與輪播 */}
      <div className="wish-card-image-wrapper">
        {validImages.length > 0 ? (
          <>
            <img src={validImages[currentImageIdx]} alt="預覽圖" className="wish-card-img" />
            {validImages.length > 1 && (
              <div style={{ position: 'absolute', bottom: '10px', right: '10px', background: 'rgba(0,0,0,0.6)', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ChevronLeft size={14} style={{ cursor: 'pointer' }} onClick={() => setCurrentImageIdx(prev => prev === 0 ? validImages.length - 1 : prev - 1)} />
                {currentImageIdx + 1} / {validImages.length}
                <ChevronRight size={14} style={{ cursor: 'pointer' }} onClick={() => setCurrentImageIdx(prev => prev === validImages.length - 1 ? 0 : prev + 1)} />
              </div>
            )}
          </>
        ) : (
          <div className="fallback-placeholder">
            <User size={48} color="#cbd5e1" />
            <span style={{ marginTop: '8px', color: '#94a3b8' }}>無提供圖片</span>
          </div>
        )}
        <div className="wish-countdown"><Clock size={12} /> {getTimeRemaining(bulletin.expires_at)}</div>
      </div>

      {/* 📄 右側資訊區 */}
      <div className="wish-card-info">
        <div className="wish-card-header">
          <h3>{bulletin.title || '無標題'}</h3>
          <span className="category-badge" style={{ background: bulletin.category === 'offer' ? '#fef3c7' : '#f1f5f9', color: bulletin.category === 'offer' ? '#d97706' : '#475569', padding: '4px 10px', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold' }}>
            {bulletin.category === 'request' ? '徵委託' : bulletin.category === 'offer' ? '接委託' : '其他'}
          </span>
        </div>

        <div className="wish-metadata">
          
          {/* 🌟 分類顯示標籤 */}
          <div className="meta-item" style={{ alignItems: 'flex-start' }}>
            <Tag size={14} style={{ marginTop: '4px', color: '#94a3b8' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {warningTags.length > 0 && (
                <div className="tag-group">
                  <span className="tag-label"><AlertTriangle size={12} style={{ display: 'inline', marginRight: '2px' }}/> 風格預警</span>
                  {warningTags.map((t: string) => <span key={t} className="tag-chip tag-warning">{t}</span>)}
                </div>
              )}
              {licenseTags.length > 0 && (
                <div className="tag-group">
                  <span className="tag-label"><CheckCircle2 size={12} style={{ display: 'inline', marginRight: '2px' }}/> 接受範圍</span>
                  {licenseTags.map((t: string) => <span key={t} className="tag-chip tag-license">{t}</span>)}
                </div>
              )}
              {styleTags.length > 0 && (
                <div className="tag-group">
                  <span className="tag-label">風格標籤</span>
                  {styleTags.map((t: string) => <span key={t} className="tag-chip tag-style">{t}</span>)}
                </div>
              )}
            </div>
          </div>

          <div className="meta-row">
            <span className="meta-item">
              <DollarSign size={14} color="#94a3b8" /> 
              <span style={{ color: '#475569' }}>{bulletin.category === 'offer' ? '接案底價' : '預算'}：</span>
              <span className="price">${bulletin.budget_min} ~ ${bulletin.budget_max}</span>
            </span>
            <span className="meta-item">
              <Calendar size={14} color="#94a3b8" /> 
              <span style={{ color: '#475569' }}>排單：</span>
              <span style={{ fontWeight: '600', color: '#334155' }}>
                {bulletin.schedule_type === 'flexible' ? (bulletin.category === 'offer' ? '目前空閒可排單' : '可接受排單') : bulletin.specific_date}
              </span>
            </span>
          </div>
          
          <div className="meta-item">
            <Send size={14} color="#94a3b8" /> 
            <span style={{ color: '#475569' }}>付款：</span>
            <span style={{ fontWeight: '500' }}>{paymentMethods.join(', ')}</span>
          </div>
        </div>

        {/* 說明區域（可過濾 JSON 避免噴錯） */}
        <div className="wish-description" style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #f1f5f9', marginTop: 'auto' }}>
          <strong style={{ color: '#0f172a' }}>{bulletin.category === 'offer' ? '接案說明：' : '詳細需求：'}</strong>
          <p style={{ margin: '8px 0 0 0', lineHeight: '1.6', color: '#475569', fontSize: '14px', whiteSpace: 'pre-wrap' }}>
            {(() => {
              try {
                // 如果是我們新版存入的 JSON 物件
                const contentObj = JSON.parse(bulletin.content);
                return contentObj.description || '';
              } catch {
                // 舊版或純文字
                return bulletin.content;
              }
            })()}
          </p>
        </div>

        {/* 操作按鈕 */}
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