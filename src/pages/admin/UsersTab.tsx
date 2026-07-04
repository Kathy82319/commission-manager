import { useEffect, useState } from 'react';
import { apiClient } from '../../api/client';

export function UsersTab() {
  const [dataList, setDataList] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(20);
  const [myId, setMyId] = useState('');

  // 單筆管理 modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    plan_type: 'free',
    pro_expires_at: '',
    custom_quota: '',
    role: 'client',
    wishboard_status: 'active',
    mute_expires_at: '',
    admin_note: '',
  });

  // 批次操作
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkTrialDays, setBulkTrialDays] = useState('7');
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  useEffect(() => {
    apiClient.get('/api/users/me').then(res => setMyId(res.data.id));
  }, []);

  useEffect(() => { fetchListData(); }, [page, search]);

  const fetchListData = async () => {
    try {
      const res = await apiClient.get(`/api/admin/users?search=${search}&page=${page}`);
      setDataList(res.data);
      if (res.pagination) {
        setTotal(res.pagination.total);
        setLimit(res.pagination.limit || 20);
      }
    } catch (e) { console.error(e); }
  };

  // ── 單筆操作 ─────────────────────────────────────────
  const openManageModal = (user: any) => {
    setSelectedUser(user);
    setFormData({
      plan_type: user.plan_type || 'free',
      pro_expires_at: user.pro_expires_at ? user.pro_expires_at.split('T')[0] : '',
      custom_quota: user.custom_quota?.toString() || '',
      role: user.role || 'client',
      wishboard_status: user.wishboard_status || 'active',
      mute_expires_at: user.mute_expires_at ? user.mute_expires_at.split('T')[0] : '',
      admin_note: user.admin_note || '',
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (selectedUser.id === myId && formData.role !== 'admin') {
      alert('⚠️ 資安防呆：你不能拔除自己的管理員權限！');
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        ...formData,
        custom_quota: formData.custom_quota ? parseInt(formData.custom_quota) : null,
        pro_expires_at: formData.pro_expires_at ? new Date(formData.pro_expires_at).toISOString() : null,
        mute_expires_at: formData.mute_expires_at ? new Date(formData.mute_expires_at).toISOString() : null,
      };
      await apiClient.patch(`/api/admin/users/${selectedUser.id}`, payload);
      alert('更新成功');
      setIsModalOpen(false);
      fetchListData();
    } catch (e: any) {
      alert(`更新失敗: ${e.response?.data?.error || '未知錯誤'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // ── 批次操作 ─────────────────────────────────────────
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === dataList.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(dataList.map(u => u.id)));
    }
  };

  const handleBulkAction = async (action: 'suspend' | 'grant_trial') => {
    if (selectedIds.size === 0) return;
    const label = action === 'suspend' ? '批次停權' : `批次贈送 ${bulkTrialDays} 天試用`;
    if (!confirm(`確定要對選取的 ${selectedIds.size} 位用戶執行「${label}」嗎？`)) return;

    setIsBulkProcessing(true);
    try {
      const ids = Array.from(selectedIds);
      if (action === 'suspend') {
        await Promise.all(ids.map(id => apiClient.patch(`/api/admin/users/${id}`, { role: 'deleted' })));
      } else {
        const days = Math.max(1, parseInt(bulkTrialDays) || 7);
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + days);
        await Promise.all(ids.map(id =>
          apiClient.patch(`/api/admin/users/${id}`, {
            plan_type: 'trial',
            pro_expires_at: expiry.toISOString(),
          })
        ));
      }
      setSelectedIds(new Set());
      fetchListData();
      alert(`完成！已更新 ${ids.length} 位用戶。`);
    } catch {
      alert('部分操作失敗，請重新整理後確認。');
    } finally {
      setIsBulkProcessing(false);
    }
  };

  // ── 顯示輔助 ─────────────────────────────────────────
  const getRoleDisplay = (role: string) => {
    switch (role) {
      case 'client':  return '委託人';
      case 'artist':  return '繪師';
      case 'admin':   return '👑 管理員';
      case 'deleted': return '🚫 全站停權';
      default:        return role;
    }
  };

  const getPlanDisplay = (plan: string) => {
    switch (plan) {
      case 'free':  return '免費版';
      case 'trial': return '試用版';
      case 'pro':   return '專業版';
      default:      return plan;
    }
  };

  const getDefaultQuota = (plan: string) => (plan === 'pro' || plan === 'trial') ? 20 : 3;

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return null;
    return new Date(dateStr.includes('Z') ? dateStr : dateStr.replace(' ', 'T') + 'Z')
      .toLocaleString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const allSelected = dataList.length > 0 && selectedIds.size === dataList.length;
  const someSelected = selectedIds.size > 0 && !allSelected;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div style={{ paddingBottom: selectedIds.size > 0 ? '90px' : '0' }}>

      {/* ── 標題列 ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', margin: 0 }}>用戶管理</h1>
        <input
          type="text"
          placeholder="搜尋暱稱、ID..."
          style={{ padding: '10px 16px', border: '1px solid #E5E7EB', borderRadius: '8px', width: '300px', maxWidth: '100%', outline: 'none', boxSizing: 'border-box' }}
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      {/* ── 主表格 ── */}
      <div style={{ backgroundColor: '#FFF', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1050px' }}>
          <thead style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
            <tr>
              {/* 全選 checkbox */}
              <th style={{ ...thStyle, width: '40px', textAlign: 'center' }}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={el => { if (el) el.indeterminate = someSelected; }}
                  onChange={toggleSelectAll}
                  style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                />
              </th>
              <th style={thStyle}>用戶資訊</th>
              <th style={thStyle}>目前方案 / 到期日</th>
              <th style={thStyle}>單量統計</th>
              <th style={thStyle}>許願池狀態</th>
              <th style={thStyle}>操作</th>
            </tr>
          </thead>
          <tbody>
            {dataList.map(item => {
              const isSelected = selectedIds.has(item.id);
              const expiryDate = item.plan_type === 'trial' ? item.trial_end_at : item.pro_expires_at;
              // 委託明細：若 API 有回傳分類數據就顯示；否則只顯示總數
              const hasBreakdown = item.active_commissions != null || item.completed_commissions != null;

              return (
                <tr key={item.id} style={{ borderBottom: '1px solid #F3F4F6', backgroundColor: isSelected ? '#EFF6FF' : 'transparent' }}>

                  {/* Checkbox */}
                  <td style={{ ...tdStyle, textAlign: 'center', verticalAlign: 'middle' }}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(item.id)}
                      style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                    />
                  </td>

                  {/* 用戶資訊 */}
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 'bold', color: item.role === 'deleted' ? '#EF4444' : '#111827' }}>
                      {item.display_name}{' '}
                      <span style={{ fontSize: '12px', color: '#6B7280', fontWeight: 'normal' }}>({getRoleDisplay(item.role)})</span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '2px' }}>ID: {item.public_id}</div>
                    {item.email && (
                      <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '2px' }}>✉ {item.email}</div>
                    )}
                    {item.last_login_at && (
                      <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '2px' }}>
                        最後登入：{formatDate(item.last_login_at)}
                      </div>
                    )}
                    {item.admin_note && (
                      <div style={{ fontSize: '11px', color: '#4B5563', backgroundColor: '#FEF3C7', padding: '4px 8px', borderRadius: '4px', marginTop: '6px', display: 'inline-block' }}>
                        📝 {item.admin_note}
                      </div>
                    )}
                  </td>

                  {/* 方案 */}
                  <td style={tdStyle}>
                    <span style={{ fontWeight: 'bold', color: item.plan_type === 'pro' ? '#7C3AED' : item.plan_type === 'trial' ? '#B45309' : '#374151' }}>
                      {getPlanDisplay(item.plan_type)}
                    </span>
                    <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
                      {expiryDate ? expiryDate.split('T')[0] : '無期限'}
                    </div>
                  </td>

                  {/* 單量統計 */}
                  <td style={tdStyle}>
                    {hasBreakdown ? (
                      <div style={{ fontSize: '13px', lineHeight: '1.8' }}>
                        <span style={{ color: '#2563EB' }}>進行中 {item.active_commissions ?? 0}</span>
                        <span style={{ color: '#9CA3AF', margin: '0 4px' }}>／</span>
                        <span style={{ color: '#059669' }}>完成 {item.completed_commissions ?? 0}</span>
                        <span style={{ color: '#9CA3AF', margin: '0 4px' }}>／</span>
                        <span style={{ color: '#DC2626' }}>取消 {item.cancelled_commissions ?? 0}</span>
                      </div>
                    ) : (
                      <div style={{ fontSize: '13px' }}>累積：{item.total_commissions} 單</div>
                    )}
                    <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '4px' }}>
                      上限：{item.custom_quota || getDefaultQuota(item.plan_type)} {item.custom_quota ? '(自訂)' : '(預設)'}
                    </div>
                  </td>

                  {/* 許願池 */}
                  <td style={tdStyle}>
                    {item.wishboard_status === 'banned' ? (
                      <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '12px', backgroundColor: '#FEF2F2', color: '#DC2626' }}>永久封鎖</span>
                    ) : item.wishboard_status === 'muted' ? (
                      <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '12px', backgroundColor: '#FFFBEB', color: '#D97706' }}>禁止使用</span>
                    ) : (
                      <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '12px', backgroundColor: '#ECFDF5', color: '#059669' }}>正常</span>
                    )}
                  </td>

                  {/* 操作 */}
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <a href={`/${item.public_id}`} target="_blank" rel="noreferrer" style={actionLinkStyle}>查看首頁</a>
                      <button onClick={() => openManageModal(item)} style={{ ...actionLinkStyle, color: '#DC2626' }}>管理設定</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── 分頁 ── */}
      <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#6B7280', fontSize: '14px', padding: '0 8px' }}>
        <span>📊 共 <b style={{ color: '#111827' }}>{total}</b> 筆　{selectedIds.size > 0 && <span style={{ color: '#2563EB', fontWeight: 'bold' }}>已選 {selectedIds.size} 人</span>}</span>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)} style={{ ...btnStyle, opacity: page === 1 ? 0.5 : 1 }}>上一頁</button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button
              key={p}
              onClick={() => setPage(p)}
              style={{
                ...btnStyle,
                minWidth: '40px',
                backgroundColor: p === page ? '#2563EB' : '#FFF',
                color: p === page ? '#FFF' : '#374151',
                cursor: p === page ? 'default' : 'pointer',
              }}
            >
              {p}
            </button>
          ))}
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} style={{ ...btnStyle, opacity: page >= totalPages ? 0.5 : 1 }}>下一頁</button>
        </div>
      </div>

      {/* ── 批次操作列（底部浮動） ── */}
      {selectedIds.size > 0 && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, backgroundColor: '#1E293B', color: 'white', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', zIndex: 500, boxShadow: '0 -4px 12px rgba(0,0,0,0.2)' }}>
          <span style={{ fontWeight: 'bold', fontSize: '14px', marginRight: '4px' }}>
            已選 {selectedIds.size} 人
          </span>

          {/* 批次停權 */}
          <button
            onClick={() => handleBulkAction('suspend')}
            disabled={isBulkProcessing}
            style={{ padding: '8px 16px', borderRadius: '7px', border: 'none', backgroundColor: '#EF4444', color: 'white', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}
          >
            🚫 批次停權
          </button>

          {/* 批次贈送試用 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#334155', padding: '4px 10px 4px 14px', borderRadius: '7px' }}>
            <span style={{ fontSize: '13px', fontWeight: 'bold' }}>⏳ 贈送試用</span>
            <input
              type="number"
              min={1}
              value={bulkTrialDays}
              onChange={e => setBulkTrialDays(e.target.value)}
              style={{ width: '52px', padding: '4px 6px', borderRadius: '5px', border: 'none', textAlign: 'center', fontSize: '13px', outline: 'none' }}
            />
            <span style={{ fontSize: '13px' }}>天</span>
            <button
              onClick={() => handleBulkAction('grant_trial')}
              disabled={isBulkProcessing}
              style={{ padding: '6px 12px', borderRadius: '5px', border: 'none', backgroundColor: '#F59E0B', color: 'white', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}
            >
              確認
            </button>
          </div>

          {/* 清除選取 */}
          <button
            onClick={() => setSelectedIds(new Set())}
            style={{ marginLeft: 'auto', padding: '8px 14px', borderRadius: '7px', border: '1px solid #475569', backgroundColor: 'transparent', color: '#94A3B8', fontSize: '13px', cursor: 'pointer' }}
          >
            清除選取
          </button>
        </div>
      )}

      {/* ── 單筆管理 Modal ── */}
      {isModalOpen && selectedUser && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px', boxSizing: 'border-box' }}>
          <div style={{ backgroundColor: '#FFF', padding: '24px', borderRadius: '12px', width: '450px', maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', boxSizing: 'border-box' }}>
            <h2 style={{ marginTop: 0, marginBottom: '24px', fontSize: '20px' }}>設定用戶：{selectedUser.display_name}</h2>

            <div style={formGroupStyle}>
              <label style={labelStyle}>站內角色 (Role)</label>
              <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })} style={inputStyle}>
                <option value="client">委託人 (Client)</option>
                <option value="artist">繪師 (Artist)</option>
                <option value="admin">管理員 (Admin)</option>
                <option value="deleted">🚫 全站停權 (Deleted)</option>
              </select>
            </div>

            <div style={formGroupStyle}>
              <label style={labelStyle}>方案類型</label>
              <select value={formData.plan_type} onChange={e => setFormData({ ...formData, plan_type: e.target.value })} style={inputStyle}>
                <option value="free">🎨 基礎免費版 (Free)</option>
                <option value="trial">⏳ 專業版試用 (Trial)</option>
                <option value="pro">💎 專業版 (Pro)</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>方案到期日</label>
                <input type="date" value={formData.pro_expires_at} onChange={e => setFormData({ ...formData, pro_expires_at: e.target.value })} style={inputStyle} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>接單配額上限</label>
                <input type="number" placeholder="空白為系統預設" value={formData.custom_quota} onChange={e => setFormData({ ...formData, custom_quota: e.target.value })} style={inputStyle} />
              </div>
            </div>

            <div style={formGroupStyle}>
              <label style={labelStyle}>內部管理員備註 (不會對外顯示)</label>
              <textarea
                rows={3}
                placeholder="例如：2026/05 此用戶疑似多開分身，先列入觀察名單..."
                value={formData.admin_note}
                onChange={e => setFormData({ ...formData, admin_note: e.target.value })}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>

            <hr style={{ margin: '24px 0', borderColor: '#E5E7EB' }} />
            <h3 style={{ fontSize: '16px', marginBottom: '16px', color: '#374151' }}>許願池專屬設定</h3>

            <div style={formGroupStyle}>
              <label style={labelStyle}>許願池狀態</label>
              <select value={formData.wishboard_status} onChange={e => setFormData({ ...formData, wishboard_status: e.target.value })} style={inputStyle}>
                <option value="active">🟢 正常發言 (Active)</option>
                <option value="muted">🟡 禁止使用許願池 (Suspended)</option>
                <option value="banned">🔴 永久封鎖 (Banned)</option>
              </select>
            </div>

            {formData.wishboard_status === 'muted' && (
              <div style={formGroupStyle}>
                <label style={labelStyle}>禁言解除日期</label>
                <input type="date" value={formData.mute_expires_at} onChange={e => setFormData({ ...formData, mute_expires_at: e.target.value })} style={inputStyle} />
              </div>
            )}

            <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button onClick={() => setIsModalOpen(false)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #D1D5DB', backgroundColor: '#FFF', cursor: 'pointer' }}>取消</button>
              <button onClick={handleSave} disabled={isSaving} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', backgroundColor: '#2563EB', color: '#FFF', fontWeight: 'bold', cursor: isSaving ? 'not-allowed' : 'pointer', opacity: isSaving ? 0.7 : 1 }}>
                {isSaving ? '儲存中...' : '確認儲存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const thStyle = { padding: '16px', fontSize: '13px', color: '#6B7280', fontWeight: 'bold' };
const tdStyle = { padding: '16px', fontSize: '14px', verticalAlign: 'top' as const };
const actionLinkStyle = { background: 'none', border: 'none', color: '#2563EB', cursor: 'pointer', fontSize: '13px', textDecoration: 'underline', padding: 0, fontWeight: 'bold' } as const;
const formGroupStyle = { marginBottom: '16px' };
const labelStyle = { display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#374151', marginBottom: '8px' } as const;
const inputStyle = { width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #D1D5DB', outline: 'none', boxSizing: 'border-box' } as const;
const btnStyle = { padding: '8px 16px', border: '1px solid #E5E7EB', borderRadius: '8px', backgroundColor: '#FFF', cursor: 'pointer', fontWeight: 'bold' };
