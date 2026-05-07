// src/pages/artist/notebook-components/TabDetails.tsx
import DOMPurify from 'dompurify';
import type { Commission, PaymentRecord } from './notebookUtils';

interface TabDetailsProps {
  selectedOrder: Commission;
  selectedId: string;
  editData: Partial<Commission>;
  setEditData: (updater: (prev: Partial<Commission>) => Partial<Commission>) => void | React.Dispatch<React.SetStateAction<Partial<Commission>>>;
  payments: PaymentRecord[];
  newPayment: { record_date: string; item_name: string; amount: string };
  setNewPayment: React.Dispatch<React.SetStateAction<{ record_date: string; item_name: string; amount: string }>>;
  handleAddPayment: () => Promise<void>;
  handleDeletePayment: (paymentId: string) => Promise<void>;
  handlePaymentStatusChange: (newStatus: string) => Promise<void>;
  totalPaid: number;
  totalUnpaid: number;
  originData: any;
  isTrajectoryExpanded: boolean;
  setIsTrajectoryExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  isEditingRequest: boolean;
  handleSaveDailyFields: () => Promise<void>;
  handleStartEditRequest: () => void;
  handleCancelEditRequest: () => void;
  handleSubmitRequestFields: () => Promise<void>;
}

export function TabDetails({
  selectedOrder,
  editData,
  setEditData,
  payments,
  newPayment,
  setNewPayment,
  handleAddPayment,
  handleDeletePayment,
  handlePaymentStatusChange,
  totalPaid,
  totalUnpaid,
  originData,
  isTrajectoryExpanded,
  setIsTrajectoryExpanded,
  isEditingRequest,
  handleSaveDailyFields,
  handleStartEditRequest,
  handleCancelEditRequest,
  handleSubmitRequestFields
}: TabDetailsProps) {

  // 渲染表單欄位的封裝邏輯
  const renderRequestField = (label: string, fieldKey: keyof Commission, type: 'text' | 'number' | 'select' = 'text', suffix: string = '', options: string[] = []) => {
    if (!selectedOrder) return null;
    const isFreeMode = selectedOrder.workflow_mode === 'free';
    const canDirectEdit = isEditingRequest || isFreeMode;
    
    let pendingObj: Record<string, any> = {};
    if (selectedOrder.pending_changes && !isFreeMode) { 
      try { pendingObj = JSON.parse(selectedOrder.pending_changes); } catch(e) {} 
    }
    
    const originalValue = selectedOrder[fieldKey];
    const pendingValue = pendingObj[fieldKey];
    const hasPending = pendingValue !== undefined && pendingValue !== originalValue;

    return (
      <div className="request-field">
        <span className="field-label">{label}</span>
        {canDirectEdit ? (
          type === 'select' ? (
            <select className="form-input" value={(editData[fieldKey] as string) || ''} onChange={e => setEditData(prev => ({...prev, [fieldKey]: e.target.value}))}>
              <option value="">請選擇</option>{options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          ) : (
            <input className="form-input" type={type} value={editData[fieldKey] || ''} onChange={e => setEditData(prev => ({...prev, [fieldKey]: type === 'number' ? Number(e.target.value) : e.target.value}))} />
          )
        ) : (
          <div className="field-display">
            {hasPending ? (
              <div>
                <span className="field-strikethrough">{originalValue}{suffix}</span>
                <span className="field-pending">待異動：{pendingValue}{suffix}</span>
              </div>
            ) : (<span className="field-value">{originalValue || '-'}{suffix}</span>)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="tab-details-container">
      
      {/* 財務與收款狀態 */}
      <div className="section-card">
        <div className="section-header">
          <h3 className="section-title">財務與收款狀態</h3>
          <div className="payment-status-wrapper">
            <span className="payment-status-label">帳務狀態：</span>
            <select className="form-input select-status" value={selectedOrder.payment_status || 'unpaid'} onChange={(e) => handlePaymentStatusChange(e.target.value)}>
              <option value="unpaid">未收款</option><option value="partial">已收訂金</option><option value="paid">已收款</option>
            </select>
            <span style={{ fontSize: '11px', color: '#A0978D', marginLeft: '6px' }}>(此狀態會根據明細自動連動)</span>
          </div>
        </div>

        <div className="payment-inputs">
          <input type="date" className="form-input" value={newPayment.record_date} onChange={e => setNewPayment({...newPayment, record_date: e.target.value})} />
          <input type="text" className="form-input" placeholder="項目 (如: 訂金)" value={newPayment.item_name} onChange={e => setNewPayment({...newPayment, item_name: e.target.value})} />
          <input type="number" className="form-input" placeholder="金額 (退款請填負數)" value={newPayment.amount} onChange={e => setNewPayment({...newPayment, amount: e.target.value})} />
          <button className="action-btn btn-primary btn-add-payment" onClick={handleAddPayment}>+ 記帳</button>
        </div>

        <div className="table-responsive">
          <table className="custom-table">
            <tbody>
              {payments.length === 0 && <tr><td colSpan={4} className="table-empty">尚無記帳紀錄</td></tr>}
              {payments.map(p => {
                const dateParts = p.record_date.split('-');
                const yearStr = dateParts.length === 3 ? `${dateParts[0]}-` : '';
                const mdStr = dateParts.length === 3 ? `${dateParts[1]}-${dateParts[2]}` : p.record_date;

                return (
                  <tr key={p.id} className="table-row">
                    <td className="col-date">
                      <span className="hide-on-mobile">{yearStr}</span>
                      <span>{mdStr}</span>
                    </td>
                    <td className="col-item">{p.item_name}</td>
                    <td className="col-amount">
                      <span className="hide-on-mobile">{p.amount < 0 ? '-' : '+'} NT$ </span>
                      <span className="show-on-mobile" style={{ display: 'none' }}>{p.amount < 0 ? '-' : '+'} $</span>
                      {Math.abs(p.amount)}
                    </td>
                    <td style={{ textAlign: 'right' }}><button className="btn-delete" onClick={() => handleDeletePayment(p.id)}>刪除</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="payment-summary">
          <div className="summary-item">總金額：<span className="summary-val total">${selectedOrder.total_price}</span></div>
          <div className="summary-item">已收款：<span className="summary-val paid">${totalPaid}</span></div>
          <div className="summary-item">未付款：<span className="summary-val unpaid">${totalUnpaid > 0 ? totalUnpaid : 0}</span></div>
        </div>
      </div>

      {/* 初始需求單 / 媒合軌跡 */}
      {originData && (
        <div className="section-card" style={{ backgroundColor: '#FBFBF9' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #EAE6E1', paddingBottom: '8px', marginBottom: '12px' }}>
            <h3 className="section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              🔍 初始需求單 / 媒合軌跡
            </h3>
          </div>

          <div className={isTrajectoryExpanded ? "" : "line-clamp-3"} style={{ fontSize: '13px', color: '#5D4A3E', lineHeight: '1.6', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
            {originData.type === 'showcase_form' ? (
              <div style={{ paddingBottom: '12px', marginBottom: '12px' }}>
                <strong style={{ color: '#4A7294' }}>【委託人填寫的客製化表單】</strong><br/>
                {originData.answers && originData.answers.length > 0 ? originData.answers.map((qa: any, i: number) => (
                  <div key={i} style={{ marginTop: '8px' }}>
                    <strong style={{ color: '#A67B3E' }}>Q: {qa.question}</strong><br/>
                    <span style={{ whiteSpace: 'pre-wrap' }}>A: {Array.isArray(qa.answer) ? qa.answer.join(', ') : (qa.answer || '(未填寫)')}</span>
                  </div>
                )) : (
                  <div style={{ color: '#A0978D', fontStyle: 'italic', marginTop: '8px' }}>委託人未填寫任何客製化問答。</div>
                )}
              </div>
            ) : (
              <>
                <div style={{ paddingBottom: '12px', borderBottom: '1px dashed #DED9D3', marginBottom: '12px' }}>
                  <strong style={{ color: '#A67B3E' }}>【{originData.isOffer ? '繪師' : '委託方'}的原始貼文設定】</strong><br/>
                  <span style={{ whiteSpace: 'pre-wrap' }}>{originData.description}</span>
                  {originData.questions && originData.questions.length > 0 && (
                    <div style={{ marginTop: '6px' }}>
                      <strong style={{ color: '#A0978D' }}>提問設定：</strong>
                      <ol style={{ margin: '4px 0 0 0', paddingLeft: '16px', color: '#7A7269' }}>
                        {originData.questions.map((q: string, idx: number) => <li key={idx}>{q}</li>)}
                      </ol>
                    </div>
                  )}
                </div>
                <div>
                  <strong style={{ color: '#4A7294' }}>【{originData.isOffer ? '委託方' : '繪師'}的投遞回覆】</strong><br/>
                  {originData.parsedSnapshot?.answers && originData.parsedSnapshot.answers.length > 0 && (
                    <div style={{ marginTop: '4px', marginBottom: '8px' }}>
                      {originData.parsedSnapshot.answers.map((ans: any, idx: number) => (
                        <div key={idx} style={{ marginTop: '8px' }}>
                          <strong style={{ color: '#A0978D' }}>Q: {ans.question}</strong><br/>
                          <span style={{ whiteSpace: 'pre-wrap' }}>A: {ans.answer || '(未填寫)'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {originData.parsedSnapshot?.message && (
                    <div style={{ marginTop: '8px' }}>
                      <strong style={{ color: '#A0978D' }}>備註留言：</strong><br/>
                      <span style={{ whiteSpace: 'pre-wrap' }}>{originData.parsedSnapshot.message}</span>
                    </div>
                  )}
                  {!originData.isOffer && (originData.parsedSnapshot?.specialties || originData.parsedSnapshot?.no_gos) && (
                    <div style={{ marginTop: '10px' }}>
                      {originData.parsedSnapshot?.specialties && <div style={{ color: '#ff8c00', marginBottom: '4px' }}>舒適圈：{originData.parsedSnapshot.specialties}</div>}
                      {originData.parsedSnapshot?.no_gos && <div style={{ color: '#e11d48' }}>雷點：{originData.parsedSnapshot.no_gos}</div>}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
          <button onClick={() => setIsTrajectoryExpanded(!isTrajectoryExpanded)} style={{ background: 'none', border: 'none', color: '#A67B3E', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', marginTop: '12px', padding: '12px 0 0 0', width: '100%', textAlign: 'center', borderTop: '1px dashed #EAE6E1' }}>
            {isTrajectoryExpanded ? "▲ 收起完整內容" : "▼ 展開完整內容"}
          </button>
        </div>
      )}

      {/* 委託單細項 */}
      <div className="section-card">
        <div className="section-header-no-border">
          <h3 className="section-title">委託單細項</h3>
          <div className="mode-badges">
            {isEditingRequest && <span className="badge-edit-mode">異動編輯模式</span>}
            {selectedOrder.workflow_mode === 'free' && <span className="badge-free-mode">自由紀錄模式</span>}
          </div>
        </div>
        
        <div className="details-grid">
          <div className="request-field">
            <span className="field-label">委託人暱稱 (繪師自訂)：</span>
            <input 
              className="form-input" 
              placeholder="例如：FB的王小明"
              value={editData.contact_memo || ''} 
              onChange={e => setEditData(prev => ({...prev, contact_memo: e.target.value}))} 
            />
          </div>                        
          <div className="request-field">
            <span className="field-label">項目名稱 (繪師自訂)：</span>
            <input className="form-input" value={editData.project_name || ''} onChange={e => setEditData(prev => ({...prev, project_name: e.target.value}))} />
          </div>
          <div className="request-field">
            <span className="field-label">交易方式 (繪師自訂)：</span>
            <input className="form-input" value={editData.payment_method || ''} onChange={e => setEditData(prev => ({...prev, payment_method: e.target.value}))} />
          </div>

          {renderRequestField('委託用途：', 'usage_type')}
          {renderRequestField('是否急件：', 'is_rush', 'select', '', ['否', '是'])}
          {renderRequestField('交稿方式：', 'delivery_method')}
          {renderRequestField('總金額：', 'total_price', 'number')}
          {renderRequestField('繪畫範圍：', 'draw_scope')}
          {renderRequestField('人物數量：', 'char_count', 'number', ' 人')}
          {renderRequestField('背景設定：', 'bg_type')}
          {renderRequestField('附加項目：', 'add_ons')}
        </div>

        {/* 📝 最終確認規格 / 備忘錄 */}
        {(selectedOrder.agreed_memo || editData.agreed_memo) && (
          <div className="detailed-settings-wrapper">
            <span className="field-label" style={{ color: '#4A7294' }}>📝 最終確認規格 / 備忘錄 (雙方共識)：</span>
            <textarea 
              className="form-input textarea-large" 
              value={editData.agreed_memo || selectedOrder.agreed_memo || ''} 
              disabled={!isEditingRequest && selectedOrder.workflow_mode !== 'free'}
              onChange={e => setEditData(prev => ({...prev, agreed_memo: e.target.value}))}
            />
          </div>
        )}

        <div className="detailed-settings-wrapper">
          <span className="field-label">詳細設定：(委託方不可見)</span>
          <textarea className="form-input textarea-large" value={editData.detailed_settings || ''} onChange={e => setEditData(prev => ({...prev, detailed_settings: e.target.value}))} />
        </div>

        <div className="tos-snapshot-wrapper">
          <span className="field-label">
            專屬協議書快照 <span className="label-note">(不可修改)</span>
          </span>
          <div className="tos-content"
            dangerouslySetInnerHTML={{ __html: selectedOrder.agreed_tos_snapshot ? DOMPurify.sanitize(selectedOrder.agreed_tos_snapshot) : '<span style="color:#A0978D">未設定或舊版訂單</span>' }} 
          />
        </div>

        <div className="details-actions">
          {selectedOrder.workflow_mode === 'free' ? (
            <button className="action-btn btn-primary btn-save" onClick={handleSaveDailyFields}>儲存設定</button>
          ) : isEditingRequest ? (
            <>
              <button className="action-btn btn-outline-default" onClick={handleCancelEditRequest}>取消編輯</button>
              <button className="action-btn btn-danger" onClick={handleSubmitRequestFields}>確認送出異動</button>
            </>
          ) : (
            <>
              <button className="action-btn btn-outline-default" onClick={handleStartEditRequest}>委託單異動</button>
              <button className="action-btn btn-primary btn-save" onClick={handleSaveDailyFields}>日常儲存</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}