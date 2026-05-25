import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DOMPurify from 'dompurify';
import '../../../styles/Home.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

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

const TYPE_CLASS: Record<AnnouncementType, string> = {
  update: 'badge-update',
  event: 'badge-event',
  other: 'badge-other',
};

function formatDate(iso: string) {
  return iso.slice(0, 10);
}

export function Home() {
  const navigate = useNavigate();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    fetch(`${API_BASE}/api/announcements?limit=3`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setAnnouncements(Array.isArray(data) ? data : []))
      .catch(() => setAnnouncements([]));
  }, []);

  return (
    <div className="home-page">
      {/* Hero */}
      <section className="home-hero">
        <div className="home-hero-badge">✨ 繪師 × 委託人的媒合平台</div>
        <h1 className="home-hero-title">
          讓創作<span>更容易</span>開始
        </h1>
        <p className="home-hero-desc">
          Arti 小幫手，幫助繪師管理委託流程、讓委託人找到合適的創作者。<br />
          從接稿到交稿，全程在這裡。
        </p>
        <button className="home-hero-btn" onClick={() => navigate('/wishboard')}>
          前往許願池 →
        </button>
      </section>

      <hr className="home-divider" />

      {/* 最新公告 */}
      <section className="home-section">
        <div className="home-section-header">
          <h2 className="home-section-title">📢 最新公告</h2>
          <button className="home-section-link" onClick={() => navigate('/announcements')}>
            查看全部 →
          </button>
        </div>

        {announcements.length === 0 ? (
          <div className="home-empty">目前尚無公告，請稍後回來查看。</div>
        ) : (
          <div className="home-announcements-grid">
            {announcements.map(a => (
              <div key={a.id} className="home-card" onClick={() => navigate('/announcements')}>
                <span className={`home-badge ${TYPE_CLASS[a.type]}`}>
                  {TYPE_LABEL[a.type]}
                </span>
                <h3 className="home-card-title">{a.title}</h3>
                <p className="home-card-desc" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(a.content) }} />
                <div className="home-card-date">{formatDate(a.published_at)}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 意見回饋列 */}
      <div className="home-feedback-bar">
        遇到問題或有建議？
        <button className="home-feedback-link" onClick={() => navigate('/feedback')}>
          點這裡告訴我們
        </button>
        &nbsp;— 你的回饋會讓 Arti 更好 ✦
      </div>
    </div>
  );
}
