// src/pages/public/Wishboard.tsx
import React, { useEffect, useState } from 'react';
import { apiClient } from '../../api/client';
import '../../styles/Wishboard.css';

export const Wishboard: React.FC = () => {
  // 移除寫死的 Role，改為動態取得當前使用者狀態
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [bulletins, setBulletins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'request' | 'offer' | 'other'>('request');

  const [showPostModal, setShowPostModal] = useState(false);
  const [showInquireModal, setShowInquireModal] = useState(false);
  const [selectedBulletin, setSelectedBulletin] = useState<string | null>(null);

  // 初始化：同時抓取許願池資料與當前登入者資料
  const initData = async () => {
    setLoading(true);
    try {
      // 1. 抓取看板資料
      const resBulletins = await apiClient.get('/api/bulletins');
      if (resBulletins.success) {
        setBulletins(resBulletins.data);
      }
      // 2. 抓取當前使用者 (如果未登入會報錯，但我們 catch 起來忽略即可)
      try {
        const resUser = await apiClient.get('/api/users/me');
        if (resUser.success) {
          setCurrentUser(resUser.data);
        }
      } catch (e) {
        console.log("訪客模式瀏覽");
      }
    } catch (error) {
      console.error("無法載入許願池", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initData();
  }, []);

  const handlePostWish = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!currentUser) {
      alert("請先登入才能發布許願！");
      return;
    }

    const formData = new FormData(e.currentTarget);
    const payload = {
      content: formData.get('content') as string,
      budget_range: formData.get('budget') as string,
      specs: formData.get('specs') as string,
      category: activeTab 
    };

    try {
      const res = await apiClient.post('/api/bulletins', payload);
      if (res.success) {
        alert('發布成功！');
        setShowPostModal(false);
        initData(); // 重新載入列表
      }
    } catch (error: any) {
      alert('發布失敗: ' + (error.message || '未知錯誤'));
    }
  };

  const handleInquire = async () => {
    if (!selectedBulletin) return;
    
    // 這裡我們暫時用假資料模擬投遞的快照，後續可以改為從 currentUser 的設定中抓取
    const mockArtistSnapshot = {
      title: currentUser?.display_name + " 的客製化服務",
      price: "詳談後報價",
      terms: "依據平台標準服務條款"
    };

    try {
      const res = await apiClient.post(`/api/bulletins/${selectedBulletin}/inquire`, {
        artist_snapshot: mockArtistSnapshot
      });
      if (res.success) {
        alert('已成功發送您的意向與簡歷給案主！請至收件匣查看進度。');
        setShowInquireModal(false);
      }
    } catch (error: any) {
      alert('投遞發生錯誤: ' + (error.message || ''));
    }
  };

  const filteredBulletins = bulletins.filter(b => b.category === activeTab || (!b.category && activeTab === 'request'));

  return (
    <div className="wishboard-container">
      <div className="wishboard-header">
        <h1>✨ 許願池看板</h1>
        {/* 只要有登入的使用者就可以發布需求 */}
        {currentUser && (
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
              
              {/* 關鍵邏輯：必須是繪師，且這篇貼文「不是」自己發的，才能看到投遞按鈕 */}
              {currentUser?.role === 'artist' && b.client_id !== currentUser.id && activeTab === 'request' && (
                <button 
                  onClick={() => {
                    setSelectedBulletin(b.id);
                    setShowInquireModal(true);
                  }}
                  className="w-full mt-4 bg-green-50 text-green-700 border border-green-200 py-2 rounded hover:bg-green-100 font-medium cursor-pointer"
                >
                  我有興趣 (發送系統簡歷)
                </button>
              )}
            </div>
          ))}
          {filteredBulletins.length === 0 && (
            <p>這個分類目前還沒有任何內容。</p>
          )}
        </div>
      )}

      {/* 發布 Modal */}
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

      {/* 投遞確認 Modal */}
      {showInquireModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>確認發送意向？</h2>
            <p className="mb-4">
              系統將自動抓取您的徵稿簡歷與預設協議發送給案主。案主審閱後若同意，將向您發送邀請細節。
            </p>
            <div className="modal-actions">
              <button onClick={() => setShowInquireModal(false)} className="btn-secondary">取消</button>
              <button onClick={handleInquire} className="btn-primary" style={{backgroundColor: '#16a34a'}}>確認投遞</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};