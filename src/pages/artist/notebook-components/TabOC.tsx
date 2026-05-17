// src/pages/artist/notebook-components/TabOC.tsx
import { OCDetailCard } from '../../../components/OC/OCDetailCard';
import type { OCCardData } from '../../../components/OC/OCDetailCard';
import type { Commission } from './notebookUtils';

interface TabOCProps {
  selectedOrder: Commission;
}

export function TabOC({ selectedOrder }: TabOCProps) {

  let ocData: OCCardData | null = null;
  try {
    if ((selectedOrder as any).oc_snapshot) {
      ocData = JSON.parse((selectedOrder as any).oc_snapshot);
    }
  } catch (e) {
    console.error("無法解析 OC 資料", e);
  }

  if (!ocData) {
    return (
      <div style={{ backgroundColor: '#FFF', borderRadius: '12px', padding: '40px', textAlign: 'center', border: '1px dashed #DED9D3', color: '#A0978D' }}>
        此委託單尚未綁定任何專屬角色設定卡 (OC)。
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ 
      border: '1px solid #EAE6E1', 
      borderRadius: '12px', 
      overflow: 'hidden',
      boxShadow: '0 4px 20px rgba(0,0,0,0.02)'
    }}>
      <OCDetailCard ocData={ocData} />
    </div>
  );
}