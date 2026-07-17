// src/components/BlockContentView.tsx
import DOMPurify from 'dompurify';
import type { CSSProperties } from 'react';
import type { ContentBlock } from '../pages/artist/Settings/types';
import '../styles/BlockContentView.css';

const decodeHTML = (html?: string) => {
  if (!html || typeof html !== 'string') return '';
  const txt = document.createElement('textarea');
  txt.innerHTML = html;
  return txt.value;
};

function hexToRgba(hex: string, opacity: number) {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean;
  const bigint = parseInt(full, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

function blockBackgroundStyle(block: ContentBlock): CSSProperties | undefined {
  if (!block.background_color) return undefined;
  return {
    background: hexToRgba(block.background_color, block.background_opacity ?? 1),
    borderRadius: '12px',
    padding: '20px',
  };
}

interface Props {
  blocks: ContentBlock[];
  onImageClick?: (url: string) => void;
}

function RichBody({ html }: { html?: string }) {
  return <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(decodeHTML(html)) }} />;
}

export function BlockContentView({ blocks, onImageClick }: Props) {
  if (!blocks || blocks.length === 0) return null;

  return (
    <div className="block-content-view">
      {blocks.map(block => {
        if (block.type === 'text') {
          return (
            <div key={block.id} className="bcv-text rich-text-content" style={blockBackgroundStyle(block)}>
              {block.title && <h3>{block.title}</h3>}
              <RichBody html={block.body} />
            </div>
          );
        }

        if (block.type === 'image') {
          if (!block.image_url) return null;
          return (
            <div key={block.id} className="bcv-image-full" style={blockBackgroundStyle(block)}>
              <img
                src={block.image_url}
                alt={block.caption || ''}
                className={onImageClick ? 'is-clickable' : ''}
                onClick={() => onImageClick?.(block.image_url!)}
              />
              {block.caption && <span className="bcv-caption">{block.caption}</span>}
            </div>
          );
        }

        const reverse = block.type === 'image-right';
        return (
          <div key={block.id} className={`bcv-split${reverse ? ' is-reverse' : ''}`} style={blockBackgroundStyle(block)}>
            {block.image_url && (
              <div className="bcv-media">
                <img
                  src={block.image_url}
                  alt={block.caption || ''}
                  className={onImageClick ? 'is-clickable' : ''}
                  onClick={() => onImageClick?.(block.image_url!)}
                />
                {block.caption && <span className="bcv-caption">{block.caption}</span>}
              </div>
            )}
            <div className="bcv-text rich-text-content">
              {block.title && <h3>{block.title}</h3>}
              <RichBody html={block.body} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
