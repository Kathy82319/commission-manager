import { useNavigate } from 'react-router-dom';
import '../../../styles/Guide.css';

export function Guide() {
  const navigate = useNavigate();

  return (
    <div className="guide-page">
      <div className="guide-inner">
        <button className="guide-back" onClick={() => navigate('/')}>← 回首頁</button>
        <h1 className="guide-title">📖 使用教學 &amp; Q&amp;A</h1>
        <p className="guide-subtitle">這個頁面正在建置中，即將上線。</p>
        <div className="guide-coming-soon">
          <div className="guide-coming-icon">🚧</div>
          <p>使用教學與常見問題說明即將整理上線，<br />敬請期待！</p>
          <button className="guide-back-btn" onClick={() => navigate('/')}>
            先回首頁逛逛
          </button>
        </div>
      </div>
    </div>
  );
}
