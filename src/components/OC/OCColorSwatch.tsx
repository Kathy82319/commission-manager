import { useState, useRef, useEffect } from 'react';
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
  const containerRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (color) setDraft(color);
  }, [color]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      if (
        containerRef.current && !containerRef.current.contains(e.target as Node) &&
        popupRef.current && !popupRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    // 用 touchend 而非 touchstart，避免干擾 picker 的拖曳手勢
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchend', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchend', handler);
    };
  }, [open]);

  const handleChange = (newColor: string) => {
    setDraft(newColor);
    onChange(newColor);
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '32px', height: '32px', flexShrink: 0 }}>
      {/* 色塊按鈕 */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          width: '32px', height: '32px', borderRadius: '6px',
          backgroundColor: color || '#F0ECE7',
          border: open ? '2px solid #A67B3E' : '2px solid rgba(0,0,0,0.1)',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: color ? 1 : 0.5,
          transition: 'border-color 0.15s',
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
            cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.2)', padding: 0,
            zIndex: 1,
          }}
          title="移除此色票"
        >
          <X size={9} strokeWidth={3} />
        </button>
      )}

      {/* 顏色選擇器彈窗 */}
      {open && (
        <div
          ref={popupRef}
          style={{
            position: 'fixed',
            zIndex: 9999,
          }}
          // 用 useLayoutEffect 動態定位
        >
          <PopupPositioned anchor={containerRef} onClose={() => setOpen(false)}>
            {/* touch-action: none 讓瀏覽器不把拖曳當成捲動 */}
            <div style={{ touchAction: 'none' }}>
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
          </PopupPositioned>
        </div>
      )}
    </div>
  );
}

// 負責把彈窗定位在 anchor 元素上方，避免超出螢幕
function PopupPositioned({ anchor, children, onClose }: {
  anchor: React.RefObject<HTMLDivElement | null>;
  children: React.ReactNode;
  onClose: () => void;
}) {
  const popupRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({ visibility: 'hidden' });

  useEffect(() => {
    if (!anchor.current || !popupRef.current) return;
    const rect = anchor.current.getBoundingClientRect();
    const popup = popupRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const gap = 8;

    let top = rect.top - popup.height - gap;
    let left = rect.left + rect.width / 2 - popup.width / 2;

    // 如果上方空間不足，改為下方
    if (top < 8) top = rect.bottom + gap;
    // 左右邊界保護
    if (left < 8) left = 8;
    if (left + popup.width > vw - 8) left = vw - popup.width - 8;
    // 底部邊界
    if (top + popup.height > vh - 8) top = vh - popup.height - 8;

    setStyle({ top, left, visibility: 'visible' });
  }, []);

  return (
    <div
      ref={popupRef}
      style={{
        position: 'fixed',
        ...style,
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        padding: '14px',
        zIndex: 9999,
        minWidth: '200px',
      }}
      onClick={e => e.stopPropagation()}
    >
      {children}
    </div>
  );
}
