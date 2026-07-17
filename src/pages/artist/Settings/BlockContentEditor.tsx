// src/pages/artist/Settings/BlockContentEditor.tsx
import { useRef, useState } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { Image as ImageIcon } from 'lucide-react';
import { ImageUploader } from '../../../components/ImageUploader';
import { BlockContentView } from '../../../components/BlockContentView';
import type { ContentBlock } from './types';
import { BLOCK_TYPE_META, createEmptyBlock, parseBlocks, serializeBlocks } from './blockContent';

const customQuillModules = {
  toolbar: [
    [{ 'header': [1, 2, 3, false] }],
    [{ 'size': ['small', false, 'large', 'huge'] }],
    ['bold', 'italic', 'underline', 'strike', 'blockquote'],
    [{ 'color': [] }, { 'background': [] }],
    [{ 'list': 'ordered' }, { 'list': 'bullet' }, { 'align': [] }],
    ['link', 'clean']
  ]
};

async function uploadBlockImage(blob: Blob): Promise<string> {
  const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
  const ticketRes = await fetch(`${API_BASE}/api/r2/upload-url`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contentType: 'image/jpeg', bucketType: 'public', originalName: `content_${Date.now()}.jpg`, folder: 'content_blocks' })
  });
  const ticketData = await ticketRes.json();
  if (!ticketData.success) throw new Error(ticketData.error || '無法取得上傳通行證');
  const uploadRes = await fetch(ticketData.uploadUrl, { method: 'PUT', body: blob, headers: { 'Content-Type': 'image/jpeg' } });
  if (!uploadRes.ok) throw new Error('上傳遭拒絕');
  return `https://pub-1d4bcc7f19324c0d95d7bfdfeb1a69e2.r2.dev/${ticketData.fileName}`;
}

function layoutGlyph(type: ContentBlock['type']) {
  const cells = type === 'image-left' ? ['fill', 'empty']
    : type === 'image-right' ? ['empty', 'fill']
    : type === 'image' ? ['fill']
    : ['empty'];
  return (
    <span style={{ display: 'inline-flex', width: '22px', height: '14px', borderRadius: '3px', overflow: 'hidden', border: '1px solid #DED9D3', flexShrink: 0 }}>
      {cells.map((c, i) => (
        <span key={i} style={{ flex: 1, background: c === 'fill' ? '#8C5A3C' : '#FFFFFF' }} />
      ))}
    </span>
  );
}

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export function BlockContentEditor({ value, onChange }: Props) {
  const [blocks, setBlocks] = useState<ContentBlock[]>(() => parseBlocks(value));
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const draggedId = useRef<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const commit = (next: ContentBlock[]) => {
    setBlocks(next);
    onChange(serializeBlocks(next));
  };

  const updateBlock = (id: string, patch: Partial<ContentBlock>) => {
    commit(blocks.map(b => b.id === id ? { ...b, ...patch } : b));
  };

  const deleteBlock = (id: string) => commit(blocks.filter(b => b.id !== id));

  const moveBlock = (id: string, dir: -1 | 1) => {
    const idx = blocks.findIndex(b => b.id === id);
    const target = idx + dir;
    if (idx === -1 || target < 0 || target >= blocks.length) return;
    const next = [...blocks];
    [next[idx], next[target]] = [next[target], next[idx]];
    commit(next);
  };

  const addBlock = (type: ContentBlock['type']) => {
    commit([...blocks, createEmptyBlock(type)]);
    setAddMenuOpen(false);
  };

  const handleImageUpload = async (id: string, blobs: { preview: Blob }) => {
    setUploadingId(id);
    try {
      const url = await uploadBlockImage(blobs.preview);
      updateBlock(id, { image_url: url });
    } catch (err: any) {
      alert(err.message || '圖片上傳失敗，請稍後再試');
    } finally {
      setUploadingId(null);
    }
  };

  const handleDrop = (targetId: string) => {
    const fromId = draggedId.current;
    draggedId.current = null;
    setDragOverId(null);
    if (!fromId || fromId === targetId) return;
    const fromIdx = blocks.findIndex(b => b.id === fromId);
    const toIdx = blocks.findIndex(b => b.id === targetId);
    if (fromIdx === -1 || toIdx === -1) return;
    const next = [...blocks];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    commit(next);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {blocks.length === 0 && (
        <div style={{ padding: '32px', textAlign: 'center', background: '#FAFAFA', border: '2px dashed #DED9D3', borderRadius: '12px', color: '#A0978D', fontSize: '14px' }}>
          尚未新增任何內容，點下方「＋ 新增區塊」開始編輯。
        </div>
      )}

      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {blocks.map((block, idx) => {
          const meta = BLOCK_TYPE_META[block.type];
          return (
            <li
              key={block.id}
              draggable
              onDragStart={(e) => {
                if (!(e.target as HTMLElement).closest('[data-drag-handle]')) { e.preventDefault(); return; }
                draggedId.current = block.id;
              }}
              onDragOver={(e) => { e.preventDefault(); setDragOverId(block.id); }}
              onDragLeave={() => setDragOverId(prev => prev === block.id ? null : prev)}
              onDrop={(e) => { e.preventDefault(); handleDrop(block.id); }}
              style={{
                background: '#FFFFFF',
                border: dragOverId === block.id ? '2px dashed #8C5A3C' : '1px solid #EAE6E1',
                borderRadius: '12px',
                overflow: 'hidden',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: '#FAFAFA', borderBottom: '1px solid #F0ECE7' }}>
                <button
                  type="button"
                  data-drag-handle
                  title="拖曳排序"
                  style={{ border: 'none', background: 'none', cursor: 'grab', color: '#A0978D', fontSize: '14px', letterSpacing: '-2px', padding: '2px 4px' }}
                >
                  ⠿⠿
                </button>
                <span style={{ fontSize: '12px', color: '#A0978D', fontVariantNumeric: 'tabular-nums', minWidth: '18px' }}>
                  {String(idx + 1).padStart(2, '0')}
                </span>
                {layoutGlyph(block.type)}
                <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#7A7269' }}>{meta.label}</span>
                <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 'auto' }}>
                  <button type="button" onClick={() => moveBlock(block.id, -1)} disabled={idx === 0} title="上移"
                    style={{ border: 'none', background: 'none', cursor: idx === 0 ? 'default' : 'pointer', color: idx === 0 ? '#DED9D3' : '#A0978D', fontSize: '9px', padding: '1px 4px' }}>▲</button>
                  <button type="button" onClick={() => moveBlock(block.id, 1)} disabled={idx === blocks.length - 1} title="下移"
                    style={{ border: 'none', background: 'none', cursor: idx === blocks.length - 1 ? 'default' : 'pointer', color: idx === blocks.length - 1 ? '#DED9D3' : '#A0978D', fontSize: '9px', padding: '1px 4px' }}>▼</button>
                </div>
                <button
                  type="button"
                  onClick={() => deleteBlock(block.id)}
                  title="刪除區塊"
                  style={{ width: '26px', height: '26px', borderRadius: '7px', border: 'none', background: 'none', cursor: 'pointer', color: '#A0978D', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#F5E4E0'; e.currentTarget.style.color = '#A6503F'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#A0978D'; }}
                >
                  ✕
                </button>
              </div>

              <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {block.type !== 'text' && (
                  <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                    <div style={{ width: '140px', flexShrink: 0 }}>
                      <ImageUploader
                        existingUrl={block.image_url}
                        targetWidth={1000}
                        maxSizeMB={5}
                        buttonText={uploadingId === block.id ? '上傳中…' : '點擊上傳圖片'}
                        onUpload={(blobs) => handleImageUpload(block.id, blobs)}
                      />
                    </div>
                    <div style={{ flex: '1 1 200px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#A0978D', marginBottom: '6px' }}>圖片說明文字</div>
                      <input
                        className="form-input"
                        value={block.caption || ''}
                        onChange={e => updateBlock(block.id, { caption: e.target.value })}
                        placeholder="例如：我的工作桌"
                        style={{ width: '100%' }}
                      />
                    </div>
                  </div>
                )}

                {block.type !== 'image' && (
                  <>
                    <input
                      className="form-input"
                      value={block.title || ''}
                      onChange={e => updateBlock(block.id, { title: e.target.value })}
                      placeholder="段落標題（可留空）"
                      style={{ fontWeight: 'bold', fontSize: '15px' }}
                    />
                    <div className="custom-quill-wrapper">
                      <ReactQuill
                        theme="snow"
                        value={block.body || ''}
                        onChange={html => updateBlock(block.id, { body: html })}
                        modules={customQuillModules}
                      />
                    </div>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <div style={{ position: 'relative' }}>
        {addMenuOpen && (
          <div style={{ position: 'absolute', bottom: 'calc(100% + 8px)', left: 0, right: 0, background: '#FFFFFF', border: '1px solid #EAE6E1', borderRadius: '10px', boxShadow: '0 8px 24px rgba(74,60,51,0.12)', padding: '6px', display: 'flex', flexDirection: 'column', gap: '2px', zIndex: 5 }}>
            {(['text', 'image-left', 'image-right', 'image'] as const).map(type => (
              <button
                key={type}
                type="button"
                onClick={() => addBlock(type)}
                style={{ display: 'flex', alignItems: 'center', gap: '10px', border: 'none', background: 'none', padding: '8px 10px', borderRadius: '7px', textAlign: 'left', fontSize: '13.5px', color: '#5D4A3E', cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = '#FAF6EF'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                {layoutGlyph(type)}
                {BLOCK_TYPE_META[type].label}
              </button>
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={() => setAddMenuOpen(o => !o)}
          style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1.5px dashed #DED9D3', background: '#FFFFFF', color: '#7A7269', fontWeight: 'bold', fontSize: '13.5px', cursor: 'pointer' }}
        >
          ＋ 新增區塊
        </button>
      </div>

      {blocks.length > 0 && (
        <div style={{ marginTop: '8px' }}>
          <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#A0978D', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ImageIcon size={13} /> 公開頁面預覽
          </div>
          <div style={{ background: '#FBFBF9', border: '1px solid #EAE6E1', borderRadius: '12px', padding: '20px' }}>
            <BlockContentView blocks={blocks} />
          </div>
        </div>
      )}
    </div>
  );
}
