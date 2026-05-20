// src/pages/artist/Settings/NotificationSettingsTab.tsx
import React from 'react';

export interface NotificationConfig {
  notification_email: string;
  email_art_chat: number;
  email_art_progress: number;
  email_art_inbound: number;
  email_cli_chat: number;
  email_cli_progress: number;
  email_cli_bulletin: number;
}

interface NotificationSettingsTabProps {
  config: NotificationConfig;
  setConfig: React.Dispatch<React.SetStateAction<NotificationConfig>>;
  role: 'artist' | 'client';
}

export function NotificationSettingsTab({ config, setConfig, role }: NotificationSettingsTabProps) {
  
  const handleToggle = (field: keyof NotificationConfig) => {
    setConfig(prev => ({
      ...prev,
      [field]: prev[field] === 1 ? 0 : 1
    }));
  };

  const ToggleRow = ({ label, description, field }: { label: string, description: string, field: keyof NotificationConfig }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: '1px solid #F3F4F6' }}>
      <div style={{ paddingRight: '24px' }}>
        <div style={{ fontWeight: 'bold', color: '#374151', fontSize: '15px', marginBottom: '4px' }}>{label}</div>
        <div style={{ fontSize: '13px', color: '#6B7280', lineHeight: '1.4' }}>{description}</div>
      </div>
      <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px', flexShrink: 0, cursor: 'pointer' }}>
        <input 
          type="checkbox" 
          checked={config[field] === 1}
          onChange={() => handleToggle(field)}
          style={{ opacity: 0, width: 0, height: 0 }}
        />
        <span style={{
          position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: config[field] === 1 ? '#4E7A5A' : '#D1D5DB',
          transition: '.2s', borderRadius: '24px'
        }}>
          <span style={{
            position: 'absolute', content: '""', height: '18px', width: '18px', 
            left: config[field] === 1 ? '22px' : '3px', bottom: '3px', 
            backgroundColor: 'white', transition: '.2s', borderRadius: '50%',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }} />
        </span>
      </label>
    </div>
  );

  return (
    <div style={{ maxWidth: '680px', animation: 'fadeIn 0.3s ease-in-out' }}>
      
      
      <div style={{ marginBottom: '32px', backgroundColor: '#F9FAFB', padding: '20px', borderRadius: '12px', border: '1px solid #E5E7EB' }}>
        <h4 style={{ margin: '0 0 8px 0', color: '#1F2937', fontSize: '16px' }}>📧 專屬通知信箱</h4>
        <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#6B7280' }}>
          系統預設會將通知寄至您填寫的信箱。
        </p>
        <input
          type="email"
          placeholder="若留空，則只有站內小鈴鐺會收到通知"
          value={config.notification_email || ''}
          onChange={(e) => setConfig(prev => ({ ...prev, notification_email: e.target.value }))}
          style={{ 
            width: '100%', padding: '10px 14px', borderRadius: '8px', 
            border: '1px solid #D1D5DB', fontSize: '14px', outline: 'none'
          }}
        />
      </div>

      
      {role === 'artist' && (
        <div style={{ marginBottom: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ width: '4px', height: '18px', backgroundColor: '#4E7A5A', borderRadius: '2px', marginRight: '8px' }}></div>
            <h3 style={{ margin: 0, fontSize: '18px', color: '#1F2937' }}>創作者接案通知</h3>
          </div>
          <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#6B7280' }}>
            當您作為「繪師」提供服務時的郵件提醒設定。小鈴鐺通知為全域常駐，此處僅控制是否發送 Email。
          </p>

          <div style={{ backgroundColor: '#FFF', borderRadius: '12px', padding: '0 16px' }}>
            <ToggleRow 
              label="新委託與招募應徵" 
              description="當個人頁收到新委託申請，或是許願池貼文收到新的應徵/提案時寄信通知。"
              field="email_art_inbound" 
            />
            <ToggleRow 
              label="委託單與合約進度" 
              description="當委託人同意合約、確認稿件、提出修改請求，或是退回提案時寄信通知。"
              field="email_art_progress" 
            />
            <ToggleRow 
              label="洽談室新訊息" 
              description="當委託人在洽談室或正式委託單中傳送新聊天訊息時寄信通知。"
              field="email_art_chat" 
            />
          </div>
        </div>
      )}

      
      <div>
        {role === 'artist' ? (
          <div style={{ 
            marginTop: '40px', paddingTop: '32px', borderTop: '2px dashed #E5E7EB',
            position: 'relative'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ width: '4px', height: '18px', backgroundColor: '#3B82F6', borderRadius: '2px', marginRight: '8px' }}></div>
              <h3 style={{ margin: 0, fontSize: '18px', color: '#1F2937' }}>委託方消費通知</h3>
            </div>
            <div style={{ backgroundColor: '#EFF6FF', color: '#1E3A8A', padding: '12px 16px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '16px' }}>💡</span>
              <div style={{ lineHeight: '1.5' }}>
                以下為您作為「委託人」向其他創作者約稿時的通知設定。<br/>
                <span style={{ opacity: 0.8 }}>若您目前只打算接案，沒有發包委託的需求，可以保持預設或忽略此區塊。</span>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ width: '4px', height: '18px', backgroundColor: '#3B82F6', borderRadius: '2px', marginRight: '8px' }}></div>
              <h3 style={{ margin: 0, fontSize: '18px', color: '#1F2937' }}>委託管理通知</h3>
            </div>
            <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#6B7280' }}>
              當您作為委託人進行委託時的郵件提醒設定。
            </p>
          </div>
        )}

        <div style={{ backgroundColor: '#FFF', borderRadius: '12px', padding: '0 16px' }}>
          <ToggleRow 
            label="許願池投遞狀態" 
            description="當您投遞的許願池被婉拒、滿額關閉，或收到繪師的詳談邀請時寄信通知。"
            field="email_cli_bulletin" 
          />
          <ToggleRow 
            label="繪師交稿與開單進度" 
            description="當繪師主動為您開立專屬委託單、提出合約異動，或上傳最新階段稿件時寄信通知。"
            field="email_cli_progress" 
          />
          <ToggleRow 
            label="洽談室新回覆" 
            description="當繪師在洽談室或正式委託單中回覆您的聊天訊息時寄信通知。"
            field="email_cli_chat" 
          />
        </div>
      </div>
      
    </div>
  );
}