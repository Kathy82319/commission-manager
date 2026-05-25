import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DOMPurify from 'dompurify';
import '../../../styles/Announcements.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

type AnnouncementType = 'update' | 'event' | 'other';

interface Announcement {
  id: number;
  type: AnnouncementType;
  title: string;
  content: string;
  published_at: string;
}

type FilterType = 'all' | AnnouncementType;

const TYPE_LABEL: Record<AnnouncementType, string> = {
  update: '🔧 版本更新',
  event: '🎉 活動消息',
  other: '📌 其他通知',
};

const TYPE_CLASS: Record<AnnouncementType, string> = {
  update: 'badge-update',
  event: 'badge-event',
  other: 'badge-other',
};

const FILTERS: { key: FilterType; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'update', label: '版本更新' },
  { key: 'event', label: '活動消息' },
  { key: 'other', label: '其他通知' },
];

function formatDate(iso: string) {
  return iso.slice(0, 10);
}

export function Announcements() {
  const navigate = useNavigate();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/announcements`)
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        const list = Array.isArray(data) ? data : [];
        setAnnouncements(list);
        if (list.length > 0) setExpanded(list[0].id);
      })
      .catch(() => setAnnouncements([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'all'
    ? announcements
    : announcements.filter(a => a.type === filter);

  return (
    <div className="ann-page">
      <div className="ann-inner">
        <button className="ann-back" onClick={() => navigate('/')}>← 回首頁</button>
        <h1 className="ann-title">📢 最新公告</h1>

        <div className="ann-filters">
          {FILTERS.map(f => (
            <button
              key={f.key}
              className={`ann-filter-btn${filter === f.key ? ' active' : ''}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading && <div className="ann-empty">載入中...</div>}

        {!loading && filtered.length === 0 && (
          <div className="ann-empty">目前沒有相關公告。</div>
        )}

        <div className="ann-list">
          {filtered.map(a => (
            <div key={a.id} className="ann-item">
              <div className="ann-item-header" onClick={() => setExpanded(expanded === a.id ? null : a.id)}>
                <div className="ann-item-meta">
                  <span className={`ann-badge ${TYPE_CLASS[a.type]}`}>{TYPE_LABEL[a.type]}</span>
                  <span className="ann-item-date">{formatDate(a.published_at)}</span>
                </div>
                <h3 className="ann-item-title">{a.title}</h3>
              </div>
              {expanded === a.id && (
                <div
                  className="ann-item-content"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(a.content) }}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
