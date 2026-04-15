// src/pages/Privacy.tsx
import React from 'react';

export function Privacy() {
  const containerStyle: React.CSSProperties = {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '80px 24px 60px 24px',
    lineHeight: '1.8',
    color: '#5D4A3E',
    fontFamily: '"PingFang TC", "Heiti TC", "Microsoft JhengHei", sans-serif',
  };

  const sectionStyle: React.CSSProperties = {
    marginBottom: '40px',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '28px',
    fontWeight: 'bold',
    marginBottom: '32px',
    borderBottom: '2px solid #F4F0EB',
    paddingBottom: '12px',
    color: '#5D4A3E',
  };

  const subTitleStyle: React.CSSProperties = {
    fontSize: '20px',
    fontWeight: 'bold',
    marginBottom: '16px',
    color: '#A67B3E',
    display: 'flex',
    alignItems: 'center',
  };

  const listStyle: React.CSSProperties = {
    paddingLeft: '20px',
    marginTop: '8px',
  };

  const itemStyle: React.CSSProperties = {
    marginBottom: '8px',
  };

  const highlightStyle: React.CSSProperties = {
    fontWeight: 'bold',
    color: '#5D4A3E',
  };

  return (
    <div style={containerStyle}>
      <h1 style={titleStyle}>隱私權政策 (Privacy Policy)</h1>
      <p style={{ marginBottom: '32px', opacity: 0.8 }}>
        本平台（以下簡稱「本工具」）致力於保障用戶的隱私與資安。請詳細閱讀以下隱私權保護政策：
      </p>

      <section style={sectionStyle}>
        <h2 style={subTitleStyle}>一、 資料蒐集之目的與類別</h2>
        <div style={itemStyle}>
          <span style={highlightStyle}>1. 身分識別：</span>
          本平台將使用 LINE 作為第三方驗證機制，在經您同意授權後，僅獲取您的 <span style={highlightStyle}>識別碼 (Unique ID)、顯示名稱及頭像網址</span>。我們不會存取您的私密通訊紀錄、密碼或好友名單。
        </div>
        <div style={itemStyle}>
          <span style={highlightStyle}>2. 服務提供：</span>
          若您為繪師用戶，我們將蒐集您主動提供之資訊（如：簡介、作品圖片、委託規範），僅用於協助您管理委託流程、展示個人名片及驗證專業版資格。
        </div>
      </section>

      <section style={sectionStyle}>
        <h2 style={subTitleStyle}>二、 資料安全與技術保護</h2>
        <p>本平台將盡力採取當代合理之技術及程序維護資訊安全，以保障您的資料安全，包含但不限於：</p>
        <ul style={listStyle}>
          <li style={itemStyle}>
            <span style={highlightStyle}>檔案保護：</span>所有上傳之預覽圖與草稿均會由系統自動加上<span style={highlightStyle}>數位浮水印</span>。
          </li>
          <li style={itemStyle}>
            <span style={highlightStyle}>權限控管：</span>嚴格限制閱覽權限，僅有具備對應權限之用戶（如當事繪師與委託人）方可透過系統驗證存取相關檔案。
          </li>
          <li style={itemStyle}>
            <span style={highlightStyle}>加密機制：</span>全站採用 SSL / HTTPS 加密傳輸，並針對敏感資料執行加密存儲與存取隔離，防止資料被非法竊取。
          </li>
        </ul>
      </section>

      <section style={sectionStyle}>
        <h2 style={subTitleStyle}>三、 帳號刪除機制</h2>
        <p>
          您可隨時透過聯繫開發者（Email: cath40286@gmail.com）申請刪除帳號。
          <span style={highlightStyle}> 帳號刪除後，本平台將會全部刪除您留存於系統內的個人資料、作品集圖片以及相關委託紀錄，不予保留。</span>
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={subTitleStyle}>四、 使用者權益與匿名性保護</h2>
        <div style={itemStyle}>
          <span style={highlightStyle}>1. 匿名性保護：</span>
          本平台產出之使用者編號（User-ID）係由系統亂數產生，旨在保護用戶之現實身分，此編號僅供平台內信用參考之用。
        </div>
        <div style={itemStyle}>
          <span style={highlightStyle}>2. 對外提供規範：</span>
          本平台不會將您的資料售予第三方。僅在司法單位依法要求調閱紀錄，或為執行必要之第三方驗證（如 LINE 登入）時，方提供必要之資訊。
        </div>
      </section>

      <section style={sectionStyle}>
        <h2 style={subTitleStyle}>五、 您的權利與聯繫管道</h2>
        <p>
          您可以隨時透過 LINE 登入後修改您的個人資料。若對本政策或資料處理有任何疑問，請聯繫開發者：
          <br />
          <span style={highlightStyle}>客服信箱：cath40286@gmail.com</span>
        </p>
      </section>

      <div style={{ 
        marginTop: '60px', 
        fontSize: '12px', 
        color: 'rgba(93, 74, 62, 0.5)', 
        textAlign: 'center',
        borderTop: '1px solid #F4F0EB',
        paddingTop: '20px'
      }}>
        最後更新日期：2024年3月21日
      </div>
    </div>
  );
}