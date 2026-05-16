// src/pages/client/OCCardPage.tsx
import { useState, useEffect } from 'react';
import { Plus, ChevronLeft } from 'lucide-react';
import { OCDashedInput } from '../../components/OC/OCDashedInput';
import { OCTagInput } from '../../components/OC/OCTagInput';
import { OCImageManager } from '../../components/OC/OCImageManager';
import type { OCImageItem } from '../../components/OC/OCImageManager';
import '../../styles/Notebook.css'; 

const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || '';

interface OCCardData {
  id: string;
  name: string;
  gender: string;
  body_type: string;
  hair_desc: string;
  hair_colors: string[]; 
  eyes_desc: string;
  eyes_colors: string[];
  clothing_desc: string;
  clothing_colors: string[];
  traits: string;
  must_have: string;
  donts: string;
  keywords: string[];
  short_intro: string;
  personality: string;
  background: string;
  other_notes: string;
  images: OCImageItem[];
  updated_at: string;
}

export function OCCardPage() {
  const [ocList, setOcList] = useState<OCCardData[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'intro' | 'background'>('intro');
  const [isLoading, setIsLoading] = useState(true);

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
      } finally {
        setIsLoading(false);
      }
    };
    fetchOCs();
  }, []);

  const handleSaveOC = async (updatedData: OCCardData) => {
    setOcList(prev => prev.map(oc => oc.id === updatedData.id ? updatedData : oc));
    
    try {
      await fetch(`${API_BASE}/api/oc/${updatedData.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updatedData)
      });
    } catch (e) {
      console.error("儲存失敗", e);
    }
  };

  const handleCreateNewOC = async () => {
    if (ocList.length >= 3) {
      alert("最多只能建立 3 個角色卡喔！");
      return;
    }
    
    const newOC: OCCardData = {
      id: `oc-${Date.now()}`,
      name: '未命名角色', gender: '', body_type: '', hair_desc: '', hair_colors: [],
      eyes_desc: '', eyes_colors: [], clothing_desc: '', clothing_colors: [],
      traits: '', must_have: '', donts: '', keywords: [], short_intro: '',
      personality: '', background: '', other_notes: '', images: [],
      updated_at: new Date().toISOString()
    };

    setOcList([...ocList, newOC]);
    setSelectedId(newOC.id);
    
    try {
      await fetch(`${API_BASE}/api/oc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(newOC)
      });
    } catch (e) {
      console.error("建立失敗", e);
    }
  };

  const selectedOC = ocList.find(oc => oc.id === selectedId);

  // 🌟 修正：明確拆分描述欄位名稱與顏色欄位名稱，避免隨機拼湊字串錯誤
  const ColorField = ({ 
    label, 
    descFieldName, 
    colorFieldName, 
    value, 
    colors, 
    maxColors = 3 
  }: { 
    label: string, 
    descFieldName: keyof OCCardData, 
    colorFieldName: 'hair_colors' | 'eyes_colors' | 'clothing_colors', 
    value: string, 
    colors: string[], 
    maxColors?: number 
  }) => {
    return (
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#5D4A3E', marginBottom: '6px' }}>{label}</div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '150px' }}>
            <OCDashedInput value={value} onSave={(val: string) => handleSaveOC({ ...selectedOC!, [descFieldName]: val })} placeholder={`輸入${label}...`} />
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            {Array.from({ length: maxColors }).map((_, i) => {
              const color = colors[i] || '';
              return (
                <div key={i} style={{ position: 'relative' }}>
                  <input
                    type="color"
                    value={color || '#FFFFFF'}
                    onChange={(e) => {
                      const newColors = [...colors];
                      newColors[i] = e.target.value;
                      handleSaveOC({ ...selectedOC!, [colorFieldName]: newColors });
                    }}
                    style={{
                      width: '32px', height: '32px', padding: 0, border: '1px solid #DED9D3',
                      borderRadius: '4px', cursor: 'pointer',
                      opacity: color ? 1 : 0.3 
                    }}
                    title="點擊選擇代表色"
                  />
                  {!color && (
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none', color: '#A0978D', fontSize: '18px', fontWeight: 'bold' }}>+</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="notebook-page">
      <div className="notebook-container">
        
        <div className={`notebook-sidebar ${selectedId ? 'mobile-hide' : ''}`}>
          <div className="sidebar-header">
            <span className="sidebar-title">我的角色卡 (OC)</span>
            <span style={{ fontSize: '12px', color: '#A0978D' }}>{ocList.length} / 3</span>
          </div>

          <div className="sidebar-list-container" style={{ padding: '16px' }}>
            {isLoading ? <div className="sidebar-empty">載入中...</div> : (
              <>
                {ocList.map(oc => (
                  <div 
                    key={oc.id} 
                    onClick={() => { setSelectedId(oc.id); window.scrollTo(0,0); }} 
                    className={`sidebar-card ${selectedId === oc.id ? 'selected' : ''}`}
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', cursor: 'pointer', borderRadius: '8px', border: selectedId === oc.id ? '2px solid #A67B3E' : '1px solid #EAE6E1', backgroundColor: selectedId === oc.id ? '#FDFDFB' : '#FFF', marginBottom: '12px' }}
                  >
                    <div style={{ width: '50px', height: '50px', borderRadius: '8px', backgroundColor: '#FBFBF9', overflow: 'hidden', border: '1px solid #EAE6E1', flexShrink: 0 }}>
                      {oc.images && oc.images.length > 0 ? (
                        <img src={oc.images[0].previewUrl} alt="頭像" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#DED9D3' }}>無圖</div>
                      )}
                    </div>
                    <div>
                      <div style={{ fontWeight: 'bold', color: '#5D4A3E', fontSize: '15px' }}>{oc.name || '未命名角色'}</div>
                      <div style={{ fontSize: '12px', color: '#A0978D', marginTop: '4px' }}>
                        更新於 {new Date(oc.updated_at).toLocaleDateString('zh-TW')}
                      </div>
                    </div>
                  </div>
                ))}

                {ocList.length < 3 && (
                  <div 
                    onClick={handleCreateNewOC}
                    style={{ border: '2px dashed #DED9D3', borderRadius: '8px', padding: '16px', textAlign: 'center', cursor: 'pointer', color: '#A0978D', backgroundColor: '#FBFBF9', transition: 'all 0.2s' }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#A67B3E'; e.currentTarget.style.color = '#A67B3E'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#DED9D3'; e.currentTarget.style.color = '#A0978D'; }}
                  >
                    <Plus size={24} style={{ margin: '0 auto', marginBottom: '8px' }} />
                    <div style={{ fontWeight: 'bold' }}>新增角色設定卡</div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className={`notebook-main ${!selectedId ? 'mobile-hide' : ''}`}>
          {!selectedOC ? <div className="main-empty">請從左側選擇或新增一個角色卡</div> : (
            <div className="main-content-wrapper fade-in">
              
              <div className="main-header" style={{ borderBottom: 'none', paddingBottom: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
                  <button className="mobile-back-btn" onClick={() => setSelectedId(null)} style={{ display: 'flex', alignItems: 'center', padding: '8px', background: 'none', border: 'none', color: '#5D4A3E', fontWeight: 'bold' }}>
                    <ChevronLeft size={20} /> 返回列表
                  </button>
                  <div style={{ flex: 1 }}>
                    <OCDashedInput value={selectedOC.name} onSave={(val: string) => handleSaveOC({ ...selectedOC, name: val })} placeholder="輸入角色名稱..." />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0 24px', gap: '8px', marginTop: '-10px' }}>
                <button 
                  onClick={() => setActiveTab('intro')}
                  style={{ padding: '8px 24px', backgroundColor: activeTab === 'intro' ? '#8CB369' : '#DED9D3', color: activeTab === 'intro' ? '#FFF' : '#7A7269', border: 'none', borderRadius: '8px 8px 0 0', fontWeight: 'bold', cursor: 'pointer', transition: 'background 0.2s' }}
                >
                  簡介
                </button>
                <button 
                  onClick={() => setActiveTab('background')}
                  style={{ padding: '8px 24px', backgroundColor: activeTab === 'background' ? '#8CB369' : '#DED9D3', color: activeTab === 'background' ? '#FFF' : '#7A7269', border: 'none', borderRadius: '8px 8px 0 0', fontWeight: 'bold', cursor: 'pointer', transition: 'background 0.2s' }}
                >
                  背景詳細設定
                </button>
              </div>

              <div style={{ backgroundColor: '#FDFDFB', border: '1px solid #EAE6E1', borderRadius: '12px 0 12px 12px', padding: '24px', minHeight: '600px' }}>
                
                {activeTab === 'intro' && (
                  <div className="fade-in">
                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '24px' }} className="oc-intro-grid">
                      
                      <div style={{ gridColumn: '1 / span 1' }}>
                        <OCImageManager images={selectedOC.images} onChange={(newImages: OCImageItem[]) => handleSaveOC({ ...selectedOC, images: newImages })} />
                      </div>

                      <div style={{ gridColumn: '2 / span 1', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        
                        <div style={{ display: 'flex', gap: '16px' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#5D4A3E', marginBottom: '6px' }}>性別：</div>
                            <OCDashedInput value={selectedOC.gender} onSave={(val: string) => handleSaveOC({ ...selectedOC, gender: val })} placeholder="例如：女" />
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#5D4A3E', marginBottom: '6px' }}>體型：</div>
                            <OCDashedInput value={selectedOC.body_type} onSave={(val: string) => handleSaveOC({ ...selectedOC, body_type: val })} placeholder="例如：瘦小" />
                          </div>
                        </div>

                        {/* 🌟 修正：此處精準指名描述與顏色的各別對應欄位 */}
                        <ColorField label="髮色／髮型：" descFieldName="hair_desc" colorFieldName="hair_colors" value={selectedOC.hair_desc} colors={selectedOC.hair_colors} />
                        <ColorField label="瞳色／瞳型：" descFieldName="eyes_desc" colorFieldName="eyes_colors" value={selectedOC.eyes_desc} colors={selectedOC.eyes_colors} />
                        <ColorField label="服裝：" descFieldName="clothing_desc" colorFieldName="clothing_colors" value={selectedOC.clothing_desc} colors={selectedOC.clothing_colors} />

                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#5D4A3E', marginBottom: '6px' }}>特點／配件：</div>
                          <OCDashedInput value={selectedOC.traits} onSave={(val: string) => handleSaveOC({ ...selectedOC, traits: val })} placeholder="例如：左眼下有淚痣、戴黑框眼鏡" />
                        </div>
                        
                        <div style={{ borderLeft: '3px solid #8CB369', paddingLeft: '12px' }}>
                          <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#5D4A3E', marginBottom: '6px' }}>必帶元素：</div>
                          <OCDashedInput value={selectedOC.must_have} onSave={(val: string) => handleSaveOC({ ...selectedOC, must_have: val })} placeholder="繪師絕對不能漏掉的細節..." />
                        </div>

                        <div style={{ borderLeft: '3px solid #E11D48', paddingLeft: '12px' }}>
                          <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#E11D48', marginBottom: '6px' }}>絕對雷點：</div>
                          <OCDashedInput value={selectedOC.donts} onSave={(val: string) => handleSaveOC({ ...selectedOC, donts: val })} placeholder="絕對禁止畫出的地雷..." />
                        </div>

                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#5D4A3E', marginBottom: '6px' }}>印象關鍵字：</div>
                          <OCTagInput tags={selectedOC.keywords} onChange={(newTags: string[]) => handleSaveOC({ ...selectedOC, keywords: newTags })} />
                        </div>

                      </div>
                    </div>

                    <div style={{ marginTop: '24px', backgroundColor: '#FFFEE0', padding: '20px', borderRadius: '12px', border: '1px solid #F0E68C' }}>
                      <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#8B8000', marginBottom: '12px' }}>個性簡述：</div>
                      <OCDashedInput value={selectedOC.short_intro} onSave={(val: string) => handleSaveOC({ ...selectedOC, short_intro: val })} placeholder="請在此簡單敘述角色的個性（最多120字）..." isTextArea={true} />
                    </div>
                  </div>
                )}

                {activeTab === 'background' && (
                  <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div style={{ backgroundColor: '#FFF', padding: '20px', borderRadius: '8px', border: '1px solid #EAE6E1' }}>
                      <h4 style={{ color: '#5D4A3E', marginTop: 0, marginBottom: '12px', borderBottom: '1px solid #F4F0EB', paddingBottom: '8px' }}>角色個性 (無字數限制)</h4>
                      <textarea
                        value={selectedOC.personality}
                        onChange={(e) => setOcList(prev => prev.map(oc => oc.id === selectedId ? { ...oc, personality: e.target.value } : oc))}
                        onBlur={() => handleSaveOC(selectedOC)}
                        placeholder="詳細描述角色的內在性格、價值觀或口癖..."
                        style={{ width: '100%', minHeight: '120px', border: 'none', outline: 'none', resize: 'vertical', fontSize: '14px', lineHeight: '1.6', color: '#5D4A3E' }}
                      />
                    </div>

                    <div style={{ backgroundColor: '#FFF', padding: '20px', borderRadius: '8px', border: '1px solid #EAE6E1' }}>
                      <h4 style={{ color: '#5D4A3E', marginTop: 0, marginBottom: '12px', borderBottom: '1px solid #F4F0EB', paddingBottom: '8px' }}>人物背景說明 (無字數限制)</h4>
                      <textarea
                        value={selectedOC.background}
                        onChange={(e) => setOcList(prev => prev.map(oc => oc.id === selectedId ? { ...oc, background: e.target.value } : oc))}
                        onBlur={() => handleSaveOC(selectedOC)}
                        placeholder="敘述角色的生平、世界觀或重要人際關係..."
                        style={{ width: '100%', minHeight: '150px', border: 'none', outline: 'none', resize: 'vertical', fontSize: '14px', lineHeight: '1.6', color: '#5D4A3E' }}
                      />
                    </div>

                    <div style={{ backgroundColor: '#FFF', padding: '20px', borderRadius: '8px', border: '1px solid #EAE6E1' }}>
                      <h4 style={{ color: '#5D4A3E', marginTop: 0, marginBottom: '12px', borderBottom: '1px solid #F4F0EB', paddingBottom: '8px' }}>其他說明 (無字數限制)</h4>
                      <textarea
                        value={selectedOC.other_notes}
                        onChange={(e) => setOcList(prev => prev.map(oc => oc.id === selectedId ? { ...oc, other_notes: e.target.value } : oc))}
                        onBlur={() => handleSaveOC(selectedOC)}
                        placeholder="任何其他想讓繪師知道的細節（例如武器設定、特殊狀態等）..."
                        style={{ width: '100%', minHeight: '120px', border: 'none', outline: 'none', resize: 'vertical', fontSize: '14px', lineHeight: '1.6', color: '#5D4A3E' }}
                      />
                    </div>
                  </div>
                )}

              </div>
            </div>
          )}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @media (max-width: 768px) {
          .oc-intro-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}} />
    </div>
  );
}