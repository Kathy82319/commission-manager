// src/utils/unsavedChanges.ts
// 追蹤「目前頁面是否有尚未儲存的變更」，供離開頁面前跳出提示使用。
// 用單純的模組層級旗標而非 React context/state，因為不需要驅動畫面重新渲染，
// 只需要在「使用者點擊離開」或「瀏覽器即將關閉/重新整理」這兩個時間點被動檢查。
let isDirty = false;

export function setUnsavedChanges(dirty: boolean) {
  isDirty = dirty;
}

export function hasUnsavedChanges() {
  return isDirty;
}

// 有變更時跳出確認對話框；回傳 true 代表可以放行離開（使用者確認或本來就沒有變更）
export function confirmLeaveIfDirty(): boolean {
  if (!isDirty) return true;
  return window.confirm('這個頁面有尚未儲存的變更，確定要離開嗎？離開後變更將會遺失。');
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', (e) => {
    if (!isDirty) return;
    e.preventDefault();
    e.returnValue = '';
  });
}
