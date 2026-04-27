// src/pages/public/Wishboard.tsx
import React, { useEffect, useState } from 'react';

export const Wishboard: React.FC = () => {
  const currentUserRole: string = 'client'; 

  const [bulletins, setBulletins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 新增分類狀態：'request' (徵委託), 'offer' (接委託), 'other' (其他)
  const [activeTab, setActiveTab] = useState<'request' | 'offer' | 'other'>('request');

  const [showPostModal, setShowPostModal] = useState(false);
  const [showInquireModal, setShowInquireModal] = useState(false);
  const [selectedBulletin, setSelectedBulletin] = useState<string | null>(null);

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
      category: activeTab // 將目前的分類一併送出
    };

    try {
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
      }
    } catch (error) {
      alert('發布發生錯誤');
      console.error(error);
    }
  };

  const handleInquire = async () => {
    if (!selectedBulletin) return;
    
    const mockArtistSnapshot = {
      title: "半身精緻插畫",
      price: "NT$ 2000",
      terms: "不接受二次改稿、完稿後僅供非商用"
    };

    try {
      const res = await fetch(`/api/bulletins/${selectedBulletin}/inquire`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artist_snapshot: mockArtistSnapshot }),
      });
      const data = await res.json();

      if (data.success) {
        alert('已成功發送您的意向給案主！');
        setShowInquireModal(false);
      } else {
        alert(data.error || '投遞失敗');
      }
    } catch (error) {
      alert('投遞發生錯誤');
      console.error(error);
    }
  };

  // 過濾當前分類的資料
  const filteredBulletins = bulletins.filter(b => b.category === activeTab || (!b.category && activeTab === 'request'));

  return (
    <div className="max-w-5xl mx-auto p-6 mt-10 relative z-0">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">許願池看板</h1>
        
        {currentUserRole === 'client' && (
          <button 
            type="button"
            onClick={() => setShowPostModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 relative z-10 cursor-pointer"
          >
            發布需求
          </button>
        )}
      </div>

      {/* 分頁標籤 UI */}
      <div className="flex border-b mb-6">
        <button
          className={`px-6 py-3 font-medium ${activeTab === 'request' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('request')}
        >
          #徵委託
        </button>
        <button
          className={`px-6 py-3 font-medium ${activeTab === 'offer' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('offer')}
        >
          #接委託
        </button>
        <button
          className={`px-6 py-3 font-medium ${activeTab === 'other' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('other')}
        >
          #其他
        </button>
      </div>

      {loading ? (
        <div className="p-8 text-center">載入中...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredBulletins.map((b) => (
            <div key={b.id} className="border rounded-lg p-5 shadow-sm bg-white">
              <div className="mb-4 flex justify-between">
                <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">
                  ID: {b.client_id.substring(0, 8)}...
                </span>
                <span className="text-xs font-bold text-blue-600">
                  {b.category === 'offer' ? '#接委託' : b.category === 'other' ? '#其他' : '#徵委託'}
                </span>
              </div>
              <p className="text-lg font-medium mb-2">{b.content}</p>
              <div className="text-sm text-gray-600 space-y-1 mb-4">
                <p>預算：{b.budget_range}</p>
                <p>規格：{b.specs}</p>
              </div>
              
              {currentUserRole === 'artist' && activeTab === 'request' && (
                <button 
                  onClick={() => {
                    setSelectedBulletin(b.id);
                    setShowInquireModal(true);
                  }}
                  className="w-full bg-green-50 text-green-700 border border-green-200 py-2 rounded hover:bg-green-100 font-medium"
                >
                  我有興趣 (投遞意向)
                </button>
              )}
            </div>
          ))}
          {filteredBulletins.length === 0 && (
            <p className="text-gray-500 col-span-2 text-center py-10">這個分類目前還沒有任何內容。</p>
          )}
        </div>
      )}

      {/* 案主發布 Modal */}
      {showPostModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[100]">
          <div className="bg-white rounded-lg p-6 max-w-md w-full relative">
            <h2 className="text-xl font-bold mb-4">發布 {activeTab === 'request' ? '徵委託' : activeTab === 'offer' ? '接委託' : '其他'}</h2>
            <form onSubmit={handlePostWish} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">內容描述</label>
                <textarea name="content" required className="w-full border rounded p-2 h-24" placeholder="請填寫詳細內容..."></textarea>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">預算區間</label>
                <input type="text" name="budget" required className="w-full border rounded p-2" placeholder="例: NT$ 1500 - 2200" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">規格需求</label>
                <input type="text" name="specs" required className="w-full border rounded p-2" placeholder="例: 2000x2000 px, PNG" />
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <button type="button" onClick={() => setShowPostModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">取消</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">發布</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 繪師投遞確認 Modal */}
      {showInquireModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[100]">
          <div className="bg-white rounded-lg p-6 max-w-md w-full relative">
            <h2 className="text-xl font-bold mb-4">確認發送意向？</h2>
            <p className="text-gray-600 mb-6">
              系統將自動抓取您的徵稿簡歷與預設協議發送給案主。案主審閱後若同意，將向您發送邀請細節。
            </p>
            <div className="flex justify-end space-x-2">
              <button onClick={() => setShowInquireModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">取消</button>
              <button onClick={handleInquire} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">確認投遞</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};