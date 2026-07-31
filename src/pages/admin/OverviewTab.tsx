// src/pages/admin/OverviewTab.tsx
import { useState } from 'react';
import { apiClient } from '../../api/client';

export function OverviewTab({ stats }: { stats: any }) {
  const [isTriggeringCampaign, setIsTriggeringCampaign] = useState(false);

  const handleTriggerWishboardCampaign = async () => {
    if (!window.confirm('確定要建立「年末許願池重新上架邀約」嗎？這會對符合資格的使用者發送通知，此操作是一次性的維護功能。')) return;
    setIsTriggeringCampaign(true);
    try {
      const res: any = await apiClient.post('/api/admin/campaign/wishboard-reactivation', {});
      if (res.offer_count === 0) {
        alert('沒有符合資格的貼文，未建立任何邀約。');
      } else {
        alert(`建立完成！共 ${res.offer_count} 篇貼文、通知了 ${res.notified_clients} 位使用者。`);
      }
    } catch (error: any) {
      alert(error.message || '建立邀約失敗，請稍後再試。');
    } finally {
      setIsTriggeringCampaign(false);
    }
  };

  if (!stats) return <div style={{ padding: '50px', textAlign: 'center', color: '#666' }}>⚙️ 正在讀取最高權限資料...</div>;

  return (
    <div>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', marginBottom: '24px' }}>全站營運儀表板</h1>

      <div style={{ marginBottom: '24px', padding: '16px 20px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontWeight: 'bold', color: '#92400E' }}>⚠️ 一次性維護功能：年末許願池重新上架邀約</div>
          <div style={{ fontSize: '13px', color: '#92400E', marginTop: '4px' }}>點擊後會建立邀約並通知使用者，跑過一次後記得請開發移除這個按鈕。</div>
        </div>
        <button
          onClick={handleTriggerWishboardCampaign}
          disabled={isTriggeringCampaign}
          style={{ padding: '10px 18px', borderRadius: '8px', border: 'none', background: '#D97706', color: 'white', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' }}
        >
          {isTriggeringCampaign ? '建立中...' : '建立邀約'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
        <StatCard title="總註冊用戶" value={stats.users?.reduce((a:any, b:any) => a + (b.total || 0), 0)} icon="👥" />
        <StatCard title="本月新增用戶" value={stats.new_users_this_month} icon="📈" color="#2563EB" />
        <StatCard title="專業版 (PRO)" value={stats.users?.find((u:any)=>u.plan_type==='pro')?.total || 0} icon="💎" color="#7C3AED" />
        <StatCard title="總委託件數" value={stats.commissions?.reduce((a:any, b:any) => a + (b.total || 0), 0)} icon="🎨" color="#059669" />
      </div>
      
      <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#111827', marginTop: '40px', marginBottom: '16px' }}>藍新金流數據</h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
        <StatCard title="本月成交總額" value={`NT$ ${(stats.payments?.month_amount || 0).toLocaleString()}`} icon="💰" color="#059669" />
        <StatCard title="本月成交筆數" value={stats.payments?.month_count || 0} icon="🧾" color="#059669" />
        <StatCard title="累計成交總額" value={`NT$ ${(stats.payments?.total_amount || 0).toLocaleString()}`} icon="💵" color="#2563EB" />
        <StatCard title="累計成交筆數" value={stats.payments?.total_count || 0} icon="📊" color="#2563EB" />
      </div>

      <div style={{ marginTop: '24px', backgroundColor: '#FFF', borderRadius: '12px', border: '1px solid #E5E7EB', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #E5E7EB', fontWeight: 'bold', color: '#111827' }}>
          最近入帳紀錄
        </div>
        {(!stats.payments?.recent || stats.payments.recent.length === 0) ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#9CA3AF' }}>目前尚無入帳紀錄</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ backgroundColor: '#F9FAFB', color: '#6B7280', textAlign: 'left' }}>
                <th style={{ padding: '10px 20px' }}>付款時間</th>
                <th style={{ padding: '10px 20px' }}>用戶</th>
                <th style={{ padding: '10px 20px' }}>方案</th>
                <th style={{ padding: '10px 20px' }}>金額</th>
                <th style={{ padding: '10px 20px' }}>交易序號</th>
              </tr>
            </thead>
            <tbody>
              {stats.payments.recent.map((p: any, i: number) => (
                <tr key={i} style={{ borderTop: '1px solid #F3F4F6' }}>
                  <td style={{ padding: '10px 20px', color: '#374151' }}>{p.pay_time || '-'}</td>
                  <td style={{ padding: '10px 20px', color: '#374151' }}>{p.display_name || p.public_id || '-'}</td>
                  <td style={{ padding: '10px 20px', color: '#374151' }}>{p.plan_type}</td>
                  <td style={{ padding: '10px 20px', color: '#374151' }}>NT$ {p.amount?.toLocaleString()}</td>
                  <td style={{ padding: '10px 20px', color: '#9CA3AF' }}>{p.trade_no || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color = "#111827" }: any) {
  return (
    <div style={{ backgroundColor: '#FFF', padding: '24px', borderRadius: '16px', border: '1px solid #E5E7EB', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#6B7280', fontSize: '14px' }}>
        <span>{title}</span><span>{icon}</span>
      </div>
      <div style={{ fontSize: '28px', fontWeight: '900', color }}>{value}</div>
    </div>
  );
}