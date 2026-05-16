// src/pages/client/OCCardPage.tsx
import { useState, useEffect, useRef } from 'react';
import { Plus, ChevronLeft, Trash2 } from 'lucide-react';
import { OCDashedInput } from '../../components/OC/OCDashedInput';
import { OCTagInput } from '../../components/OC/OCTagInput';
import { OCImageManager } from '../../components/OC/OCImageManager';
import type { OCImageItem } from '../../components/OC/OCImageManager';
import '../../styles/Notebook.css'; 
import '../../styles/OCCardPage.css';

const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || '';

interface OCCardData {
  id: string; name: string; gender: string; body_type: string;
  hair_desc: string; hair_colors: string[]; eyes_desc: string; eyes_colors: string[];
  clothing_desc: string; clothing_colors: string[]; traits: string; must_have: string;
  donts: string; keywords: string[]; short_intro: string; personality: string;
  background: string; other_notes: string; images: OCImageItem[]; updated_at: string;
}

export function OCCardPage() {
  const [ocList, setOcList] = useState<OCCardData[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'intro' | 'background'>('intro');
  const [isLoading, setIsLoading] = useState(true);

  // 🌟 核心防護 1：使用 useRef 隨時追蹤最新的 ocList，避免 React 閉包陷阱導致舊資料覆蓋新資料
  const latestOcList = useRef<OCCardData[]>([]);
  // 🌟 核心防護 2：使用 AbortController 阻擋短時間內連續觸發的 API 請求（防範網路傳輸的 Race Condition）
  const saveAbortController = useRef<AbortController | null>(null);

  useEffect(() => {
    latestOcList.current = ocList;
  }, [ocList]);

  useEffect(() => {
    const fetchOCs = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/oc`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          const list = data.data || [];
          setOcList(list);
          if (list.length > 0) setSelectedId(list[0].id);
        }
      } catch (error) {
        console.error("無法取得 OC 資料", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchOCs();
  }, []);

  // 🌟 改寫 handleSaveOC，現在只需傳入「要修改的欄位 (updates)」，不再需要傳遞整包資料
  const handleSaveOC = async (updates: Partial<OCCardData>) => {
    if (!selectedId) return;

    // 確保永遠拿到記憶體中「最新」的卡片資料
    const currentOC = latestOcList.current.find(oc => oc.id === selectedId);
    if (!currentOC) return;

    const mergedOC = { ...currentOC, ...updates };

    // 立即更新前端畫面 (Optimistic Update)
    setOcList(prev => prev.map(oc => oc.id === selectedId ? mergedOC : oc));

    // 取消上一個還在飛的請求，只讓最後一個攜帶完整狀態的請求抵達後端
    if (saveAbortController.current) {
      saveAbortController.current.abort();
    }
    const abortController = new AbortController();
    saveAbortController.current = abortController;

    try {
      await fetch(`${API_BASE}/api/oc/${selectedId}`, {
        method: 'PATCH', 
        headers: { 'Content-Type': 'application/json' }, 
        credentials: 'include',
        body: JSON.stringify(mergedOC),
        signal: abortController.signal
      });
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        console.error("儲存失敗", e);
      }
    }
  };

  const handleCreateNewOC = async () => {
    if (ocList.length >= 3) return alert("最多只能建立 3 個角色卡喔！");
    const newOC: OCCardData = {
      id: `oc-${Date.now()}`, name: '未命名角色', gender: '', body_type: '', hair_desc: '', hair_colors: [],
      eyes_desc: '', eyes_colors: [], clothing_desc: '', clothing_colors: [], traits: '', must_have: '', donts: '', keywords: [], short_intro: '',
      personality: '', background: '', other_notes: '', images: [], updated_at: new Date().toISOString()
    };
    setOcList([...ocList, newOC]);
    setSelectedId(newOC.id);
    setActiveTab('intro'); 
    try {
      await fetch(`${API_BASE}/api/oc`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify(newOC)
      });
    } catch (e) { console.error("建立失敗", e); }
  };

  const handleDeleteOC = async () => {
    if (!selectedId) return;
    if (!window.confirm("確定要刪除這個角色卡嗎？此動作無法復原！")) return;

    const currentId = selectedId;
    setOcList(prev => prev.filter(oc => oc.id !== currentId));
    setSelectedId(null);

    try {
      await fetch(`${API_BASE}/api/oc/${currentId}`, {
        method: 'DELETE', credentials: 'include'
      });
    } catch (e) {
      alert("刪除失敗");
    }
  };

  const selectedOC = ocList.find(oc => oc.id === selectedId);

  const ColorField = ({ label, descFieldName, colorFieldName, value, colors, maxColors = 3 }: any) => {
    return (
      <div>
        <div className="oc-field-label">{label}</div>
        <div className="oc-color-group">
          <div style={{ flex: 1, minWidth: '160px' }}>
            {/* 🌟 寫法變得非常簡潔，不會再有舊狀態被傳入 */}
            <OCDashedInput value={value} onSave={(val: string) => handleSaveOC({ [descFieldName]: val })} placeholder={`輸入${label.replace('：', '')}的描述...`} />
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {Array.from({ length: maxColors }).map((_, i) => {
              const color = colors[i] || '';
              return (
                <div key={i} style={{ position: 'relative' }}>
                  <input type="color" value={color || '#FFFFFF'}
                    onChange={(e) => {
                      const newColors = [...colors]; newColors[i] = e.target.value;
                      handleSaveOC({ [colorFieldName]: newColors });
                    }}
                    className="oc-color-picker" style={{ opacity: color ? 1 : 0.4 }} title="點擊選擇代表色"
                  />
                  {!color && <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none', color: '#A0978D', fontSize: '18px', fontWeight: 'bold' }}>+</div>}
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
            <span style={{ fontSize: '12px', color: '#A0978D', fontWeight: 'bold' }}>{ocList.length} / 3</span>
          </div>

          <div className="sidebar-list-container" style={{ padding: '16px' }}>
            {isLoading ? <div className="sidebar-empty">載入中...</div> : (
              <>
                {ocList.map(oc => (
                  <div key={oc.id} onClick={() => { setSelectedId(oc.id); window.scrollTo(0,0); }} 
                    className={`sidebar-card ${selectedId === oc.id ? 'selected' : ''}`}
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', cursor: 'pointer', borderRadius: '10px', border: selectedId === oc.id ? '2px solid #A67B3E' : '1px solid #EAE6E1', backgroundColor: selectedId === oc.id ? '#FDFDFB' : '#FFF', marginBottom: '12px', transition: 'all 0.2s' }}
                  >
                    <div style={{ width: '56px', height: '56px', borderRadius: '8px', backgroundColor: '#FBFBF9', overflow: 'hidden', border: '1px solid #EAE6E1', flexShrink: 0 }}>
                      {oc.images && oc.images.length > 0 ? (
                        <img src={oc.images[0].previewUrl} alt="頭像" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#DED9D3', fontSize: '12px', fontWeight: 'bold' }}>無圖</div>}
                    </div>
                    <div style={{ overflow: 'hidden', flex: 1 }}>
                      <div style={{ fontWeight: 'bold', color: '#5D4A3E', fontSize: '15px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                        {oc.name || '未命名角色'}
                      </div>
                      <div style={{ fontSize: '12px', color: '#A0978D', marginTop: '6px' }}>
                        更新於 {new Date(oc.updated_at).toLocaleDateString('zh-TW')}
                      </div>
                    </div>
                  </div>
                ))}

                {ocList.length < 3 && (
                  <div onClick={handleCreateNewOC} style={{ border: '2px dashed #DED9D3', borderRadius: '10px', padding: '20px', textAlign: 'center', cursor: 'pointer', color: '#A0978D', backgroundColor: '#FBFBF9', transition: 'all 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#A67B3E'; e.currentTarget.style.color = '#A67B3E'; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#DED9D3'; e.currentTarget.style.color = '#A0978D'; }}>
                    <Plus size={26} style={{ margin: '0 auto', marginBottom: '10px' }} />
                    <div style={{ fontWeight: 'bold', fontSize: '14px' }}>新增角色設定卡</div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className={`notebook-main ${!selectedId ? 'mobile-hide' : ''}`} style={{ overflowY: 'auto', height: '100%' }}>
          {!selectedOC ? <div className="main-empty" style={{ paddingTop: '100px' }}>請從左側選擇或新增一個角色卡</div> : (
            <div className="main-content-wrapper fade-in" style={{ paddingBottom: '100px' }}>
              
              <div className="oc-main-header mobile-only-btn">
                <button className="mobile-back-btn" onClick={() => setSelectedId(null)} style={{ display: 'flex', alignItems: 'center', padding: '8px 0', background: 'none', border: 'none', color: '#5D4A3E', fontWeight: 'bold', cursor: 'pointer' }}>
                  <ChevronLeft size={20} /> 返回列表
                </button>
              </div>

              <div className="oc-tabs-wrapper" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '16px' }}>
                <button onClick={handleDeleteOC} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: 'none', border: '1px solid #FECACA', borderRadius: '6px', color: '#EF4444', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', backgroundColor: '#FEF2F2' }}>
                  <Trash2 size={14} /> 刪除角色
                </button>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className={`oc-tab-btn ${activeTab === 'intro' ? 'active' : 'inactive'}`} onClick={() => setActiveTab('intro')}>簡介</button>
                  <button className={`oc-tab-btn ${activeTab === 'background' ? 'active' : 'inactive'}`} onClick={() => setActiveTab('background')}>背景詳細設定</button>
                </div>
              </div>

              <div className="oc-content-panel">
                
                {activeTab === 'intro' && (
                  <div className="fade-in">
                    <div className="oc-intro-grid">
                      <div>
                        <OCImageManager images={selectedOC.images} onChange={(newImages: OCImageItem[]) => handleSaveOC({ images: newImages })} />
                      </div>

                      <div className="oc-form-column">
                        <div>
                          <div className="oc-field-label">角色名稱：</div>
                          <OCDashedInput value={selectedOC.name} onSave={(val: string) => handleSaveOC({ name: val })} placeholder="請輸入角色名稱..." />
                        </div>

                        <div className="oc-form-row-2">
                          <div>
                            <div className="oc-field-label">性別：</div>
                            <OCDashedInput value={selectedOC.gender} onSave={(val: string) => handleSaveOC({ gender: val })}  />
                          </div>
                          <div>
                            <div className="oc-field-label">體型：</div>
                            <OCDashedInput value={selectedOC.body_type} onSave={(val: string) => handleSaveOC({ body_type: val })}  />
                          </div>
                        </div>

                        <ColorField label="髮色／髮型：" descFieldName="hair_desc" colorFieldName="hair_colors" value={selectedOC.hair_desc} colors={selectedOC.hair_colors} />
                        <ColorField label="瞳色／瞳型：" descFieldName="eyes_desc" colorFieldName="eyes_colors" value={selectedOC.eyes_desc} colors={selectedOC.eyes_colors} />
                        <ColorField label="服裝：" descFieldName="clothing_desc" colorFieldName="clothing_colors" value={selectedOC.clothing_desc} colors={selectedOC.clothing_colors} />

                        <div>
                          <div className="oc-field-label">特點／配件：</div>
                          <OCDashedInput value={selectedOC.traits} onSave={(val: string) => handleSaveOC({ traits: val })}  />
                        </div>
                        
                        <div className="oc-must-have">
                          <div className="oc-field-label">必帶元素：</div>
                          <OCDashedInput value={selectedOC.must_have} onSave={(val: string) => handleSaveOC({ must_have: val })} placeholder="繪師絕對不能漏掉的細節..." />
                        </div>

                        <div className="oc-donts">
                          <div className="oc-field-label">雷點：</div>
                          <OCDashedInput value={selectedOC.donts} onSave={(val: string) => handleSaveOC({ donts: val })} placeholder="例如：禁止畫出的元素..." />
                        </div>

                        <div>
                          <div className="oc-field-label">關鍵字標籤：</div>
                          <OCTagInput tags={selectedOC.keywords} onChange={(newTags: string[]) => handleSaveOC({ keywords: newTags })} />
                        </div>
                      </div>
                    </div>

                    <div className="oc-short-intro">
                      <div className="oc-short-intro-title">其他簡述：</div>
                      <OCDashedInput value={selectedOC.short_intro} onSave={(val: string) => handleSaveOC({ short_intro: val })} placeholder="請在此簡單敘述角色的外部描寫（最多200字）..." isTextArea={true} />
                    </div>
                  </div>
                )}

                {/* 🌟 核心修正：正式啟用 OCDashedInput 與限制 800 字 */}
                {activeTab === 'background' && (
                  <div className="fade-in oc-form-column">
                    <div style={{ backgroundColor: '#FFF', padding: '16px', borderRadius: '10px', border: '1px solid #EAE6E1' }}>
                      <h4 className="oc-field-label" style={{ borderBottom: '1px solid #F4F0EB', paddingBottom: '8px', marginBottom: '12px' }}>角色個性</h4>
                      <OCDashedInput 
                        value={selectedOC.personality} 
                        onSave={(val: string) => handleSaveOC({ personality: val })} 
                        placeholder="描述角色的內在性格、價值觀或喜好..." 
                        isTextArea={true}
                        maxLength={800}
                      />
                    </div>
                    <div style={{ backgroundColor: '#FFF', padding: '16px', borderRadius: '10px', border: '1px solid #EAE6E1' }}>
                      <h4 className="oc-field-label" style={{ borderBottom: '1px solid #F4F0EB', paddingBottom: '8px', marginBottom: '12px' }}>人物背景說明</h4>
                      <OCDashedInput 
                        value={selectedOC.background} 
                        onSave={(val: string) => handleSaveOC({ background: val })} 
                        placeholder="敘述角色的生平、世界觀或重要人際關係..." 
                        isTextArea={true}
                        maxLength={800}
                      />
                    </div>
                    <div style={{ backgroundColor: '#FFF', padding: '16px', borderRadius: '10px', border: '1px solid #EAE6E1' }}>
                      <h4 className="oc-field-label" style={{ borderBottom: '1px solid #F4F0EB', paddingBottom: '8px', marginBottom: '12px' }}>其他說明</h4>
                      <OCDashedInput 
                        value={selectedOC.other_notes} 
                        onSave={(val: string) => handleSaveOC({ other_notes: val })} 
                        placeholder="任何其他想讓繪師知道的細節（例如武器設定、特殊狀態等）..." 
                        isTextArea={true}
                        maxLength={800}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}