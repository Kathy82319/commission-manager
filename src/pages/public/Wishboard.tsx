// src/pages/public/Wishboard.tsx
import React, { useEffect, useState } from 'react';
import '../../styles/Wishboard.css'; // 引入樣式！

export const Wishboard: React.FC = () => {
  const currentUserRole: string = 'client'; 

  const [bulletins, setBulletins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'request' | 'offer' | 'other'>('request');

  const [showPostModal, setShowPostModal] = useState(false);


  const fetchBulletins = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/bulletins');
      const data = await res.json();
      if (data.success) {
        setBulletins(data.data);
      }
    } catch (error) {
      console.error("無法載入許願池", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBulletins();
  }, []);

  const handlePostWish = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const payload = {
      content: formData.get('content') as string,
      budget_range: formData.get('budget') as string,
      specs: formData.get('specs') as string,
      category: activeTab 
    };

    try {
      // 因為需要登入才能發布，請確認你的測試環境已經登入，或者 API 有正確帶上 Cookie/Token
      const res = await fetch('/api/bulletins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      
      if (data.success) {
        alert('發布成功！');
        setShowPostModal(false);
        fetchBulletins();
      } else {
        alert('發布失敗: ' + data.error);
      }
    } catch (error) {
      alert('發布發生錯誤');
      console.error(error);
    }
  };

  const filteredBulletins = bulletins.filter(b => b.category === activeTab || (!b.category && activeTab === 'request'));

  return (
    <div className="wishboard-container">
      <div className="wishboard-header">
        <h1>✨ 許願池看板</h1>
        {currentUserRole === 'client' && (
          <button className="btn-primary" onClick={() => setShowPostModal(true)}>
            + 發布需求
          </button>
        )}
      </div>

      <div className="wishboard-tabs">
        <button className={`tab-btn ${activeTab === 'request' ? 'active' : ''}`} onClick={() => setActiveTab('request')}>#徵委託</button>
        <button className={`tab-btn ${activeTab === 'offer' ? 'active' : ''}`} onClick={() => setActiveTab('offer')}>#接委託</button>
        <button className={`tab-btn ${activeTab === 'other' ? 'active' : ''}`} onClick={() => setActiveTab('other')}>#其他</button>
      </div>

      {loading ? (
        <p>載入中...</p>
      ) : (
        <div className="bulletin-grid">
          {filteredBulletins.map((b) => (
            <div key={b.id} className="bulletin-card">
              <p><strong>類別:</strong> {b.category === 'offer' ? '#接委託' : b.category === 'other' ? '#其他' : '#徵委託'}</p>
              <p>{b.content}</p>
              <p><small>預算：{b.budget_range}</small></p>
              <p><small>規格：{b.specs}</small></p>
            </div>
          ))}
          {filteredBulletins.length === 0 && (
            <p>這個分類目前還沒有任何內容。</p>
          )}
        </div>
      )}

      {/* 獨立彈窗區塊 */}
      {showPostModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>發布 {activeTab === 'request' ? '徵委託' : activeTab === 'offer' ? '接委託' : '其他'}</h2>
            <form onSubmit={handlePostWish}>
              <div className="form-group">
                <label>內容描述</label>
                <textarea name="content" required rows={4} placeholder="請填寫詳細內容..."></textarea>
              </div>
              <div className="form-group">
                <label>預算區間</label>
                <input type="text" name="budget" required placeholder="例: NT$ 1500 - 2200" />
              </div>
              <div className="form-group">
                <label>規格需求</label>
                <input type="text" name="specs" required placeholder="例: 2000x2000 px, PNG" />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowPostModal(false)}>取消</button>
                <button type="submit" className="btn-primary">發布</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};