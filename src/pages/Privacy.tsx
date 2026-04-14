// src/pages/Privacy.tsx
export function Privacy() {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '60px 20px', lineHeight: '1.8', color: '#5D4A3E' }}>
      <h1 style={{ fontSize: '24px', marginBottom: '24px', borderBottom: '2px solid #F4F0EB' }}>隱私權政策</h1>
      
      <section>
        <h3 style={{ color: '#A67B3E' }}>一、資料蒐集之目的與類別</h3>
        <p>本平台透過 LINE Login 進行身分驗證，蒐集之類別包括：LINE 內部唯一識別碼、顯示名稱、頭像。若您為繪師用戶，我們會蒐集您自行填寫的個人簡介、作品網址及委託規範。蒐集目的僅用於：使用者辨識、委託單紀錄管理、及專業版（Pro）資格驗證。</p>
      </section>

      <section>
        <h3 style={{ color: '#A67B3E' }}>二、利用期間與地區</h3>
        <p>您的資料將於本服務營運期間內，於台灣地區進行處理。除非法律要求或您申請刪除帳號，否則資料將持續留存於系統資料庫中。</p>
      </section>

      <section>
        <h3 style={{ color: '#A67B3E' }}>三、資料安全與技術</h3>
        <p>本平台使用 Cloudflare 安全防護技術，所有檔案（如草稿、完稿）均儲存於 R2 安全雲端儲存，並對不同角色執行權限隔離。我們承諾採取合理之技術及措施防止個人資料被竊取或洩漏。</p>
      </section>

      <section>
        <h3 style={{ color: '#A67B3E' }}>四、您的權利</h3>
        <p>您可以隨時透過 LINE 登入後修改個人資料，或聯繫開發者（Email: cath40286@gmail.com）請求停止蒐集或刪除您的帳號資料。</p>
      </section>
    </div>
  );
}