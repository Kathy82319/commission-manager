// src/pages/admin/GuideTab.tsx
import { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';

interface Step {
  id: number;
  image_url: string;
  caption: string;
  step_order: number;
}

interface Section {
  id: number;
  title: string;
  steps: Step[];
}

export function GuideTab() {
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [stepForm, setStepForm] = useState<Record<number, { image_url: string; caption: string }>>({});
  const [stepSubmitting, setStepSubmitting] = useState<Record<number, boolean>>({});

  const fetchSections = () => {
    apiClient.get('/api/guide')
      .then(res => setSections(Array.isArray(res) ? res : []))
      .catch(() => setSections([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchSections(); }, []);

  const createSection = async () => {
    if (!newTitle.trim() || submitting) return;
    setSubmitting(true);
    try {
      await apiClient.post('/api/admin/guide/sections', { title: newTitle.trim() });
      setNewTitle('');
      fetchSections();
    } catch {}
    setSubmitting(false);
  };

  const deleteSection = async (id: number) => {
    if (!confirm('確定要刪除這個分類（含所有步驟）？')) return;
    try {
      await apiClient.delete(`/api/admin/guide/sections/${id}`);
      fetchSections();
    } catch {}
  };

  const addStep = async (sectionId: number) => {
    const form = stepForm[sectionId];
    if (!form?.image_url?.trim() || stepSubmitting[sectionId]) return;
    setStepSubmitting(prev => ({ ...prev, [sectionId]: true }));
    try {
      await apiClient.post('/api/admin/guide/steps', {
        section_id: sectionId,
        image_url: form.image_url.trim(),
        caption: form.caption?.trim() || '',
      });
      setStepForm(prev => ({ ...prev, [sectionId]: { image_url: '', caption: '' } }));
      fetchSections();
    } catch {}
    setStepSubmitting(prev => ({ ...prev, [sectionId]: false }));
  };

  const deleteStep = async (stepId: number) => {
    try {
      await apiClient.delete(`/api/admin/guide/steps/${stepId}`);
      fetchSections();
    } catch {}
  };

  const card: React.CSSProperties = {
    background: 'white',
    borderRadius: '12px',
    border: '1px solid #E5E7EB',
    padding: '20px 24px',
    marginBottom: '16px',
  };

  if (loading) return <div style={{ color: '#6B7280', padding: '20px' }}>載入中...</div>;

  return (
    <div>
      <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#111827', marginBottom: '24px' }}>📖 教學管理</h2>

      {/* 新增分類 */}
      <div style={{ ...card, marginBottom: '28px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#374151', marginBottom: '12px' }}>新增教學分類</h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && createSection()}
            placeholder="分類標題，例如：如何投遞委託"
            style={{ flex: 1, padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: '8px', fontSize: '14px', outline: 'none' }}
          />
          <button
            onClick={createSection}
            disabled={submitting || !newTitle.trim()}
            style={{ padding: '8px 18px', background: '#374151', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer', opacity: submitting || !newTitle.trim() ? 0.5 : 1 }}
          >
            新增
          </button>
        </div>
      </div>

      {sections.length === 0 && (
        <div style={{ textAlign: 'center', color: '#9CA3AF', padding: '40px' }}>尚無教學內容，從上方新增第一個分類吧</div>
      )}

      {sections.map(section => (
        <div key={section.id} style={card}>
          {/* 分類標題列 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', margin: 0 }}>{section.title}</h3>
            <button
              onClick={() => deleteSection(section.id)}
              style={{ padding: '4px 12px', background: '#FEE2E2', color: '#DC2626', border: 'none', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}
            >
              刪除分類
            </button>
          </div>

          {section.steps.length === 0 && (
            <div style={{ fontSize: '13px', color: '#9CA3AF', padding: '8px 0 12px' }}>尚無步驟</div>
          )}

          {/* 步驟列表 */}
          {section.steps.map((step, i) => (
            <div key={step.id} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '12px 0', borderTop: '1px solid #F3F4F6' }}>
              <img
                src={step.image_url}
                alt=""
                style={{ width: '80px', height: '56px', objectFit: 'cover', borderRadius: '6px', flexShrink: 0, background: '#F3F4F6' }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '11px', color: '#9CA3AF', marginBottom: '3px' }}>步驟 {i + 1}</div>
                <div style={{ fontSize: '13px', color: '#374151', wordBreak: 'break-all' }}>{step.caption || '（無說明）'}</div>
              </div>
              <button
                onClick={() => deleteStep(step.id)}
                style={{ padding: '4px 10px', background: '#F9FAFB', color: '#6B7280', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', flexShrink: 0 }}
              >
                刪除
              </button>
            </div>
          ))}

          {/* 新增步驟表單 */}
          <div style={{ marginTop: '14px', padding: '14px', background: '#F9FAFB', borderRadius: '8px' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>+ 新增步驟</div>
            <input
              value={stepForm[section.id]?.image_url || ''}
              onChange={e => setStepForm(prev => ({ ...prev, [section.id]: { ...prev[section.id], image_url: e.target.value } }))}
              placeholder="圖片網址（https://...）"
              style={{ width: '100%', padding: '7px 10px', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '13px', marginBottom: '6px', boxSizing: 'border-box', outline: 'none' }}
            />
            <input
              value={stepForm[section.id]?.caption || ''}
              onChange={e => setStepForm(prev => ({ ...prev, [section.id]: { ...prev[section.id], caption: e.target.value } }))}
              placeholder="說明文字（選填）"
              style={{ width: '100%', padding: '7px 10px', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '13px', marginBottom: '8px', boxSizing: 'border-box', outline: 'none' }}
            />
            <button
              onClick={() => addStep(section.id)}
              disabled={!stepForm[section.id]?.image_url?.trim() || stepSubmitting[section.id]}
              style={{ padding: '7px 16px', background: '#374151', color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', opacity: !stepForm[section.id]?.image_url?.trim() ? 0.5 : 1 }}
            >
              新增步驟
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
