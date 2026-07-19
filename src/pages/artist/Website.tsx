// src/pages/artist/Website.tsx
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { QuotaInfo, FormDataState, CompleteSettings } from './Settings/types';
import { BasicInfoTab } from './Settings/BasicInfoTab';
import { PortfolioTab } from './Settings/PortfolioTab';
import { BlockContentEditor } from './Settings/BlockContentEditor';
import { SplashTab } from './Settings/SplashTab';
import { ThemeTab } from './Settings/ThemeTab';
import { ShowcaseTab } from './Settings/ShowcaseTab';
import { QueueSettingsTab } from './Settings/QueueSettingsTab';
import { SingleCustomSectionTab } from './Settings/SingleCustomSectionTab';
import { ReviewSettingsTab } from './Settings/ReviewSettingsTab';
import { OCDisplaySettingsTab } from './Settings/OCDisplaySettingsTab';
import '../../styles/Settings.css';
import { useLocation, useNavigate } from 'react-router-dom';
import { Pencil, GripVertical, Eye, EyeOff } from 'lucide-react';
import { confirmLeaveIfDirty, setUnsavedChanges, stableStringify } from '../../utils/unsavedChanges';

// 內容管理清單裡的分頁 id 跟公開個人頁排序/顯示用的 id 並非全部一致（例如排單表顯示設定 -> queue、角色設定卡展示 -> oc）
const CONTENT_TAB_TO_PUBLIC_ID: Record<string, string> = { queue_settings: 'queue', oc_display: 'oc' };
const toPublicId = (id: string) => CONTENT_TAB_TO_PUBLIC_ID[id] || id;

const RENAMABLE_TABS: Record<string, { field: keyof CompleteSettings; label: string }> = {
  portfolio: { field: 'portfolio_label', label: '作品展示區' },
  detailed_intro: { field: 'detailed_intro_label', label: '詳細介紹' },
  queue_settings: { field: 'queue_label', label: '排單表顯示設定' },
  showcase: { field: 'showcase_label', label: '接委託區' },
  reviews: { field: 'reviews_label', label: '精選評價管理' },
};

function Toast({ message, type, onClose }: { message: string, type: 'ok' | 'err', onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`toast-message ${type === 'err' ? 'error' : 'success'}`}>
      <div className="toast-icon">{type === 'err' ? '[錯誤]' : '[成功]'}</div>
      <div className="toast-content">{message}</div>
    </div>
  );
}

interface MenuItem {
  id: string;
  label: string;
  isCustom?: boolean;
}

interface MenuCategory {
  title: string;
  items: MenuItem[];
}

export function Website() {
  const location = useLocation();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(location.search);
    return params.get('tab') || 'profile_basic';
  });

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [location.search]);

  const [formData, setFormData] = useState<FormDataState>({ display_name: '', avatar_url: '', bio: '' });

  const [quotaInfo, setQuotaInfo] = useState<QuotaInfo | null>(null);
  const [showcaseCount, setShowcaseCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hideGlobalSave, setHideGlobalSave] = useState(false);
  const [toast, setToast] = useState<{ msg: string, type: 'ok' | 'err' } | null>(null);

  const [isEditingTabLabel, setIsEditingTabLabel] = useState(false);
  useEffect(() => { setIsEditingTabLabel(false); }, [activeTab]);

  const [hasOC, setHasOC] = useState<boolean>(false);

  const [settings, setSettings] = useState<CompleteSettings>({
    portfolio: [],
    detailed_intro: '',
    rules: '',
    custom_sections: [],
    social_links: [],
    hidden_sections: [],
    splash_enabled: true,
    splash_image: '',
    splash_duration: 2,
    splash_text: '',
    layout_type: 'blog',
    background_color: '',
    gradient_direction: '',
    theme_mode: '',
    showcase_label: '',
    portfolio_label: '',
    detailed_intro_label: '',
    queue_label: '',
    reviews_label: '',
    bulletin_card: { specialties: '', no_gos: '', payment_methods: '', price_list: '' },
    question_template: '',
    queue_settings: { enabled: false, show_client_name: true, show_client_id: false, show_project_name: true, show_artist_note: false },
    tab_order: [],
    show_favorite_count: false,
    portfolio_layout: 'grid',
    portfolio_blurred: false,
    showcase_layout: 'card'
  });

  const [isSaving, setIsSaving] = useState(false);
  const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

  const showToast = useCallback((msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type });
  }, []);

  // 用「跟最後一次載入/儲存時的內容做比對」來判斷是否真的有未儲存變更，
  // 而不是「呼叫過 setSettings 就當作有變更」——後者太容易被無關的重新渲染誤判。
  const savedSnapshotRef = useRef('');

  useEffect(() => {
    if (isLoading) return;
    savedSnapshotRef.current = stableStringify({ settings, formData });
    setUnsavedChanges(false);
  }, [isLoading]);

  useEffect(() => {
    if (isLoading) return;
    setUnsavedChanges(stableStringify({ settings, formData }) !== savedSnapshotRef.current);
  }, [settings, formData, isLoading]);

  // 切換分頁不會清掉目前編輯到一半的內容（settings 狀態還在），
  // 但還是要提醒使用者尚未儲存，避免忘記按「儲存所有變更」
  const switchTab = (tabId: string) => {
    if (!confirmLeaveIfDirty()) return;
    setActiveTab(tabId);
  };

  const categories: MenuCategory[] = [
    { title: '個人資訊', items: [
        { id: 'profile_basic', label: '頭像與簡介' },
    ]},
    { title: '頁面外觀', items: [
        { id: 'theme', label: '背景與版型設定' },
        { id: 'splash', label: '開場動畫設定' }
    ]},
    { title: '內容管理', items: [
        { id: 'queue_settings', label: settings.queue_label || '排單表顯示設定' },
        { id: 'detailed_intro', label: settings.detailed_intro_label || '詳細介紹' },
        { id: 'portfolio', label: settings.portfolio_label || '作品展示區' },
        { id: 'showcase', label: settings.showcase_label || '接委託區' },
        { id: 'reviews', label: settings.reviews_label || '精選評價管理' },
        ...(hasOC ? [{ id: 'oc_display', label: '角色設定卡展示' }] : []),
    ]},
  ];

  const menuGroups = categories.map(group => {
    if (group.title.includes('內容管理')) {
      const sections = settings.custom_sections || [];
      const dynamicItems: MenuItem[] = sections.map((section) => ({
        id: section.id,
        label: section.title || `未命名分頁`,
        isCustom: true
      }));
      return { ...group, items: [...group.items, ...dynamicItems] };
    }
    return group;
  });

  const currentActiveLabel = useMemo(() => {
    for (const group of menuGroups) {
      const found = group.items.find(item => item.id === activeTab);
      if (found) return found.label;
    }
    return '設定';
  }, [activeTab, menuGroups]);

  const contentMenuGroup = menuGroups.find(group => group.title === '內容管理');
  const contentGroupItems: MenuItem[] = contentMenuGroup
    ? [...contentMenuGroup.items].sort((a, b) => {
        const order = settings.tab_order || [];
        const idxA = order.indexOf(toPublicId(a.id));
        const idxB = order.indexOf(toPublicId(b.id));
        return (idxA === -1 ? Infinity : idxA) - (idxB === -1 ? Infinity : idxB);
      })
    : [];

  const [draggedContentIdx, setDraggedContentIdx] = useState<number | null>(null);

  const handleContentDragStart = (idx: number) => setDraggedContentIdx(idx);

  const handleContentDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (draggedContentIdx === null || draggedContentIdx === idx) return;
    const reordered = [...contentGroupItems];
    const [moved] = reordered.splice(draggedContentIdx, 1);
    reordered.splice(idx, 0, moved);
    setDraggedContentIdx(idx);
    const newContentIds = reordered.map(it => toPublicId(it.id));
    setSettings(prev => {
      const leftover = (prev.tab_order || []).filter(
        id => !newContentIds.includes(id) && !contentGroupItems.some(it => toPublicId(it.id) === id)
      );
      return { ...prev, tab_order: [...newContentIds, ...leftover] };
    });
  };

  const fetchUserData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/users/me`, { credentials: 'include' });
      if (res.status === 401) {
        window.location.href = '/login';
        return;
      }
      const data = await res.json();
      if (data.success && data.data) {
        setFormData({
          display_name: data.data.display_name || '',
          avatar_url: data.data.avatar_url || '',
          bio: data.data.bio || '',
        });

        setQuotaInfo({
          plan_type: data.data.plan_type || 'free',
          used_quota: data.data.used_quota || 0,
          max_quota: 3,
        });

        if (data.data.profile_settings) {
          const parsed = typeof data.data.profile_settings === 'string'
            ? JSON.parse(data.data.profile_settings)
            : data.data.profile_settings;

          const safeCustomSections = (parsed.custom_sections || []).map((sec: any, idx: number) => ({
            ...sec,
            id: sec.id || `custom_legacy_${idx}`
          }));

          setSettings(prev => ({
            ...prev,
            ...parsed,
            custom_sections: safeCustomSections,
            bulletin_card: parsed.bulletin_card || { specialties: '', no_gos: '', payment_methods: '', price_list: '' },
            question_template: data.data.question_template || parsed.question_template || '',
            queue_settings: parsed.queue_settings || prev.queue_settings,
            tab_order: parsed.tab_order || [],
            portfolio_layout: parsed.portfolio_layout ?? 'grid',
            portfolio_blurred: parsed.portfolio_blurred === true,
            showcase_layout: parsed.showcase_layout ?? 'card',
          }));
        }

        try {
          const ocRes = await fetch(`${API_BASE}/api/oc`, { credentials: 'include' });
          if (ocRes.ok) {
            const ocData = await ocRes.json();
            if (ocData.success && ocData.data && ocData.data.length > 0) {
              setHasOC(true);
            }
          }
        } catch (e) {
          console.error("背景檢查 OC 列表失敗", e);
        }
      }
    } catch (error) {
      console.error("讀取設定失敗", error);
    } finally {
      setIsLoading(false);
    }
  }, [API_BASE]);

  useEffect(() => { fetchUserData(); }, [fetchUserData]);

  const handleSave = async (overrideSettings?: CompleteSettings, successMessage: string = '所有變更已成功儲存') => {
    const settingsToSave = overrideSettings || settings;
    setIsSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/users/me`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: formData.display_name,
          avatar_url: formData.avatar_url,
          bio: formData.bio,
          profile_settings: JSON.stringify(settingsToSave),
          question_template: settingsToSave.question_template,
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(successMessage, 'ok');
        savedSnapshotRef.current = stableStringify({ settings: settingsToSave, formData });
        setUnsavedChanges(false);
      } else {
        showToast(data.error || '儲存失敗', 'err');
      }
    } catch (error) {
      showToast('系統發生錯誤', 'err');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleVisibility = (sectionId: string) => {
    const isHidden = settings.hidden_sections.includes(sectionId);
    const next: CompleteSettings = {
      ...settings,
      hidden_sections: isHidden
        ? settings.hidden_sections.filter(id => id !== sectionId)
        : [...settings.hidden_sections, sectionId]
    };
    setSettings(next);
    handleSave(next, '✓ 已自動儲存顯示狀態');
  };

  const handleContentDragEnd = () => {
    setDraggedContentIdx(null);
    handleSave(undefined, '✓ 排序已自動儲存');
  };

  const moveContentItem = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= contentGroupItems.length) return;
    const reordered = [...contentGroupItems];
    [reordered[idx], reordered[target]] = [reordered[target], reordered[idx]];
    const newContentIds = reordered.map(it => toPublicId(it.id));
    const leftover = (settings.tab_order || []).filter(
      id => !newContentIds.includes(id) && !contentGroupItems.some(it => toPublicId(it.id) === id)
    );
    const next: CompleteSettings = { ...settings, tab_order: [...newContentIds, ...leftover] };
    setSettings(next);
    handleSave(next, '✓ 排序已自動儲存');
  };

  const quotaBannerText = useMemo(() => {
    if (activeTab === 'portfolio') {
      const limit = quotaInfo?.plan_type === 'pro' ? 30 : quotaInfo?.plan_type === 'trial' ? 20 : 15;
      return quotaInfo?.plan_type === 'free'
        ? `📢 目前您的方案僅公開前 15 張作品。 (目前已上傳: ${settings.portfolio.length} / 配額: ${limit})`
        : `📢 您的作品將在個人頁面完整公開展示。 (目前已上傳: ${settings.portfolio.length} / 配額: ${limit})`;
    }
    if (activeTab === 'showcase') {
      const limit = quotaInfo?.plan_type === 'pro' ? 30 : quotaInfo?.plan_type === 'trial' ? 20 : 3;
      const label = settings.showcase_label || '接委託';
      return quotaInfo?.plan_type === 'free'
        ? `📢 目前您的方案可建立最多 ${limit} 項${label}項目。 (目前數量: ${showcaseCount} / 配額: ${limit})`
        : `📢 您的項目將在個人分頁完整公開展示。 (目前數量: ${showcaseCount} / 配額: ${limit})`;
    }
    return null;
  }, [activeTab, quotaInfo, settings.portfolio.length, settings.showcase_label, showcaseCount]);

  const isFreePlan = quotaInfo?.plan_type === 'free';

  const freeAllowedTabs = [
    'profile_basic', 'portfolio', 'detailed_intro', 'queue_settings', 'showcase', 'oc_display'
  ];

  const isCurrentTabLocked = isFreePlan && (!freeAllowedTabs.includes(activeTab) || activeTab.startsWith('custom_'));

  if (isLoading) return <div className="loading-screen" style={{ padding: '40px', textAlign: 'center' }}>載入設定中...</div>;

  const shouldHideGlobalSave = hideGlobalSave || activeTab === 'reviews' || activeTab === 'oc_display';
  const isBlockEditorTab = activeTab === 'detailed_intro' || activeTab.startsWith('custom_');

  return (
    <div className={`settings-page ${isBlockEditorTab ? 'settings-page--wide' : ''}`}>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      <div className="settings-layout">

        <div className="settings-mobile-nav">
          <button
            className="mobile-nav-trigger"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <span>目前查看：{currentActiveLabel}</span>
            <span className="trigger-arrow" style={{ transform: isMobileMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }}>▼</span>
          </button>

          <div className={`mobile-nav-dropdown ${isMobileMenuOpen ? 'open' : ''}`}>
            {menuGroups.map(group => (
              <div key={group.title} className="sidebar-group">
                <div className="group-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {group.title}
                </div>

                {(group.title === '內容管理' ? contentGroupItems : group.items).map((item: MenuItem, idx: number) => {
                  const isLocked = isFreePlan && (!freeAllowedTabs.includes(item.id) || item.isCustom);
                  const isContentGroup = group.title === '內容管理';
                  const publicId = toPublicId(item.id);
                  const isHidden = settings.hidden_sections.includes(publicId);
                  return (
                    <div
                      key={item.id}
                      style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                      onDragOver={isContentGroup ? (e) => handleContentDragOver(e, idx) : undefined}
                    >
                      {isContentGroup && (
                        <span
                          draggable
                          onDragStart={() => handleContentDragStart(idx)}
                          onDragEnd={handleContentDragEnd}
                          title="拖曳調整此分頁在個人頁的顯示順序"
                          className="wt-drag-handle"
                          style={{ cursor: 'grab', display: 'flex', color: '#A0978D', flexShrink: 0 }}
                        >
                          <GripVertical size={16} />
                        </span>
                      )}
                      {isContentGroup && (
                        <span className="wt-order-buttons">
                          <button
                            type="button"
                            onClick={() => moveContentItem(idx, -1)}
                            disabled={idx === 0}
                            title="上移"
                            style={{ border: 'none', background: 'none', cursor: idx === 0 ? 'default' : 'pointer', color: idx === 0 ? '#DED9D3' : '#A0978D', fontSize: '9px', padding: '1px 4px' }}
                          >▲</button>
                          <button
                            type="button"
                            onClick={() => moveContentItem(idx, 1)}
                            disabled={idx === contentGroupItems.length - 1}
                            title="下移"
                            style={{ border: 'none', background: 'none', cursor: idx === contentGroupItems.length - 1 ? 'default' : 'pointer', color: idx === contentGroupItems.length - 1 ? '#DED9D3' : '#A0978D', fontSize: '9px', padding: '1px 4px' }}
                          >▼</button>
                        </span>
                      )}
                      <button
                        className={`tab-btn ${activeTab === item.id ? 'active' : ''} ${item.isCustom ? 'custom-tab' : ''}`}
                        onClick={() => { switchTab(item.id); setHideGlobalSave(false); setIsMobileMenuOpen(false); }}
                        title={item.label}
                        style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      >
                        {item.label}
                      </button>
                      {isLocked ? (
                        <span
                          title="此分頁限專業版用戶"
                          style={{ fontSize: '11px', color: '#A67B3E', fontWeight: 'bold', flexShrink: 0, whiteSpace: 'nowrap', background: '#FDF4E6', padding: '3px 8px', borderRadius: '999px', border: '1px solid #F0DDB8' }}
                        >
                          專業版
                        </span>
                      ) : (
                        isContentGroup && (
                          <button
                            type="button"
                            onClick={() => toggleVisibility(publicId)}
                            title={isHidden ? '目前隱藏，點擊顯示於個人頁' : '目前公開顯示，點擊隱藏'}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', color: isHidden ? '#C4BDB5' : '#5D4A3E', flexShrink: 0 }}
                          >
                            {isHidden ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        )
                      )}
                    </div>
                  );
                })}

                {group.title.includes('內容管理') && (
                  <button
                    className="add-custom-section-btn"
                    onClick={() => {
                      if (!confirmLeaveIfDirty()) return;
                      if (isFreePlan) { setActiveTab('custom_locked_placeholder'); setIsMobileMenuOpen(false); return; }
                      if (settings.custom_sections.length >= 5) return;
                      const newId = `custom_${Date.now()}`;
                      setSettings(prev => ({
                        ...prev,
                        custom_sections: [...prev.custom_sections, { id: newId, title: '未命名分頁', content: '' }]
                      }));
                      setActiveTab(newId);
                      setHideGlobalSave(false);
                      setIsMobileMenuOpen(false);
                    }}
                    style={{ opacity: settings.custom_sections.length >= 5 ? 0.5 : 1 }}
                  >
                    + 新增分頁
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <aside className="settings-sidebar">
          <div className="sidebar-title">個人頁編輯</div>
          {menuGroups.map(group => (
            <div key={group.title} className="sidebar-group">
              <div className="group-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {group.title}
              </div>

              {(group.title === '內容管理' ? contentGroupItems : group.items).map((item: MenuItem, idx: number) => {
                const isLocked = isFreePlan && (!freeAllowedTabs.includes(item.id) || item.isCustom);
                const isContentGroup = group.title === '內容管理';
                const publicId = toPublicId(item.id);
                const isHidden = settings.hidden_sections.includes(publicId);
                return (
                  <div
                    key={item.id}
                    style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                    onDragOver={isContentGroup ? (e) => handleContentDragOver(e, idx) : undefined}
                  >
                    {isContentGroup && (
                      <span
                        draggable
                        onDragStart={() => handleContentDragStart(idx)}
                        onDragEnd={handleContentDragEnd}
                        title="拖曳調整此分頁在個人頁的顯示順序"
                        className="wt-drag-handle"
                        style={{ cursor: 'grab', display: 'flex', color: '#A0978D', flexShrink: 0 }}
                      >
                        <GripVertical size={16} />
                      </span>
                    )}
                    {isContentGroup && (
                      <span className="wt-order-buttons">
                        <button
                          type="button"
                          onClick={() => moveContentItem(idx, -1)}
                          disabled={idx === 0}
                          title="上移"
                          style={{ border: 'none', background: 'none', cursor: idx === 0 ? 'default' : 'pointer', color: idx === 0 ? '#DED9D3' : '#A0978D', fontSize: '9px', padding: '1px 4px' }}
                        >▲</button>
                        <button
                          type="button"
                          onClick={() => moveContentItem(idx, 1)}
                          disabled={idx === contentGroupItems.length - 1}
                          title="下移"
                          style={{ border: 'none', background: 'none', cursor: idx === contentGroupItems.length - 1 ? 'default' : 'pointer', color: idx === contentGroupItems.length - 1 ? '#DED9D3' : '#A0978D', fontSize: '9px', padding: '1px 4px' }}
                        >▼</button>
                      </span>
                    )}
                    <button
                      className={`tab-btn ${activeTab === item.id ? 'active' : ''} ${item.isCustom ? 'custom-tab' : ''}`}
                      onClick={() => { switchTab(item.id); setHideGlobalSave(false); }}
                      title={item.label}
                      style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    >
                      {item.label}
                    </button>
                    {isLocked ? (
                      <span
                        title="此分頁限專業版用戶"
                        style={{ fontSize: '11px', color: '#A67B3E', fontWeight: 'bold', flexShrink: 0, whiteSpace: 'nowrap', background: '#FDF4E6', padding: '3px 8px', borderRadius: '999px', border: '1px solid #F0DDB8' }}
                      >
                        專業版
                      </span>
                    ) : (
                      isContentGroup && (
                        <button
                          type="button"
                          onClick={() => toggleVisibility(publicId)}
                          title={isHidden ? '目前隱藏，點擊顯示於個人頁' : '目前公開顯示，點擊隱藏'}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', color: isHidden ? '#C4BDB5' : '#5D4A3E', flexShrink: 0 }}
                        >
                          {isHidden ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      )
                    )}
                  </div>
                );
              })}

              {group.title.includes('內容管理') && (
                <button
                  className="add-custom-section-btn"
                  onClick={() => {
                    if (!confirmLeaveIfDirty()) return;
                    if (isFreePlan) { setActiveTab('custom_locked_placeholder'); return; }
                    if (settings.custom_sections.length >= 5) return;
                    const newId = `custom_${Date.now()}`;
                    setSettings(prev => ({
                      ...prev,
                      custom_sections: [...prev.custom_sections, { id: newId, title: '未命名分頁', content: '' }]
                    }));
                    setActiveTab(newId);
                    setHideGlobalSave(false);
                  }}
                  style={{ opacity: settings.custom_sections.length >= 5 ? 0.5 : 1 }}
                >
                  + 新增分頁
                </button>
              )}
            </div>
          ))}
        </aside>

        <div className="settings-content-area">
          <div className="settings-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              {RENAMABLE_TABS[activeTab] && (
                isEditingTabLabel ? (
                  <input
                    autoFocus
                    className="form-input"
                    value={(settings[RENAMABLE_TABS[activeTab].field] as string) || ''}
                    onChange={e => setSettings(prev => ({ ...prev, [RENAMABLE_TABS[activeTab].field]: e.target.value }))}
                    onBlur={() => { setIsEditingTabLabel(false); handleSave(); }}
                    onKeyDown={e => { if (e.key === 'Enter') { setIsEditingTabLabel(false); handleSave(); } }}
                    placeholder={RENAMABLE_TABS[activeTab].label}
                    style={{ fontSize: '16px', fontWeight: 'bold', padding: '4px 8px', width: '180px' }}
                  />
                ) : (
                  <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px', color: '#5D4A3E' }}>
                    {(settings[RENAMABLE_TABS[activeTab].field] as string) || RENAMABLE_TABS[activeTab].label}
                    <button
                      type="button"
                      onClick={() => setIsEditingTabLabel(true)}
                      title="重新命名"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center', color: '#A0978D' }}
                    >
                      <Pencil size={14} />
                    </button>
                  </h3>
                )
              )}
              {quotaBannerText && (
                <div style={{ fontSize: '13px', color: '#A67B3E', fontWeight: 'bold' }}>{quotaBannerText}</div>
              )}
            </div>
          </div>

          {isCurrentTabLocked && (
            <div className="lock-overlay">
              <div className="lock-card">
                <div className="lock-icon">[鎖定]</div>
                <h4>此功能僅限專業版</h4>
                <button onClick={() => navigate('/artist/subscription')}>查看方案</button>
              </div>
            </div>
          )}

          <div className="tab-body" style={{ filter: isCurrentTabLocked ? 'blur(8px)' : 'none', pointerEvents: isCurrentTabLocked ? 'none' : 'auto' }}>
            {activeTab === 'profile_basic' && <BasicInfoTab formData={formData} setFormData={setFormData} settings={settings as any} setSettings={setSettings as any} />}
            {activeTab === 'queue_settings' && <QueueSettingsTab settings={settings as any} setSettings={setSettings as any} />}
            {activeTab === 'theme' && <ThemeTab settings={settings as any} setSettings={setSettings as any} />}
            {activeTab === 'splash' && <SplashTab settings={settings as any} setSettings={setSettings as any} />}

            {activeTab === 'reviews' && <ReviewSettingsTab onToast={showToast} />}
            {activeTab === 'oc_display' && <OCDisplaySettingsTab onToast={showToast} />}

            {activeTab === 'detailed_intro' && (
              <BlockContentEditor
                key={activeTab}
                value={settings.detailed_intro}
                onChange={v => setSettings(prev => ({ ...prev, detailed_intro: v }))}
                previewTheme={{
                  background_color: settings.background_color,
                  gradient_enabled: settings.gradient_enabled,
                  gradient_direction: settings.gradient_direction,
                  secondary_color: settings.secondary_color,
                  theme_mode: settings.theme_mode as 'light' | 'dark',
                }}
              />
            )}

            {activeTab.startsWith('custom_') && (
              <SingleCustomSectionTab
                key={activeTab}
                sectionId={activeTab}
                settings={settings}
                setSettings={setSettings}
                onSaveNow={handleSave}
                onDelete={() => {
                  setSettings(prev => ({ ...prev, custom_sections: prev.custom_sections.filter(s => s.id !== activeTab) }));
                  setActiveTab('profile_basic');
                }}
              />
            )}

            {activeTab === 'showcase' && <ShowcaseTab onToggleGlobalSave={setHideGlobalSave} onToast={showToast} quotaInfo={quotaInfo} isReadOnly={false} portfolio={settings.portfolio} settings={settings as any} setSettings={setSettings as any} onAutoSaveLayout={(next) => handleSave(next as CompleteSettings, '✓ 版型已自動儲存')} onItemCountChange={setShowcaseCount} />}
            {activeTab === 'portfolio' && <PortfolioTab formData={formData} settings={settings as any} setSettings={setSettings as any} quotaInfo={quotaInfo} />}
          </div>

          {!shouldHideGlobalSave && (
            <div className="save-action-bar">
              <button onClick={() => handleSave()} disabled={isSaving || isCurrentTabLocked} className="main-save-btn">
                {isSaving ? '儲存中...' : '儲存所有變更'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
