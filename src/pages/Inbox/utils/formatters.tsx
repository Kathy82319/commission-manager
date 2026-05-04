// src/pages/Inbox/utils/formatters.ts

export const renderChips = (text: string, type: 'good' | 'bad' | 'info') => {
  if (!text || text.trim() === '') return <span className="text-[#A0978D] text-sm">未提供</span>;
  const tags = text.split(/[,、\s]+/).filter(t => t.trim() !== '');
  return (
    <div className="chip-group">
      {tags.map((t, i) => (
        <span key={i} className={`chip-tag chip-${type}`}>{t}</span>
      ))}
    </div>
  );
};

export const getStatusLabel = (status: string) => {
  switch(status) {
    case 'pending': return '待確認';
    case 'submitted': return '洽談中';
    case 'proposed': return '待審閱協議';
    case 'accepted': return '已轉為正式委託';
    case 'declined': return '已婉拒 / 終止';
    case 'closed': return '徵件結束';
    default: return '未知狀態';
  }
};

export const safeParseTime = (dateStr?: string) => {
  if (!dateStr) return 0;
  const utcStr = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T') + 'Z';
  return new Date(utcStr).getTime();
};

export const getExpiryInfo = (expiresAt?: string) => {
  if (!expiresAt) return { text: '無限期', className: 'expiry-safe' };

  const diff = safeParseTime(expiresAt) - Date.now();

  if (diff <= 0) {
    return { text: '已過期', className: 'expiry-expired' }; 
  }

  const hoursLeft = diff / (1000 * 60 * 60);

  if (hoursLeft <= 12) {
    return { text: '剩餘不足 12 小時', className: 'expiry-danger' };
  } else if (hoursLeft <= 24) {
    return { text: '剩餘 1 天', className: 'expiry-warning' }; 
  } else if (hoursLeft <= 48) {
    return { text: '剩餘 2 天', className: 'expiry-safe' }; 
  } else {
    const days = Math.ceil(hoursLeft / 24);
    return { text: `剩餘 ${days} 天`, className: 'expiry-safe' };
  }
};

export const calculateDaysLeft = (expiresAt: string) => {
  return getExpiryInfo(expiresAt).text;
};


export const filterOldItems = (item: any) => {
  if (item.inquiry_status === 'declined' || item.inquiry_status === 'cancelled') {
    const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;
    if (safeParseTime(item.latest_update_at) < threeDaysAgo) return false;
  }
  return true;
};