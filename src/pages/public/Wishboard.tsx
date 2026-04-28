// src/pages/public/Wishboard.tsx
import React, { useEffect, useState } from 'react';
import { apiClient } from '../../api/client';
import '../../styles/Wishboard.css';

export const Wishboard: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [bulletins, setBulletins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'request' | 'offer' | 'other'>('request');

  const [showPostModal, setShowPostModal] = useState(false);
  const [showInquireModal, setShowInquireModal] = useState(false);
  const [selectedBulletin, setSelectedBulletin] = useState<string | null>(null);

  const [inquireDraft, setInquireDraft] = useState({
    title: '',
    specialties: '',
    no_gos: '',
    payment_methods: '',
    price_list: '',
    question_template: ''
  });

  const initData = async () => {
    setLoading(true);
    try {
      const resBulletins = await apiClient.get('/api/bulletins');
      if (resBulletins.success) {
        setBulletins(resBulletins.data);
      }
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
        initData(); 
      }
    } catch (error: any) {
      alert('發布失敗: ' + (error.message || '未知錯誤'));
    }
  };

  const openInquireModal = (bulletinId: string) => {
    setSelectedBulletin(bulletinId);

    let settings: any = {};
    if (currentUser && currentUser.profile_settings) {
      try {
        settings = typeof currentUser.profile_settings === 'string'
          ? JSON.parse(currentUser.profile_settings)
          : currentUser.profile_settings;
      } catch(e) {}
    }

    const card = settings.bulletin_card || {};

    setInquireDraft({
      title: `${currentUser?.display_name || '繪師'} 的客製化服務`,
      specialties: card.specialties || '',
      no_gos: card.no_gos || '',
      payment_methods: card.payment_methods || '',
      price_list: card.price_list || '',
      question_template: settings.question_template || ''
    });

    setShowInquireModal(true);
  };

  const handleInquire = async () => {
    if (!selectedBulletin) return;
    
    try {
      const res = await apiClient.post(`/api/bulletins/${selectedBulletin}/inquire`, {
        artist_snapshot: JSON.stringify(inquireDraft) 
      });
      if (res.success) {
        alert('已成功發送您的意向與簡歷給案主！請至收件匣查看進度。');
        setShowInquireModal(false);
        initData();
      } else {
        alert(res.message || '投遞發生錯誤');
      }
    } catch (error: any) {
      alert('投遞發生錯誤: ' + (error.message || ''));
    }
  };

  // 🌟 新增：計算剩餘時間的輔助函數
  const getTimeRemaining = (expiresAt: string) => {
    if (!expiresAt) return '未知';
    const now = new Date();
    const exp = new Date(expiresAt);
    const diffMs = exp.getTime() - now.getTime();
    
    if (diffMs <= 0) return '已結束';
    
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) return `剩餘 ${diffDays}天`;
    if (diffHours > 0) return `剩餘 ${diffHours}小時`;
    return '即將結束';
  };

  const filteredBulletins = bulletins.filter(b => b.category === activeTab || (!b.category && activeTab === 'request'));

  return (
    <div className="wishboard-container">
      <div className="wishboard-header">
        <h1>✨ 許願池看板</h1>
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
          {filteredBulletins.map((b) => {
            const isMyOwnPost = currentUser && b.client_id === currentUser.id;
            const hasApplied = currentUser && b.applied_artist_ids && b.applied_artist_ids.includes(currentUser.id);

            return (
              <div key={b.id} className="bulletin-card relative">
                {/* 🌟 頂部的標籤與倒數計時 */}
                <div className="flex justify-between items-start mb-3">
                  <span className="text-xs font-bold px-2 py-1 bg-gray-100 rounded text-gray-600">
                    {b.category === 'offer' ? '#接委託' : b.category === 'other' ? '#其他' : '#徵委託'}
                  </span>
                  <span className="text-xs text-orange-600 font-medium bg-orange-50 px-2 py-1 rounded border border-orange-100">
                    ⏱️ {getTimeRemaining(b.expires_at)}
                  </span>
                </div>

                <p className="text-gray-800 whitespace-pre-wrap">{b.content}</p>
                <div className="mt-3 text-sm text-gray-600">
                  <p><strong>預算：</strong>{b.budget_range}</p>
                  <p><strong>規格：</strong>{b.specs}</p>
                </div>
                
                {activeTab === 'request' && (
                  <>
                    {isMyOwnPost ? (
                      <button disabled className="w-full mt-4 bg-gray-100 text-gray-500 font-bold py-2 rounded border border-gray-200 cursor-not-allowed">
                        這是您發布的許願單
                      </button>
                    ) : hasApplied ? (
                      <button disabled className="w-full mt-4 bg-gray-200 text-gray-500 font-bold py-2 rounded border border-gray-300 cursor-not-allowed">
                        已投遞
                      </button>
                    ) : (
                      <button 
                        onClick={() => openInquireModal(b.id)}
                        className="w-full mt-4 bg-green-50 text-green-700 font-bold py-2 rounded border border-green-200 hover:bg-green-100 transition-colors"
                      >
                        我有興趣 (發送投遞意向)
                      </button>
                    )}
                  </>
                )}
              </div>
            );
          })}
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

      {/* 投遞意向 Modal */}
      {showInquireModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px', maxHeight: '85vh', overflowY: 'auto' }}>
            <h2>投遞意向預覽與微調</h2>
            <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '20px' }}>
              以下內容將會發送給該案主。您可以針對本次委託進行暫時性的文字微調（不會影響您的全域設定）。
            </p>

            <div className="form-group">
              <label>標題 / 稱呼</label>
              <input 
                type="text" 
                value={inquireDraft.title}
                onChange={(e) => setInquireDraft({...inquireDraft, title: e.target.value})}
                className="w-full border p-2 rounded"
              />
            </div>

            <div className="form-group" style={{ marginTop: '15px' }}>
              <label>擅長題材</label>
              <input 
                type="text" 
                value={inquireDraft.specialties}
                onChange={(e) => setInquireDraft({...inquireDraft, specialties: e.target.value})}
                className="w-full border p-2 rounded"
              />
            </div>

            <div className="form-group" style={{ marginTop: '15px' }}>
              <label>不擅長 / 雷點</label>
              <input 
                type="text" 
                value={inquireDraft.no_gos}
                onChange={(e) => setInquireDraft({...inquireDraft, no_gos: e.target.value})}
                className="w-full border p-2 rounded"
              />
            </div>

            <div className="form-group" style={{ marginTop: '15px' }}>
              <label>接受的付款方式</label>
              <input 
                type="text" 
                value={inquireDraft.payment_methods}
                onChange={(e) => setInquireDraft({...inquireDraft, payment_methods: e.target.value})}
                className="w-full border p-2 rounded"
              />
            </div>

            <div className="form-group" style={{ marginTop: '15px' }}>
              <label>簡易價目表預覽</label>
              <textarea 
                value={inquireDraft.price_list}
                onChange={(e) => setInquireDraft({...inquireDraft, price_list: e.target.value})}
                className="w-full border p-2 rounded"
                rows={3}
              />
            </div>

            <div className="form-group" style={{ marginTop: '15px' }}>
              <label style={{ color: '#9333ea' }}>要求案主回填的提問模板</label>
              <textarea 
                value={inquireDraft.question_template}
                onChange={(e) => setInquireDraft({...inquireDraft, question_template: e.target.value})}
                className="w-full border p-2 rounded"
                rows={4}
              />
            </div>

            <div className="modal-actions" style={{ marginTop: '25px' }}>
              <button onClick={() => setShowInquireModal(false)} className="btn-secondary">取消</button>
              <button onClick={handleInquire} className="btn-primary" style={{ backgroundColor: '#16a34a' }}>確認並送出投遞</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};