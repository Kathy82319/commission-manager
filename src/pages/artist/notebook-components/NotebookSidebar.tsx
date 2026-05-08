// src/pages/artist/notebook-components/NotebookSidebar.tsx
import { formatLocalDate, parseTime, getOriginData } from './notebookUtils';
import type { Commission } from './notebookUtils';

interface NotebookSidebarProps {
  filteredOrders: Commission[];
  selectedId: string | null;
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  filter: 'all' | 'pending' | 'working' | 'completed';
  setFilter: (val: 'all' | 'pending' | 'working' | 'completed') => void;
  tabs: { id: string, label: string }[];
  handleSelect: (order: Commission) => void;
  getPaymentBadge: (status: string) => { text: string, className: string };
  getStatusBadge: (status: string) => { text: string, className: string } | null;
  getClientNameDisplay: (order: Commission) => string;
}

export function NotebookSidebar({
  filteredOrders,
  selectedId,
  searchTerm,
  setSearchTerm,
  filter,
  setFilter,
  tabs,
  handleSelect,
  getPaymentBadge,
  getStatusBadge,
  getClientNameDisplay
}: NotebookSidebarProps) {
  return (
    <div className={`notebook-sidebar ${selectedId ? 'mobile-hide' : ''}`}>
      <div className="sidebar-header">
        <span className="sidebar-title">委託單列表</span>
        <div className="sidebar-controls">
          <input 
            type="text" 
            className="form-input sidebar-search-input" 
            placeholder="[搜尋] 暱稱/單號..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
          />
          <select 
            className="form-input sidebar-filter" 
            value={filter} 
            onChange={e => setFilter(e.target.value as any)}
          >
            {tabs.map(tab => <option key={tab.id} value={tab.id}>{tab.label}</option>)}
          </select>
        </div>
      </div>

      <div className="sidebar-list-container">
        {filteredOrders.map(order => {
          const payBadge = getPaymentBadge(order.payment_status);
          const statusBadge = getStatusBadge(order.status);
          const dateStr = formatLocalDate(order.order_date); 
          const isSelected = selectedId === order.id;
          const hasNewMsg = parseTime(order.latest_message_at) > parseTime(order.last_read_at_artist);
          
          const orderOrigin = getOriginData(order);
          const isShowcaseForm = orderOrigin?.type === 'showcase_form';
          const isBulletin = orderOrigin?.type === 'bulletin';
          
          return (
            <div key={order.id} onClick={() => handleSelect(order)} className={`sidebar-card ${isSelected ? 'selected' : ''} ${order.status === 'cancelled' ? 'cancelled' : ''}`}>
              <div className="card-meta-row">
                <span>{dateStr}</span>
                {isShowcaseForm && (
                  <span className="card-mode-badge" style={{ backgroundColor: '#4A7294', color: '#fff', marginLeft: '6px' }}>接委託表單</span>
                )}
                {isBulletin && (
                  <span className="card-mode-badge" style={{ backgroundColor: '#8E7E8E', color: '#fff', marginLeft: '6px' }}>許願池</span>
                )}
                {order.client_custom_label === '黑名單' && (
                  <span className="card-mode-badge mode-blacklist" style={{ marginLeft: '6px' }}>黑名單</span>
                )}
              </div>
              <div className="card-title-row">
                <span className="card-client-name" title={getClientNameDisplay(order)}>{getClientNameDisplay(order)}</span>
                <span className="card-price">NT$ {order.total_price}</span>
              </div>
              <div className="card-project-row">
                <span className="card-project-name">項目：{order.project_name || order.type_name || '未命名項目'}</span>
              </div>
              <div className="card-info-row">
                <span>單號：{order.id.split('-')[1] || order.id}</span>
                <span>委託人：{order.client_public_id || '未綁定'}</span>
              </div>
              <div className="card-tags-row">
                <span className={`card-tag ${payBadge.className}`}>{payBadge.text}</span>
                {statusBadge && <span className={`card-tag ${statusBadge.className}`}>{statusBadge.text}</span>}
                {order.queue_status && <span className="card-tag badge-queue">{order.queue_status}</span>}
                {hasNewMsg && <span className="card-tag badge-new-msg">新訊息</span>}
              </div>
            </div>
          );
        })}
        {filteredOrders.length === 0 && <div className="sidebar-empty">沒有符合條件的委託單</div>}
      </div>
    </div>
  );
}