// src/pages/artist/notebook-components/TabLogs.tsx
import { formatLocalTime } from './notebookUtils';
import type { ActionLog } from './notebookUtils';

interface TabLogsProps {
  logs: ActionLog[];
}

export function TabLogs({ logs }: TabLogsProps) {
  return (
    <div className="section-card">
      <h3 className="section-title logs-title">決策與操作追蹤紀錄</h3>
      
      {logs.length === 0 ? (
        <div className="logs-empty">尚未有紀錄</div>
      ) : (
        <div className="logs-list">
          {logs.map(log => (
            <div key={log.id} className={`log-card ${log.actor_role === 'artist' ? 'log-artist' : 'log-client'}`}>
              <div className="log-meta">
                {formatLocalTime(log.created_at)} | {log.actor_role === 'artist' ? '繪師' : '委託人'}
              </div>
              <div className="log-content">
                {log.content}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}