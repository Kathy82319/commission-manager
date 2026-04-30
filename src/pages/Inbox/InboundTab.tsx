// src/pages/Inbox/InboundTab.tsx
import React from 'react';
import { Clock, MessageSquare, XCircle, ChevronRight, ImageIcon, AlertCircle, FileCheck } from 'lucide-react';
import { R2_PUBLIC_URL } from '../public/Wishboard/constants';

interface InboundTabProps {
  clientBulletins: any[];
  clientInquiries: any[];
  navigate: any;
  setSelectedInquiry: (inquiry: any) => void;
  setShowDeclineModal: (show: boolean) => void;
  handleDirectInvite: (inquiry: any) => void;
  handleEnterInquiryWorkspace: (id: string) => void;
  handleViewCommission: (id: string) => void;
  setSelectedIdsForBatch: (ids: any) => void;
}

export const InboundTab: React.FC<InboundTabProps> = ({
  clientBulletins,
  clientInquiries,
  navigate,
  setSelectedInquiry,
  setShowDeclineModal,
  handleDirectInvite,
  handleEnterInquiryWorkspace,
  handleViewCommission,
  setSelectedIdsForBatch
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

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return { label: '待處理', class: 'status-pending' };
      case 'submitted': return { label: '洽談中', class: 'status-active' };
      case 'declined': return { label: '已婉拒/撤回', class: 'status-declined' };
      case 'accepted': return { label: '已接受', class: 'status-success' }; // 補上已接受狀態
      case 'closed': return { label: '已結案', class: 'status-closed' };
      default: return { label: '未知', class: '' };
    }
  };

  if (clientBulletins.length === 0) {
    return (
      <div className="inbox-empty-state">
        <ImageIcon size={48} opacity={0.2} />
        <p>目前沒有刊登中的許願池文章</p>
        <button className="btn-primary-outline" onClick={() => navigate('/wishboard')}>前往發布</button>
      </div>
    );
  }

  return (
    <div className="inbound-tab-container">
      {clientBulletins.map(bulletin => {
        const inquiries = clientInquiries.filter(i => i.bulletin_id === bulletin.id);
        const bulletinImg = getBulletinImage(bulletin.ref_image_key);

        return (
          <div key={bulletin.id} className="bulletin-group">
            <div className="bulletin-group-header">
              <div className="bulletin-header-left">
                <div className="bulletin-mini-preview">
                  {bulletinImg ? (
                    <img src={bulletinImg} alt="貼文首圖" className="mini-img" />
                  ) : (
                    <div className="mini-img-placeholder"><ImageIcon size={14} /></div>
                  )}
                </div>
                <div className="bulletin-title-box">
                  <span className={`type-tag ${bulletin.category}`}>
                    {bulletin.category === 'offer' ? '接委託' : '徵委託'}
                  </span>
                  <h3>{bulletin.title}</h3>
                </div>
              </div>
              <div className="bulletin-header-meta">
                <span>收到 {inquiries.length} 筆提案</span>
                <button className="btn-text-small" onClick={() => navigate(`/wishboard`)}>查看原帖</button>
              </div>
            </div>

            <div className="inquiry-list">
              {inquiries.length === 0 ? (
                <p className="no-inquiry-hint">尚未收到任何提案</p>
              ) : (
                inquiries.map(inquiry => {
                  const statusInfo = getStatusLabel(inquiry.inquiry_status);
                  const isDeclined = inquiry.inquiry_status === 'declined';
                  
                  return (
                    <div key={inquiry.inquiry_id} className={`inquiry-row-card ${inquiry.inquiry_status}`}>
                      <div className="inquiry-main-flex-container" style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                        
                        <div className="inquiry-top-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div className="artist-info" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {/* 🌟 修正點 1：將勾選框連結至 setSelectedIdsForBatch 用於批次操作 */}
                            <input 
                              type="checkbox" 
                              className="inquiry-checkbox"
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedIdsForBatch((prev: string[]) => [...prev, inquiry.inquiry_id]);
                                } else {
                                  setSelectedIdsForBatch((prev: string[]) => prev.filter(id => id !== inquiry.inquiry_id));
                                }
                              }}
                            />
                            <span className="artist-name">{inquiry.artist_name}</span>
                            <span className="artist-id">@{inquiry.artist_public_id}</span>
                          </div>
                          
                          <div className="inquiry-meta-right" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div className="inquiry-time" style={{ fontSize: '12px', color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Clock size={12} />
                              {new Date(inquiry.latest_update_at).toLocaleDateString()}
                            </div>
                            <span className={`status-pill ${statusInfo.class}`}>{statusInfo.label}</span>
                          </div>
                        </div>

                        {/* 顯示婉拒或撤回的原因 */}
                        {isDeclined && inquiry.decline_reason && (
                          <div style={{ 
                            background: '#FEF2F2', 
                            borderLeft: '4px solid #EF4444', 
                            padding: '12px', 
                            borderRadius: '0 8px 8px 0', 
                            marginTop: '4px' 
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#EF4444', fontWeight: 'bold', fontSize: '13px', marginBottom: '4px' }}>
                              <AlertCircle size={14} />
                              <span>終止/撤回原因：</span>
                            </div>
                            <p style={{ 
                              margin: 0, 
                              fontSize: '13px', 
                              color: '#A05C5C', 
                              whiteSpace: 'pre-wrap', 
                              lineHeight: '1.6',
                              maxHeight: '100px',
                              overflowY: 'auto'
                            }}>
                              {inquiry.decline_reason}
                            </p>
                          </div>
                        )}

                        <div className="inquiry-actions-row" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                          {inquiry.inquiry_status === 'pending' && (
                            <>
                              <button className="action-btn invite" onClick={() => handleDirectInvite(inquiry)}>
                                <MessageSquare size={16} /> 邀請洽談
                              </button>
                              <button className="action-btn decline" onClick={() => {
                                setSelectedInquiry(inquiry);
                                setShowDeclineModal(true);
                              }}>
                                <XCircle size={16} /> 婉拒
                              </button>
                            </>
                          )}

                          {/* 洽談中顯示進入工作板 */}
                          {(inquiry.inquiry_status === 'submitted' || inquiry.inquiry_status === 'proposed') && (
                            <button className="action-btn workspace" onClick={() => handleEnterInquiryWorkspace(inquiry.inquiry_id)}>
                              進入工作板 <ChevronRight size={16} />
                            </button>
                          )}

                          {/* 🌟 修正點 2：當狀態為 accepted 時，顯示查看正式委託單的按鈕 */}
                          {inquiry.inquiry_status === 'accepted' && inquiry.commission_id && (
                            <button className="action-btn success" onClick={() => handleViewCommission(inquiry.commission_id)}>
                              <FileCheck size={16} /> 查看正式委託單
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};