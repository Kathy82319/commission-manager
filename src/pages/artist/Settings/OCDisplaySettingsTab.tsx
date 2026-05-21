// src/pages/artist/Settings/OCDisplaySettingsTab.tsx
import { useState, useEffect } from 'react';
import { Eye, EyeOff, Image as ImageIcon } from 'lucide-react';
import type { OCCardData } from '../../../components/OC/OCDetailCard';

interface OCDisplaySettingsTabProps {
  onToast: (msg: string, type?: 'ok' | 'err') => void;
}

export function OCDisplaySettingsTab({ onToast }: OCDisplaySettingsTabProps) {
  const [ocList, setOcList] = useState<(OCCardData & { is_public: boolean })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || '';

  useEffect(() => {
    const fetchOCs = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/oc`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setOcList(data.data || []);
        } else {
          setOcList([]);
        }
      } catch (error) {
        console.error("無法取得 OC 資料", error);
        onToast('讀取角色卡列表失敗', 'err');
      } finally {
        setIsLoading(false);
      }
    };
    fetchOCs();
  }, [API_BASE, onToast]);

  const toggleVisibility = async (oc: OCCardData & { is_public: boolean }) => {
    const newStatus = !oc.is_public;

    setOcList(prev => prev.map(item => item.id === oc.id ? { ...item, is_public: newStatus } : item));

    try {
      const res = await fetch(`${API_BASE}/api/oc/${oc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...oc, is_public: newStatus })
      });
      
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      
      onToast(`角色卡「${oc.name}」已設為${newStatus ? '公開' : '不公開'}`);
    } catch (e) {
      setOcList(prev => prev.map(item => item.id === oc.id ? { ...item, is_public: !newStatus } : item));
      onToast('儲存公開狀態失敗', 'err');
    }
  };

  if (isLoading) {
    return <div style={{ padding: '20px', color: '#A0978D', textAlign: 'center' }}>載入角色卡中...</div>;
  }

  return (
    <div className="tab-pane fade-in">
      <h3 style={{ margin: '0 0 16px 0', color: '#5D4A3E', borderBottom: '1px solid #EAE6E1', paddingBottom: '12px' }}>
        角色設定卡 (OC) 公開展示
      </h3>
      <p style={{ fontSize: '13px', color: '#7A7269', marginBottom: '24px', lineHeight: '1.6' }}>
        您可以在此決定哪些專屬角色卡要公開展示在您的「個人公開主頁」上。<br/>
        設為「公開」後，任何人只要進入您的主頁，都能直接檢視該角色的設定細節與色票，方便您將名片一鍵分享給繪師。
      </p>

      {ocList.length === 0 ? (
        <div style={{ padding: '30px', textAlign: 'center', backgroundColor: '#FBFBF9', borderRadius: '8px', border: '1px dashed #DED9D3' }}>
          <div style={{ color: '#A0978D', marginBottom: '12px' }}>您目前還沒有建立任何角色設定卡喔！</div>
          <button 
            onClick={() => window.location.href = '/client/oc'}
            style={{ padding: '8px 16px', backgroundColor: '#5D4A3E', color: '#FFF', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}
          >
            前往建立角色卡
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {ocList.map(oc => (
            <div key={oc.id} style={{ 
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
              padding: '16px', borderRadius: '12px', border: '1px solid #EAE6E1', 
              backgroundColor: oc.is_public ? '#FFF' : '#FBFBF9',
              transition: 'all 0.2s', boxShadow: oc.is_public ? '0 2px 8px rgba(0,0,0,0.02)' : 'none'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '8px', backgroundColor: '#F4F0EB', overflow: 'hidden', border: '1px solid #EAE6E1' }}>
                  {oc.images && oc.images.length > 0 ? (
                    <img src={oc.images[0].previewUrl} alt="頭像" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#DED9D3' }}><ImageIcon size={20} /></div>
                  )}
                </div>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '15px', color: '#5D4A3E', marginBottom: '4px' }}>{oc.name || '未命名角色'}</div>
                  <div style={{ fontSize: '12px', color: '#A0978D' }}>更新於 {new Date(oc.updated_at).toLocaleDateString('zh-TW')}</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '13px', fontWeight: 'bold', color: oc.is_public ? '#8CB369' : '#A0978D' }}>
                  {oc.is_public ? '已公開展示' : '目前不公開'}
                </span>
                
                
                <button 
                  onClick={() => toggleVisibility(oc)}
                  style={{ 
                    position: 'relative', width: '48px', height: '26px', 
                    backgroundColor: oc.is_public ? '#8CB369' : '#DED9D3', 
                    borderRadius: '13px', border: 'none', cursor: 'pointer', transition: 'background-color 0.3s'
                  }}
                  title={oc.is_public ? "點擊隱藏" : "點擊公開"}
                >
                  <div style={{ 
                    position: 'absolute', top: '2px', left: oc.is_public ? '24px' : '2px', 
                    width: '22px', height: '22px', backgroundColor: '#FFF', borderRadius: '50%', 
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)', transition: 'left 0.3s ease-in-out',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    {oc.is_public ? <Eye size={12} color="#8CB369" /> : <EyeOff size={12} color="#A0978D" />}
                  </div>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}