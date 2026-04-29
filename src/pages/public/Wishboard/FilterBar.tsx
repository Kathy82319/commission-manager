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
      {/* 🌟 優化後的 Hero 區塊 */}
      <header className="wishboard-hero">
        <h1 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', margin: '0 0 10px 0', color: '#1e293b' }}>
          <Sparkles color="#ff8c00" size={28} /> 創作許願池
        </h1>
        <p style={{ color: '#64748b', fontSize: '15px', margin: 0 }}>在這裡遇見你的命定畫師，或為案主實現願望</p>
        
        <div className="tab-group">
          <button 
            className={activeTab === 'request' ? 'active' : ''} 
            onClick={() => setActiveTab('request')}
          >
            # 徵委託
          </button>
          <button 
            className={activeTab === 'offer' ? 'active' : ''} 
            onClick={() => setActiveTab('offer')}
          >
            # 接委託
          </button>
          <button 
            className={activeTab === 'other' ? 'active' : ''} 
            onClick={() => setActiveTab('other')}
          >
            # 其他
          </button>
        </div>
      </header>

      {/* 🌟 優化後的篩選器與發布按鈕佈局 */}
      <div className="filter-section">
        <div className="filter-label">
          <Tag size={16} /> 熱門篩選：
        </div>
        <div className="filter-tags">
          {REQ_TAGS.map(tag => (
            <button 
              key={tag} 
              className={(tag === '不限' && selectedFilters.length === 0) || selectedFilters.includes(tag) ? 'active' : ''} 
              onClick={() => toggleTag(tag, 'filters')}
            >
              {tag}
            </button>
          ))}
        </div>
        {currentUser && (
          <button className="post-trigger-btn" onClick={onPostTrigger}>
            <Plus size={18} /> 
            {activeTab === 'request' ? '發布需求' : activeTab === 'offer' ? '發布接案' : '發布其他'}
          </button>
        )}
      </div>
    </>
  );
};