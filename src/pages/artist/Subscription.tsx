// src/pages/artist/Subscription.tsx
import { useState, useEffect, useCallback } from 'react';
import type { QuotaInfo } from './Settings/types';
import { SubscriptionTab } from './Settings/SubscriptionTab';
import '../../styles/Settings.css';

function Toast({ message, type, onClose }: { message: string, type: 'ok' | 'err', onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`toast-message ${type === 'err' ? 'error' : 'success'}`}>
      <div className="toast-icon">{type === 'err' ? '[錯誤]' : '[成功]'}</div>
      <div className="toast-content">{message}</div>
    </div>
  );
}

export function Subscription() {
  const [quotaInfo, setQuotaInfo] = useState<QuotaInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string, type: 'ok' | 'err' } | null>(null);
  const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

  const showToast = useCallback((msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type });
  }, []);

  const fetchUserData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/users/me`, { credentials: 'include' });
      if (res.status === 401) {
        window.location.href = '/login';
        return;
      }
      const data = await res.json();
      if (data.success && data.data) {
        setQuotaInfo({
          plan_type: data.data.plan_type || 'free',
          used_quota: data.data.used_quota || 0,
          max_quota: 3,
          trial_start_at: data.data.trial_start_at,
          trial_end_at: data.data.trial_end_at,
          pro_expires_at: data.data.pro_expires_at,
        });
      }
    } catch (error) {
      console.error("讀取訂閱資訊失敗", error);
    } finally {
      setIsLoading(false);
    }
  }, [API_BASE]);

  useEffect(() => {
    fetchUserData();
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') === 'success') {
      showToast('付款完成，方案已更新！', 'ok');
    }
  }, [fetchUserData, showToast]);

  if (isLoading) return <div className="loading-screen" style={{ padding: '40px', textAlign: 'center' }}>載入方案資訊中...</div>;

  return (
    <div className="settings-page">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      <div className="settings-layout">
        <div className="settings-content-area" style={{ width: '100%' }}>
          <div className="settings-header">
            <h2 style={{ margin: 0, fontSize: '20px', color: '#5D4A3E' }}>訂閱方案</h2>
          </div>
          <div className="tab-body">
            <SubscriptionTab quotaInfo={quotaInfo} fetchUserData={fetchUserData} onToast={showToast} />
          </div>
        </div>
      </div>
    </div>
  );
}
