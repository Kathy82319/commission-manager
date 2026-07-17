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

// 用來比對「目前內容」跟「最後儲存的內容」是否真的不同。
// 一般的 JSON.stringify 會依照物件屬性被塞進去的順序排列，
// 同樣的資料如果是用不同順序組出來的（例如不同分頁元件各自用不同順序的 {...prev, ...} 合併），
// 字串就會不一樣，導致明明內容相同卻被誤判成「有異動」。
// 這裡先把所有物件的 key 排序過再序列化，讓比較結果只跟實際內容有關、不受組裝順序影響。
export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  if (value !== null && typeof value === 'object') {
    const keys = Object.keys(value as Record<string, unknown>).sort();
    return `{${keys.map(k => `${JSON.stringify(k)}:${stableStringify((value as Record<string, unknown>)[k])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}
