import { useState } from 'react';
import type { QuotaInfo } from '../Settings/types';

interface Props {
  quotaInfo: QuotaInfo | null;
  fetchUserData: () => void;
  onToast: (msg: string, type: 'ok' | 'err') => void;
}

export function SubscriptionTab({ quotaInfo, fetchUserData, onToast }: Props) {
  const [isUpgrading, setIsUpgrading] = useState(false);
  const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

  const handleStartTrial = async () => {
    // 功能目前暫停開放
    onToast('試用功能維護中，暫不開放開啟', 'err');
    /* 原有邏輯保留備用
    try {
      const res = await fetch(`${API_BASE}/api/test/start-trial`, { method: 'POST', credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        onToast(data.message || '15 天試用已開啟', 'ok');
        fetchUserData();
      } else {
        onToast(data.error || '開啟試用失敗', 'err');
      }
    } catch(e) { 
      onToast('連線失敗', 'err'); 
    }
    */
  };

  const handleUpgradeClick = async () => {
    // 功能目前暫停開放
    onToast('升級功能維護中，暫不開放訂閱', 'err');
    /* 原有邏輯保留備用
    setIsUpgrading(true);
    try {
      const response = await fetch(`${API_BASE}/api/payment/create`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_type: "pro" })
      });
      const result = await response.json();
      if (result.success && result.data) {
        const form = document.createElement("form");
        form.method = "POST";
        form.action = result.data.PayGateWay;
        const params = {
          MerchantID: result.data.MerchantID,
          TradeInfo: result.data.TradeInfo,
          TradeSha: result.data.TradeSha,
          Version: result.data.Version,
        };
        for (const [key, value] of Object.entries(params)) {
          const input = document.createElement("input");
          input.type = "hidden";
          input.name = key;
          input.value = value as string;
          form.appendChild(input);
        }
        document.body.appendChild(form);
        form.submit(); 
      } else {
        onToast("訂單建立失敗：" + (result.error || "請稍後再試"), 'err');
        setIsUpgrading(false);
      }
    } catch (error) {
      console.error("升級失敗:", error);
      onToast("系統連線異常", 'err');
      setIsUpgrading(false);
    }
    */
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
        
        {/* 基礎免費版 */}
        <div style={{ border: quotaInfo?.plan_type === 'free' ? '2px solid #5D4A3E' : '1px solid #EAE6E1', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', backgroundColor: quotaInfo?.plan_type === 'free' ? '#FFFFFF' : '#FBFBF9', boxShadow: quotaInfo?.plan_type === 'free' ? '0 4px 16px rgba(0,0,0,0.05)' : 'none' }}>
          <h4 style={{ margin: 0, fontSize: '18px', color: '#5D4A3E' }}>基礎免費版</h4>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#5D4A3E' }}>NT$ 0 <span style={{ fontSize: '14px', fontWeight: 'normal', color: '#A0978D' }}>/ 月</span></div>
          <ul style={{ margin: 0, paddingLeft: '20px', color: '#7A7269', fontSize: '14px', lineHeight: '1.8', flex: 1 }}>
            <li>每月最高建立 <strong>3 筆</strong>委託單</li>
            <li>單檔上傳最高 <strong>5MB</strong> 限制</li>
            <li>開放編輯「頭像與簡介、作品展示、詳細介紹」</li>
            <li>公開頁面最多展示 <strong>前 6 張</strong>作品</li>
          </ul>
          {quotaInfo?.plan_type === 'free' ? (
            <div style={{ textAlign: 'center', padding: '12px', color: '#A0978D', fontWeight: 'bold', backgroundColor: '#F0ECE7', borderRadius: '8px' }}>目前方案</div>
          ) : (
            <div style={{ textAlign: 'center', padding: '12px', color: '#A0978D', fontSize: '13px' }}>到期後將自動降級至此方案</div>
          )}
        </div>

        {/* 專業版 (15天試用) */}
        <div style={{ border: quotaInfo?.plan_type === 'trial' ? '2px solid #A67B3E' : '1px solid #EAE6E1', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', backgroundColor: quotaInfo?.plan_type === 'trial' ? '#FFFFFF' : '#FBFBF9', boxShadow: quotaInfo?.plan_type === 'trial' ? '0 4px 16px rgba(0,0,0,0.05)' : 'none' }}>
          <h4 style={{ margin: 0, fontSize: '18px', color: '#A67B3E' }}>專業版 (15天試用)</h4>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#5D4A3E' }}>免費體驗</div>
          <ul style={{ margin: 0, paddingLeft: '20px', color: '#7A7269', fontSize: '14px', lineHeight: '1.8', flex: 1 }}>
            <li>試用期間可建立 <strong>20 筆</strong>委託單</li>
            <li>單檔上傳最高 <strong>5MB</strong> 限制</li>
            <li>解鎖編輯所有區塊權限</li>
            <li>解鎖最高 <strong>20 張</strong>作品展示上限</li>
            <li>解鎖最高 <strong>10 個</strong>徵稿/販售項目</li>
            <li>解鎖「徵稿/販售區」開放展示 <strong>10 個</strong>項目</li>
            <li style={{ color: '#A67B3E', listStyle: 'none', marginLeft: '-20px', marginTop: '10px' }}>降級保障：方案過期後，已設定的進階區塊與超過 6張的作品和徵稿不會刪除會持續展示，僅鎖定後台編輯權限。</li>
          </ul>
          {quotaInfo?.plan_type === 'trial' ? (
              <div style={{ textAlign: 'center', padding: '12px', color: '#A67B3E', fontWeight: 'bold', backgroundColor: '#FDF4E6', borderRadius: '8px' }}>試用中</div>
          ) : quotaInfo?.trial_start_at ? (
              <div style={{ textAlign: 'center', padding: '12px', color: '#A0978D', fontSize: '13px' }}>您已經使用過免費試用額度</div>
          ) : (
            <div style={{ textAlign: 'center', padding: '12px', color: '#A0978D', backgroundColor: '#F0ECE7', borderRadius: '8px', fontSize: '14px' }}>
              試用功能暫未開放
            </div>
            /* 暫時隱藏按鈕
            <button onClick={handleStartTrial} style={{ padding: '12px', backgroundColor: '#A67B3E', color: '#FFF', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', transition: 'opacity 0.2s' }}>開啟 15 天試用</button>
            */
          )}
        </div>

        {/* 專業版 */}
        <div style={{ border: quotaInfo?.plan_type === 'pro' ? '2px solid #4E7A5A' : '1px solid #EAE6E1', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', backgroundColor: quotaInfo?.plan_type === 'pro' ? '#FFFFFF' : '#FBFBF9', boxShadow: quotaInfo?.plan_type === 'pro' ? '0 4px 16px rgba(0,0,0,0.05)' : 'none' }}>
          <h4 style={{ margin: 0, fontSize: '18px', color: '#4E7A5A' }}>專業版</h4>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#5D4A3E' }}>NT$ 150 <span style={{ fontSize: '14px', fontWeight: 'normal', color: '#A0978D' }}>/ 月</span></div>
          <ul style={{ margin: 0, paddingLeft: '20px', color: '#7A7269', fontSize: '14px', lineHeight: '1.8', flex: 1 }}>
            <li><strong>無限制建立委託單數量</strong></li>
            <li>解鎖編輯「所有」進階區塊編輯權限</li>
            <li>單檔上傳最高 <strong>5MB</strong> 限制</li>
            <li>解鎖最高 <strong>30 張</strong>作品展示上限</li>
            <li>「徵稿/販售區」開放展示 <strong>30 個</strong>項目</li>
            <li>享有未來所有進階功能更新</li>
          </ul>
          {quotaInfo?.plan_type === 'pro' ? (
              <div style={{ textAlign: 'center', padding: '12px', color: '#4E7A5A', fontWeight: 'bold', backgroundColor: '#E8F3EB', borderRadius: '8px' }}>已訂閱專業版</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ textAlign: 'center', padding: '12px', color: '#A0978D', backgroundColor: '#F0ECE7', borderRadius: '8px', fontSize: '14px' }}>
                訂閱功能升級中，暫不開放
              </div>
              <div style={{ fontSize: '12px', color: '#A0978D', textAlign: 'center', lineHeight: '1.4' }}>
                目前系統正在進行金流模組維護。
              </div>
              {/* 暫時隱藏按鈕與政策連結
              <div style={{ fontSize: '12px', color: '#A05C5C', textAlign: 'center', lineHeight: '1.4' }}>
                點擊按鈕即代表同意<a href="/refund-policy" target="_blank" rel="noreferrer" style={{ color: '#A05C5C', textDecoration: 'underline' }}>退款政策</a>，<br/>數位內容一經啟用恕不退費。
              </div>                        
              <button 
                onClick={handleUpgradeClick} 
                disabled={isUpgrading}
                style={{ 
                  padding: '12px', backgroundColor: isUpgrading ? '#C4BDB5' : '#4E7A5A', color: '#FFF', 
                  border: 'none', borderRadius: '8px', cursor: isUpgrading ? 'not-allowed' : 'pointer', 
                  fontWeight: 'bold', transition: 'opacity 0.2s', width: '100%'
                }} 
              >
                {isUpgrading ? '導向安全支付頁面...' : '升級專業版 (線上刷卡)'}
              </button>
              */}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}