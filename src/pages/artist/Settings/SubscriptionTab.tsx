// src/pages/artist/Settings/SubscriptionTab.tsx
import { useState } from 'react';
import type { QuotaInfo } from '../Settings/types';

interface Props {
  quotaInfo: QuotaInfo | null;
  fetchUserData: () => void;
  onToast: (msg: string, type: 'ok' | 'err') => void;
}

export function SubscriptionTab({ quotaInfo, fetchUserData, onToast }: Props) {
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [isStartingTrial, setIsStartingTrial] = useState(false);
  const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

  // 開啟 15 天試用邏輯 (測試 API 模式)
  const handleStartTrial = async () => {
    if (isStartingTrial) return;
    setIsStartingTrial(true);
    try {
      const res = await fetch(`${API_BASE}/api/test/start-trial`, { 
        method: 'POST', 
        credentials: 'include' 
      });
      const data = await res.json();
      if (data.success) {
        onToast(data.message || '15 天試用已成功開啟！', 'ok');
        fetchUserData();
      } else {
        onToast(data.error || '開啟試用失敗，請稍後再試', 'err');
      }
    } catch(e) { 
      onToast('伺服器連線失敗', 'err'); 
    } finally {
      setIsStartingTrial(false);
    }
  };

  // 升級專業版邏輯 (目前仍為測試 API 模式)
  const handleUpgradeClick = async () => {
    if (isUpgrading) return;
    setIsUpgrading(true);
    try {
      // 🌟 這裡暫時維持測試用路由，確認流程無誤再改為正式藍新路徑
      const response = await fetch(`${API_BASE}/api/payment/create`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_type: "pro" })
      });
      
      const result = await response.json();
      
      if (result.success && result.data) {
        // 建立隱藏表單並跳轉至藍新支付頁面
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
        onToast("支付單建立失敗：" + (result.error || "請稍後再試"), 'err');
        setIsUpgrading(false);
      }
    } catch (error) {
      console.error("支付流程異常:", error);
      onToast("系統連線異常，請檢查網路狀態", 'err');
      setIsUpgrading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* 頂部公測提示 */}
      <div style={{ backgroundColor: '#E0F2FE', color: '#0369A1', padding: '16px', borderRadius: '12px', border: '1px solid #BAE6FD', textAlign: 'center', fontSize: '14px', fontWeight: 'bold' }}>
        ✨ 系統公測中：目前全站功能開放免費測試，無需額外開啟試用或訂閱。
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
        
        {/* 1. 基礎免費版 */}
        <div style={{ 
          border: quotaInfo?.plan_type === 'free' ? '2px solid #5D4A3E' : '1px solid #EAE6E1', 
          borderRadius: '20px', padding: '30px', display: 'flex', flexDirection: 'column', gap: '16px', 
          backgroundColor: quotaInfo?.plan_type === 'free' ? '#FFFFFF' : '#FBFBF9',
          boxShadow: quotaInfo?.plan_type === 'free' ? '0 8px 24px rgba(93, 74, 62, 0.08)' : 'none',
          position: 'relative'
        }}>
          {quotaInfo?.plan_type === 'free' && <div style={{ position: 'absolute', top: '-12px', left: '20px', backgroundColor: '#5D4A3E', color: 'white', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>目前方案</div>}
          <h4 style={{ margin: 0, fontSize: '18px', color: '#5D4A3E' }}>基礎免費版</h4>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#5D4A3E' }}>NT$ 0 <span style={{ fontSize: '14px', fontWeight: 'normal', color: '#A0978D' }}>/ 月</span></div>
          
          <div style={{ height: '1px', backgroundColor: '#EAE6E1', margin: '8px 0' }} />
          
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', color: '#7A7269', fontSize: '14px', lineHeight: '2.2', flex: 1 }}>
            <li>📋 每月可建立 <strong>3 筆</strong> 委託單 (含許願池訂單)</li>
            <li>✨ 許願池：投遞徵委託區 <strong>5 次</strong> / 月</li>
            <li>✨ 許願池：接委託區發佈 <strong>1 則</strong> / 月</li>
            <li>🖼️ 作品集展示上限 <strong>6 張</strong></li>
            <li>📤 單檔上傳最高 3MB 限制</li>
          </ul>
          
          <div style={{ textAlign: 'center', padding: '14px', color: '#A0978D', fontSize: '14px', backgroundColor: '#F0ECE7', borderRadius: '12px', fontWeight: 'bold' }}>
            {quotaInfo?.plan_type === 'free' ? '方案使用中' : '過期後將自動降級'}
          </div>
        </div>

        {/* 2. 專業版體驗 (Trial) - 已禁用 */}
        <div style={{ 
          border: '1px solid #EAE6E1', 
          borderRadius: '20px', padding: '30px', display: 'flex', flexDirection: 'column', gap: '16px', 
          backgroundColor: '#FBFBF9', opacity: 0.8
        }}>
          <h4 style={{ margin: 0, fontSize: '18px', color: '#A0978D' }}>專業版 (15天試用)</h4>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#A0978D' }}>免費體驗</div>
          
          <div style={{ height: '1px', backgroundColor: '#EAE6E1', margin: '8px 0' }} />
          
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', color: '#A0978D', fontSize: '14px', lineHeight: '2.2', flex: 1 }}>
            <li>💎 試用期間可建立 <strong>20 筆</strong> 委託單</li>
            <li>💎 <strong>解除</strong> 許願池投遞與發布次數限制</li>
            <li>💎 <strong>解鎖</strong> 最高 20 張作品展示</li>
            <li>💎 <strong>解鎖</strong>「販售區」開放展示 10 個項目</li>
            <li>💎 <strong>解鎖</strong> 所有進階編輯區塊權限</li>
          </ul>
          
          <button 
            disabled={true}
            style={{ 
              padding: '14px', backgroundColor: '#D1D5DB', color: '#9CA3AF', border: 'none', 
              borderRadius: '12px', cursor: 'not-allowed', 
              fontWeight: 'bold', fontSize: '15px'
            }}
          >
            免費專業版開放
          </button>
        </div>

        {/* 3. 專業版 (Pro) - 已禁用 */}
        <div style={{ 
          border: '1px solid #EAE6E1', 
          borderRadius: '20px', padding: '30px', display: 'flex', flexDirection: 'column', gap: '16px', 
          backgroundColor: '#FBFBF9',
          position: 'relative',
          opacity: 0.9
        }}>
          <h4 style={{ margin: 0, fontSize: '18px', color: '#9CA3AF' }}>專業版</h4>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#9CA3AF' }}>NT$ 150 <span style={{ fontSize: '14px', fontWeight: 'normal', color: '#A0978D' }}>/ 月</span></div>
          
          <div style={{ height: '1px', backgroundColor: '#EAE6E1', margin: '8px 0' }} />
          
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', color: '#A0978D', fontSize: '14px', lineHeight: '1.8', flex: 1 }}>
            <li>👑 建立委託單數量 <strong>99張</strong></li>
            <li>👑 許願池投遞與發布次數<strong>無限制*</strong></li>
            <li>👑 <strong>解鎖</strong> 最高 <strong>30 張</strong> 作品展示</li>
            <li>👑 <strong>解鎖</strong>「販售區」開放展示 30 個項目</li>
            <li>👑 <strong>個人頁自訂：</strong>背景、開場動畫、展示分頁順序</li>
          </ul>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '12px', color: '#A0978D', textAlign: 'center', lineHeight: '1.4' }}>
              免費專業版開放中，暫不用付費訂閱。
            </div>                        
            <button 
              disabled={true}
              style={{ 
                padding: '16px', backgroundColor: '#D1D5DB', color: '#9CA3AF', 
                border: 'none', borderRadius: '12px', cursor: 'not-allowed', 
                fontWeight: 'bold', fontSize: '16px', width: '100%'
              }} 
            >
              立即升級專業版 (暫未開放)
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}