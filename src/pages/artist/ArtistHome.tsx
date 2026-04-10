import { useLocation } from 'react-router-dom';

export function ArtistHome() {
  const location = useLocation();
  const currentHash = location.hash || '#intro';

  // 根據目前的 Hash，決定下方要渲染哪一個內容區塊
  const renderContent = () => {
    switch (currentHash) {
      case '#portfolio':
        return (
          <div>
            <h3 style={sectionTitleStyle}>🖼️ 作品展示區</h3>
            <p>這裡未來會實作您的作品集瀑布流，或是依照插畫、Q版、場景等分類展示的網格。</p>
          </div>
        );
      case '#process':
        return (
          <div>
            <h3 style={sectionTitleStyle}>🔄 委託流程說明</h3>
            <p>1. <b>私訊討論</b>：請先傳送設定集與需求進行估價。<br/><br/>
               2. <b>建立報價單</b>：確認接單後，我會給您專屬委託連結。<br/><br/>
               3. <b>草圖確認</b>：匯款後開始繪製草稿，可免費大改一次。<br/><br/>
               4. <b>線稿與底色確認</b>：可微調細節。<br/><br/>
               5. <b>完稿交付</b>：提供高解析度去背檔案與 JPG 檔。</p>
          </div>
        );
      case '#payment':
        return (
          <div>
            <h3 style={sectionTitleStyle}>💰 付款方式</h3>
            <p>✔️ <b>銀行轉帳</b>：玉山銀行 (808)<br/><br/>
               ✔️ <b>LINE Pay</b>：支援好友轉帳付款<br/><br/>
               ⚠️ <b>注意事項</b>：請於收到專屬連結後 3 日內完成匯款，逾期將自動取消排單。</p>
          </div>
        );
      case '#tos':
        return (
          <div>
            <h3 style={sectionTitleStyle}>📜 委託範圍 (規範)</h3>
            <p>🔴 <b>不接範圍</b>：R18G (血腥暴力)、機甲、爭議性題材、急件。<br/><br/>
               🟢 <b>授權範圍</b>：非商業委託僅供個人收藏、頭貼、非營利粉專發布。禁止用於 AI 訓練。<br/><br/>
               ⭕ <b>商用委託</b>：包含實體周邊販售、Vtuber 收益化直播等，價格為原報價之 2 ~ 3 倍，請事先告知。</p>
          </div>
        );
      case '#intro':
      default:
        return (
          <div>
            <h3 style={sectionTitleStyle}>✨ 詳細介紹</h3>
            <p style={{ lineHeight: '1.8' }}>
              嗨！我是測試繪師，有三年以上的接案經驗，擅長日系全彩立繪、角色設計與輕小說封面風格。<br/><br/>
              如果喜歡我的畫風，非常歡迎您透過下方的委託流程與我接洽！我會盡全力為您畫出心目中理想的角色。
            </p>
          </div>
        );
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      
      {/* 上半部：固定顯示的繪師簡介與幻燈片 */}
      <div style={{ display: 'flex', gap: '30px', marginBottom: '40px' }}>
        <div style={{ flex: 1, backgroundColor: '#fff', padding: '30px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '20px' }}>
            <div style={{ width: '90px', height: '90px', backgroundColor: '#e0e0e0', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '30px' }}>🎨</div>
            <div>
              <h2 style={{ margin: '0 0 5px 0' }}>測試繪師</h2>
              <span style={{ backgroundColor: '#e8f5e9', color: '#2e7d32', padding: '4px 8px', borderRadius: '4px', fontSize: '13px', fontWeight: 'bold' }}>目前開放排單中</span>
            </div>
          </div>
          <p style={{ color: '#555', lineHeight: '1.6' }}>
            日系全彩立繪 / 角色設計 / Vtuber 元件拆分<br/>
            📍 聯絡方式優先使用 X (Twitter) 或 LINE 官方帳號。
          </p>
        </div>

        <div style={{ flex: 1, backgroundColor: '#e0e0e0', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '250px', overflow: 'hidden', border: '1px dashed #aaa' }}>
          <span style={{ color: '#666', fontWeight: 'bold' }}>[右側作品展示：自動幻燈片模組]</span>
        </div>
      </div>

      {/* 下半部：會根據副頂端列點擊而變化的內容區 */}
      <div style={{ backgroundColor: '#fff', padding: '40px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', minHeight: '350px' }}>
        {renderContent()}
      </div>

    </div>
  );
}

// 輔助樣式：統一標題風格
const sectionTitleStyle = {
  borderBottom: '2px solid #eee',
  paddingBottom: '10px',
  marginTop: 0,
  color: '#333'
};