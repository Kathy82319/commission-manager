// src/pages/admin/OverviewTab.tsx

// 🌟 接收來自 Dashboard 的 props，移除內部獨立的 fetch 邏輯
export function OverviewTab({ stats }: { stats: any }) {
  
  if (!stats) return <div style={{ padding: '50px', textAlign: 'center', color: '#666' }}>⚙️ 正在讀取最高權限資料...</div>;

  return (
    <div>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', marginBottom: '24px' }}>全站營運儀表板</h1>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
        <StatCard title="總註冊用戶" value={stats.users?.reduce((a:any, b:any) => a + (b.total || 0), 0)} icon="👥" />
        <StatCard title="本月新增用戶" value={stats.new_users_this_month} icon="📈" color="#2563EB" />
        <StatCard title="專業版 (PRO)" value={stats.users?.find((u:any)=>u.plan_type==='pro')?.total || 0} icon="💎" color="#7C3AED" />
        <StatCard title="總委託件數" value={stats.commissions?.reduce((a:any, b:any) => a + (b.total || 0), 0)} icon="🎨" color="#059669" />
      </div>
      
      <div style={{ marginTop: '40px', padding: '24px', backgroundColor: '#FFF', borderRadius: '12px', border: '1px dashed #D1D5DB', color: '#6B7280', textAlign: 'center' }}>
        預留區塊：未來將在此處整合藍新金流數據 (入帳、成交總額等)
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