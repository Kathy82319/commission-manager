// src/pages/Terms.tsx
import React from 'react';

export function Terms() {
  const containerStyle: React.CSSProperties = {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '80px 24px 60px 24px',
    lineHeight: '1.8',
    color: '#F8F9FA', 
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
    color: '#FFFFFF', 
  };

  const subTitleStyle: React.CSSProperties = {
    fontSize: '20px',
    fontWeight: 'bold',
    marginBottom: '16px',
    color: '#E8D5C4',
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
    color: '#FFFFFF', 
    textDecoration: 'underline',
    textDecorationColor: 'rgba(232, 213, 196, 0.5)',
  };

  const nestedListStyle: React.CSSProperties = {
    paddingLeft: '20px',
    marginTop: '4px',
    color: 'rgba(248, 249, 250, 0.9)', 
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
            <span style={highlightStyle}>專業版試用期：</span> 用戶可啟用 15 天試用專業版服務，試用期間享有專業版全功能，並提供 20 筆委託建單額度。
          </li>
          <li style={itemStyle}>
            <span style={highlightStyle}>額度扣抵順序：</span> 若用戶擁有試用額度，系統將優先扣抵該 20 筆額度，用罄後方開始使用當月之免費額度。
          </li>
          <li style={itemStyle}>
            <span style={highlightStyle}>免費版：</span>
            <ul style={nestedListStyle}>
              <li>每月提供 3 筆委託單建立額度。</li>
              <li>個人展示頁面：作品區、徵稿區限制為 6 張圖片。</li>
              <li>開放「頭像、簡介、詳細介紹」區塊之編輯權限。</li>
            </ul>
          </li>
          <li style={itemStyle}>
            <span style={highlightStyle}>專業版 (Pro)：</span>
            <ul style={nestedListStyle}>
              <li><span style={{ color: '#FFFFFF', fontWeight: 'bold' }}>費用：NT$ 150 / 月</span> (無自動訂閱，每月視需求購買)。</li>
              <li>無接單數量限制。</li>
              <li>作品區、徵稿區上傳限制提高至 30 張。</li>
              <li>個人展示頁面：可編輯背景色、開場動畫、數個文字說明介面</li>
            </ul>
          </li>
        </ul>
        <p style={{ marginTop: '20px' }}>
          <span style={highlightStyle}>退款原則：</span> 依據「通訊交易解除權合理例外情事適用準則」，本服務提供之數位內容一經啟用（升級 Pro 版）即完成履約，恕不接受當月退款，特殊狀況請參考退款政策。
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={subTitleStyle}>三、 權利與責任免責聲明</h2>
        <p style={itemStyle}>1. 繪師與委託人間的畫作版權歸屬（包含但不限於授權範圍、著作權轉讓等協議）、酬金給付及糾紛處理，應依據雙方於建單時簽署之「協議書內容」為準。</p>
        <p style={itemStyle}>2. <span style={highlightStyle}>本平台不介入亦不代為定義任何法律條文之實質效力。</span> 系統不提供協議保障，實際契約義務由雙方自行議定。</p>
        <p style={itemStyle}>3. 本平台對委託人間之溝通落差、跑單或畫作品質爭議不負法律賠償責任，但提供完整歷程紀錄（ActionLogs）作為舉證參考。</p>
      </section>

      <section style={sectionStyle}>
        <h2 style={subTitleStyle}>四、 違規與法律責任</h2>
        <p style={itemStyle}>1. <span style={highlightStyle}>禁止行為：</span>用戶不得利用本服務儲存、發布或傳送任何非法、具威脅性、誹謗、猥褻、色情、侵權或違反公共秩序之內容。若上傳之畫作涉及版權爭議，由上傳用戶自行承擔所有法律責任。</p>
        <p style={itemStyle}>2. <span style={highlightStyle}>紀錄之真實性義務：</span>繪師於本平台內針對委託過程所作之紀錄（如：標註跑單、溝通狀況等），應基於客觀事實。若用戶故意捏造虛假事實導致他人名譽受損，相關法律責任須由該用戶負擔。</p>
        <p style={itemStyle}>3. <span style={highlightStyle}>異常使用防範：</span>用戶不得利用自動化程式或人為惡意手段進行不合理之資源耗損行為，包含但不限於短時間內大量建立單據（如一分鐘內連續建單）、大量上傳無關或冗餘圖檔、或執行任何足以導致伺服器效能受損之行為。</p>
        <p style={itemStyle}>4. <span style={highlightStyle}>平台處置權：</span>若用戶違反上述規定或有異常使用之情事，本平台有權不經通知即採取「暫停帳號功能」、「限制存取權限」、「永久刪除帳號」或「限制 IP 訪問」等措施。</p>
      </section>


    </div>
  );
}