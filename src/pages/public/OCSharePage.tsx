import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { OCDetailCard } from '../../components/OC/OCDetailCard';

export function OCSharePage() {
  const { id } = useParams<{ id: string }>();
  const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
  const [ocData, setOcData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) { setNotFound(true); setLoading(false); return; }
    fetch(`${API_BASE}/api/oc/share/${id}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) setOcData(data.data);
        else setNotFound(true);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', color: '#7A6B62', fontSize: '15px' }}>
      載入中...
    </div>
  );

  if (notFound) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '16px', color: '#7A6B62' }}>
      <div style={{ fontSize: '48px' }}>🎨</div>
      <div style={{ fontSize: '18px', fontWeight: 700, color: '#3D2B1F' }}>找不到這張 OC 卡</div>
      <div style={{ fontSize: '14px' }}>連結可能已失效或角色已被刪除</div>
      <Link to="/" style={{ marginTop: '8px', padding: '9px 22px', background: '#A67B3E', color: 'white', borderRadius: '20px', fontSize: '14px', fontWeight: 600, textDecoration: 'none' }}>
        回首頁
      </Link>
    </div>
  );

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '32px 20px 60px' }}>
      <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '13px', color: '#A0978D' }}>由</span>
        <span style={{ fontSize: '13px', fontWeight: 700, color: '#5D4A3E' }}>Arti 繪師小幫手</span>
        <span style={{ fontSize: '13px', color: '#A0978D' }}>分享的 OC 角色設定卡</span>
      </div>
      <OCDetailCard ocData={ocData} variant="flat" />
    </div>
  );
}
