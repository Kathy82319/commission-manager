// src/pages/RefundPolicy.tsx
import React from 'react';

export function RefundPolicy() {
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
  };

  return (
    <div style={containerStyle}>
      <h1 style={titleStyle}>退款政策</h1>

      <section style={sectionStyle}>
        <h2 style={subTitleStyle}>一、 數位內容服務說明</h2>
        <p>
          本服務（包含 Pro 版之升級功能）所提供之內容屬於「非以有形媒介提供之數位內容」。
          依據《消費者保護法》及《通訊交易解除權合理例外情事適用準則》第 5 條規定，此類服務經消費者事先同意始提供，一經授權啟用（即升級 Pro 版）後，即視為完成履約，不適用 7 天鑑賞期，亦不接受當月退款。
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={subTitleStyle}>二、 故障處理與退費機制</h2>
        <p>
          若因本平台系統嚴重瑕疵，導致您購買的 Pro 版功能無法正常使用，請立即透過客服管道聯繫我們，並提供您的帳號與問題截圖。
          經確認屬實且無法於合理時間內修復，我們將依據受影響之天數比例，辦理退費。正常使用情況下，已扣除之款項不予退還。
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={subTitleStyle}>三、 服務終止與取消訂閱</h2>
        <p>
          本服務之 Pro 版採「單月購買、無自動續訂」制，費用為 NT$ 150 / 月。
          當月購買後，服務效期將持續至當月結束為止，次月如不再續用，您無需執行任何取消手續，系統不會自動向您扣款。若欲繼續使用，請於次月重新進行單次購買。
        </p>
      </section>
    </div>
  );
}