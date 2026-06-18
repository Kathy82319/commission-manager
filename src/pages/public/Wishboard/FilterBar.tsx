// src/pages/public/Wishboard/FilterBar.tsx
import React from 'react';
import { Tag, Plus, Sparkles, X, LayoutList, LayoutGrid } from 'lucide-react';
import { REQ_TAGS } from './constants';

interface FilterBarProps {
  activeTab: 'request' | 'offer' | 'other';
  setActiveTab: (tab: 'request' | 'offer' | 'other') => void;
  selectedFilters: string[];
  toggleTag: (tag: string, field: 'filters') => void;
  currentUser: any;
  onPostTrigger: () => void;
  myPostId?: string | null;
  onScrollToMyPost?: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  layoutMode: 'list' | 'masonry';
  setLayoutMode: (mode: 'list' | 'masonry') => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  activeTab,
  setActiveTab,
  selectedFilters,
  toggleTag,
  currentUser,
  onPostTrigger,
  myPostId,
  onScrollToMyPost,
  searchQuery,
  setSearchQuery,
  layoutMode,
  setLayoutMode,
}) => {
  return (
    <>
      <header className="wishboard-hero">
        <h1 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', margin: '0 0 10px 0', color: '#1e293b' }}>
          <Sparkles color="#ff8c00" size={28} /> 創作許願池
        </h1>
        <p style={{ color: '#64748b', fontSize: '15px', margin: 0 }}>在這裡遇見你的命定畫師，或為委託人實現願望</p>
        
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

        {/* 手機版搜尋框：在 label 後、標籤上方 */}
        {activeTab !== 'other' && (
          <div className="wb-search">
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="搜尋標題、標籤或發佈者..."
                className="wb-search-input"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#A0978D', padding: 0, display: 'flex' }}>
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        )}

        <div className="tag-selector filter-tags-scroll" style={{ flex: 1, margin: 0 }}>
          {REQ_TAGS.map(tag => {
            const isSelected = tag === '不限'
              ? selectedFilters.length === 0
              : selectedFilters.includes(tag);
            return (
              <button
                key={tag}
                className={`selectable-tag ${isSelected ? 'selected' : ''}`}
                onClick={() => toggleTag(tag, 'filters')}
              >
                {tag}
              </button>
            );
          })}
          {/* 桌機版搜尋框：跟在最後一個標籤後面，手機版隱藏 */}
          {activeTab !== 'other' && (
            <div className="wb-search-inline">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="搜尋..."
                className="wb-search-inline-input"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#A0978D', padding: 0, display: 'flex' }}>
                  <X size={14} />
                </button>
              )}
            </div>
          )}
        </div>

        <div className="wb-post-btns">
          <div className="layout-toggle-btns">
            <button
              className={`layout-toggle-btn${layoutMode === 'list' ? ' active' : ''}`}
              onClick={() => setLayoutMode('list')}
              title="列表模式"
            >
              <LayoutList size={17} />
            </button>
            <button
              className={`layout-toggle-btn${layoutMode === 'masonry' ? ' active' : ''}`}
              onClick={() => setLayoutMode('masonry')}
              title="瀑布流模式"
            >
              <LayoutGrid size={17} />
            </button>
          </div>

          {currentUser && (
            <>
              <button
                className="submit-post-btn"
                style={{ padding: '10px 20px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}
                onClick={onPostTrigger}
              >
                <Plus size={18} /> {activeTab === 'request' ? '發布需求' : activeTab === 'offer' ? '發布接案' : '發布其他'}
              </button>
              {myPostId && (
                <button
                  className="btn-cancel"
                  style={{ padding: '8px 20px', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  onClick={onScrollToMyPost}
                >
                  📍 跳到我的貼文
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
};