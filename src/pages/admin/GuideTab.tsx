// src/pages/admin/GuideTab.tsx
import { useState, useEffect, useRef } from 'react';
import { apiClient } from '../../api/client';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
const R2_PUBLIC_BASE = 'https://pub-1d4bcc7f19324c0d95d7bfdfeb1a69e2.r2.dev';

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

interface StepFormState {
  image_url: string;
  caption: string;
  uploading: boolean;
}

async function uploadToR2(file: File): Promise<string> {
  const ticketRes = await fetch(`${API_BASE}/api/r2/upload-url`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contentType: file.type,
      bucketType: 'public',
      folder: 'guide',
      originalName: file.name,
    }),
  });
  const ticket = await ticketRes.json() as any;
  if (!ticket.success) throw new Error(ticket.error || '無法取得上傳通行證');

  const uploadRes = await fetch(ticket.uploadUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type },
  });
  if (!uploadRes.ok) throw new Error('上傳失敗');

  return `${R2_PUBLIC_BASE}/${ticket.fileName}`;
}

export function GuideTab() {
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [stepForm, setStepForm] = useState<Record<number, StepFormState>>({});
  const [stepSubmitting, setStepSubmitting] = useState<Record<number, boolean>>({});
  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

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

  const handleImageSelect = async (sectionId: number, file: File) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type)) {
      alert('僅支援 JPG、PNG、WebP、GIF 格式');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('圖片大小不能超過 5MB');
      return;
    }

    setStepForm(prev => ({ ...prev, [sectionId]: { ...prev[sectionId], uploading: true } }));
    try {
      const url = await uploadToR2(file);
      setStepForm(prev => ({ ...prev, [sectionId]: { ...prev[sectionId], image_url: url, uploading: false } }));
    } catch (err: any) {
      alert(err.message || '圖片上傳失敗');
      setStepForm(prev => ({ ...prev, [sectionId]: { ...prev[sectionId], uploading: false } }));
    }
  };

  const addStep = async (sectionId: number) => {
    const form = stepForm[sectionId];
    if (!form?.image_url || stepSubmitting[sectionId]) return;
    setStepSubmitting(prev => ({ ...prev, [sectionId]: true }));
    try {
      await apiClient.post('/api/admin/guide/steps', {
        section_id: sectionId,
        image_url: form.image_url,
        caption: form.caption?.trim() || '',
      });
      setStepForm(prev => ({ ...prev, [sectionId]: { image_url: '', caption: '', uploading: false } }));
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

          {section.steps.map((step, i) => (
            <div key={step.id} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '12px 0', borderTop: '1px solid #F3F4F6' }}>
              <img
                src={step.image_url}
                alt=""
                style={{ width: '80px', height: '56px', objectFit: 'cover', borderRadius: '6px', flexShrink: 0, background: '#F3F4F6' }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '11px', color: '#9CA3AF', marginBottom: '3px' }}>步驟 {i + 1}</div>
                <div style={{ fontSize: '13px', color: '#374151' }}>{step.caption || '（無說明）'}</div>
              </div>
              <button
                onClick={() => deleteStep(step.id)}
                style={{ padding: '4px 10px', background: '#F9FAFB', color: '#6B7280', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', flexShrink: 0 }}
              >
                刪除
              </button>
            </div>
          ))}

          {/* 新增步驟 */}
          <div style={{ marginTop: '14px', padding: '14px', background: '#F9FAFB', borderRadius: '8px' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '10px' }}>+ 新增步驟</div>

            {/* 圖片上傳區 */}
            <input
              type="file"
              accept="image/*"
              ref={el => { fileInputRefs.current[section.id] = el; }}
              style={{ display: 'none' }}
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) handleImageSelect(section.id, file);
                e.target.value = '';
              }}
            />

            {stepForm[section.id]?.image_url ? (
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px' }}>
                <img
                  src={stepForm[section.id].image_url}
                  alt="預覽"
                  style={{ width: '72px', height: '52px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #E5E7EB' }}
                />
                <button
                  onClick={() => fileInputRefs.current[section.id]?.click()}
                  style={{ padding: '5px 12px', background: 'white', color: '#6B7280', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}
                >
                  重新選擇
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRefs.current[section.id]?.click()}
                disabled={stepForm[section.id]?.uploading}
                style={{ width: '100%', padding: '28px', border: '2px dashed #D1D5DB', borderRadius: '8px', background: 'white', color: '#9CA3AF', fontSize: '13px', cursor: 'pointer', marginBottom: '8px' }}
              >
                {stepForm[section.id]?.uploading ? '上傳中...' : '點擊選擇圖片'}
              </button>
            )}

            <input
              value={stepForm[section.id]?.caption || ''}
              onChange={e => setStepForm(prev => ({ ...prev, [section.id]: { ...prev[section.id], caption: e.target.value } }))}
              placeholder="說明文字（選填）"
              style={{ width: '100%', padding: '7px 10px', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '13px', marginBottom: '8px', boxSizing: 'border-box', outline: 'none' }}
            />
            <button
              onClick={() => addStep(section.id)}
              disabled={!stepForm[section.id]?.image_url || stepSubmitting[section.id]}
              style={{ padding: '7px 16px', background: '#374151', color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', opacity: !stepForm[section.id]?.image_url ? 0.5 : 1 }}
            >
              新增步驟
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
