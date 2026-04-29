// src/pages/public/Wishboard/FilterBar.tsx
import React from 'react';
import { Tag, Plus } from 'lucide-react';
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
      {/* Hero 區塊 */}
      <header className="wishboard-hero">
        <div className="hero-content">
          <h1>✨ 創作許願池</h1>
          <p>在這裡遇見你的命定畫師，或為案主實現願望</p>
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
        </div>
      </header>

      {/* 篩選標籤與發布按鈕 */}
      <div className="filter-section">
        <div className="filter-label"><Tag size={16} /> 熱門篩選：</div>
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
            <Plus size={20} /> 
            {activeTab === 'request' ? '發布需求' : activeTab === 'offer' ? '發布接案' : '發布其他'}
          </button>
        )}
      </div>
    </>
  );
};