import React from 'react';
import { Calendar, DollarSign, Tag, Clock, Send, User } from 'lucide-react';

interface WishCardProps {
  bulletin: any;
  currentUser: any;
  onInquire: (bulletin: any) => void;
}

export const WishCard: React.FC<WishCardProps> = ({ bulletin, currentUser, onInquire }) => {
  const isMyOwnPost = currentUser && bulletin.client_id === currentUser.id;
  const hasApplied = currentUser && bulletin.applied_artist_ids && bulletin.applied_artist_ids.includes(currentUser.id);

  const getTimeRemaining = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - new Date().getTime();
    if (diff <= 0) return '已結束';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    return hours > 24 ? `剩餘 ${Math.floor(hours / 24)}天` : `剩餘 ${hours}小時`;
  };

  const tags = JSON.parse(bulletin.tags || '[]');
  const paymentMethods = JSON.parse(bulletin.payment_methods || '[]');

  return (
    <div className="wish-card-wide">
      <div className="wish-card-image-wrapper">
        {bulletin.ref_image_key ? (
          <img src={bulletin.ref_image_key} alt="範例圖" className="wish-card-img" />
        ) : (
          <div className="fallback-placeholder">
            <User size={64} opacity={0.3} />
            <span style={{ marginTop: '10px' }}>無提供範例圖</span>
          </div>
        )}
        <div className="wish-countdown"><Clock size={12} /> {getTimeRemaining(bulletin.expires_at)}</div>
      </div>

      <div className="wish-card-info">
        <div className="wish-card-header">
          <h3>{bulletin.title || '無標題'}</h3>
          <span className="category-badge">
            {bulletin.category === 'request' ? '徵委託' : bulletin.category === 'offer' ? '接委託' : '其他'}
          </span>
        </div>

        <div className="wish-metadata">
          <div className="meta-item">
            <Tag size={14} />
            <div className="tag-cloud">
              {tags.map((t: string) => <span key={t} className="tag-chip">{t}</span>)}
            </div>
          </div>
          <div className="meta-row">
            <span className="meta-item">
              <DollarSign size={14} /> 
              {bulletin.category === 'offer' ? '價格' : '預算'}：
              <span className="price">{bulletin.budget_min}~{bulletin.budget_max}</span>
            </span>
            <span className="meta-item">
              <Calendar size={14} /> 
              排單：<span>{bulletin.schedule_type === 'flexible' ? (bulletin.category === 'offer' ? '目前空閒可排單' : '可接受排單') : bulletin.specific_date}</span>
            </span>
          </div>
          <div className="meta-item"><Send size={14} /> 付款：<span>{paymentMethods.join(', ')}</span></div>
        </div>

        <div className="wish-description">
          <strong>{bulletin.category === 'offer' ? '接案說明：' : '詳細需求：'}</strong>
          <p>{bulletin.content}</p>
        </div>

        {isMyOwnPost ? (
          <button disabled className="inquire-btn disabled-btn">這是您發布的貼文</button>
        ) : hasApplied ? (
          <button disabled className="inquire-btn applied-btn">已送出</button>
        ) : (
          <button className="inquire-btn" onClick={() => onInquire(bulletin)}>
            {bulletin.category === 'offer' ? '我想委託 (填寫需求單)' : '我有興趣 (發送提案卡)'}
          </button>
        )}
      </div>
    </div>
  );
};