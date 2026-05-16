// src/pages/artist/notebook-components/QueueCalendarView.tsx
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
// @ts-ignore: moment 語系檔缺乏官方 TypeScript 宣告，此處忽略 TS 型別檢查
import 'moment/locale/zh-tw';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { X, Calendar as CalendarIcon, Link as LinkIcon, Trash2 } from 'lucide-react';

moment.locale('zh-tw');
const localizer = momentLocalizer(moment);

const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || '';

interface QueueCalendarViewProps {
  commissions: any[];
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

const PRESET_COLORS = ['#4A7294', '#8CB369', '#A67B3E', '#A05C5C', '#8E7E8E', '#5D4A3E'];

export function QueueCalendarView({ commissions }: QueueCalendarViewProps) {
  const navigate = useNavigate();
  const [events, setEvents] = useState<CalendarEventData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal 狀態
  const [modalMode, setModalMode] = useState<'none' | 'edit_custom' | 'view_commission'>('none');
  const [selectedCalendarEvent, setSelectedCalendarEvent] = useState<Partial<CalendarEventData>>({});
  const [selectedCommission, setSelectedCommission] = useState<any | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // 抓取私人行程
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

  // 混合資料：將委託單(截稿日)與私人行程轉為日曆套件格式
  const calendarDisplayEvents = useMemo(() => {
    const displayList: any[] = [];

    // 1. 委託單 (紅色單日圓點)
    commissions.forEach(c => {
      if (c.end_date) {
        displayList.push({
          id: `comm-${c.id}`,
          title: `[截稿] ${c.client_custom_title || c.project_name || '未命名'}`,
          start: new Date(c.end_date),
          end: new Date(c.end_date),
          allDay: true,
          resource: { type: 'commission', data: c }
        });
      }
    });

    // 2. 私人行程 (自訂色塊)
    events.forEach(e => {
      // 判斷是否關聯了委託單
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
        end: new Date(e.end_date), // 若要跨日，結束日會自動延展
        allDay: true,
        resource: { type: 'custom', data: e }
      });
    });

    return displayList;
  }, [commissions, events]);

  // 自訂日曆色塊樣式
  const eventStyleGetter = (event: any) => {
    let backgroundColor = '#4A7294';
    if (event.resource?.type === 'commission') {
      backgroundColor = '#C04B4B'; // 委託單固定紅色
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
        padding: '2px 4px'
      }
    };
  };

  // 點擊日曆空白格子 -> 新增行程
  const handleSelectSlot = (slotInfo: { start: Date; end: Date }) => {
    const formattedStart = moment(slotInfo.start).format('YYYY-MM-DD');
    // react-big-calendar 的 end date 通常會多包一天，若是單日選取，我們將其扣回
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

  // 點擊現有色塊 -> 編輯行程 或 檢視委託單
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

      const data = await res.json();
      if (data.success) {
        setModalMode('none');
        fetchCalendarEvents(); // 重新整理
      } else {
        alert('儲存失敗：' + data.error);
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

  if (isLoading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#A0978D' }}>日曆載入中...</div>;
  }

  return (
    <div style={{ backgroundColor: '#FFF', borderRadius: '12px', padding: '20px', border: '1px solid #EAE6E1', height: '800px', display: 'flex', flexDirection: 'column' }}>
      
      {/* 局部注入日曆套件的客製化樣式，避免破壞全域 */}
      <style dangerouslySetInnerHTML={{__html: `
        .rbc-calendar { font-family: inherit; }
        .rbc-toolbar button { border-radius: 6px; color: #5D4A3E; border-color: #DED9D3; }
        .rbc-toolbar button.rbc-active { background-color: #5D4A3E; color: white; border-color: #5D4A3E; box-shadow: none; }
        .rbc-toolbar button:hover:not(.rbc-active) { background-color: #FBFBF9; }
        .rbc-today { background-color: #FDF4E6; }
        .rbc-event { padding: 0 !important; }
        .rbc-month-view { border-color: #EAE6E1; border-radius: 8px; overflow: hidden; }
        .rbc-header { padding: 8px 0; font-weight: bold; color: #7A7269; border-bottom: 1px solid #EAE6E1; }
      `}} />

      <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', fontSize: '13px', color: '#7A7269', alignItems: 'center' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#C04B4B', display: 'inline-block' }}></span> 委託死線</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#4A7294', display: 'inline-block' }}></span> 自訂行程 / 工作期</span>
        <span style={{ marginLeft: 'auto', fontStyle: 'italic', fontSize: '12px', color: '#A0978D' }}>💡 點擊空白處新增行程，點擊色塊編輯。</span>
      </div>

      <div style={{ flex: 1 }}>
        <Calendar
          localizer={localizer}
          events={calendarDisplayEvents}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '100%' }}
          views={['month', 'week']}
          eventPropGetter={eventStyleGetter}
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          selectable
          popup
        />
      </div>

      {/* =======================================================
          彈出視窗：新增/編輯 私人行程
          ======================================================= */}
      {modalMode === 'edit_custom' && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#FFF', width: '100%', maxWidth: '400px', borderRadius: '12px', padding: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}>
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
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #DED9D3' }}
                  placeholder="例如：休假、草稿繪製期..."
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#7A7269', marginBottom: '6px', display: 'block' }}>開始日期</label>
                  <input type="date" value={selectedCalendarEvent.start_date || ''} onChange={e => setSelectedCalendarEvent({...selectedCalendarEvent, start_date: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #DED9D3' }} />
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#7A7269', marginBottom: '6px', display: 'block' }}>結束日期</label>
                  <input type="date" value={selectedCalendarEvent.end_date || ''} onChange={e => setSelectedCalendarEvent({...selectedCalendarEvent, end_date: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #DED9D3' }} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#7A7269', marginBottom: '6px', display: 'block' }}>行程顏色</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {PRESET_COLORS.map(color => (
                    <div 
                      key={color} 
                      onClick={() => setSelectedCalendarEvent({...selectedCalendarEvent, color_hex: color})}
                      style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: color, cursor: 'pointer', border: selectedCalendarEvent.color_hex === color ? '3px solid #EAE6E1' : 'none', transform: selectedCalendarEvent.color_hex === color ? 'scale(1.1)' : 'scale(1)' }}
                    />
                  ))}
                </div>
              </div>

              <div style={{ padding: '12px', backgroundColor: '#FBFBF9', borderRadius: '8px', border: '1px solid #EAE6E1' }}>
                <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#4A7294', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}><LinkIcon size={14} /> 關聯委託單 (選填)</label>
                <select 
                  value={selectedCalendarEvent.linked_commission_id || ''} 
                  onChange={e => setSelectedCalendarEvent({...selectedCalendarEvent, linked_commission_id: e.target.value})}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #DED9D3', background: '#FFF' }}
                >
                  <option value="">-- 不關聯任何委託單 --</option>
                  {commissions.filter(c => c.status !== 'completed' && c.status !== 'cancelled').map(c => (
                    <option key={c.id} value={c.id}>{c.client_custom_title || c.project_name || '未命名'} ({c.id.split('-')[1] || c.id})</option>
                  ))}
                </select>
                <div style={{ fontSize: '11px', color: '#A0978D', marginTop: '6px' }}>關聯後，日曆上會一併顯示委託專案名稱。</div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px' }}>
                {selectedCalendarEvent.id ? (
                  <button onClick={handleDeleteCustomEvent} disabled={isSaving} style={{ background: 'none', border: '1px solid #FECACA', color: '#C04B4B', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}><Trash2 size={16}/> 刪除</button>
                ) : <div></div>}
                
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => setModalMode('none')} style={{ background: '#F1F5F9', border: 'none', color: '#64748B', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>取消</button>
                  <button onClick={handleSaveCustomEvent} disabled={isSaving} style={{ background: '#5D4A3E', border: 'none', color: 'white', padding: '10px 24px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>{isSaving ? '儲存中...' : '儲存行程'}</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =======================================================
          彈出視窗：檢視 委託單紅點
          ======================================================= */}
      {modalMode === 'view_commission' && selectedCommission && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#FFF', width: '100%', maxWidth: '350px', borderRadius: '12px', padding: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <span style={{ fontSize: '11px', backgroundColor: '#FEEBEB', color: '#C04B4B', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold' }}>委託死線</span>
                <h3 style={{ margin: '8px 0 0 0', color: '#5D4A3E' }}>{selectedCommission.client_custom_title || selectedCommission.project_name || '未命名'}</h3>
              </div>
              <button onClick={() => setModalMode('none')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#A0978D' }}><X size={20}/></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: '#7A7269', marginBottom: '24px' }}>
              <div><strong>委託人：</strong>{selectedCommission.client_name || selectedCommission.contact_memo || '未知'}</div>
              <div><strong>金額：</strong>NT$ {selectedCommission.total_price || 0}</div>
              <div><strong>當前狀態：</strong>{selectedCommission.queue_status || '尚未設定'}</div>
            </div>

            <button 
              onClick={() => navigate(`/artist/notebook?id=${selectedCommission.id}`)}
              style={{ width: '100%', background: '#5D4A3E', border: 'none', color: 'white', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              進入單據管理 ➔
            </button>
          </div>
        </div>
      )}

    </div>
  );
}