// src/pages/Terms.tsx
import React from 'react';

export function Terms() {
  const containerStyle: React.CSSProperties = {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '80px 24px 60px 24px',
    lineHeight: '1.8',
    color: '#000000',
    fontFamily: '"PingFang TC", "Heiti TC", "Microsoft JhengHei", sans-serif',
  };

  const sectionStyle: React.CSSProperties = {
    marginBottom: '40px',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '28px',
    fontWeight: 'bold',
    marginBottom: '32px',
    borderBottom: '2px solid rgba(255, 255, 255, 0.2)',
    paddingBottom: '12px',
    color: '#000018',
  };

  const subTitleStyle: React.CSSProperties = {
    fontSize: '20px',
    fontWeight: 'bold',
    marginBottom: '16px',
    color: '#000000',
    display: 'flex',
    alignItems: 'center',
  };

  const listStyle: React.CSSProperties = {
    paddingLeft: '20px',
    marginTop: '8px',
  };

  const itemStyle: React.CSSProperties = {
    marginBottom: '12px',
  };

  const highlightStyle: React.CSSProperties = {
    fontWeight: 'bold',
    color: '#000018',
    textDecoration: 'underline',
    textDecorationColor: 'rgba(232, 213, 196, 0.5)',
  };

  const nestedListStyle: React.CSSProperties = {
    paddingLeft: '20px',
    marginTop: '4px',
    color: 'rgba(1, 8, 15, 0.9)',
  };

  return (
    <div style={containerStyle}>
      <h1 style={titleStyle}>服務條款與收費規則</h1>

      <section style={sectionStyle}>
        <h2 style={subTitleStyle}>一、 服務內容</h2>
        <p>
          本平台（以下簡稱「本工具」）提供委託進度追蹤、合約數位存證與個人化排單表之軟體工具服務。
          <span style={highlightStyle}>本工具僅作為溝通與紀錄之輔助手段，並非繪師與委託人間交易之當事人。</span>
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={subTitleStyle}>二、 訂閱費用與額度說明</h2>
        <p style={{ marginBottom: '16px' }}>本服務依據使用者身份提供不同額度之管理服務：</p>
        <ul style={listStyle}>
          <li style={itemStyle}>
            <span style={highlightStyle}>專業版試用期：</span> 用戶可啟用 15 天試用專業版服務，試用期間享有專業版全功能，並提供 20 筆活躍委託額度。活躍額度為同時進行中之委託數量上限，結案或封存訂單後即自動釋放空位，可重複循環使用。
          </li>
          <li style={itemStyle}>
            <span style={highlightStyle}>免費版：</span>
            <ul style={nestedListStyle}>
              <li>活躍委託額度：同時進行中之委託上限為 3 筆，結案或封存後自動釋放，可無限次循環使用。</li>
              <li>許願池媒合平台：「接委託」發佈上限為每月 3 則（同時間僅保留 1 則有效貼文）。</li>
              <li>個人展示頁面：作品區、徵稿區限制為 6 張圖片。</li>
              <li>開放「頭像、簡介、詳細介紹」區塊之編輯權限。</li>
            </ul>
          </li>
          <li style={itemStyle}>
            <span style={highlightStyle}>專業版 (Pro)：</span>
            <ul style={nestedListStyle}>
              <li><span style={{ color: '#000018', fontWeight: 'bold' }}>費用：NT$ 150 / 月</span>（無自動訂閱，每月視需求購買）。</li>
              <li>活躍委託額度無限制。</li>
              <li>許願池媒合平台：「接委託」發佈次數不限（同時間仍僅保留 1 則有效貼文）。</li>
              <li>作品區、接委託區上傳限制提高至 30 張。</li>
              <li>個人展示頁面：可編輯背景色、開場動畫、數個文字說明介面。</li>
            </ul>
          </li>
        </ul>
        <p style={{ marginTop: '20px' }}>
          <span style={highlightStyle}>退款原則：</span> 依據「通訊交易解除權合理例外情事適用準則」，本服務提供之數位內容一經啟用（升級 Pro 版）即完成履約，恕不接受當月退款，特殊狀況請參考退款政策。
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={subTitleStyle}>三、 權利與責任聲明</h2>
        <p style={itemStyle}>1. 繪師與委託人間的畫作版權歸屬（包含但不限於授權範圍、著作權轉讓等協議）、酬金給付及糾紛處理，應依據雙方於建單時簽署之「協議書內容」為準。</p>
        <p style={itemStyle}>2. <span style={highlightStyle}>本平台不介入亦不代為定義任何法律條文之實質效力。</span>系統不提供協議保障，實際契約義務由雙方自行議定。</p>
        <p style={itemStyle}>3. 本平台對委託人間之溝通落差、跑單或畫作品質爭議不介入處理，但提供完整歷程紀錄（ActionLogs）作為雙方舉證參考。</p>
        <p style={itemStyle}>4. <span style={highlightStyle}>本平台不主張任何用戶上傳圖檔之著作權，亦不將圖檔用於服務功能以外之目的。</span>若本平台有意將特定用戶之作品用於對外宣傳，將事先取得該用戶之明確同意，方進行使用。</p>
        <p style={itemStyle}>5. 本平台建議用戶自行保留上傳圖檔之本地端原始備份，平台不保證資料之永久留存。</p>
      </section>

      <section style={sectionStyle}>
        <h2 style={subTitleStyle}>四、 違規與法律責任</h2>
        <p style={itemStyle}>1. <span style={highlightStyle}>禁止行為：</span>用戶不得利用本服務儲存、發布或傳送任何非法、具威脅性、誹謗、猥褻、色情、侵權或違反公共秩序之內容。若上傳之畫作涉及版權爭議，由上傳用戶自行承擔所有法律責任。</p>
        <p style={itemStyle}>2. <span style={highlightStyle}>紀錄之真實性義務：</span>繪師於本平台內針對委託過程所作之紀錄（如：標註跑單、溝通狀況等），應基於客觀事實。若用戶故意捏造虛假事實導致他人名譽受損，相關法律責任須由該用戶負擔。</p>
        <p style={itemStyle}>3. <span style={highlightStyle}>平台處置權：</span>若用戶違反上述規定或有異常使用之情事，本平台有權不經通知即採取「暫停帳號功能」、「限制存取權限」、「永久刪除帳號」或「限制 IP 訪問」等措施。</p>
      </section>

    </div>
  );
}