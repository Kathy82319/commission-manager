// src/pages/admin/components/KeywordManager.tsx
import { useState, useEffect } from 'react';
import { apiClient } from '../../../api/client';

export function KeywordManager({ onKeywordsChange }: { onKeywordsChange?: (keywords: string[]) => void }) {
  const [keywords, setKeywords] = useState<{id: number, keyword: string}[]>([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchKeywords();
  }, []);

  const fetchKeywords = async () => {
    try {
      const res = await apiClient.get('/api/admin/keywords');
      setKeywords(res.data || []);
      if (onKeywordsChange) onKeywordsChange((res.data || []).map((k: any) => k.keyword));
    } catch (e) {
      console.error('Failed to fetch keywords', e);
    }
  };

  const handleAdd = async () => {
    if (!newKeyword.trim()) return;
    setIsLoading(true);
    try {
      await apiClient.post('/api/admin/keywords', { keyword: newKeyword.trim() });
      setNewKeyword('');
      fetchKeywords();
    } catch (e: any) {
      alert(`新增失敗: ${e.response?.data?.error || '關鍵字可能已存在'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('確定要刪除這個監控關鍵字嗎？')) return;
    try {
      await apiClient.delete(`/api/admin/keywords/${id}`);
      fetchKeywords();
    } catch (e) {
      alert('刪除失敗');
    }
  };

  return (
    <div style={{ backgroundColor: '#F9FAFB', padding: '20px', borderRadius: '12px', border: '1px solid #E5E7EB', marginBottom: '24px' }}>
      <h3 style={{ marginTop: 0, fontSize: '16px', color: '#111827', marginBottom: '16px' }}>🛡️ 系統監控關鍵字管理</h3>
      <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '16px' }}>包含以下關鍵字的許願池貼文，將會在下方的審核清單中被特別標示 (⚠️)。</p>
      
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <input 
          type="text" 
          value={newKeyword} 
          onChange={(e) => setNewKeyword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="輸入要監控的敏感詞..."
          style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', outline: 'none' }}
        />
        <button onClick={handleAdd} disabled={isLoading} style={{ padding: '8px 16px', backgroundColor: '#111827', color: '#FFF', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
          新增
        </button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {keywords.length === 0 ? <span style={{ fontSize: '13px', color: '#9CA3AF' }}>目前無監控關鍵字</span> : null}
        {keywords.map(k => (
          <div key={k.id} style={{ display: 'flex', alignItems: 'center', backgroundColor: '#FFF', padding: '4px 8px 4px 12px', borderRadius: '99px', border: '1px solid #D1D5DB', fontSize: '13px', gap: '8px' }}>
            <span style={{ color: '#374151', fontWeight: '500' }}>{k.keyword}</span>
            <button onClick={() => handleDelete(k.id)} style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}>
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}