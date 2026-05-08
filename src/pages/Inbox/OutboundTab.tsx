// src/pages/Inbox/OutboundTab.tsx
import { getStatusLabel, filterOldItems } from './utils/formatters';
import { R2_PUBLIC_URL } from '../public/Wishboard/constants';
import { Ban } from 'lucide-react'; 
import '../../styles/Notebook.css'; 

interface OutboundTabProps {
  artistInquiries: any[];
  directOutboundInquiries?: any[]; 
  selectedInquiryId?: string; // 🌟 接收從父層傳來的 ID
  setSelectedInquiry: (inquiry: any) => void;
  setShowDeclineModal: (show: boolean) => void;
  handleEnterInquiryWorkspace: (id: string) => void;
  handleViewCommission: (id: string) => void; 
  blacklistedIds?: string[];
}

export const OutboundTab: React.FC<OutboundTabProps> = ({
  artistInquiries,
  directOutboundInquiries = [],
  selectedInquiryId,
  setSelectedInquiry,
  setShowDeclineModal,
  handleEnterInquiryWorkspace,
  handleViewCommission,
  blacklistedIds = []
}) => {
  const getFullUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${R2_PUBLIC_URL}/${url}`;
  };

  const getBulletinImage = (refImageKey: string) => {
    try {
      const parsed = JSON.parse(refImageKey || '[]');
      const firstImg = Array.isArray(parsed) ? parsed[0] : parsed;
      return firstImg ? getFullUrl(firstImg) : null;
    } catch {
      return refImageKey ? getFullUrl(refImageKey) : null;
    }
  };

  const parseSnapshot = (snapshotData: any) => {
    try {
      if (!snapshotData) return {};
      return typeof snapshotData === 'string' ? JSON.parse(snapshotData) : snapshotData;
    } catch (e) {
      console.error("解析投遞內容失敗", e);
      return {};
    }
  };

  const handleWithdrawClick = (item: any) => {
    if (item.inquiry_status === 'pending') {
      const confirmMsg = item.is_direct 
        ? '確定要撤回這筆委託申請嗎？'
        : '⚠️ 注意：每則許願限投遞 2 次，撤回後將消耗 1 次機會。\n\n確定要撤回這筆投遞嗎？';
        
      const isConfirmed = window.confirm(confirmMsg);
      if (!isConfirmed) return;
    }
    setSelectedInquiry(item);
    setShowDeclineModal(true);
  };

  const formatTime = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T') + 'Z');
    return d.toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const combinedInquiries = [
    ...artistInquiries.map(item => ({ ...item, is_direct: false })),
    ...directOutboundInquiries.map(item => ({
      ...item,
      is_direct: true,
      inquiry_id: item.id, 
      inquiry_status: item.status, 
      bulletin_title: item.showcase_title || '客製化委託申請',
    }))
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const filteredInquiries = combinedInquiries.filter(filterOldItems);

  if (filteredInquiries.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px', color: '#A0978D' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>🚀</div>
        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#7A7269', marginBottom: '8px' }}>目前沒有送出任何申請</div>
        <div style={{ fontSize: '14px' }}>無論是填寫別人的客製化表單，或是去許願池提案，紀錄都會顯示在這裡。</div>
      </div>
    );
  }

  // 取得目前選中的項目資料
  const selectedInq = filteredInquiries.find(i => i.inquiry_id === selectedInquiryId);

  // 如果父層傳來的 ID 找不到，顯示提示畫面
  if (!selectedInq && selectedInquiryId) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px', color: '#A0978D' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>📭</div>
        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#7A7269', marginBottom: '8px' }}>找不到該筆申請紀錄</div>
        <div style={{ fontSize: '14px' }}>請從左側清單重新選擇。</div>
      </div>
    );
  }

  // 提取選中項目的共用資料
  const targetName = selectedInq?.is_direct ? selectedInq.artist_name : selectedInq?.client_name;
  const targetPublicId = selectedInq?.is_direct ? selectedInq.artist_public_id : selectedInq?.client_public_id;
  const targetIdForBlacklist = selectedInq?.is_direct ? selectedInq.artist_id : selectedInq?.client_id;
  const isBlacklisted = blacklistedIds.includes(targetIdForBlacklist);
  const canDecline = selectedInq ? !['accepted', 'declined', 'closed'].includes(selectedInq.inquiry_status) : false;

  // 許願池專用
  const bulletinImg = selectedInq && !selectedInq.is_direct ? getBulletinImage(selectedInq.ref_image_key) : null;
  const isOffer = selectedInq && !selectedInq.is_direct && selectedInq.bulletin_category === 'offer'; 
  const snapshot = selectedInq && !selectedInq.is_direct ? parseSnapshot(selectedInq.artist_snapshot) : {};
  let displayContent = selectedInq?.bulletin_content;
  if (selectedInq && !selectedInq.is_direct) {
    try {
      const parsedContent = JSON.parse(selectedInq.bulletin_content || '{}');
      displayContent = parsedContent.description || selectedInq.bulletin_content;
    } catch (e) {}
  }

  // 表單專用
  let parsedFormAnswers: any[] = [];
  if (selectedInq?.is_direct) {
    try { parsedFormAnswers = JSON.parse(selectedInq.form_answers || '[]'); } catch (e) {}
  }

  return (
    <div className="notebook-container" style={{ height: '100%', margin: 0, padding: 0 }}>
      {/* ================= 左側清單區 (已移除，由父層控制) ================= */}
      {/* 雖然原本有清單，但在我們的新架構中，左側選單已經交給 Inbox/index.tsx 處理了。 */}
      {/* 為了維持版面平衡，如果是在手機版，我們不需要左側清單；如果是電腦版，左側清單已在外部。 */}
      {/* 所以這裡直接渲染右側的詳細資料區。 */}
      
      {/* ================= 右側詳細內容區 ================= */}
      <div style={{ flex: 1, backgroundColor: '#FBFBF9', animation: 'fadeIn 0.2s ease', height: 'calc(100vh - 140px)', overflowY: 'auto' }}>
        {!selectedInq ? (
          <div className="main-empty" style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <span style={{ fontSize: '40px', marginBottom: '16px', display: 'block', opacity: 0.5 }}>📄</span>
            請從左側選擇一筆紀錄以查看詳細內容
          </div>
        ) : (
          <div className="main-content-wrapper" style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
            
            {/* 標題與基礎資訊 */}
            <div className="main-header" style={{ marginBottom: '24px', backgroundColor: 'transparent', padding: 0 }}>
              <div className="main-header-info">
                <h2 className="main-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '24px' }}>
                  投遞給：{targetName || '未知使用者'}
                  {targetPublicId && <span style={{ fontSize: '16px', color: '#A0978D', fontWeight: 'normal', fontFamily: 'monospace' }}>@{targetPublicId}</span>}
                </h2>
                
                <div className="main-subtitle" style={{ fontSize: '15px', color: '#4A7294', fontWeight: 'bold', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ 
                    background: selectedInq.is_direct ? '#EBF2F7' : (isOffer ? '#EFF6FF' : '#FDF2F8'), 
                    color: selectedInq.is_direct ? '#4A7294' : (isOffer ? '#2563EB' : '#DB2777'), 
                    padding: '2px 10px', 
                    borderRadius: '999px', 
                    fontSize: '12px', 
                  }}>
                    {selectedInq.is_direct ? '專屬委託表單' : (isOffer ? '許願池接委託' : '許願池徵委託')}
                  </span>
                  <span>申請項目：{selectedInq.bulletin_title}</span>
                </div>
                
                {isBlacklisted && (
                  <div style={{ display: 'inline-block', padding: '6px 12px', background: '#FEF2F2', color: '#EF4444', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', border: '1px solid #FECACA', marginTop: '12px' }}>
                    <Ban size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'text-bottom' }} /> 
                    警告：此用戶已被您列入黑名單。
                  </div>
                )}
              </div>
            </div>

            {/* 狀態提示卡塊 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', padding: '16px', backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #EAE6E1', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
              <span className={`status-${selectedInq.inquiry_status}`} style={{ padding: '6px 16px', borderRadius: '6px', fontSize: '14px', fontWeight: 'bold' }}>
                {getStatusLabel(selectedInq.inquiry_status)}
              </span>
              <span style={{ fontSize: '13px', color: '#7A7269' }}>投遞時間：{formatTime(selectedInq.created_at)}</span>
            </div>

            {/* 原文/描述摘要區塊 (僅許願池有) */}
            {!selectedInq.is_direct && (
              <div className="section-card" style={{ marginBottom: '24px', backgroundColor: '#FDFDFB' }}>
                <h3 className="section-title" style={{ fontSize: '15px' }}>🔍 對方許願池原文摘要</h3>
                <div style={{ display: 'flex', gap: '16px', marginTop: '12px' }}>
                  {bulletinImg ? (
                    <img src={bulletinImg} alt="參考圖" referrerPolicy="no-referrer" style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #DED9D3', flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: '100px', height: '100px', background: '#EAE6E1', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#A0978D', flexShrink: 0 }}>無附圖</div>
                  )}
                  <div style={{ flex: 1, minWidth: 0, fontSize: '13px', color: '#5D4A3E', lineHeight: '1.6', whiteSpace: 'pre-wrap', maxHeight: '100px', overflowY: 'auto' }} className="custom-scrollbar">
                    {displayContent}
                  </div>
                </div>
              </div>
            )}

            {/* 表單/履歷內容區 */}
            <div className="section-card" style={{ marginBottom: '24px' }}>
              <h3 className="section-title">
                {selectedInq.is_direct ? '📄 我填寫的表單內容' : '📄 我的回覆與備註'}
              </h3>
              
              <div style={{ fontSize: '14px', color: '#5D4A3E', lineHeight: '1.8', marginTop: '16px' }}>
                {selectedInq.is_direct ? (
                  // 個人頁委託表單渲染
                  parsedFormAnswers.length > 0 ? parsedFormAnswers.map((qa: any, i: number) => (
                    <div key={i} style={{ marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px dashed #EAE6E1' }}>
                      <strong style={{ color: '#A67B3E', display: 'block', marginBottom: '4px' }}>Q: {qa.question}</strong>
                      <span style={{ whiteSpace: 'pre-wrap', color: '#333' }}>A: {Array.isArray(qa.answer) ? qa.answer.join(', ') : (qa.answer || '(未填寫)')}</span>
                    </div>
                  )) : (
                    <div style={{ color: '#A0978D', fontStyle: 'italic' }}>未填寫客製化問答。</div>
                  )
                ) : (
                  // 許願池履歷渲染
                  <>
                    {snapshot.answers && snapshot.answers.length > 0 && (
                      <div style={{ marginBottom: '16px' }}>
                        {snapshot.answers.map((ans: any, idx: number) => (
                          <div key={idx} style={{ marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px dashed #EAE6E1' }}>
                            <strong style={{ color: '#A67B3E', display: 'block', marginBottom: '4px' }}>Q: {ans.question}</strong>
                            <div style={{ whiteSpace: 'pre-wrap', color: '#333' }}>A: {ans.answer || '(未填寫)'}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {snapshot.message && (
                      <div style={{ marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px dashed #EAE6E1' }}>
                        <strong style={{ color: '#A67B3E', display: 'block', marginBottom: '4px' }}>備註留言：</strong>
                        <div style={{ whiteSpace: 'pre-wrap', color: '#333' }}>{snapshot.message}</div>
                      </div>
                    )}

                    {!isOffer && (snapshot.specialties || snapshot.no_gos) && (
                      <div style={{ marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px dashed #EAE6E1' }}>
                        {snapshot.specialties && <div style={{ marginBottom: '8px' }}><strong style={{ color: '#4A7294' }}>舒適圈/擅長：</strong> <br/>{snapshot.specialties}</div>}
                        {snapshot.no_gos && <div><strong style={{ color: '#EF4444' }}>雷點/不擅長：</strong> <br/>{snapshot.no_gos}</div>}
                      </div>
                    )}
                    
                    {snapshot.images && snapshot.images.length > 0 && (
                      <div>
                        <strong style={{ color: '#A67B3E', display: 'block', marginBottom: '8px' }}>附件圖片：</strong>
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                          {snapshot.images.map((img: string, idx: number) => (
                            <img key={idx} src={getFullUrl(img)} alt={`附件 ${idx + 1}`} referrerPolicy="no-referrer" style={{ width: '120px', height: '120px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #DED9D3' }} />
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* 對方回覆 / 婉拒理由區塊 */}
            {selectedInq.client_response && (
              <div style={{ background: '#F8FAFC', borderLeft: '4px solid #4A7294', padding: '20px', borderRadius: '0 12px 12px 0', marginBottom: '24px' }}>
                <strong style={{ color: '#4A7294', fontSize: '15px', marginBottom: '8px', display: 'block' }}>對方回覆：</strong>
                <p style={{ margin: 0, fontSize: '14px', color: '#5D4A3E', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{selectedInq.client_response}</p>
              </div>
            )}

            {(selectedInq.inquiry_status === 'declined' || selectedInq.inquiry_status === 'closed') && selectedInq.decline_reason && (
              <div style={{ background: '#FEF2F2', borderLeft: '4px solid #EF4444', padding: '20px', borderRadius: '0 12px 12px 0', marginBottom: '24px' }}>
                <strong style={{ color: '#EF4444', fontSize: '15px', marginBottom: '8px', display: 'block' }}>終止/撤回原因：</strong>
                <p style={{ margin: 0, fontSize: '14px', color: '#A05C5C', lineHeight: '1.6' }}>{selectedInq.decline_reason}</p>
              </div>
            )}

            {/* 底部操作列 (Action Bar) */}
            <div className="section-card" style={{ marginTop: '24px', backgroundColor: 'transparent', border: 'none', boxShadow: 'none', padding: 0, display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              
              {canDecline && (
                <button 
                  className="action-btn"
                  style={{ backgroundColor: '#FFFFFF', color: '#EF4444', border: '1px solid #FECACA', padding: '14px 24px', fontSize: '15px' }}
                  onClick={() => handleWithdrawClick(selectedInq)}
                >
                  {selectedInq.inquiry_status === 'pending' ? '撤回申請' : '終止洽談'}
                </button>
              )}

              {(selectedInq.inquiry_status === 'submitted' || selectedInq.inquiry_status === 'proposed' || (selectedInq.is_direct && selectedInq.inquiry_status === 'pending')) && (
                <button 
                  className="action-btn btn-primary"
                  style={{ padding: '14px 24px', fontSize: '15px' }}
                  onClick={() => handleEnterInquiryWorkspace(selectedInq.inquiry_id)}
                >
                  💬 進入聊天室
                </button>
              )}

              {selectedInq.inquiry_status === 'accepted' && (
                <button 
                  className="action-btn btn-success"
                  style={{ padding: '14px 24px', fontSize: '15px' }}
                  onClick={() => handleViewCommission(selectedInq.commission_id)}
                >
                  前往查看委託單 ➔
                </button>
              )}

            </div>

          </div>
        )}
      </div>
    </div>
  );
};