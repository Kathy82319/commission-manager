
// 🔒 資安檢查：這裡的 {t} 是字串變數，React 預設會進行 HTML 逸出 (Escape)，
// 因此即使案主在標籤輸入惡意的 <script>，也會被轉義為純文字，有效防範 XSS 攻擊[cite: 1]。
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
  // 處理 Safari 或部分舊版瀏覽器對 ISO 8601 時間格式解析的問題
  const utcStr = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T') + 'Z';
  return new Date(utcStr).getTime();
};

export const calculateDaysLeft = (expiresAt: string) => {
  const diff = safeParseTime(expiresAt) - Date.now();
  if (diff <= 0) return '已過期';
  return `剩餘 ${Math.ceil(diff / (1000 * 60 * 60 * 24))} 天`;
};

// 💡 邏輯提醒：這裡是依賴使用者本地端的時間 (Date.now()) 來過濾。
// 雖然使用者若竄改電腦時間，可能會看到過期的婉拒單，但這僅屬於「顯示層」的過濾，
// 並不影響實際資料庫權限，因此沒有嚴重的越權 (IDOR) 風險。
export const filterOldItems = (item: any) => {
  if (item.inquiry_status === 'declined' || item.inquiry_status === 'cancelled') {
    const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;
    if (safeParseTime(item.latest_update_at) < threeDaysAgo) return false;
  }
  return true;
};