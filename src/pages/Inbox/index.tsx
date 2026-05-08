// src/pages/Inbox/index.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';
import '../../styles/Inbox.css';

import { InboundTab } from './InboundTab';
import { OutboundTab } from './OutboundTab';
import { DirectInboundTab } from './DirectInboundTab'; 

const getMiniBadge = (status: string) => {
  if (status === 'pending') return <span className="mini-badge pending">待處理</span>;
  if (status === 'accepted') return <span className="mini-badge accepted">已成單</span>;
  if (status === 'declined' || status === 'cancelled') return <span className="mini-badge declined">已婉拒</span>;
  if (status === 'proposed') return <span className="mini-badge pending" style={{ background: '#EBF2F7', color: '#4A7294', borderColor: '#C1D6E8' }}>已提案</span>;
  return null;
};

const formatShortTime = (dateStr: string) => {
  if (!dateStr) return '';
  const d = new Date(dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T') + 'Z');
  return d.toLocaleDateString('zh-TW', { month: '2-digit', day: '2-digit' }) + ' ' + d.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false });
};

export const Inbox: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['wishes', 'inbound', 'outbound']));
  
  const [showArchived, setShowArchived] = useState(false);

  const [selectedItem, setSelectedItem] = useState<{ type: string; id: string } | null>(null);

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [clientBulletins, setClientBulletins] = useState<any[]>([]);
  const [clientInquiries, setClientInquiries] = useState<any[]>([]);
  const [artistInquiries, setArtistInquiries] = useState<any[]>([]);
  const [directInquiries, setDirectInquiries] = useState<any[]>([]);
  const [directOutboundInquiries, setDirectOutboundInquiries] = useState<any[]>([]);
  const [blacklistedIds, setBlacklistedIds] = useState<string[]>([]);

  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false); 
  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null);
  const [selectedInquiryToDecline, setSelectedInquiryToDecline] = useState<any>(null);
  const [batchDeclineIds, setBatchDeclineIds] = useState<Set<string>>(new Set());
  
  const isBatchMode = batchDeclineIds.size > 0;
  const isCancelMode = !!cancelTargetId; 

  const [declineReason, setDeclineReason] = useState('');
  const [declineTemplates, setDeclineTemplates] = useState<string[]>([
    '目前檔期較滿，暫不接單', '經過評估，可能有預算考量', '較不擅長此題材，怕無法達到期望'
  ]);
  const [isEditingTemplates, setIsEditingTemplates] = useState(false);
  const [tempTemplates, setTempTemplates] = useState<string[]>(['', '', '']);

  const fetchInbox = async () => {
    setLoading(true);
    try {
      const [
        meRes, relRes, 
        clientBulletinRes, artistBulletinRes, 
        directInRes, directOutRes
      ] = await Promise.all([
        apiClient.get('/api/users/me'),
        apiClient.get('/api/relations'),
        apiClient.get('/api/bulletins/client/inbox'),
        apiClient.get('/api/bulletins/artist/inbox'),
        apiClient.get('/api/direct-inquiries'),
        apiClient.get('/api/direct-inquiries/outbound')
      ]);

      if (meRes.success) {
        setCurrentUser(meRes.data);
        try {
          const settings = typeof meRes.data.profile_settings === 'string' ? JSON.parse(meRes.data.profile_settings) : meRes.data.profile_settings;
          if (settings?.decline_templates && Array.isArray(settings.decline_templates)) {
            setDeclineTemplates(settings.decline_templates);
          }
        } catch(e) {}
      }

      if (relRes.success && relRes.data) {
        setBlacklistedIds(relRes.data.filter((r: any) => r.relation_type === 'blacklist').map((r: any) => r.target_user_id));
      }

      if (clientBulletinRes.success) {
        setClientBulletins(clientBulletinRes.data.bulletins || []);
        setClientInquiries(clientBulletinRes.data.inquiries || []);
      }
      if (artistBulletinRes.success) setArtistInquiries(artistBulletinRes.data || []);
      if (directInRes.success) setDirectInquiries(directInRes.data || []);
      if (directOutRes.success) setDirectOutboundInquiries(directOutRes.data || []);

    } catch (error) { 
      console.error("載入失敗", error); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { fetchInbox(); }, []);

  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      newSet.has(group) ? newSet.delete(group) : newSet.add(group);
      return newSet;
    });
  };

  const handleSelectItem = (type: string, id: string) => {
    setSelectedItem({ type, id });
    setShowMobileSidebar(false);
  };

  const archivedStatuses = ['accepted', 'declined', 'cancelled', 'closed'];

  const displayBulletins = showArchived 
    ? clientBulletins.filter(b => b.status !== 'open') 
    : clientBulletins.filter(b => b.status === 'open');

  const displayDirectInquiries = showArchived
    ? directInquiries.filter(i => archivedStatuses.includes(i.status))
    : directInquiries.filter(i => !archivedStatuses.includes(i.status));

  const pendingDirectCount = directInquiries.filter(i => i.status === 'pending').length;
  
  const combinedOutbound = [
    ...artistInquiries.map(item => ({ ...item, is_direct: false })),
    ...directOutboundInquiries.map(item => ({ ...item, is_direct: true, inquiry_id: item.id }))
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const displayOutbound = showArchived
    ? combinedOutbound.filter(i => archivedStatuses.includes(i.is_direct ? i.status : i.inquiry_status))
    : combinedOutbound.filter(i => !archivedStatuses.includes(i.is_direct ? i.status : i.inquiry_status));


  const getMobileHeaderTitle = () => {
    if (!selectedItem) return '收件匣';
    if (selectedItem.type === 'bulletin') return '許願池提案管理';
    if (selectedItem.type === 'direct') return '專屬客製化委託';
    if (selectedItem.type === 'outbound') return '我投遞的申請';
    return '收件匣';
  };

  const handleCloseModal = () => {
    setShowDeclineModal(false);
    setIsEditingTemplates(false);
    setBatchDeclineIds(new Set());
    setSelectedInquiryToDecline(null);
    setCancelTargetId(null);
    setDeclineReason('');
  };

  const handleConfirmDecline = async () => {
    if (!isBatchMode && !selectedInquiryToDecline && !isCancelMode) return;
    const finalReason = declineReason || '已終止洽談 / 撤銷申請';
    try {
      if (isCancelMode && cancelTargetId) {
        await apiClient.patch(`/api/bulletins/${cancelTargetId}/close`, { decline_reason: finalReason });
        alert('許願貼文已撤銷。');
      } else if (isBatchMode) {
        await apiClient.post('/api/inquiries/batch-decline', { inquiry_ids: Array.from(batchDeclineIds), decline_reason: finalReason });
        alert(`批次處理完成！`);
      } else if (selectedInquiryToDecline) {
        const id = selectedInquiryToDecline.inquiry_id || selectedInquiryToDecline.id;
        if (selectedInquiryToDecline.showcase_id) {
          await apiClient.post(`/api/direct-inquiries/${id}/decline`, { decline_reason: finalReason });
        } else {
          await apiClient.post(`/api/inquiries/${id}/decline`, { decline_reason: finalReason });
        }
        alert('已傳送婉拒/撤回通知。');
      }
      handleCloseModal(); 
      fetchInbox(); 
    } catch (error: any) { 
      alert(error.message || '發生錯誤'); 
    }
  };

  const handleDirectInvite = async (inq: any) => {
    try {
      await apiClient.patch(`/api/inquiries/${inq.inquiry_id}/submit-response`, { client_response: "案主已確認提案，開啟聊天室與您詳談。" });
      fetchInbox(); 
    } catch (error: any) { 
      alert('開啟失敗'); 
    }
  };

  const handleSaveTemplates = async () => {
    try {
      const settings = typeof currentUser?.profile_settings === 'string' 
        ? JSON.parse(currentUser.profile_settings || '{}') 
        : (currentUser?.profile_settings || {});
        
      settings.decline_templates = tempTemplates;
      await apiClient.patch('/api/users/me', { profile_settings: JSON.stringify(settings) });
      setDeclineTemplates(tempTemplates);
      setIsEditingTemplates(false);
      alert('✅ 罐頭訊息已成功儲存！');
    } catch (e) {
      alert('儲存失敗，請檢查網路連線');
    }
  };

  return (
    <div className="inbox-layout">
      
      <div className={`sidebar-overlay ${showMobileSidebar ? 'open' : ''}`} onClick={() => setShowMobileSidebar(false)}></div>

      <div className={`inbox-master-sidebar custom-scrollbar ${showMobileSidebar ? 'open' : ''}`}>
        <div className="inbox-sidebar-header">
          <h1 className="inbox-sidebar-title">收件匣</h1>
          <button onClick={() => setShowRulesModal(true)} className="inbox-rules-btn">? 規則</button>
        </div>

        {/* 🌟 切換開關區塊 */}
        <div className="inbox-filter-container">
          <div className="filter-toggle-box">
            <button className={`filter-tab-btn ${!showArchived ? 'active' : ''}`} onClick={() => setShowArchived(false)}>
              處理中
            </button>
            <button className={`filter-tab-btn ${showArchived ? 'active' : ''}`} onClick={() => setShowArchived(true)}>
              已結案 / 歸檔
            </button>
          </div>
        </div>

        <div className="accordion-group">
          <div className="accordion-header" onClick={() => toggleGroup('wishes')}>
            <span className="accordion-title">
              <span className={`accordion-icon ${expandedGroups.has('wishes') ? 'open' : ''}`}>▶</span>
              🌠 {showArchived ? '歷史許願池' : '許願池收件匣'}
            </span>
          </div>
          {expandedGroups.has('wishes') && (
            displayBulletins.length > 0 ? displayBulletins.map(b => {
              const isSelected = selectedItem?.type === 'bulletin' && selectedItem?.id === b.id;
              const inqCount = clientInquiries.filter(i => i.bulletin_id === b.id && i.inquiry_status === 'pending').length;
              return (
                <div key={b.id} className={`mini-card ${isSelected ? 'active' : ''}`} onClick={() => handleSelectItem('bulletin', b.id)}>
                  <div className="mini-card-meta">
                    <span>{formatShortTime(b.created_at)}</span>
                    <span className="mini-badge bulletin">{b.status === 'open' ? '發布中' : '已關閉'}</span>
                  </div>
                  <div className="mini-card-title">📌 {b.title || '未命名貼文'}</div>
                  <div className="mini-card-subtitle" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>共 {b.inquiry_count || 0} 份提案</span>
                    {!showArchived && inqCount > 0 && <span style={{ color: '#EF4444', fontWeight: 'bold' }}>{inqCount} 待看</span>}
                  </div>
                </div>
              );
            }) : <div className="mini-card-empty">目前沒有相關紀錄</div>
          )}
        </div>

        <div className="accordion-group">
          <div className="accordion-header" onClick={() => toggleGroup('inbound')}>
            <span className="accordion-title">
              <span className={`accordion-icon ${expandedGroups.has('inbound') ? 'open' : ''}`}>▶</span>
              📥 表單收件匣
            </span>
            {!showArchived && pendingDirectCount > 0 && <span className="accordion-badge">{pendingDirectCount}</span>}
          </div>
          {expandedGroups.has('inbound') && (
            displayDirectInquiries.length > 0 ? displayDirectInquiries.map(inq => {
              const isSelected = selectedItem?.type === 'direct' && selectedItem?.id === inq.id;
              const isGuest = !inq.client_id;
              return (
                <div key={inq.id} className={`mini-card ${isSelected ? 'active' : ''}`} onClick={() => handleSelectItem('direct', inq.id)}>
                  <div className="mini-card-meta">
                    <span>{formatShortTime(inq.created_at)}</span>
                    {getMiniBadge(inq.status)}
                  </div>
                  <div className="mini-card-title">{isGuest ? '👤 訪客委託' : (inq.client_name || '案主')}</div>
                  <div className="mini-card-subtitle">項目：{inq.showcase_title || '未命名'}</div>
                </div>
              );
            }) : <div className="mini-card-empty">目前沒有相關紀錄</div>
          )}
        </div>

        <div className="accordion-group">
          <div className="accordion-header" onClick={() => toggleGroup('outbound')}>
            <span className="accordion-title">
              <span className={`accordion-icon ${expandedGroups.has('outbound') ? 'open' : ''}`}>▶</span>
              🚀 寄件匣
            </span>
          </div>
          {expandedGroups.has('outbound') && (
            displayOutbound.length > 0 ? displayOutbound.map(inq => {
              const isSelected = selectedItem?.type === 'outbound' && selectedItem?.id === inq.inquiry_id;
              const targetName = inq.is_direct ? inq.artist_name : inq.client_name;
              const status = inq.is_direct ? inq.status : inq.inquiry_status;
              return (
                <div key={inq.inquiry_id} className={`mini-card ${isSelected ? 'active' : ''}`} onClick={() => handleSelectItem('outbound', inq.inquiry_id)}>
                  <div className="mini-card-meta">
                    <span>{formatShortTime(inq.created_at)}</span>
                    {getMiniBadge(status)}
                  </div>
                  <div className="mini-card-title">投給：{targetName || '未知'}</div>
                  <div className="mini-card-subtitle">{inq.is_direct ? '專屬委託單' : (inq.bulletin_title || '許願池提案')}</div>
                </div>
              );
            }) : <div className="mini-card-empty">目前沒有相關紀錄</div>
          )}
        </div>
      </div>

      <div className="inbox-main-content custom-scrollbar">
        <div className="mobile-inbox-header">
          <button className="mobile-menu-btn" onClick={() => setShowMobileSidebar(true)}>☰ 選單</button>
          <span className="mobile-header-title">{getMobileHeaderTitle()}</span>
        </div>

        <div className="inbox-content-wrapper" style={{ height: '100%', padding: selectedItem?.type === 'direct' ? '0' : '24px' }}>
          {loading ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#A0978D' }}>資料載入中...</div>
          ) : !selectedItem ? (
            <div style={{ textAlign: 'center', marginTop: '100px', color: '#A0978D' }}>
              <div style={{ fontSize: '48px', opacity: 0.5, marginBottom: '16px' }}>📭</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#7A7269' }}>請從左側清單選擇一筆項目</div>
            </div>
          ) : (
            <>
              {selectedItem.type === 'direct' && (
                <DirectInboundTab 
                  inquiries={directInquiries}
                  selectedInquiryId={selectedItem.id} 
                  navigate={navigate}
                  setSelectedInquiry={setSelectedInquiryToDecline}
                  setShowDeclineModal={setShowDeclineModal}
                  handleEnterInquiryWorkspace={(id) => navigate(`/inquiry/workspace/${id}`)}
                  handleViewCommission={(id) => {
                    if (id) navigate(`/artist/notebook?id=${id}`);
                    else navigate(`/artist/notebook`);
                  }}
                  blacklistedIds={blacklistedIds}
                  setSelectedIdsForBatch={setBatchDeclineIds}
                />
              )}
              {selectedItem.type === 'bulletin' && (
                <InboundTab 
                  clientBulletins={clientBulletins.filter(b => b.id === selectedItem.id)}
                  clientInquiries={clientInquiries}
                  navigate={navigate}
                  setSelectedInquiry={setSelectedInquiryToDecline}
                  setShowDeclineModal={setShowDeclineModal}
                  handleDirectInvite={handleDirectInvite}
                  handleEnterInquiryWorkspace={(id) => navigate(`/inquiry/workspace/${id}`)}
                  handleViewCommission={(id) => {
                    if (id) navigate(`/client/orders?id=${id}`);
                    else navigate(`/client/orders`);
                  }}
                  setSelectedIdsForBatch={setBatchDeclineIds}
                  blacklistedIds={blacklistedIds}
                  handleCancelBulletin={(id) => { setCancelTargetId(id); setShowDeclineModal(true); }}
                />
              )}
              {selectedItem.type === 'outbound' && (
                <OutboundTab 
                  artistInquiries={artistInquiries} 
                  directOutboundInquiries={directOutboundInquiries} 
                  selectedInquiryId={selectedItem.id} 
                  setSelectedInquiry={setSelectedInquiryToDecline}
                  setShowDeclineModal={setShowDeclineModal}
                  handleEnterInquiryWorkspace={(id) => navigate(`/inquiry/workspace/${id}`)}
                  handleViewCommission={(id) => {
                    const selectedInq = combinedOutbound.find(i => i.inquiry_id === selectedItem?.id);
                    if (selectedInq?.is_direct) {
                      if (id) navigate(`/client/orders?id=${id}`);
                      else navigate(`/client/orders`);
                    } else {
                      if (id) navigate(`/artist/notebook?id=${id}`);
                      else navigate(`/artist/notebook`);
                    }
                  }}
                  blacklistedIds={blacklistedIds} 
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* ========== 原有的 Modals ========== */}
      {showRulesModal && (
        <div className="inbox-modal-overlay" onClick={() => setShowRulesModal(false)}>
           <div className="inbox-modal-content rules-modal-content" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #EAE6E1', paddingBottom: '12px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', color: '#5D4A3E' }}><span>📋</span> 收件匣規則</h2>
              <button onClick={() => setShowRulesModal(false)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#A0978D' }}>✕</button>
            </div>
            
            <ul style={{ padding: 0, margin: 0, listStyle: 'none', color: '#7A7269', fontSize: '14px', lineHeight: '1.6' }}>
              <li style={{ marginBottom: '12px' }}>
                <strong style={{ color: '#4A7294' }}>許願池時效限制</strong>：刊登文章限時 <span style={{ color: '#EF4444' }}>3 天</span>，過期將自動下架，確保提案都是最新需求。
              </li>
              <li style={{ marginBottom: '12px' }}>
                <strong style={{ color: '#4A7294' }}>處理期限</strong>：收到提案後請盡速處理。倒數 <span style={{ color: '#EF4444' }}>不足 12 小時</span> 的提案將亮起紅燈警示。
              </li>
              <li style={{ marginBottom: '12px' }}>
                <strong style={{ color: '#4A7294' }}>逾期處理</strong>：超過 <span style={{ color: '#EF4444' }}>7 天</span> 未處理的提案，系統將視為無效並自動標記為「已失效」歸檔。
              </li>
            </ul>

            <div style={{ marginTop: '24px', textAlign: 'right' }}>
              <button style={{ padding: '8px 16px', background: '#5D4A3E', color: '#FFF', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => setShowRulesModal(false)}>
                我了解了
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeclineModal && (
        <div className="inbox-modal-overlay">
          <div className="inbox-modal-content decline-mode">
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#EF4444', marginBottom: '8px', marginTop: 0 }}>
              {isCancelMode 
                ? '⚠️ 撤銷許願與婉拒提案' 
                : isBatchMode 
                  ? `批次婉拒 (${batchDeclineIds.size} 筆)` 
                  : (selectedInquiryToDecline?.status === 'pending' || selectedInquiryToDecline?.inquiry_status === 'pending') && selectedItem?.type === 'outbound' ? '撤回申請' : '禮貌婉拒'
              }
            </h2>
            
            <p style={{ color: '#A05C5C', fontSize: '13px', marginBottom: '20px', padding: '12px', backgroundColor: '#FEF2F2', borderRadius: '8px', border: '1px solid #FECACA' }}>
              {isCancelMode
                ? '您即將撤銷這篇許願貼文。這將會關閉該貼文，並將所有尚未處理的提案一併婉拒。請填寫統一的婉拒理由以示尊重。'
                : isBatchMode
                  ? '您即將同時婉拒多筆提案，這項操作無法復原。請填寫統一的婉拒理由以示尊重。'
                  : '這將會終止洽談，建議附上簡單理由以示尊重。'
              }
            </p>

            <div className="template-manager" style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#5D4A3E' }}>快速帶入罐頭訊息：</div>
                <button 
                  style={{ background: 'none', border: 'none', color: '#4A7294', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' }}
                  onClick={() => {
                    if (!isEditingTemplates) {
                      const defaults = [...declineTemplates];
                      while (defaults.length < 3) defaults.push('');
                      setTempTemplates(defaults);
                    }
                    setIsEditingTemplates(!isEditingTemplates);
                  }}
                >
                  {isEditingTemplates ? '✕ 取消編輯' : '⚙️ 編輯罐頭訊息'}
                </button>
              </div>

              {isEditingTemplates ? (
                <div style={{ backgroundColor: '#FBFBF9', padding: '12px', borderRadius: '8px', border: '1px solid #EAE6E1' }}>
                  <div style={{ fontSize: '11px', color: '#A0978D', marginBottom: '8px' }}>在此修改您的 3 則常用婉拒原因，儲存後下次也可直接使用。</div>
                  {tempTemplates.map((temp, idx) => (
                    <div key={idx} style={{ marginBottom: '8px' }}>
                      <input 
                        type="text" 
                        value={temp} 
                        onChange={(e) => {
                          const newT = [...tempTemplates];
                          newT[idx] = e.target.value;
                          setTempTemplates(newT);
                        }} 
                        placeholder={`罐頭訊息 ${idx + 1}`}
                        style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #DED9D3', fontSize: '13px' }}
                      />
                    </div>
                  ))}
                  <div style={{ textAlign: 'right', marginTop: '12px' }}>
                    <button style={{ padding: '6px 12px', background: '#4A7294', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' }} onClick={handleSaveTemplates}>儲存變更</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {declineTemplates.map((template, idx) => {
                    if (!template.trim()) return null;
                    return (
                      <button 
                        key={idx}
                        type="button"
                        style={{ padding: '6px 12px', backgroundColor: '#FDFDFB', border: '1px solid #DED9D3', borderRadius: '99px', fontSize: '12px', color: '#7A7269', cursor: 'pointer' }}
                        onClick={() => setDeclineReason(template)}
                      >
                        {template}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <textarea 
              placeholder="例如：預算不符、時程已滿、或已找到合適人選..."
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              disabled={isEditingTemplates}
              maxLength={200} 
              style={{ width: '100%', minHeight: '100px', padding: '12px', borderRadius: '8px', border: '1px solid #DED9D3', fontSize: '13px', resize: 'vertical', opacity: isEditingTemplates ? 0.5 : 1, marginBottom: '20px', fontFamily: 'inherit' }}
            ></textarea>
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <button style={{ flex: 1, padding: '12px', background: '#F4F4F1', color: '#7A7269', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }} onClick={handleCloseModal}>再想想</button>
              <button style={{ flex: 1, padding: '12px', background: '#EF4444', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: isEditingTemplates ? 'not-allowed' : 'pointer', opacity: isEditingTemplates ? 0.5 : 1 }} onClick={handleConfirmDecline} disabled={isEditingTemplates}>確認送出</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};