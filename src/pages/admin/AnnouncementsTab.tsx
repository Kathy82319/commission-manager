// src/pages/admin/AnnouncementsTab.tsx
import { useEffect, useState } from 'react';
import { apiClient } from '../../api/client';

type AnnouncementType = 'update' | 'event' | 'other';

interface Announcement {
  id: number;
  type: AnnouncementType;
  title: string;
  content: string;
  published_at: string;
}

const TYPE_LABEL: Record<AnnouncementType, string> = {
  update: '🔧 版本更新',
  event: '🎉 活動消息',
  other: '📌 其他通知',
};

const TYPE_COLOR: Record<AnnouncementType, string> = {
  update: '#1D6FA4',
  event: '#B45309',
  other: '#5B4A8A',
};

const TYPE_BG: Record<AnnouncementType, string> = {
  update: '#E8F0EE',
  event: '#FEF3C7',
  other: '#EEEAF6',
};

const EMPTY_FORM = { type: 'update' as AnnouncementType, title: '', content: '' };

function formatDate(iso: string) {
  const utc = iso.includes('Z') ? iso : iso.replace(' ', 'T') + 'Z';
  return new Date(utc).toLocaleString('zh-TW', { hour12: false });
}

const s = {
  container: { padding: '0 0 40px 0' },
  header: { fontSize: '22px', fontWeight: 900, color: '#111827', marginBottom: '24px' },
  card: { background: 'white', borderRadius: '12px', padding: '24px', marginBottom: '24px', border: '1px solid #E5E7EB' },
  cardTitle: { fontSize: '16px', fontWeight: 700, color: '#111827', marginBottom: '16px' },
  label: { display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' },
  select: { width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '14px', background: 'white', color: '#111827', marginBottom: '12px' },
  input: { width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '14px', color: '#111827', marginBottom: '12px', boxSizing: 'border-box' as const, fontFamily: 'inherit' },
  textarea: { width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '14px', color: '#111827', minHeight: '120px', resize: 'vertical' as const, boxSizing: 'border-box' as const, fontFamily: 'inherit', lineHeight: '1.6' },
  btnPrimary: { padding: '10px 24px', borderRadius: '8px', background: '#5D4A3E', color: 'white', border: 'none', fontWeight: 700, fontSize: '14px', cursor: 'pointer' },
  btnDanger: { padding: '6px 14px', borderRadius: '6px', background: 'transparent', color: '#EF4444', border: '1px solid #FCA5A5', fontWeight: 600, fontSize: '13px', cursor: 'pointer' },
  row: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '16px 0', borderBottom: '1px solid #F3F4F6', gap: '16px' },
  badge: (type: AnnouncementType) => ({ display: 'inline-block', padding: '2px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, background: TYPE_BG[type], color: TYPE_COLOR[type], marginBottom: '4px', whiteSpace: 'nowrap' as const }),
  itemTitle: { fontSize: '15px', fontWeight: 600, color: '#111827', marginBottom: '4px' },
  itemDate: { fontSize: '12px', color: '#9CA3AF' },
  itemContent: { fontSize: '13px', color: '#6B7280', marginTop: '6px', lineHeight: '1.6', whiteSpace: 'pre-wrap' as const },
  toast: (ok: boolean) => ({ position: 'fixed' as const, top: '20px', left: '50%', transform: 'translateX(-50%)', background: ok ? '#4E7A5A' : '#EF4444', color: 'white', padding: '10px 24px', borderRadius: '30px', fontWeight: 700, fontSize: '14px', zIndex: 9999 }),
  empty: { textAlign: 'center' as const, color: '#9CA3AF', padding: '40px 0', fontSize: '14px' },
};

export function AnnouncementsTab() {
  const [list, setList] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchList = async () => {
    try {
      const data = await apiClient.get<Announcement[]>('/api/announcements');
      setList(Array.isArray(data) ? data : []);
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchList(); }, []);

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      showToast('標題和內文不能為空', false);
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.post('/api/admin/announcements', form);
      showToast('公告已發布');
      setForm(EMPTY_FORM);
      fetchList();
    } catch (e: any) {
      showToast(e.message || '發布失敗', false);
    } finally {
      setSubmitting(false);
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

  return (
    <div style={s.container}>
      {toast && <div style={s.toast(toast.ok)}>{toast.msg}</div>}

      <div style={s.header}>📢 公告管理</div>

      {/* 發布表單 */}
      <div style={s.card}>
        <div style={s.cardTitle}>發布新公告</div>

        <label style={s.label}>公告類型</label>
        <select
          style={s.select}
          value={form.type}
          onChange={e => setForm(f => ({ ...f, type: e.target.value as AnnouncementType }))}
        >
          <option value="update">🔧 版本更新</option>
          <option value="event">🎉 活動消息</option>
          <option value="other">📌 其他通知</option>
        </select>

        <label style={s.label}>標題</label>
        <input
          style={s.input}
          placeholder="公告標題"
          value={form.title}
          onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          maxLength={200}
        />

        <label style={s.label}>內文</label>
        <textarea
          style={s.textarea}
          placeholder="公告內容…"
          value={form.content}
          onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
        />

        <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
          <button style={s.btnPrimary} onClick={handleSubmit} disabled={submitting}>
            {submitting ? '發布中…' : '發布公告'}
          </button>
        </div>
      </div>

      {/* 公告列表 */}
      <div style={s.card}>
        <div style={s.cardTitle}>已發布的公告（{list.length} 則）</div>

        {loading && <div style={s.empty}>載入中…</div>}
        {!loading && list.length === 0 && <div style={s.empty}>尚無公告</div>}

        {list.map((a, i) => (
          <div key={a.id} style={{ ...s.row, borderBottom: i === list.length - 1 ? 'none' : '1px solid #F3F4F6' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={s.badge(a.type)}>{TYPE_LABEL[a.type]}</span>
              <div style={s.itemTitle}>{a.title}</div>
              <div style={s.itemContent}>{a.content}</div>
              <div style={s.itemDate}>{formatDate(a.published_at)}</div>
            </div>
            <button style={s.btnDanger} onClick={() => handleDelete(a.id)}>刪除</button>
          </div>
        ))}
      </div>
    </div>
  );
}
