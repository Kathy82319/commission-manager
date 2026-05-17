// src/pages/artist/notebook-components/QueueCalendarView.tsx
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, momentLocalizer, Views } from 'react-big-calendar';
import moment from 'moment';
// @ts-ignore: moment 語系檔缺乏官方 TypeScript 宣告，此處忽略 TS 型別檢查
import 'moment/locale/zh-tw';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { X, Calendar as CalendarIcon, Link as LinkIcon, Trash2, AlertCircle } from 'lucide-react';

moment.locale('zh-tw');
const localizer = momentLocalizer(moment);

const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || '';

interface QueueCalendarViewProps {
  commissions: any[];
  dateColumnLabel: string;
  handleUpdateField: (id: string, field: string, value: string) => Promise<void>;
}

interface CalendarEventData {
  id: string;
  artist_id: string;
  title: string;
  start_date: string;
  end_date: string;
  color_hex: string;
  linked_commission_id?: string;
}

const PRESET_COLORS = ['#4A7294', '#8CB369', '#A67B3E', '#A05C5C', '#8E7E8E', '#5D4A3E', '#C04B4B'];

export function QueueCalendarView({ commissions, dateColumnLabel, handleUpdateField }: QueueCalendarViewProps) {
  const navigate = useNavigate();
  const [events, setEvents] = useState<CalendarEventData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const [modalMode, setModalMode] = useState<'none' | 'edit_custom' | 'view_commission'>('none');
  const [selectedCalendarEvent, setSelectedCalendarEvent] = useState<Partial<CalendarEventData>>({});
  const [selectedCommission, setSelectedCommission] = useState<any | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchCalendarEvents = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/calendar-events`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setEvents(data.data || []);
      }
    } catch (e) {
      console.error("無法取得日曆行程", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendarEvents();
  }, []);

  const calendarDisplayEvents = useMemo(() => {
    const displayList: any[] = [];

    commissions.forEach(c => {
      if (c.end_date) {
        const rushTag = (c.is_rush === '是' || c.is_rush === 1 || c.is_rush === '1') ? '[急單] ' : '';
        displayList.push({
          id: `comm-${c.id}`,
          title: `${rushTag}${c.client_custom_title || c.project_name || '未命名'}`,
          start: new Date(c.end_date),
          end: new Date(c.end_date),
          allDay: true,
          resource: { type: 'commission', data: c }
        });
      }
    });

    events.forEach(e => {
      let displayTitle = e.title;
      if (e.linked_commission_id) {
        const linkedComm = commissions.find(c => c.id === e.linked_commission_id);
        if (linkedComm) {
          displayTitle = `[作畫] ${linkedComm.client_custom_title || linkedComm.project_name || '未命名'} - ${e.title}`;
        }
      }

      displayList.push({
        id: e.id,
        title: displayTitle,
        start: new Date(e.start_date),
        end: new Date(e.end_date), 
        allDay: true,
        resource: { type: 'custom', data: e }
      });
    });

    return displayList;
  }, [commissions, events]);

  const eventStyleGetter = (event: any) => {
    let backgroundColor = '#4A7294';
    if (event.resource?.type === 'commission') {
      backgroundColor = '#5D4A3E';
    } else if (event.resource?.type === 'custom') {
      backgroundColor = event.resource.data.color_hex || '#4A7294';
    }
    
    return {
      style: {
        backgroundColor,
        border: 'none',
        borderRadius: '4px',
        opacity: 0.9,
        color: 'white',
        display: 'block',
        fontSize: '12px',
        fontWeight: 'bold',
        padding: '2px 8px'
      }
    };
  };

  const handleSelectSlot = (slotInfo: { start: Date; end: Date }) => {
    const formattedStart = moment(slotInfo.start).format('YYYY-MM-DD');
    const formattedEnd = moment(slotInfo.start).isSame(moment(slotInfo.end).subtract(1, 'day'), 'day') 
      ? formattedStart 
      : moment(slotInfo.end).subtract(1, 'day').format('YYYY-MM-DD');

    setSelectedCalendarEvent({
      title: '',
      start_date: formattedStart,
      end_date: formattedEnd,
      color_hex: PRESET_COLORS[0],
      linked_commission_id: ''
    });
    setModalMode('edit_custom');
  };

  const handleSelectEvent = (event: any) => {
    if (event.resource?.type === 'commission') {
      setSelectedCommission(event.resource.data);
      setModalMode('view_commission');
    } else if (event.resource?.type === 'custom') {
      setSelectedCalendarEvent(event.resource.data);
      setModalMode('edit_custom');
    }
  };

  const handleSaveCustomEvent = async () => {
    if (!selectedCalendarEvent.title || !selectedCalendarEvent.start_date || !selectedCalendarEvent.end_date) {
      alert('請填寫標題與日期區間！');
      return;
    }
    setIsSaving(true);
    try {
      const isEdit = !!selectedCalendarEvent.id;
      const url = isEdit ? `${API_BASE}/api/calendar-events/${selectedCalendarEvent.id}` : `${API_BASE}/api/calendar-events`;
      const method = isEdit ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selectedCalendarEvent)
      });
      if ((await res.json()).success) {
        setModalMode('none');
        fetchCalendarEvents(); 
      }
    } catch (e) {
      alert('網路連線發生錯誤');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCustomEvent = async () => {
    if (!selectedCalendarEvent.id || !window.confirm('確定要刪除這個行程嗎？')) return;
    setIsSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/calendar-events/${selectedCalendarEvent.id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if ((await res.json()).success) {
        setModalMode('none');
        fetchCalendarEvents();
      }
    } catch (e) {
      alert('刪除失敗');
    } finally {
      setIsSaving(false);
    }
  };

  const getOrderOriginInfo = (order: any) => {
    if (!order.origin_source) return null;
    try {
      const parsed = JSON.parse(order.origin_source.replace(/&quot;/g, '"'));
      if (parsed.source_type === 'showcase_form') return { label: '接委託表單', color: '#4A7294' };
      if (parsed.source_type === 'bulletin') return { label: '許願池', color: '#8E7E8E' };
    } catch (e) {}
    return order.workflow_mode === 'free' ? { label: '自由紀錄', color: '#A0978D' } : { label: '標準委託', color: '#A67B3E' };
  };

  if (isLoading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#A0978D' }}>日曆載入中...</div>;
  }

  return (
    <div className="calendar-view-container" style={{ backgroundColor: '#FFF', borderRadius: '12px', padding: isMobile ? '12px' : '20px', border: '1px solid #EAE6E1', minHeight: '800px', display: 'flex', flexDirection: 'column' }}>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', fontSize: '13px', color: '#7A7269', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#5D4A3E', display: 'inline-block' }}></span> {dateColumnLabel}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#4A7294', display: 'inline-block' }}></span> 自訂行程 / 工作期</span>
        <span style={{ marginLeft: isMobile ? '0' : 'auto', width: isMobile ? '100%' : 'auto', fontStyle: 'italic', fontSize: '12px', color: '#A0978D' }}>💡 點擊空白處新增行程，點擊色塊查看與編輯詳情。</span>
      </div>

      <div style={{ flex: 1 }}>
        <Calendar
          localizer={localizer}
          events={calendarDisplayEvents}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '800px' }}
          views={isMobile ? [Views.MONTH] : [Views.MONTH, Views.WEEK]}
          eventPropGetter={eventStyleGetter}
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          selectable
          popup
          messages={{
            allDay: '全天',
            previous: '＜',
            next: '＞',
            today: '今天',
            month: '月',
            week: '週',
            day: '日',
            agenda: '待辦清單',
            date: '日期',
            time: '時間',
            event: '項目',
            noEventsInRange: '這段期間沒有任何排程。',
            showMore: total => `+${total} 項`
          }}
        />
      </div>

      {/* 新增/編輯 私人行程 Modal */}
      {modalMode === 'edit_custom' && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div className="fade-in" style={{ background: '#FFF', width: '100%', maxWidth: '400px', borderRadius: '12px', padding: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, color: '#5D4A3E', display: 'flex', alignItems: 'center', gap: '8px' }}><CalendarIcon size={18} /> {selectedCalendarEvent.id ? '編輯行程' : '新增排程'}</h3>
              <button onClick={() => setModalMode('none')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#A0978D' }}><X size={20}/></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#7A7269', marginBottom: '6px', display: 'block' }}>行程名稱</label>
                <input 
                  type="text" 
                  value={selectedCalendarEvent.title || ''} 
                  onChange={e => setSelectedCalendarEvent({...selectedCalendarEvent, title: e.target.value})} 
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #DED9D3', boxSizing: 'border-box' }}
                  placeholder="例如：休假、草稿繪製期..."
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#7A7269', marginBottom: '6px', display: 'block' }}>開始日期</label>
                  <input type="date" value={selectedCalendarEvent.start_date || ''} onChange={e => setSelectedCalendarEvent({...selectedCalendarEvent, start_date: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #DED9D3', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#7A7269', marginBottom: '6px', display: 'block' }}>結束日期</label>
                  <input type="date" value={selectedCalendarEvent.end_date || ''} onChange={e => setSelectedCalendarEvent({...selectedCalendarEvent, end_date: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #DED9D3', boxSizing: 'border-box' }} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#7A7269', marginBottom: '6px', display: 'block' }}>行程顏色</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {PRESET_COLORS.map(color => (
                    <div 
                      key={color} 
                      onClick={() => setSelectedCalendarEvent({...selectedCalendarEvent, color_hex: color})}
                      style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: color, cursor: 'pointer', border: selectedCalendarEvent.color_hex === color ? '3px solid #EAE6E1' : 'none', transform: selectedCalendarEvent.color_hex === color ? 'scale(1.1)' : 'scale(1)', transition: 'all 0.1s' }}
                    />
                  ))}
                </div>
              </div>

              <div style={{ padding: '12px', backgroundColor: '#FBFBF9', borderRadius: '8px', border: '1px solid #EAE6E1' }}>
                <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#4A7294', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}><LinkIcon size={14} /> 關聯委託單 (選填)</label>
                <select 
                  value={selectedCalendarEvent.linked_commission_id || ''} 
                  onChange={e => setSelectedCalendarEvent({...selectedCalendarEvent, linked_commission_id: e.target.value})}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #DED9D3', background: '#FFF', boxSizing: 'border-box' }}
                >
                  <option value="">-- 不關聯任何委託單 --</option>
                  {commissions.filter(c => c.status !== 'completed' && c.status !== 'cancelled').map(c => (
                    <option key={c.id} value={c.id}>{c.client_custom_title || c.project_name || '未命名'} ({c.id.split('-')[1] || c.id})</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px' }}>
                {selectedCalendarEvent.id ? (
                  <button onClick={handleDeleteCustomEvent} disabled={isSaving} style={{ background: 'none', border: '1px solid #FECACA', color: '#C04B4B', padding: '10px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}><Trash2 size={16}/> 刪除</button>
                ) : <div></div>}
                
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => setModalMode('none')} style={{ background: '#F1F5F9', border: 'none', color: '#64748B', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>取消</button>
                  <button onClick={handleSaveCustomEvent} disabled={isSaving} style={{ background: '#5D4A3E', border: 'none', color: 'white', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>{isSaving ? '儲存中...' : '儲存行程'}</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 檢視 委託單詳細資訊 Modal */}
      {modalMode === 'view_commission' && selectedCommission && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div className="fade-in" style={{ background: '#FFF', width: '100%', maxWidth: '400px', borderRadius: '16px', padding: '24px', boxShadow: '0 10px 40px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>
            
            {selectedCommission.client_custom_label === '黑名單' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#EF4444', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', fontWeight: 'bold' }}>
                <AlertCircle size={16} /> ⚠️ 提醒：此委託人已被您列入黑名單
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                   {(() => {
                     const origin = getOrderOriginInfo(selectedCommission);
                     return origin && (
                       <span style={{ fontSize: '11px', backgroundColor: origin.color, color: '#FFF', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold' }}>{origin.label}</span>
                     );
                   })()}
                   {(selectedCommission.is_rush === '是' || selectedCommission.is_rush === 1 || selectedCommission.is_rush === '1') && (
                     <span style={{ fontSize: '11px', backgroundColor: '#FFF1F2', color: '#E11D48', border: '1px solid #FDA4AF', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold' }}>[急單]</span>
                   )}
                </div>
                <h3 style={{ margin: 0, color: '#5D4A3E', fontSize: '18px', lineHeight: '1.4' }}>{selectedCommission.client_custom_title || selectedCommission.project_name || '未命名項目'}</h3>
              </div>
              <button onClick={() => setModalMode('none')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#A0978D', padding: '4px' }}><X size={24}/></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px', color: '#5D4A3E', marginBottom: '24px' }}>
              
              <div>
                <div style={{ fontSize: '12px', color: '#A0978D', marginBottom: '4px' }}>委託人資訊</div>
                <div style={{ fontWeight: 'bold' }}>{selectedCommission.client_name || '(未綁定)'} {selectedCommission.contact_memo && <span style={{ fontWeight: 'normal', color: '#7A7269' }}>({selectedCommission.contact_memo})</span>}</div>
                <div style={{ fontSize: '11px', fontFamily: 'monospace', color: '#B4ADA5', marginTop: '2px' }}>ID: {selectedCommission.client_public_id || '未綁定'}</div>
              </div>

              <div>
                <div style={{ fontSize: '12px', color: '#A0978D', marginBottom: '4px' }}>{dateColumnLabel}</div>
                <input 
                  type="date" 
                  defaultValue={selectedCommission.end_date} 
                  onChange={async (e) => {
                    const newVal = e.target.value;
                    await handleUpdateField(selectedCommission.id, 'end_date', newVal);
                    setSelectedCommission({ ...selectedCommission, end_date: newVal });
                  }}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #EAE6E1', fontSize: '14px', color: '#5D4A3E', backgroundColor: '#FDFDFB', boxSizing: 'border-box' }} 
                />
              </div>

              <div>
                <div style={{ fontSize: '12px', color: '#A0978D', marginBottom: '4px' }}>付款與狀態</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                   {(() => {
                     const status = selectedCommission.payment_status;
                     let color = '#8A7A7A'; let bg = '#F4F0EB'; let text = '尚未付款';
                     if (status === 'paid') { color = '#4E7A5A'; bg = '#E8F3EB'; text = '已收全額'; }
                     if (status === 'partial') { color = '#A67B3E'; bg = '#FDF4E6'; text = '已收訂金'; }
                     return (
                       <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '4px', backgroundColor: bg, color: color, fontWeight: 'bold' }}>{text}</span>
                     );
                   })()}
                   <span style={{ fontWeight: 'bold', color: '#7A7269' }}>${selectedCommission.total_price || 0}</span>
                </div>
              </div>

              <div>
                <div style={{ fontSize: '12px', color: '#A0978D', marginBottom: '4px' }}>當前進度</div>
                <div style={{ padding: '6px 12px', backgroundColor: '#FBFBF9', borderRadius: '8px', border: '1px solid #F4F0EB', display: 'inline-block', fontWeight: '500' }}>{selectedCommission.queue_status || '尚未開始'}</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={() => setModalMode('none')}
                style={{ flex: 1, background: '#F1F5F9', border: 'none', color: '#64748B', padding: '12px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}
              >
                關閉
              </button>
              <button 
                onClick={() => navigate(`/artist/notebook?id=${selectedCommission.id}`)}
                style={{ flex: 2, background: '#5D4A3E', border: 'none', color: 'white', padding: '12px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '13px' }}
              >
                進入單據管理 ➔
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}