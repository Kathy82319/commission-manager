// src/components/BlockContentView.tsx
import DOMPurify from 'dompurify';
import type { ContentBlock } from '../pages/artist/Settings/types';
import '../styles/BlockContentView.css';

const decodeHTML = (html?: string) => {
  if (!html || typeof html !== 'string') return '';
  const txt = document.createElement('textarea');
  txt.innerHTML = html;
  return txt.value;
};

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
            <div key={block.id} className="bcv-text rich-text-content">
              {block.title && <h3>{block.title}</h3>}
              <RichBody html={block.body} />
            </div>
          );
        }

        if (block.type === 'image') {
          if (!block.image_url) return null;
          return (
            <div key={block.id} className="bcv-image-full">
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
          <div key={block.id} className={`bcv-split${reverse ? ' is-reverse' : ''}`}>
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
