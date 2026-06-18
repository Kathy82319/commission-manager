import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { HexColorPicker, HexColorInput } from 'react-colorful';
import { X } from 'lucide-react';

interface OCColorSwatchProps {
  color: string;
  onChange: (color: string) => void;
  onRemove: () => void;
}

export function OCColorSwatch({ color, onChange, onRemove }: OCColorSwatchProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(color || '#FFFFFF');
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const swatchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (color) setDraft(color);
  }, [color]);

  const handleOpen = () => {
    if (open) { setOpen(false); return; }
    if (!swatchRef.current) return;

    const rect = swatchRef.current.getBoundingClientRect();
    const popupW = 228;
    const popupH = 290;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const gap = 8;

    let top = rect.top - popupH - gap;
    let left = rect.left + rect.width / 2 - popupW / 2;

    if (top < gap) top = rect.bottom + gap;
    if (left < gap) left = gap;
    if (left + popupW > vw - gap) left = vw - popupW - gap;
    if (top + popupH > vh - gap) top = vh - popupH - gap;

    setPos({ top, left });
    setOpen(true);
  };

  const handleChange = (newColor: string) => {
    setDraft(newColor);
    onChange(newColor);
  };

  return (
    <div ref={swatchRef} style={{ position: 'relative', width: '32px', height: '32px', flexShrink: 0 }}>
      {/* 色塊 */}
      <div
        onClick={handleOpen}
        style={{
          width: '32px', height: '32px', borderRadius: '6px',
          backgroundColor: color || '#F0ECE7',
          border: open ? '2px solid #A67B3E' : '2px solid rgba(0,0,0,0.1)',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: color ? 1 : 0.5,
          boxSizing: 'border-box',
        }}
        title={color ? `${color.toUpperCase()} — 點擊更改` : '點擊新增顏色'}
      >
        {!color && <span style={{ color: '#A0978D', fontSize: '17px', fontWeight: 'bold', lineHeight: 1, userSelect: 'none' }}>+</span>}
      </div>

      {/* 刪除按鈕 */}
      {color && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          style={{
            position: 'absolute', top: '-6px', right: '-6px',
            width: '16px', height: '16px', borderRadius: '50%',
            backgroundColor: '#EF4444', color: '#FFF', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.2)', padding: 0, zIndex: 1,
          }}
        >
          <X size={9} strokeWidth={3} />
        </button>
      )}

      {/* 彈窗：用 createPortal 直接掛到 body，避免父層干擾 touch 事件 */}
      {open && createPortal(
        <>
          {/* 背景遮罩，touchend 關閉（不用 touchstart 以免干擾拖曳） */}
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 9998 }}
            onMouseDown={() => setOpen(false)}
            onTouchEnd={() => setOpen(false)}
          />

          {/* Picker 本體 */}
          <div
            style={{
              position: 'fixed',
              top: pos.top,
              left: pos.left,
              zIndex: 9999,
              background: 'white',
              borderRadius: '12px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
              padding: '14px',
            }}
            onMouseDown={e => e.stopPropagation()}
            onTouchStart={e => e.stopPropagation()}
            onTouchEnd={e => e.stopPropagation()}
          >
            {/* touchAction: none 告訴瀏覽器不要把拖曳當成捲動 */}
            <div style={{ touchAction: 'none', userSelect: 'none' }}>
              <HexColorPicker
                color={draft}
                onChange={handleChange}
                style={{ width: '200px' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '10px', padding: '0 2px' }}>
              <span style={{ fontSize: '13px', color: '#7A6B62', fontWeight: 600 }}>#</span>
              <HexColorInput
                color={draft}
                onChange={handleChange}
                prefixed={false}
                style={{
                  flex: 1, border: '1px solid #DED9D3', borderRadius: '6px',
                  padding: '6px 8px', fontSize: '13px', fontFamily: 'monospace',
                  color: '#3D2B1F', outline: 'none', textTransform: 'uppercase',
                  letterSpacing: '1px',
                }}
              />
              <div style={{ width: '24px', height: '24px', borderRadius: '4px', backgroundColor: draft, border: '1px solid rgba(0,0,0,0.1)', flexShrink: 0 }} />
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}
