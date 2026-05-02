import { useEffect, useState } from 'react';
import { apiClient } from '../../api/client';

export function UsersTab() {
  const [dataList, setDataList] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  
  // Modal 狀態
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  useEffect(() => { fetchListData(); }, [page, search]);

  const fetchListData = async () => {
    try {
      const res = await apiClient.get(`/api/admin/users?search=${search}&page=${page}`);
      setDataList(res.data);
      if (res.pagination) setTotal(res.pagination.total);
    } catch (e) { console.error(e); }
  };

  const openManageModal = (user: any) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>用戶管理</h1>
        <input 
          type="text" 
          placeholder="搜尋暱稱、ID..." 
          style={{ padding: '10px 16px', border: '1px solid #E5E7EB', borderRadius: '8px', width: '300px', outline: 'none' }}
          value={search}
          onChange={(e) => {setSearch(e.target.value); setPage(1);}}
        />
      </div>

      <div style={{ backgroundColor: '#FFF', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1000px' }}>
          <thead style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
            <tr>
              <th style={thStyle}>用戶資訊</th>
              <th style={thStyle}>目前方案 / 到期日</th>
              <th style={thStyle}>單量與金額統計</th>
              <th style={thStyle}>許願池狀態</th>
              <th style={thStyle}>操作</th>
            </tr>
          </thead>
          <tbody>
            {dataList.map((item) => (
              <tr key={item.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                <td style={tdStyle}>
                  <div style={{ fontWeight: 'bold', color: item.role === 'deleted' ? '#EF4444' : '#111827' }}>
                    {item.display_name} {item.role === 'deleted' && '(🚫 已停權)'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#9CA3AF' }}>ID: {item.public_id}</div>
                </td>
                <td style={tdStyle}>
                  <span style={{ fontWeight: 'bold', color: item.plan_type === 'pro' ? '#7C3AED' : '#374151' }}>
                    {item.plan_type.toUpperCase()}
                  </span>
                  <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
                    {item.pro_expires_at ? item.pro_expires_at.split('T')[0] : '無期限'}
                  </div>
                </td>
                <td style={tdStyle}>
                  <div style={{ fontSize: '13px' }}>累積: {item.total_commissions} 單</div>
                  <div style={{ fontSize: '11px', color: '#9CA3AF' }}>結案數/總金額 (待實作 API)</div>
                </td>
                <td style={tdStyle}>
                  <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '12px', backgroundColor: '#ECFDF5', color: '#059669' }}>
                    正常 (待實作)
                  </span>
                </td>
                <td style={tdStyle}>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <a href={`/artist/${item.public_id}`} target="_blank" rel="noreferrer" style={actionLinkStyle}>查看首頁</a>
                    <button onClick={() => openManageModal(item)} style={{...actionLinkStyle, color: '#DC2626'}}>管理</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal 骨架 (Phase 2 將會豐富這裡) */}
      {isModalOpen && selectedUser && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#FFF', padding: '32px', borderRadius: '12px', width: '500px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h2 style={{ marginTop: 0 }}>管理用戶: {selectedUser.display_name}</h2>
            <p style={{ color: '#6B7280' }}>這部分將在 Phase 2 實作編輯方案、停權與許願池禁言等表單。</p>
            <div style={{ marginTop: '24px', textAlign: 'right' }}>
              <button onClick={() => setIsModalOpen(false)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #D1D5DB', backgroundColor: '#FFF', cursor: 'pointer' }}>關閉</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const thStyle = { padding: '16px', fontSize: '13px', color: '#6B7280', fontWeight: 'bold' };
const tdStyle = { padding: '16px', fontSize: '14px', verticalAlign: 'top' as const };
const actionLinkStyle = { background: 'none', border: 'none', color: '#2563EB', cursor: 'pointer', fontSize: '13px', textDecoration: 'underline', padding: 0, fontWeight: 'bold' };