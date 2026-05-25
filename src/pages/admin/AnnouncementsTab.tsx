// src/pages/admin/AnnouncementsTab.tsx
import { useEffect, useState } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import DOMPurify from 'dompurify';
import { apiClient } from '../../api/client';

type AnnouncementType = 'update' | 'event' | 'other';

interface Announcement {
  id: number;
  type: AnnouncementType;
  title: string;
  content: string;
  published_at: string;
  is_pinned: number;
}

const TYPE_LABEL: Record<AnnouncementType, string> = {
  update: '🔧 版本更新',
  event: '🎉 活動消息',
  other: '📌 其他通知',
};

const TYPE_COLOR: Record<AnnouncementType, string> = {
  update: '#2E6B55',
  event: '#B45309',
  other: '#5B4A8A',
};

const TYPE_BG: Record<AnnouncementType, string> = {
  update: '#E8F0EE',
  event: '#FEF3C7',
  other: '#EEEAF6',
};

const QUILL_MODULES = {
  toolbar: [
    ['bold', 'italic', 'underline'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['link'],
    ['clean'],
  ],
};
const QUILL_FORMATS = ['bold', 'italic', 'underline', 'list', 'link'];

const EMPTY_FORM = { type: 'update' as AnnouncementType, title: '', content: '' };
const isQuillEmpty = (v: string) => !v || v === '<p><br></p>';

function formatDate(iso: string) {
  const utc = iso.includes('Z') ? iso : iso.replace(' ', 'T') + 'Z';
  return new Date(utc).toLocaleString('zh-TW', { hour12: false });
}

export function AnnouncementsTab() {
  const [list, setList] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [preview, setPreview] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<{ type: AnnouncementType; title: string; content: string } | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchList = async () => {
    try {
      const data = await apiClient.get<Announcement[]>('/api/admin/announcements');
      setList(Array.isArray(data) ? data : []);
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchList(); }, []);

  const handleSubmit = async () => {
    if (!form.title.trim()) { showToast('標題不能為空', false); return; }
    if (isQuillEmpty(form.content)) { showToast('內文不能為空', false); return; }
    setSubmitting(true);
    try {
      await apiClient.post('/api/admin/announcements', form);
      showToast('公告已發布');
      setForm(EMPTY_FORM);
      setPreview(false);
      fetchList();
    } catch (e: any) {
      showToast(e.message || '發布失敗', false);
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (a: Announcement) => {
    setEditingId(a.id);
    setEditForm({ type: a.type, title: a.title, content: a.content });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(null);
  };

  const saveEdit = async () => {
    if (!editForm || editingId === null || editSaving) return;
    if (!editForm.title.trim()) { showToast('標題不能為空', false); return; }
    if (isQuillEmpty(editForm.content)) { showToast('內文不能為空', false); return; }
    setEditSaving(true);
    try {
      await apiClient.patch(`/api/admin/announcements/${editingId}`, editForm);
      showToast('已儲存');
      cancelEdit();
      fetchList();
    } catch (e: any) {
      showToast(e.message || '儲存失敗', false);
    } finally {
      setEditSaving(false);
    }
  };

  const togglePin = async (a: Announcement) => {
    try {
      await apiClient.patch(`/api/admin/announcements/${a.id}`, { is_pinned: a.is_pinned ? 0 : 1 });
      showToast(a.is_pinned ? '已取消置頂' : '已置頂');
      fetchList();
    } catch (e: any) {
      showToast(e.message || '操作失敗', false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('確定要刪除這則公告嗎？')) return;
    try {
      await apiClient.delete(`/api/admin/announcements/${id}`);
      showToast('已刪除');
      setList(prev => prev.filter(a => a.id !== id));
    } catch (e: any) {
      showToast(e.message || '刪除失敗', false);
    }
  };

  const card: React.CSSProperties = { background: 'white', borderRadius: '12px', padding: '24px', marginBottom: '24px', border: '1px solid #E5E7EB' };
  const label: React.CSSProperties = { display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' };
  const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '14px', color: '#111827', marginBottom: '14px', boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none' };
  const selectStyle: React.CSSProperties = { ...inputStyle, background: 'white', cursor: 'pointer' };

  return (
    <div style={{ paddingBottom: '40px' }}>
      {toast && (
        <div style={{ position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', background: toast.ok ? '#4E7A5A' : '#EF4444', color: 'white', padding: '10px 24px', borderRadius: '30px', fontWeight: 700, fontSize: '14px', zIndex: 9999 }}>
          {toast.msg}
        </div>
      )}

      <div style={{ fontSize: '22px', fontWeight: 900, color: '#111827', marginBottom: '24px' }}>📢 公告管理</div>

      {/* ── 發布新公告 ── */}
      <div style={card}>
        <div style={{ fontSize: '16px', fontWeight: 700, color: '#111827', marginBottom: '16px' }}>發布新公告</div>

        <label style={label}>公告類型</label>
        <select style={selectStyle} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as AnnouncementType }))}>
          <option value="update">🔧 版本更新</option>
          <option value="event">🎉 活動消息</option>
          <option value="other">📌 其他通知</option>
        </select>

        <label style={label}>標題</label>
        <input
          style={inputStyle}
          placeholder="公告標題"
          value={form.title}
          onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          maxLength={200}
        />

        <label style={label}>內文</label>
        <ReactQuill
          theme="snow"
          value={form.content}
          onChange={val => setForm(f => ({ ...f, content: val }))}
          modules={QUILL_MODULES}
          formats={QUILL_FORMATS}
          placeholder="公告內容…"
        />

        {/* 預覽 */}
        {!isQuillEmpty(form.content) && (
          <div style={{ marginTop: '12px' }}>
            <button
              onClick={() => setPreview(p => !p)}
              style={{ padding: '5px 14px', background: '#F3F4F6', color: '#374151', border: 'none', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}
            >
              {preview ? '關閉預覽' : '預覽效果'}
            </button>
            {preview && (
              <div style={{ marginTop: '12px', padding: '16px 20px', background: '#FBFBF9', borderRadius: '10px', border: '1px solid #E5E7EB' }}>
                <div style={{ fontSize: '11px', color: '#9CA3AF', marginBottom: '8px' }}>前台預覽</div>
                <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, background: TYPE_BG[form.type], color: TYPE_COLOR[form.type], marginBottom: '8px' }}>
                  {TYPE_LABEL[form.type]}
                </span>
                <div style={{ fontSize: '16px', fontWeight: 600, color: '#2A1F1A', marginBottom: '10px' }}>{form.title || '（無標題）'}</div>
                <div
                  style={{ fontSize: '14px', color: '#6B5C52', lineHeight: 1.8 }}
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(form.content) }}
                />
              </div>
            )}
          </div>
        )}

        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            style={{ padding: '10px 24px', borderRadius: '8px', background: '#5D4A3E', color: 'white', border: 'none', fontWeight: 700, fontSize: '14px', cursor: 'pointer', opacity: submitting ? 0.6 : 1 }}
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? '發布中…' : '發布公告'}
          </button>
        </div>
      </div>

      {/* ── 公告列表 ── */}
      <div style={card}>
        <div style={{ fontSize: '16px', fontWeight: 700, color: '#111827', marginBottom: '16px' }}>已發布的公告（{list.length} 則）</div>

        {loading && <div style={{ textAlign: 'center', color: '#9CA3AF', padding: '40px 0', fontSize: '14px' }}>載入中…</div>}
        {!loading && list.length === 0 && <div style={{ textAlign: 'center', color: '#9CA3AF', padding: '40px 0', fontSize: '14px' }}>尚無公告</div>}

        {list.map((a, i) => (
          <div key={a.id} style={{ borderTop: i === 0 ? 'none' : '1px solid #F3F4F6' }}>
            {/* 一般列 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '16px 0', gap: '16px' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                  {!!a.is_pinned && <span style={{ fontSize: '11px', fontWeight: 700, color: '#B45309', background: '#FEF3C7', padding: '2px 8px', borderRadius: '20px' }}>📌 置頂</span>}
                  <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, background: TYPE_BG[a.type], color: TYPE_COLOR[a.type] }}>{TYPE_LABEL[a.type]}</span>
                  <span style={{ fontSize: '12px', color: '#9CA3AF' }}>{formatDate(a.published_at)}</span>
                </div>
                <div style={{ fontSize: '15px', fontWeight: 600, color: '#111827', marginBottom: '4px' }}>{a.title}</div>
                <div
                  style={{ fontSize: '13px', color: '#6B7280', lineHeight: 1.6, display: '-webkit-box', overflow: 'hidden', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(a.content) }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0, alignItems: 'flex-end' }}>
                <button
                  onClick={() => togglePin(a)}
                  style={{ padding: '5px 12px', background: a.is_pinned ? '#FEF3C7' : '#F3F4F6', color: a.is_pinned ? '#B45309' : '#6B7280', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  {a.is_pinned ? '取消置頂' : '📌 置頂'}
                </button>
                <button
                  onClick={() => editingId === a.id ? cancelEdit() : startEdit(a)}
                  style={{ padding: '5px 12px', background: editingId === a.id ? '#EFF6FF' : '#F3F4F6', color: editingId === a.id ? '#2563EB' : '#374151', border: editingId === a.id ? '1px solid #BFDBFE' : '1px solid transparent', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}
                >
                  {editingId === a.id ? '收起' : '編輯'}
                </button>
                <button
                  onClick={() => handleDelete(a.id)}
                  style={{ padding: '5px 12px', background: 'transparent', color: '#EF4444', border: '1px solid #FCA5A5', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}
                >
                  刪除
                </button>
              </div>
            </div>

            {/* 內嵌編輯表單 */}
            {editingId === a.id && editForm && (
              <div style={{ margin: '0 0 16px', padding: '20px', background: '#F0F9FF', borderRadius: '10px', border: '1px solid #BAE6FD' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#0369A1', marginBottom: '14px' }}>編輯公告</div>

                <label style={{ ...label, color: '#0369A1' }}>公告類型</label>
                <select
                  style={{ ...selectStyle, marginBottom: '12px' }}
                  value={editForm.type}
                  onChange={e => setEditForm(f => f ? { ...f, type: e.target.value as AnnouncementType } : f)}
                >
                  <option value="update">🔧 版本更新</option>
                  <option value="event">🎉 活動消息</option>
                  <option value="other">📌 其他通知</option>
                </select>

                <label style={{ ...label, color: '#0369A1' }}>標題</label>
                <input
                  style={{ ...inputStyle, marginBottom: '12px', border: '1px solid #BAE6FD' }}
                  value={editForm.title}
                  onChange={e => setEditForm(f => f ? { ...f, title: e.target.value } : f)}
                  maxLength={200}
                />

                <label style={{ ...label, color: '#0369A1' }}>內文</label>
                <ReactQuill
                  theme="snow"
                  value={editForm.content}
                  onChange={val => setEditForm(f => f ? { ...f, content: val } : f)}
                  modules={QUILL_MODULES}
                  formats={QUILL_FORMATS}
                />

                <div style={{ display: 'flex', gap: '8px', marginTop: '44px' }}>
                  <button
                    onClick={saveEdit}
                    disabled={editSaving}
                    style={{ padding: '8px 20px', background: '#1D4ED8', color: 'white', border: 'none', borderRadius: '7px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', opacity: editSaving ? 0.6 : 1 }}
                  >
                    {editSaving ? '儲存中…' : '儲存'}
                  </button>
                  <button
                    onClick={cancelEdit}
                    style={{ padding: '8px 20px', background: 'white', color: '#6B7280', border: '1px solid #D1D5DB', borderRadius: '7px', fontSize: '13px', cursor: 'pointer' }}
                  >
                    取消
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
