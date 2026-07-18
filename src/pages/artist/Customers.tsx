// src/pages/artist/Customers.tsx
import { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { User, Heart, ExternalLink } from 'lucide-react';
import '../../styles/Customers.css';

interface Customer {
  id: string;
  artist_id: string;
  alias_name: string;
  public_id: string;
  client_user_id?: string;
  custom_label: string;
  order_count: number;
  short_note: string;
  full_note: string;
  platform_name?: string;
  contact_methods: string;
}

interface ArtistRelation {
  id: string;
  target_user_id: string;
  relation_type: 'favorite' | 'blacklist';
  custom_note: string;
  created_at: string;
  display_name: string;
  avatar_url: string;
  public_id: string;
}

const DEFAULT_LABELS = ['一般', 'VIP'];

export function Customers() {
  const navigate = useNavigate();
  const location = useLocation();
  const API_BASE = (import.meta as any).env.VITE_API_BASE_URL || '';
  
  const [activeTab, setActiveTab] = useState<'all' | 'blacklist' | 'favorites'>('all');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [relations, setRelations] = useState<ArtistRelation[]>([]);
  const [relationsLoaded, setRelationsLoaded] = useState(false);
  const [relationsLoading, setRelationsLoading] = useState(false);
  const [relSearchTerm, setRelSearchTerm] = useState('');
  const [relModalMode, setRelModalMode] = useState<'none' | 'edit'>('none');
  const [selectedRel, setSelectedRel] = useState<ArtistRelation | null>(null);
  const [editNote, setEditNote] = useState('');
  const [editType, setEditType] = useState<'favorite' | 'blacklist'>('favorite');

  const [modalMode, setModalMode] = useState<'none' | 'add' | 'view' | 'edit'>('none');
  const [modalTab, setModalTab] = useState<'overview' | 'history'>('overview');
  const [selectedCust, setSelectedCust] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<Customer[]>([]);

  const [labelOptions, setLabelOptions] = useState<string[]>(() => {
    const saved = localStorage.getItem('artist_custom_labels');
    return saved ? JSON.parse(saved) : DEFAULT_LABELS;
  });
  const [isLabelDropdownOpen, setIsLabelDropdownOpen] = useState(false);
  const [newLabelInput, setNewLabelInput] = useState('');
  const labelDropdownRef = useRef<HTMLDivElement>(null);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const parseSocialMethods = (jsonStr: string | undefined): string[] => {
    if (!jsonStr) return [];
    try {
      const parsed = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
      return Array.isArray(parsed) ? parsed.filter(s => s && s.trim() !== "") : [];
    } catch (e) {
      return [];
    }
  };

  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/customers`, { credentials: 'include' });
      const result = await res.json();
      if (result.success) setCustomers(result.data);
    } catch (err) {
      showToast("載入清單失敗");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRelations = async () => {
    setRelationsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/relations`, { credentials: 'include' });
      const result = await res.json();
      if (result.success) setRelations(result.data);
    } catch (err) {
      showToast("載入名單失敗");
    } finally {
      setRelationsLoading(false);
      setRelationsLoaded(true);
    }
  };

  const handleSwitchToFavorites = () => {
    setActiveTab('favorites');
    if (!relationsLoaded) fetchRelations();
  };

  useEffect(() => { fetchCustomers(); }, []);

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const targetId = queryParams.get('id');

    if (targetId && !isLoading && customers.length > 0) {
      const targetCustomer = customers.find(c => c.id === targetId);
      if (targetCustomer) {
        openViewModal(targetCustomer);
        window.history.replaceState(null, '', '/artist/customers');
      }
    }
  }, [location.search, isLoading, customers]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (labelDropdownRef.current && !labelDropdownRef.current.contains(e.target as Node)) {
        setIsLabelDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    localStorage.setItem('artist_custom_labels', JSON.stringify(labelOptions));
  }, [labelOptions]);

  const displayRelations = useMemo(() => {
    let list = relations.filter(r => r.relation_type === 'favorite');
    if (relSearchTerm.length > 0) {
      const term = relSearchTerm.toLowerCase();
      list = list.filter(r =>
        r.display_name?.toLowerCase().includes(term) ||
        r.public_id?.toLowerCase().includes(term) ||
        r.custom_note?.toLowerCase().includes(term)
      );
    }
    return list;
  }, [relations, relSearchTerm]);

  const openRelEditModal = (rel: ArtistRelation) => {
    setSelectedRel(rel);
    setEditNote(rel.custom_note || '');
    setEditType(rel.relation_type);
    setRelModalMode('edit');
  };

  const handleRelSave = async () => {
    if (!selectedRel) return;
    try {
      const res = await fetch(`${API_BASE}/api/relations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetId: selectedRel.target_user_id, type: editType, note: editNote }),
        credentials: 'include'
      });
      const result = await res.json();
      if (result.success) {
        showToast("更新成功");
        setRelModalMode('none');
        fetchRelations();
      } else {
        showToast(result.error || "儲存失敗");
      }
    } catch (err) {
      showToast("連線異常");
    }
  };

  const handleRelDelete = async (targetId: string) => {
    if (!window.confirm("確定要將此繪師從名單中移除嗎？")) return;
    try {
      const res = await fetch(`${API_BASE}/api/relations/${targetId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      const result = await res.json();
      if (result.success) {
        showToast("已從名單移除");
        setRelModalMode('none');
        fetchRelations();
      }
    } catch (err) {
      showToast("移除失敗");
    }
  };

  const displayCustomers = useMemo(() => {
    let list = customers;
    if (activeTab === 'blacklist') {
      list = list.filter(c => c.custom_label === '黑名單');
    }
    if (searchTerm.length >= 2) {
      const term = searchTerm.toLowerCase();
      list = list.filter(c => 
        c.alias_name?.toLowerCase().includes(term) ||
        c.public_id?.toLowerCase().includes(term) ||
        c.custom_label?.toLowerCase().includes(term) ||
        c.contact_methods?.toLowerCase().includes(term)
      );
    }
    return list;
  }, [customers, activeTab, searchTerm]);

  const fetchHistory = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/customers/${id}/history`, { credentials: 'include' });
      const result = await res.json();
      if (result.success) setHistory(result.data);
    } catch (err) {
      showToast("無法讀取歷史紀錄");
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 5);
    const fullID = `User_${val}`;
    setSelectedCust({ ...selectedCust, public_id: fullID });

    if (val.length >= 1) {
      const matches = customers.filter(c => 
        c.public_id && c.public_id.replace('User_', '').startsWith(val)
      );
      setSuggestions(matches);
    } else {
      setSuggestions([]);
    }
  };

  const handleSelectSuggestion = (cust: Customer) => {
    const methods = parseSocialMethods(cust.contact_methods);
    setSelectedCust({ ...cust, contact_methods: methods.length > 0 ? methods : [""] });
    setModalMode('edit');
    setSuggestions([]);
    showToast("已帶入現有紀錄");
  };

  const handleSave = async () => {
    if (!selectedCust.alias_name?.trim() && !selectedCust.platform_name) return showToast("請輸入名稱或稱呼");

    const isEdit = modalMode === 'edit';
    const endpoint = isEdit ? `${API_BASE}/api/customers/${selectedCust.id}` : `${API_BASE}/api/customers`;
    const method = isEdit ? 'PATCH' : 'POST';

    const cleanedMethods = Array.isArray(selectedCust.contact_methods) 
      ? selectedCust.contact_methods.filter((m: string) => m.trim() !== '')
      : [];

    try {
      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...selectedCust,
          contact_methods: cleanedMethods 
        }),
        credentials: 'include'
      });
      
      const result = await res.json();
      if (result.success) {
        showToast(isEdit ? "更新成功" : "新增成功");
        setModalMode('none');
        fetchCustomers();
      } else {
        showToast(result.error || "儲存失敗");
      }
    } catch (err) {
      showToast("連線異常");
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("確定要刪除這筆紀錄嗎？")) return;
    try {
      const res = await fetch(`${API_BASE}/api/customers/${selectedCust.id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      const result = await res.json();
      if (result.success) {
        showToast("紀錄已刪除");
        setModalMode('none');
        fetchCustomers();
      }
    } catch (err) {
      showToast("刪除失敗");
    }
  };

  const openEditModal = (cust: Customer) => {
    const methods = parseSocialMethods(cust.contact_methods);
    setSelectedCust({ ...cust, contact_methods: methods.length > 0 ? methods : [""] });
    setModalMode('edit');
  };

  const openViewModal = (cust: Customer) => {
    const methods = parseSocialMethods(cust.contact_methods);
    setSelectedCust({ ...cust, contact_methods: methods }); 
    setModalTab('overview');
    setModalMode('view');
  };

  const handleAddLabel = () => {
    const val = newLabelInput.trim();
    if (!val) return;
    if (val === '黑名單') return showToast("標籤已存在");
    if (!labelOptions.includes(val)) {
      setLabelOptions([...labelOptions, val]);
    }
    setSelectedCust({ ...selectedCust, custom_label: val });
    setNewLabelInput('');
    setIsLabelDropdownOpen(false);
  };

  const handleDeleteLabel = (e: React.MouseEvent, label: string) => {
    e.stopPropagation();
    if (label === '黑名單' || label === '一般') return;
    setLabelOptions(labelOptions.filter(l => l !== label));
    if (selectedCust.custom_label === label) {
      setSelectedCust({ ...selectedCust, custom_label: '一般' });
    }
  };

  return (
    <div className="crm-container">
      
      <style>{`
        @media (max-width: 768px) {
          .local-search-input { width: 100% !important; }
          .local-cust-td {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            padding: 12px 0 !important;
            border-bottom: 1px dashed #F0ECE7 !important;
            text-align: right !important;
          }
          .local-cust-td:last-child { border-bottom: none !important; padding-bottom: 0 !important; }
          .local-td-label { display: block !important; color: #8A7E72; font-size: 13px; font-weight: 600; }
          .local-name-cell {
            flex-direction: column; 
            align-items: flex-start !important; 
            background: #F9F7F5; 
            padding: 16px !important; 
            border-radius: 8px; 
            margin-bottom: 12px; 
            border: none !important;
          }
          .local-name-cell .local-td-label { display: none !important; }
          .local-td-content { text-align: right; max-width: 60%; }
          .local-name-cell .local-td-content { text-align: left; max-width: 100%; font-size: 16px; color: #5D4A3E; }
        }
        .local-td-label { display: none; }
      `}</style>

      {toast && <div className="crm-toast-container"><div className="crm-toast">✓ {toast}</div></div>}

      <header className="crm-header">
        <h2>名單管理</h2>
        <div className="customers-header-actions">
          <input
            type="text"
            className="crm-form-input local-search-input"
            style={{ width: '220px' }}
            placeholder={activeTab !== 'favorites' ? "搜尋 ID、暱稱、標籤、社群..." : "搜尋名稱、ID 或備註..."}
            value={activeTab !== 'favorites' ? searchTerm : relSearchTerm}
            onChange={(e) => activeTab !== 'favorites' ? setSearchTerm(e.target.value) : setRelSearchTerm(e.target.value)}
          />
          <button className="crm-submit-btn local-search-input" onClick={() => {
            if (activeTab === 'favorites') setActiveTab('all');
            setSelectedCust({ alias_name: '', public_id: 'User_', custom_label: '一般', contact_methods: [''], short_note: '', full_note: '', client_user_id: null });
            setModalMode('add');
            setSuggestions([]);
          }}>+ 新增紀錄</button>
        </div>
      </header>

      <div className="crm-tabs-container">
        <button className={`crm-tab-btn ${activeTab === 'all' ? 'crm-active' : ''}`} onClick={() => setActiveTab('all')}>總名單 ({customers.length})</button>
        <button className={`crm-tab-btn ${activeTab === 'blacklist' ? 'crm-active' : ''}`} onClick={() => setActiveTab('blacklist')}>黑名單 ({customers.filter(c => c.custom_label === '黑名單').length})</button>
        <button
          className={`crm-tab-btn ${activeTab === 'favorites' ? 'crm-active' : ''}`}
          onClick={handleSwitchToFavorites}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Heart size={15} fill={activeTab === 'favorites' ? '#ef4444' : 'none'} color={activeTab === 'favorites' ? '#ef4444' : 'currentColor'} />
          收藏的繪師 ({relations.filter(r => r.relation_type === 'favorite').length})
        </button>
      </div>

      {activeTab !== 'favorites' ? (
        <div className="crm-table-wrapper">
          <table className="crm-table">
            <thead>
              <tr>
                <th style={{ textAlign: 'center' }}>暱稱 / 自訂稱呼</th>
                <th style={{ textAlign: 'center' }}>識別 ID + 社群</th>
                <th style={{ textAlign: 'center' }}>標籤</th>
                <th style={{ textAlign: 'center' }}>合作次數</th>
                <th style={{ textAlign: 'center' }}>備註</th>
                <th className="crm-th-action" style={{ textAlign: 'center' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px' }}>讀取中...</td></tr>
              ) : displayCustomers.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '60px 20px', color: '#A0978D' }}>查無相關客戶紀錄</td></tr>
              ) : displayCustomers.map(c => {
                const socialArr = parseSocialMethods(c.contact_methods);
                return (
                  <tr key={c.id} onClick={() => openViewModal(c)} className="crm-clickable-row" style={{ cursor: 'pointer' }}>
                    <td className="local-cust-td local-name-cell" style={{ fontWeight: '600', textAlign: 'center' }}>
                      <span className="local-td-label">暱稱</span>
                      <div className="local-td-content">{c.alias_name || c.platform_name || '未命名'}</div>
                    </td>
                    <td className="local-cust-td" style={{ textAlign: 'center'}}>
                      <span className="local-td-label">識別 ID / 社群</span>
                      <div className="crm-id-social-wrapper local-td-content" style={{ alignItems: 'center' }}>
                        <div className="crm-id-box">
                          <span className="crm-id-tag" style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{c.public_id || '---'}</span>
                        </div>
                        {socialArr.map((method, idx) => (
                          <div key={idx} className="crm-social-item-text" style={{ fontSize: '11px', whiteSpace: 'normal', wordBreak: 'break-all' }}>
                            {method}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="local-cust-td" style={{ textAlign: 'center' }}>
                      <span className="local-td-label">標籤分類</span>
                      <div className="local-td-content">
                        <span className={`crm-tag crm-tag-${c.custom_label === 'VIP' ? 'vip' : c.custom_label === '黑名單' ? 'blacklisted' : 'normal'}`}>
                          {c.custom_label}
                        </span>
                      </div>
                    </td>
                    <td className="local-cust-td" style={{ textAlign: 'center' }}>
                      <span className="local-td-label">合作次數</span>
                      <div className="local-td-content">{c.order_count} 次</div>
                    </td>
                    <td className="local-cust-td crm-td-note" style={{ textAlign: 'center' }}>
                      <span className="local-td-label">備註</span>
                      <div className="local-td-content">{c.short_note || '---'}</div>
                    </td>
                    <td className="local-cust-td crm-td-action" style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                      <span className="local-td-label">操作</span>
                      <div className="local-td-content">
                        <button className="crm-tab-btn" style={{ margin: '0 auto' }} onClick={(e) => { e.stopPropagation(); openEditModal(c); }}>
                          編輯
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div>
          <div className="crm-table-wrapper">
            <table className="crm-table">
              <thead>
                <tr>
                  <th className="th-left-align">繪師資訊</th>
                  <th className="th-center-align">標籤狀態</th>
                  <th className="th-left-align">私人備註</th>
                  <th className="crm-th-action th-center-align">操作</th>
                </tr>
              </thead>
              <tbody>
                {relationsLoading ? (
                  <tr><td colSpan={4} className="td-empty-state">讀取中...</td></tr>
                ) : displayRelations.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="td-empty-state td-empty-text">
                      您目前尚未收藏任何繪師。在許願池或繪師個人頁點擊 ❤️ 即可收藏！
                    </td>
                  </tr>
                ) : displayRelations.map(rel => (
                  <tr key={rel.id} onClick={() => window.open(`/${rel.public_id}`, '_blank')} className="crm-clickable-row">
                    <td className="td-artist-info">
                      <div className="artist-info-wrapper">
                        <div className="artist-avatar-box">
                          {rel.avatar_url ? (
                            <img src={rel.avatar_url} alt="avatar" className="artist-avatar-img" />
                          ) : (
                            <User size={20} color="#94a3b8" />
                          )}
                        </div>
                        <div>
                          <div className="artist-name-text">{rel.display_name || '未命名繪師'}</div>
                          <div className="artist-id-text">{rel.public_id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="td-center-align td-mobile-tag">
                      <span className={`crm-tag crm-tag-${rel.relation_type === 'favorite' ? 'vip' : 'blacklisted'}`}>
                        {rel.relation_type === 'favorite' ? '❤️ 收藏' : '🚫 黑名單'}
                      </span>
                    </td>
                    <td className="crm-td-note td-note-text">
                      {rel.custom_note ? (
                        <span className="note-content">{rel.custom_note}</span>
                      ) : (
                        <span className="note-placeholder">尚未填寫備註</span>
                      )}
                    </td>
                    <td className="crm-td-action td-center-align" onClick={(e) => e.stopPropagation()}>
                      <button className="crm-tab-btn crm-action-btn" onClick={(e) => { e.stopPropagation(); openRelEditModal(rel); }}>
                        編輯備註
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modalMode !== 'none' && selectedCust && (
        <div className="crm-modal-overlay">
          <div className="crm-modal-card" style={{ maxWidth: modalMode === 'view' ? '650px' : '520px' }} onClick={e => e.stopPropagation()}>
            
            {modalMode === 'view' && (
              <div className="crm-tabs-container" style={{ borderBottom: '1px solid #F0ECE7', marginBottom: '20px', paddingBottom: '10px' }}>
                <button className={`crm-tab-btn ${modalTab === 'overview' ? 'crm-active' : ''}`} onClick={() => setModalTab('overview')}>資料閱覽</button>
                <button className={`crm-tab-btn ${modalTab === 'history' ? 'crm-active' : ''}`} onClick={() => { setModalTab('history'); fetchHistory(selectedCust.id); }}>過往紀錄</button>
              </div>
            )}

            <div className="crm-modal-body">
              {modalMode === 'view' ? (
                modalTab === 'overview' ? (
                  <div className="crm-view-mode">
                    <div className="crm-view-row"><strong>主要稱呼：</strong>{selectedCust.alias_name} {selectedCust.platform_name && <span style={{ fontSize: '13px', color: '#8A7E72' }}>(平台名: {selectedCust.platform_name})</span>}</div>
                    <div className="crm-view-row"><strong>識別 ID：</strong><span style={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#5D4A3E' }}>{selectedCust.public_id || '無識別 ID'}</span></div>
                    <div className="crm-view-row"><strong>標籤分類：</strong><span className={`crm-tag crm-tag-${selectedCust.custom_label === 'VIP' ? 'vip' : selectedCust.custom_label === '黑名單' ? 'blacklisted' : 'normal'}`}>{selectedCust.custom_label}</span></div>
                    <div className="crm-view-row"><strong>社群資訊：</strong>{Array.isArray(selectedCust.contact_methods) && selectedCust.contact_methods.length > 0 ? selectedCust.contact_methods.join(' / ') : '無紀錄'}</div>
                    <div className="crm-view-row"><strong>簡短備註：</strong>{selectedCust.short_note || '無'}</div>
                    <div className="crm-view-row"><strong>詳細筆記：</strong><p style={{ whiteSpace: 'pre-wrap', color: '#64748B', background: '#FDFBFA', padding: '12px', borderRadius: '8px', border: '1px solid #F0ECE7' }}>{selectedCust.full_note || '尚無內容'}</p></div>
                    <div style={{ display: 'flex', gap: '12px', marginTop: '30px', justifyContent: 'flex-end' }}>
                      <button className="crm-tab-btn" onClick={() => setModalMode('none')}>關閉</button>
                      <button className="crm-submit-btn" onClick={() => setModalMode('edit')}>編輯詳情</button>
                    </div>
                  </div>
                ) : (
                  <div className="crm-history-mode">
                    <div className="crm-history-list" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                      {history.length > 0 ? history.map(h => (
                        <div key={h.id} className="crm-history-item" onClick={() => navigate(`/artist/notebook?id=${h.id}`)}>
                          <div><strong>{h.project_name || '未命名'}</strong><br/><small>{h.order_date.substring(0, 10)}</small></div>
                          <div style={{ textAlign: 'right' }}>${h.total_price}<br/><small>{h.status}</small></div>
                        </div>
                      )) : <div style={{ textAlign: 'center', padding: '40px', color: '#A0978D' }}>尚未與此客戶有過委託</div>}
                    </div>
                    <button className="crm-tab-btn" style={{ width: '100%', marginTop: '20px' }} onClick={() => setModalMode('none')}>關閉</button>
                  </div>
                )
              ) : (
                <div className="crm-edit-mode">
                  <h3 style={{ marginBottom: '20px', color: '#5D4A3E' }}>{modalMode === 'add' ? '新增紀錄' : '編輯詳情'}</h3>
                  
                  <div className="crm-form-section" style={{ position: 'relative' }}>
                    <label className="crm-form-label">識別 ID (輸入 5 位數字)</label>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span className="crm-id-prefix">User_</span>
                      <input 
                        className="crm-form-input" 
                        style={{ borderRadius: '0 8px 8px 0', borderLeft: 'none' }}
                        placeholder="例如: 84448"
                        value={selectedCust.public_id?.replace('User_', '') || ''}
                        onChange={handleInputChange}
                      />
                    </div>
                    {suggestions.length > 0 && (
                      <div className="crm-suggestions">
                        {suggestions.map(s => (
                          <div key={s.id} className="crm-suggestion-item" onClick={() => handleSelectSuggestion(s)}>
                            <strong>{s.public_id}</strong> - {s.alias_name || s.platform_name || '現有客戶'}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="crm-form-section">
                    <label className="crm-form-label">{selectedCust.client_user_id ? '系統名稱 (鎖定)' : '稱呼 / 暱稱'}</label>
                    <input className="crm-form-input" value={selectedCust.alias_name} onChange={e => setSelectedCust({...selectedCust, alias_name: e.target.value})} readOnly={!!selectedCust.client_user_id} />
                  </div>

                  <div className="crm-form-section">
                    <label className="crm-form-label">標籤分類</label>
                    <div ref={labelDropdownRef} className="crm-dropdown-container">
                      <div className="crm-dropdown-button" onClick={() => setIsLabelDropdownOpen(!isLabelDropdownOpen)}>
                        <span>{selectedCust.custom_label}</span>
                        <span>▼</span>
                      </div>
                      {isLabelDropdownOpen && (
                        <div className="crm-dropdown-menu">
                          {['黑名單', ...labelOptions].map(opt => (
                            <div key={opt} className="crm-dropdown-item" onClick={() => { setSelectedCust({...selectedCust, custom_label: opt}); setIsLabelDropdownOpen(false); }}>
                              <span>{opt}</span>
                              {opt !== '黑名單' && opt !== '一般' && (
                                <button className="crm-dropdown-item-delete" onClick={(e) => handleDeleteLabel(e, opt)}>×</button>
                              )}
                            </div>
                          ))}
                          <div className="crm-dropdown-add-container">
                            <input 
                              className="crm-dropdown-add-input" 
                              placeholder="新增標籤..." 
                              value={newLabelInput} 
                              onChange={e => setNewLabelInput(e.target.value)} 
                              onKeyDown={e => e.key === 'Enter' && handleAddLabel()} 
                            />
                            <button className="crm-dropdown-add-button" onClick={handleAddLabel}>+</button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="crm-form-section">
                    <label className="crm-form-label">社群聯絡方式 (上限 3 個)</label>
                    {selectedCust.contact_methods.map((method: string, index: number) => (
                      <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                        <input 
                          className="crm-form-input" 
                          value={method} 
                          placeholder="例如: Twitter @ID"
                          onChange={(e) => {
                            const newMethods = [...selectedCust.contact_methods];
                            newMethods[index] = e.target.value;
                            setSelectedCust({...selectedCust, contact_methods: newMethods});
                          }} 
                        />
                        {index === selectedCust.contact_methods.length - 1 && selectedCust.contact_methods.length < 3 && (
                          <button className="crm-tab-btn" onClick={() => setSelectedCust({...selectedCust, contact_methods: [...selectedCust.contact_methods, '']})}>+</button>
                        )}
                        {selectedCust.contact_methods.length > 1 && (
                          <button className="crm-tab-btn" style={{ color: '#C04B4B' }} onClick={() => {
                            const newMethods = selectedCust.contact_methods.filter((_:any, i:number) => i !== index);
                            setSelectedCust({...selectedCust, contact_methods: newMethods});
                          }}>-</button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="crm-form-section">
                    <label className="crm-form-label">簡短備註</label>
                    <input className="crm-form-input" value={selectedCust.short_note} onChange={e => setSelectedCust({...selectedCust, short_note: e.target.value})} placeholder="顯示於列表" />
                  </div>

                  <div className="crm-form-section">
                    <label className="crm-form-label">詳細備註</label>
                    <textarea className="crm-form-input" style={{ height: '80px', resize: 'none' }} value={selectedCust.full_note} onChange={e => setSelectedCust({...selectedCust, full_note: e.target.value})} />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '30px' }}>
                    {modalMode === 'edit' && !selectedCust.client_user_id ? (
                      <button className="crm-delete-btn" onClick={handleDelete}>永久刪除此紀錄</button>
                    ) : <div />}
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button className="crm-tab-btn" onClick={() => setModalMode('none')}>取消</button>
                      <button className="crm-submit-btn" onClick={handleSave}>儲存資料</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div> 
      )}

      {relModalMode === 'edit' && selectedRel && (
        <div className="crm-modal-overlay">
          <div className="crm-modal-card" onClick={e => e.stopPropagation()}>
            <div className="crm-edit-mode">
              <div className="modal-header-wrapper">
                <h3 className="modal-title">編輯名單標記</h3>
                <button onClick={() => window.open(`/${selectedRel.public_id}`, '_blank')} className="modal-preview-btn">
                  查看公開頁 <ExternalLink size={14} />
                </button>
              </div>

              <div className="crm-form-section">
                <label className="crm-form-label">狀態切換</label>
                <div className="radio-group-wrapper">
                  <label className="radio-label">
                    <input type="radio" name="relType" checked={editType === 'favorite'} onChange={() => setEditType('favorite')} />
                    ❤️ 收藏
                  </label>
                  <label className="radio-label radio-label-danger">
                    <input type="radio" name="relType" checked={editType === 'blacklist'} onChange={() => setEditType('blacklist')} />
                    🚫 黑名單
                  </label>
                </div>
              </div>

              <div className="crm-form-section">
                <label className="crm-form-label">私人備註 (僅您自己可見)</label>
                <textarea
                  className="crm-form-input textarea-note"
                  placeholder="例如：跑單過..."
                  value={editNote}
                  onChange={e => setEditNote(e.target.value)}
                />
              </div>

              <div className="modal-footer-wrapper">
                <button className="crm-delete-btn" onClick={() => handleRelDelete(selectedRel.target_user_id)}>移除名單</button>
                <div className="modal-action-buttons">
                  <button className="crm-tab-btn" onClick={() => setRelModalMode('none')}>取消</button>
                  <button className="crm-submit-btn" onClick={handleRelSave}>儲存變更</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}