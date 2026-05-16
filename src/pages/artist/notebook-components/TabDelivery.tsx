// src/pages/artist/notebook-components/TabDelivery.tsx
import { ImageUploader } from '../../../components/ImageUploader';
import { formatLocalDate } from './notebookUtils';
import type { Commission, Submission, ActionLog } from './notebookUtils';

interface TabDeliveryProps {
  selectedOrder: Commission | undefined;
  submissions: Submission[];
  logs: ActionLog[];
  isUploading: string | null;
  handleR2FileUpload: (stageKey: string, resultBlobs: { preview: Blob; original?: Blob }) => Promise<void>;
}

export function TabDelivery({
  selectedOrder,
  submissions,
  logs,
  isUploading,
  handleR2FileUpload
}: TabDeliveryProps) {

  const isStageActuallyReviewed = (stageNameCH: string) => {
    return logs.some(log => log.actor_role === 'client' && (log.content.includes(`已閱覽 ${stageNameCH}`) || log.content.includes(`檢視 ${stageNameCH}`) || log.content.includes(`同意 ${stageNameCH}`)));
  };

  const renderStageBox = (title: string, stageKey: string, isReviewing: boolean, isPassed: boolean) => {
    const sub = submissions.find(s => s.stage === stageKey);
    const isFinal = stageKey === 'final';
    const isRejected = selectedOrder?.current_stage === `${stageKey}_drawing` && !!sub;
    const isUnbound = !selectedOrder?.client_public_id;
    const isFreeMode = selectedOrder?.workflow_mode === 'free';
  
    let headerClass = 'stage-pending', statusTag = '等待繪製上傳...';
    
    if (!sub) { headerClass = 'stage-empty'; } 
    else if (isFreeMode) { headerClass = 'stage-passed'; statusTag = '[完成] 檔案已上傳 (自由模式)'; } 
    else if (isUnbound) { headerClass = 'stage-unbound'; statusTag = '[注意] 等待委託人綁定'; } 
    else if (isPassed) { headerClass = 'stage-passed'; statusTag = isFinal ? '[完成] 委託人已同意 (原檔已解鎖)' : '[完成] 委託人已閱覽'; } 
    else if (isReviewing) { headerClass = 'stage-reviewing'; statusTag = '[等待] 待委託人確認'; } 
    else if (isRejected) { headerClass = 'stage-rejected'; statusTag = '[注意] 委託人已退回修改'; } 
    else { headerClass = 'stage-passed'; statusTag = '[完成] 稿件已上傳 (待閱覽)'; }
  
    return (
      <div className="stage-box">
        <div className={`stage-box-header ${headerClass}`}>
          <span>{title}</span> <span className="stage-status">{statusTag}</span>
        </div>
        <div className="stage-box-content">
          {isFinal && !isFreeMode && <div className="stage-notice">
            [提示] 上傳說明：系統會自動產生「浮水印預覽圖」供委託人確認。委託人按下同意後，才能下載您上傳的高畫質原檔。
          </div>}
          {isUploading === stageKey ? (
            <div className="stage-loading">檔案處理中，請稍候...</div>
          ) : (
            <ImageUploader 
              onUpload={(blobs) => handleR2FileUpload(stageKey, blobs)}
              withWatermark={!isFreeMode} 
              watermarkText="SAMPLE" 
              existingUrl={sub?.file_url?.split('|')[0]} 
              isFinal={isFinal} 
              metadata={sub ? { version: sub.version, date: formatLocalDate(sub.created_at) } : undefined}
              buttonText={sub ? "重新交付 (覆蓋版本)" : "點擊上傳圖檔"}
            />
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fade-in">
      <div className="delivery-hint-wrapper">
        <span className="hint-text">[提示]：上傳後將自動進行壓縮與壓製浮水印...</span>
      </div>
      {renderStageBox('階段 1：草稿 (Sketch)', 'sketch', selectedOrder?.current_stage === 'sketch_reviewing', isStageActuallyReviewed('草稿'))}
      {renderStageBox('階段 2：線稿 (Lineart)', 'lineart', selectedOrder?.current_stage === 'lineart_reviewing', isStageActuallyReviewed('線稿'))}
      {renderStageBox('階段 3：完稿 (Final Preview)', 'final', selectedOrder?.current_stage === 'final_reviewing', selectedOrder?.status === 'completed')}
    </div>
  );
}