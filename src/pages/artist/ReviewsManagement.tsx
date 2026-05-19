// src/pages/artist/ReviewsManagement.tsx
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/Settings.css'; // 沿用設定頁的樣式保持一致性

interface Review {
  id: string;
  commission_id: string;
  project_name: string;
  client_name: string;
  rating: number;
  content: string;
  client_anonymous: number;
  artist_anonymous: number;
  is_public: number;
  created_at: string;
}

export function ReviewsManagement() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'pending' | 'published'>('pending');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string, type: 'ok' | 'err' } | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

  const showToast = useCallback((msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const fetchReviews = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/reviews/artist`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setReviews(data.data || []);
      } else {
        showToast(data.error || '無法讀取評價', 'err');
      }
    } catch (err) {
      showToast('網路連線發生錯誤', 'err');
    } finally {
      setIsLoading(false);
    }
  }, [API_BASE, showToast]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const handleUpdateVisibility = async (reviewId: string, isPublic: number, artistAnonymous: number) => {
    setProcessingId(reviewId);
    try {
      const res = await fetch(`${API_BASE}/api/reviews/${reviewId}/visibility`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_public: isPublic,
          artist_anonymous: artistAnonymous
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(isPublic ? '評價已發布至個人頁' : '評價已設為隱藏', 'ok');
        // 樂觀更新 (Optimistic Update) 本地狀態
        setReviews(prev => prev.map(r => 
          r.id === reviewId ? { ...r, is_public: isPublic, artist_anonymous: artistAnonymous } : r
        ));
      } else {
        showToast(data.error || '更新失敗', 'err');
      }
    } catch (err) {
      showToast('系統發生錯誤', 'err');
    } finally {
      setProcessingId(null);
    }
  };

  const renderStars = (rating: number) => {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
  };

  const pendingReviews = reviews.filter(r => r.is_public === 0);
  const publishedReviews = reviews.filter(r => r.is_public === 1);
  const displayReviews = activeTab === 'pending' ? pendingReviews : publishedReviews;

  // 計算總平均星等
  const avgRating = reviews.length > 0 
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : '0.0';

  if (isLoading) {
    return <div className="loading-screen" style={{ padding: '80px', textAlign: 'center' }}>載入評價資料中...</div>;
  }

  return (
    <div className="settings-page">
      {toast && (
        <div className={`toast-message ${toast.type === 'err' ? 'error' : 'success'}`}>
          <div className="toast-icon">{toast.type === 'err' ? '[錯誤]' : '[成功]'}</div>
          <div className="toast-content">{toast.msg}</div>
        </div>
      )}

      <div className="settings-layout">
        <div className="settings-content-area" style={{ margin: '0 auto', maxWidth: '800px', width: '100%' }}>
          
          {/* Header 區塊 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <button 
              onClick={() => navigate('/artist/settings')} 
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', fontWeight: 'bold', fontSize: '15px' }}
            >
              ← 返回個人頁編輯
            </button>
            <div style={{ background: '#FFF7ED', color: '#EA580C', padding: '6px 12px', borderRadius: '20px', fontWeight: 'bold', fontSize: '14px' }}>
              當前總平均星等：{avgRating} ★
            </div>
          </div>

          <div className="settings-header">
            <h2>⭐ 評價與信譽管理 (精選好評展示)</h2>
          </div>

          {/* 分頁切換 */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', borderBottom: '2px solid #E2E8F0', paddingBottom: '10px' }}>
            <button 
              className={`tab-btn ${activeTab === 'pending' ? 'active' : ''}`}
              onClick={() => setActiveTab('pending')}
              style={{ border: 'none', background: 'none', fontSize: '16px', padding: '8px 16px', cursor: 'pointer', borderBottom: activeTab === 'pending' ? '3px solid #5D4A3E' : 'none', fontWeight: activeTab === 'pending' ? 'bold' : 'normal' }}
            >
              待處理評價 ({pendingReviews.length})
            </button>
            <button 
              className={`tab-btn ${activeTab === 'published' ? 'active' : ''}`}
              onClick={() => setActiveTab('published')}
              style={{ border: 'none', background: 'none', fontSize: '16px', padding: '8px 16px', cursor: 'pointer', borderBottom: activeTab === 'published' ? '3px solid #5D4A3E' : 'none', fontWeight: activeTab === 'published' ? 'bold' : 'normal' }}
            >
              已發布好評 ({publishedReviews.length})
            </button>
          </div>

          {/* 評價列表 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {displayReviews.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#94A3B8', background: '#F8FAFC', borderRadius: '12px' }}>
                目前沒有{activeTab === 'pending' ? '待處理的評價' : '已發布的好評'}
              </div>
            ) : (
              displayReviews.map(review => {
                const isProcessing = processingId === review.id;
                
                return (
                  <div key={review.id} style={{ background: '#FFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                    
                    {/* 評價基本資訊 */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '14px', color: '#64748B' }}>
                      <div>
                        <span style={{ fontWeight: 'bold', color: '#334155' }}>委託人：{review.client_anonymous === 1 ? '匿名委託人' : review.client_name}</span>
                        {review.client_anonymous === 1 && <span style={{ marginLeft: '8px', fontSize: '12px', background: '#F1F5F9', padding: '2px 6px', borderRadius: '4px' }}>對方要求匿名</span>}
                      </div>
                      <div>
                        {new Date(review.created_at).toLocaleDateString()}
                      </div>
                    </div>

                    <div style={{ fontSize: '13px', color: '#94A3B8', marginBottom: '8px' }}>
                      訂單項目：{review.project_name || '未命名委託'}
                    </div>

                    <div style={{ color: '#F59E0B', fontSize: '18px', marginBottom: '12px' }}>
                      {renderStars(review.rating)}
                    </div>

                    <div style={{ fontSize: '15px', color: '#334155', lineHeight: '1.6', background: '#F8FAFC', padding: '16px', borderRadius: '8px', marginBottom: '20px', whiteSpace: 'pre-wrap' }}>
                      {review.content || '(無文字評價)'}
                    </div>

                    {/* 繪師操作區塊 */}
                    <div style={{ borderTop: '1px dashed #CBD5E1', paddingTop: '16px' }}>
                      <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '12px', color: '#475569' }}>繪師發布設定：</div>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: review.client_anonymous === 1 ? 'not-allowed' : 'pointer' }}>
                          <input 
                            type="checkbox" 
                            checked={review.artist_anonymous === 1 || review.client_anonymous === 1}
                            disabled={review.client_anonymous === 1 || isProcessing}
                            onChange={(e) => {
                              // 如果委託人沒匿名，繪師才能自己決定要不要幫對方匿名
                              if (review.client_anonymous === 0) {
                                handleUpdateVisibility(review.id, review.is_public, e.target.checked ? 1 : 0);
                              }
                            }}
                          />
                          強制以「匿名委託人」身份展示此評價
                          {review.client_anonymous === 1 && <span style={{ color: '#EF4444', fontSize: '12px' }}>(因委託人設定，此選項已強制勾選)</span>}
                        </label>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                        {activeTab === 'published' && (
                          <button 
                            disabled={isProcessing}
                            onClick={() => handleUpdateVisibility(review.id, 0, review.artist_anonymous)}
                            style={{ padding: '8px 16px', background: '#FFF', border: '1px solid #CBD5E1', color: '#64748B', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                          >
                            {isProcessing ? '處理中...' : '取消公開 (移至待處理)'}
                          </button>
                        )}
                        
                        {activeTab === 'pending' && (
                          <button 
                            disabled={isProcessing}
                            onClick={() => handleUpdateVisibility(review.id, 1, review.artist_anonymous)}
                            style={{ padding: '8px 16px', background: '#5D4A3E', border: 'none', color: '#FFF', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                          >
                            {isProcessing ? '發布中...' : '確認將此評價公開上架'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

        </div>
      </div>
    </div>
  );
}