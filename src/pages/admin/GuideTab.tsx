// src/pages/admin/GuideTab.tsx
import { useState, useEffect, useRef } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import DOMPurify from 'dompurify';
import { apiClient } from '../../api/client';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
const R2_PUBLIC_BASE = 'https://pub-1d4bcc7f19324c0d95d7bfdfeb1a69e2.r2.dev';

const QUILL_MODULES = {
  toolbar: [
    ['bold', 'italic', 'underline'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['clean'],
  ],
};
const QUILL_FORMATS = ['bold', 'italic', 'underline', 'list'];

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

interface EditStepState {
  id: number;
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

const isQuillEmpty = (value: string) => !value || value === '<p><br></p>';

export function GuideTab() {
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [openSections, setOpenSections] = useState<Set<number>>(new Set());

  const [newTitle, setNewTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [editingSectionId, setEditingSectionId] = useState<number | null>(null);
  const [editingSectionTitle, setEditingSectionTitle] = useState('');
  const [editSectionSaving, setEditSectionSaving] = useState(false);

  const [stepForm, setStepForm] = useState<Record<number, StepFormState>>({});
  const [stepSubmitting, setStepSubmitting] = useState<Record<number, boolean>>({});
  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const [editingStep, setEditingStep] = useState<EditStepState | null>(null);
  const [editStepSaving, setEditStepSaving] = useState(false);
  const editFileInputRef = useRef<HTMLInputElement | null>(null);

  const fetchSections = () => {
    apiClient.get('/api/guide')
      .then(res => setSections(Array.isArray(res) ? res : []))
      .catch(() => setSections([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchSections(); }, []);

  const toggleSection = (id: number) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

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

  const startEditSection = (section: Section) => {
    setEditingSectionId(section.id);
    setEditingSectionTitle(section.title);
  };

  const saveEditSection = async () => {
    if (!editingSectionTitle.trim() || editSectionSaving || editingSectionId === null) return;
    setEditSectionSaving(true);
    try {
      await apiClient.patch(`/api/admin/guide/sections/${editingSectionId}`, { title: editingSectionTitle.trim() });
      setEditingSectionId(null);
      fetchSections();
    } catch {}
    setEditSectionSaving(false);
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
    if (!allowed.includes(file.type)) { alert('僅支援 JPG、PNG、WebP、GIF 格式'); return; }
    if (file.size > 5 * 1024 * 1024) { alert('圖片大小不能超過 5MB'); return; }
    setStepForm(prev => ({ ...prev, [sectionId]: { ...prev[sectionId], uploading: true } }));
    try {
      const url = await uploadToR2(file);
      setStepForm(prev => ({ ...prev, [sectionId]: { ...prev[sectionId], image_url: url, uploading: false } }));
    } catch (err: any) {
      alert(err.message || '圖片上傳失敗');
      setStepForm(prev => ({ ...prev, [sectionId]: { ...prev[sectionId], uploading: false } }));
    }
  };

  const handleEditImageSelect = async (file: File) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type)) { alert('僅支援 JPG、PNG、WebP、GIF 格式'); return; }
    if (file.size > 5 * 1024 * 1024) { alert('圖片大小不能超過 5MB'); return; }
    setEditingStep(prev => prev ? { ...prev, uploading: true } : prev);
    try {
      const url = await uploadToR2(file);
      setEditingStep(prev => prev ? { ...prev, image_url: url, uploading: false } : prev);
    } catch (err: any) {
      alert(err.message || '圖片上傳失敗');
      setEditingStep(prev => prev ? { ...prev, uploading: false } : prev);
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
        caption: isQuillEmpty(form.caption) ? '' : form.caption,
      });
      setStepForm(prev => ({ ...prev, [sectionId]: { image_url: '', caption: '', uploading: false } }));
      fetchSections();
    } catch {}
    setStepSubmitting(prev => ({ ...prev, [sectionId]: false }));
  };

  const startEditStep = (step: Step) => {
    setEditingStep({ id: step.id, image_url: step.image_url, caption: step.caption, uploading: false });
  };

  const saveEditStep = async () => {
    if (!editingStep || editStepSaving) return;
    setEditStepSaving(true);
    try {
      await apiClient.patch(`/api/admin/guide/steps/${editingStep.id}`, {
        image_url: editingStep.image_url,
        caption: isQuillEmpty(editingStep.caption) ? '' : editingStep.caption,
      });
      setEditingStep(null);
      fetchSections();
    } catch {}
    setEditStepSaving(false);
  };

  const deleteStep = async (stepId: number) => {
    if (!confirm('確定刪除這個步驟？')) return;
    try {
      await apiClient.delete(`/api/admin/guide/steps/${stepId}`);
      fetchSections();
    } catch {}
  };

  const reorderStep = async (stepId: number, direction: 'up' | 'down') => {
    try {
      await apiClient.patch(`/api/admin/guide/steps/${stepId}/order`, { direction });
      fetchSections();
    } catch {}
  };

  const card: React.CSSProperties = {
    background: 'white',
    borderRadius: '12px',
    border: '1px solid #E5E7EB',
    marginBottom: '12px',
    overflow: 'hidden',
  };

  if (loading) return <div style={{ color: '#6B7280', padding: '20px' }}>載入中...</div>;

  return (
    <div>
      <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#111827', marginBottom: '24px' }}>📖 教學管理</h2>

      {/* 新增分類 */}
      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #E5E7EB', padding: '20px 24px', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: '10px' }}>新增教學分類</h3>
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
            style={{ padding: '8px 18px', background: '#374151', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer', opacity: submitting || !newTitle.trim() ? 0.5 : 1, whiteSpace: 'nowrap' }}
          >
            新增
          </button>
        </div>
      </div>

      {sections.length === 0 && (
        <div style={{ textAlign: 'center', color: '#9CA3AF', padding: '40px' }}>尚無教學內容，從上方新增第一個分類吧</div>
      )}

      {sections.map(section => {
        const isOpen = openSections.has(section.id);
        const isEditingTitle = editingSectionId === section.id;

        return (
          <div key={section.id} style={card}>
            {/* Section Header */}
            <div
              style={{ display: 'flex', alignItems: 'center', padding: '14px 20px', gap: '10px', borderBottom: isOpen ? '1px solid #F3F4F6' : 'none', cursor: isEditingTitle ? 'default' : 'pointer', userSelect: 'none' }}
              onClick={() => !isEditingTitle && toggleSection(section.id)}
            >
              <span style={{ fontSize: '13px', color: '#9CA3AF', flexShrink: 0, width: '12px' }}>{isOpen ? '▾' : '▸'}</span>

              {isEditingTitle ? (
                <input
                  value={editingSectionTitle}
                  onChange={e => setEditingSectionTitle(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveEditSection(); if (e.key === 'Escape') setEditingSectionId(null); }}
                  onClick={e => e.stopPropagation()}
                  autoFocus
                  style={{ flex: 1, fontSize: '15px', fontWeight: 600, border: '1px solid #60A5FA', borderRadius: '6px', padding: '3px 8px', outline: 'none' }}
                />
              ) : (
                <span style={{ flex: 1, fontSize: '15px', fontWeight: 600, color: '#111827' }}>{section.title}</span>
              )}

              <span style={{ fontSize: '11px', color: '#9CA3AF', background: '#F3F4F6', padding: '2px 8px', borderRadius: '10px', flexShrink: 0 }}>
                {section.steps.length} 步驟
              </span>

              <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                {isEditingTitle ? (
                  <>
                    <button onClick={saveEditSection} disabled={editSectionSaving} style={{ padding: '4px 10px', background: '#DCFCE7', color: '#16A34A', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>儲存</button>
                    <button onClick={() => setEditingSectionId(null)} style={{ padding: '4px 10px', background: '#F3F4F6', color: '#6B7280', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>取消</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => startEditSection(section)} style={{ padding: '4px 10px', background: '#F3F4F6', color: '#374151', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>編輯標題</button>
                    <button onClick={() => deleteSection(section.id)} style={{ padding: '4px 10px', background: '#FEE2E2', color: '#DC2626', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>刪除</button>
                  </>
                )}
              </div>
            </div>

            {/* Section Body */}
            {isOpen && (
              <div style={{ padding: '16px 20px' }}>
                {section.steps.length === 0 && (
                  <div style={{ fontSize: '13px', color: '#9CA3AF', paddingBottom: '12px' }}>尚無步驟，從下方新增</div>
                )}

                {section.steps.map((step, i) => (
                  <div key={step.id}>
                    {/* Step Row */}
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '10px 0', borderTop: i === 0 ? 'none' : '1px solid #F3F4F6' }}>
                      <img
                        src={step.image_url}
                        alt=""
                        style={{ width: '80px', height: '56px', objectFit: 'cover', borderRadius: '6px', flexShrink: 0, background: '#F3F4F6' }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '11px', color: '#9CA3AF', marginBottom: '3px' }}>步驟 {i + 1}</div>
                        <div
                          style={{ fontSize: '13px', color: '#374151', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
                          dangerouslySetInnerHTML={{ __html: step.caption ? DOMPurify.sanitize(step.caption) : '<span style="color:#9CA3AF">（無說明）</span>' }}
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flexShrink: 0 }}>
                        <button onClick={() => reorderStep(step.id, 'up')} disabled={i === 0} style={{ padding: '2px 8px', background: '#F3F4F6', color: '#6B7280', border: 'none', borderRadius: '4px', fontSize: '11px', cursor: i === 0 ? 'default' : 'pointer', opacity: i === 0 ? 0.3 : 1 }}>↑</button>
                        <button onClick={() => reorderStep(step.id, 'down')} disabled={i === section.steps.length - 1} style={{ padding: '2px 8px', background: '#F3F4F6', color: '#6B7280', border: 'none', borderRadius: '4px', fontSize: '11px', cursor: i === section.steps.length - 1 ? 'default' : 'pointer', opacity: i === section.steps.length - 1 ? 0.3 : 1 }}>↓</button>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                        <button
                          onClick={() => editingStep?.id === step.id ? setEditingStep(null) : startEditStep(step)}
                          style={{ padding: '4px 10px', background: editingStep?.id === step.id ? '#EFF6FF' : '#F3F4F6', color: editingStep?.id === step.id ? '#2563EB' : '#374151', border: editingStep?.id === step.id ? '1px solid #BFDBFE' : '1px solid transparent', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}
                        >
                          {editingStep?.id === step.id ? '收起' : '編輯'}
                        </button>
                        <button onClick={() => deleteStep(step.id)} style={{ padding: '4px 10px', background: '#FEE2E2', color: '#DC2626', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>刪除</button>
                      </div>
                    </div>

                    {/* Inline Edit Form */}
                    {editingStep?.id === step.id && (
                      <div style={{ margin: '4px 0 12px', padding: '16px', background: '#F0F9FF', borderRadius: '8px', border: '1px solid #BAE6FD' }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#0369A1', marginBottom: '12px' }}>編輯步驟</div>

                        <input
                          type="file"
                          accept="image/*"
                          ref={editFileInputRef}
                          style={{ display: 'none' }}
                          onChange={e => {
                            const file = e.target.files?.[0];
                            if (file) handleEditImageSelect(file);
                            e.target.value = '';
                          }}
                        />

                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '12px' }}>
                          <img src={editingStep.image_url} alt="預覽" style={{ width: '80px', height: '56px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #E5E7EB' }} />
                          <button
                            onClick={() => editFileInputRef.current?.click()}
                            disabled={editingStep.uploading}
                            style={{ padding: '6px 14px', background: 'white', color: '#374151', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}
                          >
                            {editingStep.uploading ? '上傳中...' : '換圖片'}
                          </button>
                        </div>

                        <div style={{ marginBottom: '12px' }}>
                          <div style={{ fontSize: '12px', color: '#0369A1', marginBottom: '6px' }}>說明文字</div>
                          <ReactQuill
                            theme="snow"
                            value={editingStep.caption}
                            onChange={val => setEditingStep(prev => prev ? { ...prev, caption: val } : prev)}
                            modules={QUILL_MODULES}
                            formats={QUILL_FORMATS}
                          />
                        </div>

                        <div style={{ display: 'flex', gap: '8px', marginTop: '40px' }}>
                          <button
                            onClick={saveEditStep}
                            disabled={editStepSaving}
                            style={{ padding: '7px 18px', background: '#1D4ED8', color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', opacity: editStepSaving ? 0.6 : 1 }}
                          >
                            {editStepSaving ? '儲存中...' : '儲存'}
                          </button>
                          <button
                            onClick={() => setEditingStep(null)}
                            style={{ padding: '7px 18px', background: 'white', color: '#6B7280', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}
                          >
                            取消
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* Add Step Form */}
                <div style={{ marginTop: '16px', padding: '16px', background: '#F9FAFB', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '12px' }}>+ 新增步驟</div>

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
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '12px' }}>
                      <img src={stepForm[section.id].image_url} alt="預覽" style={{ width: '80px', height: '56px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #E5E7EB' }} />
                      <button onClick={() => fileInputRefs.current[section.id]?.click()} style={{ padding: '6px 14px', background: 'white', color: '#374151', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>
                        重新選擇
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileInputRefs.current[section.id]?.click()}
                      disabled={stepForm[section.id]?.uploading}
                      style={{ width: '100%', padding: '24px', border: '2px dashed #D1D5DB', borderRadius: '8px', background: 'white', color: '#9CA3AF', fontSize: '13px', cursor: 'pointer', marginBottom: '12px', boxSizing: 'border-box' }}
                    >
                      {stepForm[section.id]?.uploading ? '上傳中...' : '點擊選擇圖片'}
                    </button>
                  )}

                  <div style={{ marginBottom: '8px' }}>
                    <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '6px' }}>說明文字（選填）</div>
                    <ReactQuill
                      theme="snow"
                      value={stepForm[section.id]?.caption || ''}
                      onChange={val => setStepForm(prev => ({ ...prev, [section.id]: { ...prev[section.id], caption: val } }))}
                      modules={QUILL_MODULES}
                      formats={QUILL_FORMATS}
                    />
                  </div>

                  <button
                    onClick={() => addStep(section.id)}
                    disabled={!stepForm[section.id]?.image_url || stepSubmitting[section.id]}
                    style={{ padding: '7px 16px', background: '#374151', color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', opacity: !stepForm[section.id]?.image_url ? 0.5 : 1, marginTop: '40px' }}
                  >
                    新增步驟
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
