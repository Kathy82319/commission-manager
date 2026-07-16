// src/pages/artist/Settings/OrderTab.tsx
import { useState, useEffect } from 'react'; 
import { GripVertical } from 'lucide-react';
import type { CompleteSettings } from '../Settings';

interface Props {
  settings: CompleteSettings;
  setSettings: React.Dispatch<React.SetStateAction<CompleteSettings>>;
}

export function OrderTab({ settings, setSettings }: Props) {
  const [hasOC, setHasOC] = useState(false);

  useEffect(() => {
    const checkOCEntries = async () => {
      try {
        const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || '';
        const res = await fetch(`${API_BASE}/api/oc`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          if (data.data && data.data.length > 0) {
            setHasOC(true);
          }
        }
      } catch (e) {
        console.error("偵測 OC 分頁排序權限失敗:", e);
      }
    };
    checkOCEntries();
  }, []);

  const allPossibleTabs = [
    { id: 'portfolio', label: '作品展示' },
    { id: 'detailed_intro', label: '詳細介紹' },
    { id: 'showcase', label: settings.showcase_label || '接委託區' },
    { id: 'queue', label: '排單狀況' },
    { id: 'reviews', label: '精選評價' } 
  ];

  if (hasOC) {
    allPossibleTabs.push({ id: 'oc', label: '角色設定' });
  }

  allPossibleTabs.push(
    ...settings.custom_sections.map((sec: any) => ({ id: sec.id, label: sec.title || '未命名分頁' }))
  );

  const activeOrder = (settings.tab_order || []).filter((id: string) => allPossibleTabs.some(t => t.id === id));
  allPossibleTabs.forEach(t => {
    if (!activeOrder.includes(t.id)) activeOrder.push(t.id);
  });

  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

  const handleDragStart = (idx: number) => setDraggedIdx(idx);
  
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault(); 
    if (draggedIdx === null || draggedIdx === idx) return;
    const newOrder = [...activeOrder];
    const draggedItem = newOrder[draggedIdx];
    newOrder.splice(draggedIdx, 1);
    newOrder.splice(idx, 0, draggedItem);
    setDraggedIdx(idx);
    setSettings({ ...settings, tab_order: newOrder });
  };

  return (
    <div className="rich-text-tab">
      <h3 style={{ marginTop: 0, marginBottom: '8px', color: '#5D4A3E', fontSize: '18px' }}>變更分頁顯示排序</h3>
      <p style={{ color: '#7A7269', fontSize: '14px', marginBottom: '24px' }}>
        拖曳左側的把手來調整分頁在公開個人頁面的顯示順序。未公開(被隱藏)的分頁仍然會存在清單中，但不會顯示在前端。
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {activeOrder.map((id, idx) => {
          const tabInfo = allPossibleTabs.find(t => t.id === id);
          if (!tabInfo) return null;
          const isHidden = settings.hidden_sections.includes(id);

          return (
            <div
              key={id}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDragEnd={() => setDraggedIdx(null)}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px',
                backgroundColor: draggedIdx === idx ? '#F4F0EB' : '#FFFFFF',
                border: '1px solid #DED9D3', borderRadius: '8px', cursor: 'grab',
                opacity: isHidden ? 0.8 : 1, transition: 'background-color 0.2s'
              }}
            >
              <GripVertical size={18} color="#A0978D" />
              <span style={{ fontWeight: 'bold', color: '#5D4A3E', fontSize: '15px' }}>{tabInfo.label}</span>
              {isHidden && <span style={{ fontSize: '12px', color: '#A05C5C', marginLeft: 'auto', fontWeight: 'bold' }}>[目前隱藏中]</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}