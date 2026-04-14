// src/pages/Terms.tsx
export function Terms() {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '60px 20px', lineHeight: '1.8', color: '#5D4A3E' }}>
      <h1 style={{ fontSize: '24px', marginBottom: '24px', borderBottom: '2px solid #F4F0EB' }}>服務條款與收費規則</h1>

      <section>
        <h3 style={{ color: '#ecb05c' }}>一、服務內容</h3>
        <p>本平台（以下簡稱「本工具」）提供委託進度追蹤、合約數位存證與個人化排單表之軟體工具服務。本工具僅作為溝通與紀錄之輔助手段，並非繪師與委託人間交易之當事人。</p>
      </section>

      <section>
        <h3 style={{ color: '#ecb05c' }}>二、訂閱費用與收費規則</h3>
        <ul>
          <li><strong>試用/免費版：</strong> 每月提供 3 筆委託單建立額度。</li>
          <li><strong>專業版 (Pro)：</strong> 開啟無限建單與網頁自訂功能。費用採預付訂閱制。</li>
          <li><strong>退款原則：</strong> 依據「通訊交易解除權合理例外情事適用準則」，本服務提供之數位內容一經啟用（升級 Pro 版）即無法退還費用。用戶可隨時停止訂閱。</li>
        </ul>
      </section>

      <section>
        <h3 style={{ color: '#ecb05c' }}>三、權利與責任</h3>
        <p>繪師與委託人間的畫作版權歸屬、酬金給付及糾紛處理，應依據雙方於建單時簽署之「協議書內容」為準。本平台對委託人間之溝通落差、跑單或畫作品質爭議不負法律賠償責任，但提供完整歷程紀錄作為舉證參考。</p>
      </section>

      <section>
        <h3 style={{ color: '#ecb05c' }}>四、違規與法律責任</h3>
        <p>用戶不得利用本服務散佈違法、色情或侵權內容。若有虛假陳述致他人名譽受損，使用者須自負相關法律責任。</p>
      </section>

<section>
  <h3 style={{ color: '#ecb05c' }}>五、黑單管理功能之使用規範</h3>
  <p>
    1. 本平台提供之黑單功能僅供繪師作為個人委託管理之參考紀錄，<strong>非公開之信用評等系統</strong>。
  </p>
  <p>
    2. 使用者應自行確保黑單紀錄之客觀性與真實性。若繪師私自外流、公開由本平台產生之加密識別碼，並配合其他個資進行公開指認（即「公審」），其衍生之法律責任（如妨害名譽、違反個資法）由<strong>使用者自行承擔</strong>，與本平台無涉。
  </p>
  <p>
    3. 本平台不對黑單內容進行實質審查，僅提供技術紀錄。若涉及惡意抹黑之爭議，本平台得應司法機關要求，提供相關歷程紀錄（ActionLogs）以供查證。
  </p>
</section>

// 建議加入 src/pages/Terms.tsx
<section>
  <h3 style={{ color: '#ecb05c' }}>六、使用者行為規範</h3>
  <ul>
    <li>
      <strong>識別碼用途限制：</strong> 系統顯示之委託人識別碼（如 User-XXXXX）僅供繪師於本平台內辨識委託對象、管理委託進度使用。
    </li>
    <li>
      <strong>禁止公審行為：</strong> 用戶不得利用本平台提供之資訊，於社交媒體進行惡意抹黑或無事實根據之指控。
    </li>
    <li>
      <strong>第三方行為免責：</strong> 若用戶私自將本平台之識別碼與外部社群帳號（如 Facebook, LINE）進行連結並公開發布，導致之糾紛與損害，本平台概不負責。
    </li>
  </ul>
</section>


    </div>
  );
}