// src/pages/artist/Settings/ReviewSettingsTab.tsx
import { useState, useEffect, useCallback } from 'react';

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

interface Props {
  onToast: (msg: string, type?: 'ok' | 'err') => void;
}

export function ReviewSettingsTab({ onToast }: Props) {
  const [activeTab, setActiveTab] = useState<'pending' | 'published'>('pending');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || '';

  const fetchReviews = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/reviews/artist`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setReviews(data.data || []);
      } else {
        onToast(data.error || '無法讀取評價', 'err');
      }
    } catch (err) {
      onToast('網路連線發生錯誤', 'err');
    } finally {
      setIsLoading(false);
    }
  }, [API_BASE, onToast]);

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
        onToast(isPublic ? '評價已設為精選公開' : '評價已取消公開', 'ok');
        setReviews(prev => prev.map(r => 
          r.id === reviewId ? { ...r, is_public: isPublic, artist_anonymous: artistAnonymous } : r
        ));
      } else {
        onToast(data.error || '更新失敗', 'err');
      }
    } catch (err) {
      onToast('系統發生錯誤', 'err');
    } finally {
      setProcessingId(null);
    }
  };



  const pendingReviews = reviews.filter(r => r.is_public === 0);
  const publishedReviews = reviews.filter(r => r.is_public === 1);
  const displayReviews = activeTab === 'pending' ? pendingReviews : publishedReviews;



  if (isLoading) {
    return <div style={{ padding: '80px', textAlign: 'center', color: '#A0978D' }}>載入評價資料中...</div>;
  }

  return (
    <div className="rich-text-tab">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ marginTop: 0, marginBottom: 0, color: '#5D4A3E', fontSize: '18px' }}>評價管理</h3>
      </div>
      
      <p style={{ color: '#7A7269', fontSize: '14px', marginBottom: '24px' }}>
        您可以在此審核客戶留下的結案評價。將評價設為「公開」後，它們將會展示在您的個人專頁評價區塊中。
      </p>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', borderBottom: '2px solid #EAE6E1', paddingBottom: '10px' }}>
        <button 
          className={`tab-btn ${activeTab === 'pending' ? 'active' : ''}`}
          onClick={() => setActiveTab('pending')}
          style={{ border: 'none', background: 'none', fontSize: '15px', padding: '8px 16px', cursor: 'pointer', borderBottom: activeTab === 'pending' ? '3px solid #5D4A3E' : 'none', fontWeight: activeTab === 'pending' ? 'bold' : 'normal' }}
        >
          待處理評價 ({pendingReviews.length})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'published' ? 'active' : ''}`}
          onClick={() => setActiveTab('published')}
          style={{ border: 'none', background: 'none', fontSize: '15px', padding: '8px 16px', cursor: 'pointer', borderBottom: activeTab === 'published' ? '3px solid #5D4A3E' : 'none', fontWeight: activeTab === 'published' ? 'bold' : 'normal' }}
        >
          已發布好評 ({publishedReviews.length})
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {displayReviews.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#94A3B8', background: '#FBFBF9', borderRadius: '12px', border: '1px dashed #DED9D3' }}>
            目前沒有{activeTab === 'pending' ? '待處理的評價' : '已發布的好評'}
          </div>
        ) : (
          displayReviews.map(review => {
            const isProcessing = processingId === review.id;
            
            return (
              <div key={review.id} style={{ background: '#FFFFFF', border: '1px solid #EAE6E1', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '13px', color: '#8A7E72' }}>
                  <div>
                    <span style={{ fontWeight: 'bold', color: '#5D4A3E', fontSize: '14px' }}>
                      委託人：{review.client_anonymous === 1 ? '匿名委託人' : review.client_name}
                    </span>
                    {review.client_anonymous === 1 && <span style={{ marginLeft: '8px', fontSize: '11px', background: '#F4F0EB', padding: '2px 6px', borderRadius: '4px' }}>對方要求匿名</span>}
                  </div>
                  <div>{new Date(review.created_at).toLocaleDateString()}</div>
                </div>

                <div style={{ fontSize: '13px', color: '#A0978D', marginBottom: '12px' }}>
                  訂單項目：{review.project_name || '未命名委託'}
                </div>

        

                <div style={{ fontSize: '14px', color: '#5D4A3E', lineHeight: '1.6', background: '#FBFBF9', padding: '16px', borderRadius: '8px', marginBottom: '20px', whiteSpace: 'pre-wrap', border: '1px solid #F0ECE7' }}>
                  {review.content || '(無文字評價)'}
                </div>

                <div style={{ borderTop: '1px dashed #DED9D3', paddingTop: '16px' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '13px', marginBottom: '12px', color: '#8A7E72' }}>繪師發布設定：</div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: review.client_anonymous === 1 ? 'not-allowed' : 'pointer', color: '#5D4A3E' }}>
                      <input 
                        type="checkbox" 
                        checked={review.artist_anonymous === 1 || review.client_anonymous === 1}
                        disabled={review.client_anonymous === 1 || isProcessing}
                        onChange={(e) => {
                          if (review.client_anonymous === 0) {
                            handleUpdateVisibility(review.id, review.is_public, e.target.checked ? 1 : 0);
                          }
                        }}
                      />
                      強制以「匿名委託人」身份展示此評價
                      {review.client_anonymous === 1 && <span style={{ color: '#C04B4B', fontSize: '12px' }}>(因委託人設定，此選項已強制勾選)</span>}
                    </label>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                    {activeTab === 'published' && (
                      <button 
                        disabled={isProcessing}
                        onClick={() => handleUpdateVisibility(review.id, 0, review.artist_anonymous)}
                        style={{ padding: '8px 16px', background: '#FFFFFF', border: '1px solid #A0978D', color: '#5D4A3E', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}
                      >
                        {isProcessing ? '處理中...' : '取消公開 (移至待處理)'}
                      </button>
                    )}
                    
                    {activeTab === 'pending' && (
                      <button 
                        disabled={isProcessing}
                        onClick={() => handleUpdateVisibility(review.id, 1, review.artist_anonymous)}
                        style={{ padding: '8px 16px', background: '#5D4A3E', border: 'none', color: '#FFF', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}
                      >
                        {isProcessing ? '發布中...' : '確認將此評價精選上架'}
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
  );
}