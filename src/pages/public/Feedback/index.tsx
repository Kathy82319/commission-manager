import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../../styles/Feedback.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

type FeedbackType = 'bug' | 'suggestion' | 'other';

const TYPE_OPTIONS: { value: FeedbackType; label: string; desc: string }[] = [
  { value: 'bug',        label: '🐛 回報問題',   desc: '操作異常、錯誤、無法使用' },
  { value: 'suggestion', label: '💡 功能建議',   desc: '希望新增或改善的功能' },
  { value: 'other',      label: '💬 其他意見',   desc: '任何想告訴我們的事' },
];

export function Feedback() {
  const navigate = useNavigate();
  const [type, setType] = useState<FeedbackType>('bug');
  const [message, setMessage] = useState('');
  const [contact, setContact] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    if (message.trim().length < 5) {
      setError('請至少輸入 5 個字說明問題或建議。');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/feedback`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, message: message.trim(), contact: contact.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as any;
        throw new Error(data.error || '提交失敗，請稍後再試。');
      }
      setDone(true);
    } catch (e: any) {
      setError(e.message || '提交失敗，請稍後再試。');
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="fb-page">
        <div className="fb-inner">
          <div className="fb-success">
            <div className="fb-success-icon">✅</div>
            <h2>感謝你的回饋！</h2>
            <p>我們已收到你的意見，會認真參考並持續改善 Arti。</p>
            <button className="fb-btn-primary" onClick={() => navigate('/')}>回首頁</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fb-page">
      <div className="fb-inner">
        <button className="fb-back" onClick={() => navigate(-1)}>← 返回</button>
        <h1 className="fb-title">意見回饋</h1>
        <p className="fb-subtitle">遇到問題或有建議？讓我們知道，你的回饋讓 Arti 更好。</p>

        
        <div className="fb-section-label">回饋類型</div>
        <div className="fb-type-group">
          {TYPE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              className={`fb-type-btn${type === opt.value ? ' active' : ''}`}
              onClick={() => setType(opt.value)}
            >
              <span className="fb-type-label">{opt.label}</span>
              <span className="fb-type-desc">{opt.desc}</span>
            </button>
          ))}
        </div>

        
        <div className="fb-section-label">
          詳細說明
          <span className="fb-char-count">{message.length} / 2000</span>
        </div>
        <textarea
          className="fb-textarea"
          placeholder={
            type === 'bug'
              ? '請描述你遇到的問題：在哪個頁面、做了什麼操作、出現什麼狀況…'
              : type === 'suggestion'
              ? '你希望新增或改善什麼功能？可以描述使用情境…'
              : '有什麼想告訴我們的都可以寫在這裡…'
          }
          value={message}
          onChange={e => setMessage(e.target.value.slice(0, 2000))}
          rows={6}
        />

        
        <div className="fb-section-label">
          聯絡方式
          <span className="fb-optional">選填</span>
        </div>
        <input
          className="fb-input"
          placeholder="Email 或 LINE ID，方便我們回覆你（可不填）"
          value={contact}
          onChange={e => setContact(e.target.value)}
          maxLength={200}
        />

        {error && <div className="fb-error">{error}</div>}

        <div className="fb-footer">
          <button
            className="fb-btn-primary"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? '送出中…' : '送出回饋'}
          </button>
        </div>
      </div>
    </div>
  );
}
