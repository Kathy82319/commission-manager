// src/components/OC/OCImageManager.tsx
import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core'; // 修正：獨立引入型別
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripHorizontal, X } from 'lucide-react'; // 修正：移除未使用的 ImageIcon
import { ImageUploader } from '../ImageUploader';

export interface OCImageItem {
  id: string;
  previewUrl: string;
  file?: Blob;
}

interface OCImageManagerProps {
  images: OCImageItem[];
  onChange: (images: OCImageItem[]) => void;
}

// --- 單一可拖曳的照片元件 ---
interface SortablePhotoProps {
  item: OCImageItem;
  index: number;
  onRemove: (id: string) => void;
}

function SortablePhoto({ item, index, onRemove }: SortablePhotoProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const [isHovering, setIsHovering] = useState(false);

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.8 : 1,
    position: 'relative',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: isDragging ? '0 10px 25px rgba(0,0,0,0.2)' : 'none',
    aspectRatio: '4/3',
    backgroundColor: '#FBFBF9',
    border: '1px solid #EAE6E1',
    gridColumn: index === 0 ? 'span 2' : 'span 1',
    gridRow: index === 0 ? 'span 2' : 'span 1',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onClick={() => setIsHovering(true)}
    >
      <img
        src={item.previewUrl}
        alt={`OC Image ${index + 1}`}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />
      
      {(isHovering || isDragging) && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: '16px',
          animation: 'fadeIn 0.2s ease-in-out'
        }}>
          <div
            {...attributes}
            {...listeners}
            style={{
              cursor: 'grab', padding: '12px', backgroundColor: 'rgba(255,255,255,0.9)',
              borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
            }}
          >
            <GripHorizontal size={24} color="#5D4A3E" />
          </div>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove(item.id);
            }}
            style={{
              position: 'absolute', top: '10px', right: '10px',
              backgroundColor: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: '50%',
              width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
          >
            <X size={16} color="#A05C5C" />
          </button>

          {index === 0 && (
            <span style={{ position: 'absolute', bottom: '10px', left: '10px', backgroundColor: '#A67B3E', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
              主宣傳圖
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// --- 主要管理器元件 ---
export function OCImageManager({ images, onChange }: OCImageManagerProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = images.findIndex((img) => img.id === active.id);
      const newIndex = images.findIndex((img) => img.id === over.id);
      onChange(arrayMove(images, oldIndex, newIndex));
    }
  };

  const handleUpload = (blobs: { preview: Blob; original?: Blob }, previewUrl: string) => {
    const newItem: OCImageItem = {
      id: `img-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      previewUrl: previewUrl,
      file: blobs.preview 
    };
    onChange([...images, newItem]);
  };

  const handleRemove = (idToRemove: string) => {
    onChange(images.filter((img) => img.id !== idToRemove));
  };

  const gridContainerStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)', 
    gap: '12px',
    width: '100%'
  };

  return (
    <div style={{ width: '100%' }}>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={images.map(img => img.id)} strategy={rectSortingStrategy}>
          <div style={gridContainerStyle}>
            
            {images.map((img, index) => (
              <SortablePhoto key={img.id} item={img} index={index} onRemove={handleRemove} />
            ))}

            {images.length < 5 && (
              <div style={{ 
                gridColumn: images.length === 0 ? 'span 2' : 'span 1',
                gridRow: images.length === 0 ? 'span 2' : 'span 1',
                aspectRatio: '4/3', display: 'flex', flexDirection: 'column'
              }}>
                <ImageUploader
                  onUpload={handleUpload}
                  aspectRatio={4/3}
                  maxSizeMB={1}
                  buttonText={images.length === 0 ? "上傳主宣傳圖 (建議 4:3，限 1MB)" : "新增參考圖"}
                />
              </div>
            )}
            
          </div>
        </SortableContext>
      </DndContext>
      
      <div style={{ marginTop: '12px', fontSize: '12px', color: '#A0978D', textAlign: 'center' }}>
        💡 提示：長按圖片可拖曳更改排序，第 1 張將作為主宣傳圖。<br/>
        已上傳 {images.length} / 5 張
      </div>
    </div>
  );
}