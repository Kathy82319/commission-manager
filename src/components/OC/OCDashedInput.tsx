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
  maxLength = 120, 
  isTextArea = false 
}: OCDashedInputProps) {
  const [localValue, setLocalValue] = useState(value);
  const [isFocused, setIsFocused] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    setLocalValue(value);
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
      inputRef.current?.blur(); // 觸發 blur 以執行儲存
    }
  };

  const containerStyle: React.CSSProperties = {
    position: 'relative',
    display: 'flex',
    alignItems: isTextArea ? 'flex-start' : 'center',
    border: `2px dashed ${isFocused ? '#A67B3E' : '#DED9D3'}`,
    borderRadius: '8px',
    padding: '8px 12px',
    backgroundColor: isFocused ? '#FFF' : '#FBFBF9',
    transition: 'all 0.2s',
    cursor: isFocused ? 'text' : 'pointer',
    width: '100%'
  };

  return (
    <div style={{ position: 'relative', width: '100%' }}>
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
            style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', resize: 'vertical', minHeight: '80px', fontSize: '14px', color: '#5D4A3E', lineHeight: '1.5' }}
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
            style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: '14px', color: '#5D4A3E' }}
          />
        )}
        <Pencil size={14} color="#A0978D" style={{ marginLeft: '8px', flexShrink: 0, marginTop: isTextArea ? '4px' : '0' }} />
      </div>
      
      {showToast && (
        <div style={{ 
          position: 'absolute', bottom: '-35px', left: '50%', transform: 'translateX(-50%)', 
          backgroundColor: 'rgba(0,0,0,0.8)', color: 'white', padding: '6px 12px', 
          borderRadius: '4px', fontSize: '12px', zIndex: 10, whiteSpace: 'nowrap', 
          pointerEvents: 'none', animation: 'fadeIn 0.2s ease-in-out' 
        }}>
          限制字數為 {maxLength} 字喔！
        </div>
      )}
    </div>
  );
}