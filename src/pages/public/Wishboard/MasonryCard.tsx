// src/pages/public/Wishboard/MasonryCard.tsx
import React from 'react';
import { User } from 'lucide-react';
import { R2_PUBLIC_URL } from './constants';

interface MasonryCardProps {
  bulletin: any;
  onClick: () => void;
  highlightedId?: string | null;
}

const unescapeHtml = (str: string) => {
  if (!str) return '';
  return str.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#039;/g, "'");
};

const getFullUrl = (url: string) => (url.startsWith('http') ? url : `${R2_PUBLIC_URL}/${url}`);

export const MasonryCard: React.FC<MasonryCardProps> = ({ bulletin, onClick, highlightedId }) => {
  const isHighlighted = highlightedId === bulletin.id;

  let images: string[] = [];
  try {
    const parsed = JSON.parse(unescapeHtml(bulletin.ref_image_key || '[]'));
    images = Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    images = bulletin.ref_image_key ? [unescapeHtml(bulletin.ref_image_key)] : [];
  }
  const validImages = images.filter(Boolean).map(getFullUrl);
  const firstImage = validImages[0] ?? null;

  const posterName = bulletin.client_name || '匿名使用者';
  const posterAvatar = bulletin.client_avatar ? getFullUrl(bulletin.client_avatar) : null;

  return (
    <div
      className={`masonry-card${isHighlighted ? ' masonry-card--highlighted' : ''}`}
      id={`card-${bulletin.id}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick()}
    >
      {firstImage ? (
        <img
          src={firstImage}
          alt={bulletin.title || '作品預覽'}
          className="masonry-card__img"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className="masonry-card__placeholder">
          <User size={40} opacity={0.25} />
          <span>無提供範例圖</span>
        </div>
      )}

      <div className="masonry-card__author">
        <div className="masonry-card__avatar">
          {posterAvatar ? (
            <img src={posterAvatar} alt={posterName} referrerPolicy="no-referrer" />
          ) : (
            <User size={13} color="#94a3b8" />
          )}
        </div>
        <span className="masonry-card__name">{posterName}</span>
      </div>
    </div>
  );
};
