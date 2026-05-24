import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../../styles/Guide.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

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

interface LightboxState {
  steps: Step[];
  index: number;
  title: string;
}

export function Guide() {
  const navigate = useNavigate();
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState<LightboxState | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/guide`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setSections(Array.isArray(data) ? data : []))
      .catch(() => setSections([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!lightbox) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(null);
      if (e.key === 'ArrowLeft') setLightbox(prev => prev && prev.index > 0 ? { ...prev, index: prev.index - 1 } : prev);
      if (e.key === 'ArrowRight') setLightbox(prev => prev && prev.index < prev.steps.length - 1 ? { ...prev, index: prev.index + 1 } : prev);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightbox]);

  const openLightbox = (section: Section) => {
    if (section.steps.length === 0) return;
    setLightbox({ steps: section.steps, index: 0, title: section.title });
  };

  const currentStep = lightbox ? lightbox.steps[lightbox.index] : null;

  return (
    <div className="guide-page">
      <div className="guide-inner">
        <button className="guide-back" onClick={() => navigate('/')}>← 回首頁</button>
        <h1 className="guide-title">📖 使用教學 &amp; Q&amp;A</h1>

        {loading && <div className="guide-empty">載入中...</div>}

        {!loading && sections.length === 0 && (
          <div className="guide-coming-soon">
            <div className="guide-coming-icon">🚧</div>
            <p>使用教學與常見問題說明即將整理上線，<br />敬請期待！</p>
          </div>
        )}

        {!loading && sections.length > 0 && (
          <div className="guide-list">
            {sections.map(section => (
              <button
                key={section.id}
                className={`guide-item${section.steps.length === 0 ? ' guide-item--empty' : ''}`}
                onClick={() => openLightbox(section)}
                disabled={section.steps.length === 0}
              >
                <span className="guide-item-title">{section.title}</span>
                <span className="guide-item-meta">
                  {section.steps.length > 0 ? `${section.steps.length} 個步驟 →` : '即將上線'}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {lightbox && currentStep && (
        <div className="guide-lightbox-overlay" onClick={() => setLightbox(null)}>
          <div className="guide-lightbox" onClick={e => e.stopPropagation()}>
            <div className="guide-lb-header">
              <span className="guide-lb-title">{lightbox.title}</span>
              <button className="guide-lb-close" onClick={() => setLightbox(null)}>✕</button>
            </div>

            <div className="guide-lb-image-wrap">
              <img
                key={currentStep.id}
                src={currentStep.image_url}
                alt={currentStep.caption}
                className="guide-lb-image"
              />
            </div>

            <div className="guide-lb-footer">
              {currentStep.caption && (
                <div className="guide-lb-caption">{currentStep.caption}</div>
              )}
              <div className="guide-lb-nav">
                <button
                  className="guide-lb-arrow"
                  onClick={() => setLightbox(prev => prev ? { ...prev, index: prev.index - 1 } : prev)}
                  disabled={lightbox.index === 0}
                >
                  ← 上一步
                </button>
                <span className="guide-lb-counter">
                  {lightbox.index + 1} / {lightbox.steps.length}
                </span>
                <button
                  className="guide-lb-arrow"
                  onClick={() => setLightbox(prev => prev ? { ...prev, index: prev.index + 1 } : prev)}
                  disabled={lightbox.index === lightbox.steps.length - 1}
                >
                  下一步 →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
