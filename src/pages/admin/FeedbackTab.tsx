// src/pages/admin/FeedbackTab.tsx
import { useEffect, useState } from 'react';
import { apiClient } from '../../api/client';

type FeedbackType = 'bug' | 'suggestion' | 'other';

interface FeedbackItem {
  id: number;
  type: FeedbackType;
  message: string;
  contact: string;
  is_read: number;
  created_at: string;
}

const TYPE_LABEL: Record<FeedbackType, string> = {
  bug: '🐛 回報問題',
  suggestion: '💡 功能建議',
  other: '💬 其他意見',
};

const TYPE_COLOR: Record<FeedbackType, string> = {
  bug: '#BE123C',
  suggestion: '#1D6FA4',
  other: '#5B4A8A',
};

const TYPE_BG: Record<FeedbackType, string> = {
  bug: '#FFF1F2',
  suggestion: '#E8F0EE',
  other: '#EEEAF6',
};

function formatDate(iso: string) {
  const utc = iso.includes('Z') ? iso : iso.replace(' ', 'T') + 'Z';
  return new Date(utc).toLocaleString('zh-TW', { hour12: false });
}

const s = {
  container: { padding: '0 0 40px 0' },
  headerRow: { display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' as const },
  header: { fontSize: '22px', fontWeight: 900, color: '#111827', flex: 1 },
  filterBtn: (active: boolean) => ({
    padding: '6px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: 500,
    background: active ? '#5D4A3E' : 'white', color: active ? 'white' : '#6B7280',
    border: `1px solid ${active ? '#5D4A3E' : '#D1D5DB'}`, cursor: 'pointer', transition: 'all 0.15s',
  }),
  card: { background: 'white', borderRadius: '12px', border: '1px solid #E5E7EB', overflow: 'hidden' },
  item: (unread: boolean) => ({
    padding: '20px 24px',
    borderBottom: '1px solid #F3F4F6',
    background: unread ? '#FAFAF9' : 'white',
    display: 'flex', gap: '16px', alignItems: 'flex-start',
  }),
  badge: (type: FeedbackType) => ({
    display: 'inline-block', padding: '2px 10px', borderRadius: '20px',
    fontSize: '11px', fontWeight: 700,
    background: TYPE_BG[type], color: TYPE_COLOR[type],
    whiteSpace: 'nowrap' as const, flexShrink: 0,
  }),
  message: { fontSize: '14px', color: '#111827', lineHeight: '1.7', whiteSpace: 'pre-wrap' as const, margin: '8px 0' },
  contact: { fontSize: '12px', color: '#6B7280', marginTop: '4px' },
  date: { fontSize: '12px', color: '#9CA3AF', marginTop: '4px' },
  unreadDot: { width: '8px', height: '8px', borderRadius: '50%', background: '#EF4444', flexShrink: 0, marginTop: '6px' },
  readBtn: { padding: '4px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, background: 'transparent', color: '#9CA3AF', border: '1px solid #E5E7EB', cursor: 'pointer', whiteSpace: 'nowrap' as const, flexShrink: 0 },
  empty: { textAlign: 'center' as const, color: '#9CA3AF', padding: '60px 0', fontSize: '14px' },
  unreadCount: { background: '#EF4444', color: 'white', fontSize: '12px', padding: '2px 8px', borderRadius: '99px', fontWeight: 700 },
};

export function FeedbackTab() {
  const [list, setList] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [onlyUnread, setOnlyUnread] = useState(false);

  const fetchList = async () => {
    try {
      const url = onlyUnread ? '/api/admin/feedback?unread=1' : '/api/admin/feedback';
      const data = await apiClient.get<FeedbackItem[]>(url);
      setList(Array.isArray(data) ? data : []);
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchList();
  }, [onlyUnread]);

  const handleMarkRead = async (id: number) => {
    try {
      await apiClient.patch(`/api/admin/feedback/${id}/read`, {});
      setList(prev => prev.map(f => f.id === id ? { ...f, is_read: 1 } : f));
    } catch {/* silent */}
  };

  const unreadCount = list.filter(f => !f.is_read).length;

  return (
    <div style={s.container}>
      <div style={s.headerRow}>
        <div style={s.header}>
          💬 意見回饋
          {unreadCount > 0 && <span style={{ ...s.unreadCount, marginLeft: '10px' }}>{unreadCount} 未讀</span>}
        </div>
        <button style={s.filterBtn(!onlyUnread)} onClick={() => setOnlyUnread(false)}>全部</button>
        <button style={s.filterBtn(onlyUnread)} onClick={() => setOnlyUnread(true)}>只看未讀</button>
      </div>

      <div style={s.card}>
        {loading && <div style={s.empty}>載入中…</div>}
        {!loading && list.length === 0 && (
          <div style={s.empty}>{onlyUnread ? '沒有未讀回饋' : '尚無任何回饋'}</div>
        )}
        {list.map((f, i) => (
          <div key={f.id} style={{ ...s.item(!f.is_read), borderBottom: i === list.length - 1 ? 'none' : '1px solid #F3F4F6' }}>
            {!f.is_read && <div style={s.unreadDot} />}
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={s.badge(f.type)}>{TYPE_LABEL[f.type]}</span>
              <div style={s.message}>{f.message}</div>
              {f.contact && (
                <div style={s.contact}>聯絡方式：{f.contact}</div>
              )}
              <div style={s.date}>{formatDate(f.created_at)}</div>
            </div>
            {!f.is_read && (
              <button style={s.readBtn} onClick={() => handleMarkRead(f.id)}>標為已讀</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
