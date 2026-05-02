// src/pages/public/Wishboard/FilterBar.tsx
import React from 'react';
import { Tag, Plus, Sparkles } from 'lucide-react';
import { REQ_TAGS } from './constants';

interface FilterBarProps {
  activeTab: 'request' | 'offer' | 'other';
  setActiveTab: (tab: 'request' | 'offer' | 'other') => void;
  selectedFilters: string[];
  toggleTag: (tag: string, field: 'filters') => void;
  currentUser: any;
  onPostTrigger: () => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  activeTab,
  setActiveTab,
  selectedFilters,
  toggleTag,
  currentUser,
  onPostTrigger
}) => {
  return (
    <>
      <header className="wishboard-hero">
        <h1 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', margin: '0 0 10px 0', color: '#1e293b' }}>
          <Sparkles color="#ff8c00" size={28} /> 創作許願池
        </h1>
        <p style={{ color: '#64748b', fontSize: '15px', margin: 0 }}>在這裡遇見你的命定畫師，或為案主實現願望</p>
        
        <div className="tab-group">
          <button className={activeTab === 'request' ? 'active' : ''} onClick={() => setActiveTab('request')}>
            # 徵委託
          </button>
          <button className={activeTab === 'offer' ? 'active' : ''} onClick={() => setActiveTab('offer')}>
            # 接委託
          </button>
          <button className={activeTab === 'other' ? 'active' : ''} onClick={() => setActiveTab('other')}>
            # 其他
          </button>
        </div>
      </header>

      <div className="form-section filter-section" style={{ flexDirection: 'row', alignItems: 'center', marginBottom: '20px', padding: '16px' }}>
        <div className="filter-label" style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0, fontWeight: 'bold', color: '#475569' }}>
          <Tag size={16} /> 熱門篩選：
        </div>
        
        <div className="tag-selector filter-tags-scroll" style={{ flex: 1, margin: 0 }}>
          {REQ_TAGS.map(tag => (
            <button 
              key={tag} 
              className={`selectable-tag ${((tag === '不限' && selectedFilters.length === 0) || selectedFilters.includes(tag)) ? 'selected' : ''}`} 
              onClick={() => toggleTag(tag, 'filters')}
            >
              {tag}
            </button>
          ))}
        </div>
        
        {/* 🌟 只有登入使用者才顯示按鈕，點擊時執行 handlePostTrigger 進行身分過濾 */}
        {currentUser && (
          <button 
            className="submit-post-btn" 
            style={{ padding: '10px 20px', fontSize: '14px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '6px' }} 
            onClick={onPostTrigger}
          >
            <Plus size={18} /> {activeTab === 'request' ? '發布需求' : activeTab === 'offer' ? '發布接案' : '發布其他'}
          </button>
        )}
      </div>
    </>
  );
};