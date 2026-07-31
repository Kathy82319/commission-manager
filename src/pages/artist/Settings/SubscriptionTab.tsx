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
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'quarterly'>('monthly');
  const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

  const isPromo = new Date() < new Date('2026-09-01');
  const originalMonthlyPrice = 150;
  const quarterlyPrice = 299;
  const quarterlyOriginalPrice = originalMonthlyPrice * 3;
  const quarterlySavingPct = Math.round((1 - quarterlyPrice / quarterlyOriginalPrice) * 100);

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

  const handleUpgradeClick = async () => {
    if (isUpgrading) return;
    setIsUpgrading(true);
    try {
      const response = await fetch(`${API_BASE}/api/payment/create`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_type: "pro", billing_cycle: billingCycle })
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
        
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
            <li>📋 活躍工作欄位：同時進行 <strong>3 筆</strong> (結案即釋放)</li>
            <li>✨ 許願池：投遞徵委託區 <strong>5 次</strong> / 月</li>
            <li>✨ 許願池：接委託區發佈 <strong>3 則</strong> / 月(30天自動下架)</li>
            <li style={{ color: '#B45309', fontWeight: 'bold' }}>🎉 年末活動：許願池曝光延長至 2026/12/31</li>
            <li>🖼️ 作品集展示上限 <strong>15 張</strong></li>
            <li>🖼️ 接稿區展示上限 <strong>3 張</strong></li>
            <li>📤 單檔上傳最高 3MB 限制</li>
          </ul>
          
          <div style={{ textAlign: 'center', padding: '14px', color: '#A0978D', fontSize: '14px', backgroundColor: '#F0ECE7', borderRadius: '12px', fontWeight: 'bold' }}>
            {quotaInfo?.plan_type === 'free' ? '方案使用中' : '過期後將自動降級'}
          </div>
        </div>

        <div style={{ 
          border: quotaInfo?.plan_type === 'trial' ? '2px solid #A0978D' : '1px solid #EAE6E1', 
          borderRadius: '20px', padding: '30px', display: 'flex', flexDirection: 'column', gap: '16px', 
          backgroundColor: '#FBFBF9', position: 'relative'
        }}>
          {quotaInfo?.plan_type === 'trial' && <div style={{ position: 'absolute', top: '-12px', left: '20px', backgroundColor: '#A0978D', color: 'white', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>目前方案</div>}
          <h4 style={{ margin: 0, fontSize: '18px', color: '#A0978D' }}>專業版 (15天試用)</h4>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#A0978D' }}>免費體驗</div>
          
          <div style={{ height: '1px', backgroundColor: '#EAE6E1', margin: '8px 0' }} />
          
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', color: '#A0978D', fontSize: '14px', lineHeight: '2.2', flex: 1 }}>
            <li>💎 活躍工作欄位：同時進行 <strong>20 筆</strong> 委託單</li>
            <li>💎 <strong>解除</strong> 許願池投遞與發布次數限制(30天自動下架)</li>
            <li>💎 <strong>解鎖</strong> 最高 20 張作品展示</li>
            <li>💎 <strong>解鎖</strong>「接委託區」開放展示 10 個項目</li>
            <li>💎 <strong>解鎖</strong> 所有進階編輯區塊權限</li>
          </ul>
          
          <button 
            onClick={handleStartTrial}
            disabled={isStartingTrial || quotaInfo?.plan_type === 'trial' || quotaInfo?.plan_type === 'pro'}
            style={{ 
              padding: '14px', 
              backgroundColor: (isStartingTrial || quotaInfo?.plan_type !== 'free') ? '#D1D5DB' : '#5D4A3E', 
              color: (isStartingTrial || quotaInfo?.plan_type !== 'free') ? '#9CA3AF' : '#FFFFFF', 
              border: 'none', 
              borderRadius: '12px', 
              cursor: (isStartingTrial || quotaInfo?.plan_type !== 'free') ? 'not-allowed' : 'pointer', 
              fontWeight: 'bold', fontSize: '15px'
            }}
          >
            {isStartingTrial ? '處理中...' : (quotaInfo?.plan_type === 'trial' ? '試用方案使用中' : '開啟 15 天免費試用')}
          </button>
        </div>

        <div style={{ 
          border: quotaInfo?.plan_type === 'pro' ? '2px solid #4A7294' : '1px solid #EAE6E1', 
          borderRadius: '20px', padding: '30px', display: 'flex', flexDirection: 'column', gap: '16px', 
          backgroundColor: quotaInfo?.plan_type === 'pro' ? '#F4F8FB' : '#FBFBF9',
          position: 'relative'
        }}>
          {quotaInfo?.plan_type === 'pro' && <div style={{ position: 'absolute', top: '-12px', left: '20px', backgroundColor: '#4A7294', color: 'white', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>目前方案</div>}
          <h4 style={{ margin: 0, fontSize: '18px', color: quotaInfo?.plan_type === 'pro' ? '#4A7294' : '#9CA3AF' }}>專業版</h4>

          <div style={{ display: 'flex', gap: '6px', backgroundColor: '#EFF3F6', padding: '4px', borderRadius: '10px' }}>
            <button
              type="button"
              onClick={() => setBillingCycle('monthly')}
              style={{
                flex: 1, padding: '8px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                fontSize: '13px', fontWeight: 'bold',
                backgroundColor: billingCycle === 'monthly' ? '#FFFFFF' : 'transparent',
                color: billingCycle === 'monthly' ? '#4A7294' : '#9CA3AF',
                boxShadow: billingCycle === 'monthly' ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              月繳
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle('quarterly')}
              style={{
                flex: 1, padding: '8px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                fontSize: '13px', fontWeight: 'bold', position: 'relative',
                backgroundColor: billingCycle === 'quarterly' ? '#FFFFFF' : 'transparent',
                color: billingCycle === 'quarterly' ? '#4A7294' : '#9CA3AF',
                boxShadow: billingCycle === 'quarterly' ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              季繳{quarterlySavingPct > 0 ? `（省 ${quarterlySavingPct}%）` : ''}
            </button>
          </div>

          {billingCycle === 'monthly' ? (
            isPromo ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ fontSize: '15px', color: '#B0B0B0', textDecoration: 'line-through' }}>NT$ 150 / 月</div>
                <div style={{ fontSize: '28px', fontWeight: 'bold', color: quotaInfo?.plan_type === 'pro' ? '#4A7294' : '#9CA3AF' }}>
                  NT$ 99 <span style={{ fontSize: '14px', fontWeight: 'normal', color: '#A0978D' }}>/ 月</span>
                </div>
                <div style={{ fontSize: '12px', color: '#E07B54', fontWeight: 'bold' }}>🎉 限時優惠，促銷至 2026/08/31</div>
              </div>
            ) : (
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: quotaInfo?.plan_type === 'pro' ? '#4A7294' : '#9CA3AF' }}>NT$ 150 <span style={{ fontSize: '14px', fontWeight: 'normal', color: '#A0978D' }}>/ 月</span></div>
            )
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ fontSize: '15px', color: '#B0B0B0', textDecoration: 'line-through' }}>NT$ {quarterlyOriginalPrice} / 季</div>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: quotaInfo?.plan_type === 'pro' ? '#4A7294' : '#9CA3AF' }}>
                NT$ {quarterlyPrice} <span style={{ fontSize: '14px', fontWeight: 'normal', color: '#A0978D' }}>/ 季（3個月）</span>
              </div>
              <div style={{ fontSize: '12px', color: '#A0978D' }}>平均每月 NT$ {Math.round(quarterlyPrice / 3)}（原價每月 NT$ {originalMonthlyPrice}）</div>
            </div>
          )}

          <div style={{ height: '1px', backgroundColor: '#EAE6E1', margin: '8px 0' }} />
          
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', color: '#A0978D', fontSize: '14px', lineHeight: '1.8', flex: 1 }}>
            <li>👑 活躍工作欄位上限 <strong>無限制</strong></li>
            <li>👑 許願池投遞與發布次數<strong>無限制*</strong></li>
            <li>💎 <strong>解除</strong> 許願池30天自動下架限制</li>
            <li>💎 許願池貼文<strong>優先置頂</strong>顯示（每日亂數輪替）</li>
            <li>👑 <strong>解鎖</strong> 最高 <strong>30 張</strong> 作品展示</li>
            <li>👑 <strong>解鎖</strong>「接委託區」開放展示 30 個項目</li>
          </ul>
          
          <button 
            onClick={handleUpgradeClick}
            disabled={isUpgrading}
            style={{ 
              padding: '16px', 
              backgroundColor: isUpgrading ? '#D1D5DB' : '#4A7294', 
              color: isUpgrading ? '#9CA3AF' : '#FFFFFF', 
              border: 'none', borderRadius: '12px', 
              cursor: isUpgrading ? 'not-allowed' : 'pointer', 
              fontWeight: 'bold', fontSize: '16px', width: '100%'
            }} 
          >
            {isUpgrading ? '正在建立支付單...' : (quotaInfo?.plan_type === 'pro' ? '立即續約專業版' : '立即升級專業版')}
            {!isUpgrading && (billingCycle === 'quarterly' ? '（季繳）' : '（月繳）')}
          </button>
        </div>

      </div>
    </div>
  );
}