// src/pages/client/ArtistManager.tsx
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, ExternalLink, Heart, ShieldAlert } from 'lucide-react';
import '../../styles/Customers.css'; 

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

export function ArtistManager() {
  const navigate = useNavigate();
  const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
  
  const [activeTab, setActiveTab] = useState<'favorite' | 'blacklist'>('favorite');
  const [relations, setRelations] = useState<ArtistRelation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(""); 
  const [toast, setToast] = useState<string | null>(null);

  const [modalMode, setModalMode] = useState<'none' | 'edit'>('none');
  const [selectedRel, setSelectedRel] = useState<ArtistRelation | null>(null);
  const [editNote, setEditNote] = useState('');
  const [editType, setEditType] = useState<'favorite' | 'blacklist'>('favorite');

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const fetchRelations = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/relations`, { credentials: 'include' });
      const result = await res.json();
      if (result.success) setRelations(result.data);
    } catch (err) {
      showToast("載入名單失敗");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchRelations(); }, []);

  const displayRelations = useMemo(() => {
    let list = relations.filter(r => r.relation_type === activeTab);
    
    if (searchTerm.length > 0) {
      const term = searchTerm.toLowerCase();
      list = list.filter(r => 
        r.display_name?.toLowerCase().includes(term) ||
        r.public_id?.toLowerCase().includes(term) ||
        r.custom_note?.toLowerCase().includes(term)
      );
    }
    return list;
  }, [relations, activeTab, searchTerm]);

  const openEditModal = (rel: ArtistRelation) => {
    setSelectedRel(rel);
    setEditNote(rel.custom_note || '');
    setEditType(rel.relation_type);
    setModalMode('edit');
  };

  const handleSave = async () => {
    if (!selectedRel) return;
    try {
      const res = await fetch(`${API_BASE}/api/relations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetId: selectedRel.target_user_id,
          type: editType,
          note: editNote
        }),
        credentials: 'include'
      });
      
      const result = await res.json();
      if (result.success) {
        showToast("更新成功");
        setModalMode('none');
        fetchRelations();
      } else {
        showToast(result.error || "儲存失敗");
      }
    } catch (err) {
      showToast("連線異常");
    }
  };

  const handleDelete = async (targetId: string) => {
    if (!window.confirm("確定要將此繪師從名單中移除嗎？")) return;
    try {
      const res = await fetch(`${API_BASE}/api/relations/${targetId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      const result = await res.json();
      if (result.success) {
        showToast("已從名單移除");
        setModalMode('none');
        fetchRelations();
      }
    } catch (err) {
      showToast("移除失敗");
    }
  };

  return (
    <div className="crm-container">
      {toast && <div className="crm-toast-container"><div className="crm-toast">✓ {toast}</div></div>}

      <header className="crm-header">
        <h2>追蹤與黑名單</h2>
        <div className="customers-header-actions">
          {/* 🌟 修改點：將原本的 style={{ width: '240px' }} 改用 className，讓 CSS 控制 RWD */}
          <input 
            type="text" 
            className="crm-form-input crm-search-input" 
            placeholder="搜尋名稱、ID 或備註..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button className="crm-submit-btn crm-primary-btn" onClick={() => navigate('/')}>
            前往許願池探索
          </button>
        </div>
      </header>

      <div className="crm-tabs-container">
        <button 
          className={`crm-tab-btn ${activeTab === 'favorite' ? 'crm-active' : ''}`} 
          onClick={() => setActiveTab('favorite')}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Heart size={16} fill={activeTab === 'favorite' ? '#ef4444' : 'none'} color={activeTab === 'favorite' ? '#ef4444' : 'currentColor'} /> 
          收藏的繪師 ({relations.filter(r => r.relation_type === 'favorite').length})
        </button>
        <button 
          className={`crm-tab-btn ${activeTab === 'blacklist' ? 'crm-active' : ''}`} 
          onClick={() => setActiveTab('blacklist')}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <ShieldAlert size={16} /> 
          黑名單 ({relations.filter(r => r.relation_type === 'blacklist').length})
        </button>
      </div>

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
            {isLoading ? (
              <tr><td colSpan={4} className="td-empty-state">讀取中...</td></tr>
            ) : displayRelations.length === 0 ? (
              <tr>
                <td colSpan={4} className="td-empty-state td-empty-text">
                  {activeTab === 'favorite' 
                    ? '您目前尚未收藏任何繪師。在許願池或繪師個人頁點擊 ❤️ 即可收藏！' 
                    : '目前沒有黑名單紀錄。'}
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
                  <button className="crm-tab-btn crm-action-btn" onClick={(e) => { e.stopPropagation(); openEditModal(rel); }}>
                    編輯備註
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalMode === 'edit' && selectedRel && (
        <div className="crm-modal-overlay">
          <div className="crm-modal-card" onClick={e => e.stopPropagation()}>
            <div className="crm-edit-mode">
              <div className="modal-header-wrapper">
                <h3 className="modal-title">編輯名單標記</h3>
                <button 
                  onClick={() => window.open(`/${selectedRel.public_id}`, '_blank')}
                  className="modal-preview-btn"
                >
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
                <button className="crm-delete-btn" onClick={() => handleDelete(selectedRel.target_user_id)}>移除名單</button>
                <div className="modal-action-buttons">
                  <button className="crm-tab-btn" onClick={() => setModalMode('none')}>取消</button>
                  <button className="crm-submit-btn" onClick={handleSave}>儲存變更</button>
                </div>
              </div>
            </div>
          </div>
        </div> 
      )}
    </div>
  );
}