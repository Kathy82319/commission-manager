// src/components/OC/OCDashedInput.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Pencil } from 'lucide-react';

interface OCDashedInputProps {
  value: string;
  onSave: (newValue: string) => void;
  placeholder?: string;
  maxLength?: number;
  isTextArea?: boolean;
}

export function OCDashedInput({ 
  value, 
  onSave, 
  placeholder = '', 
  maxLength = 200, 
  isTextArea = false 
}: OCDashedInputProps) {
  const [localValue, setLocalValue] = useState(value || '');
  const [isFocused, setIsFocused] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    setLocalValue(value || '');
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    let newVal = e.target.value;
    if (newVal.length > maxLength) {
      newVal = newVal.substring(0, maxLength);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }
    setLocalValue(newVal);
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (localValue !== value) {
      onSave(localValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isTextArea && e.key === 'Enter') {
      e.preventDefault();
      inputRef.current?.blur(); 
    }
  };

  const containerStyle: React.CSSProperties = {
    position: 'relative',
    display: 'flex',
    alignItems: isTextArea ? 'flex-start' : 'center',
    border: `1.5px dashed ${isFocused ? '#A67B3E' : '#DED9D3'}`,
    borderRadius: '6px',
    padding: '4px 8px', 
    backgroundColor: isFocused ? '#FFF' : '#FBFBF9',
    transition: 'all 0.2s',
    cursor: isFocused ? 'text' : 'pointer',
    width: '100%',
    minHeight: isTextArea ? 'auto' : '32px'
  };

  // 動態計算字數顏色，接近上限時變紅警告
  const isNearLimit = localValue.length >= maxLength * 0.9;

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {/* 🌟 局部樣式防護 */}
      <style dangerouslySetInnerHTML={{__html: `
        .oc-clean-input {
          flex: 1; border: none !important; outline: none !important;
          background: transparent !important; box-shadow: none !important;
          -webkit-appearance: none !important; appearance: none !important;
          margin: 0 !important; padding: 0 4px !important; border-radius: 0 !important;
          font-size: 13px !important; color: #5D4A3E !important; line-height: 1.5 !important;
        }
        .oc-clean-input:-webkit-autofill {
          -webkit-box-shadow: 0 0 0 1000px transparent inset !important;
          transition: background-color 5000s ease-in-out 0s;
        }
        @keyframes fadeUpIn {
          from { opacity: 0; transform: translate(-50%, 10px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
      `}} />

      <div 
        style={containerStyle}
        onClick={() => inputRef.current?.focus()}
      >
        {isTextArea ? (
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={localValue}
            onChange={handleChange}
            onBlur={handleBlur}
            onFocus={() => setIsFocused(true)}
            placeholder={placeholder}
            className="oc-clean-input"
            style={{ resize: 'vertical', minHeight: '80px', paddingBottom: '24px' }} // 預留空間給字數統計
          />
        ) : (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="text"
            value={localValue}
            onChange={handleChange}
            onBlur={handleBlur}
            onFocus={() => setIsFocused(true)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="oc-clean-input"
          />
        )}
        <Pencil size={12} color="#A0978D" style={{ marginLeft: '6px', flexShrink: 0, marginTop: isTextArea ? '4px' : '0' }} />
        
        {/* 🌟 新增：長文本字數即時統計 */}
        {isTextArea && isFocused && (
          <div style={{
            position: 'absolute',
            bottom: '6px',
            right: '12px',
            fontSize: '11px',
            fontWeight: 'bold',
            color: isNearLimit ? '#C04B4B' : '#A0978D',
            pointerEvents: 'none',
            transition: 'color 0.2s'
          }}>
            {localValue.length} / {maxLength}
          </div>
        )}
      </div>
      
      {/* 🌟 優化 Toast 動畫與層級 */}
      {showToast && (
        <div style={{ 
          position: 'absolute', bottom: '-40px', left: '50%', transform: 'translateX(-50%)', 
          backgroundColor: 'rgba(93, 74, 62, 0.95)', color: 'white', padding: '6px 14px', 
          borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', zIndex: 100, whiteSpace: 'nowrap', 
          pointerEvents: 'none', animation: 'fadeUpIn 0.2s ease-out', boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
        }}>
          ⚠️ 內容已達 {maxLength} 字上限！
        </div>
      )}
    </div>
  );
}