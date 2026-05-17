// src/components/OC/OCTagInput.tsx
import React, { useState } from 'react';
import { X } from 'lucide-react';

interface OCTagInputProps {
  tags: string[];
  onChange: (newTags: string[]) => void;
  placeholder?: string;
}

export function OCTagInput({ tags, onChange, placeholder = '輸入印象關鍵字，按 Enter 或逗號產生標籤...' }: OCTagInputProps) {
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const newTag = inputValue.trim().replace(/^#/, ''); 
      
      if (newTag && !tags.includes(newTag)) {
        onChange([...tags, newTag]);
      }
      setInputValue('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    onChange(tags.filter(tag => tag !== tagToRemove));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
      {}
      {tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {tags.map(tag => (
            <div 
              key={tag} 
              style={{ display: 'flex', alignItems: 'center', backgroundColor: '#F0EBE6', color: '#5D4A3E', padding: '4px 10px', borderRadius: '16px', fontSize: '13px', fontWeight: 'bold' }}
            >
              #{tag}
              <button 
                onClick={() => removeTag(tag)}
                style={{ background: 'none', border: 'none', padding: 0, marginLeft: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#A0978D' }}
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
      
      {}
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        style={{ 
          border: '2px dashed #DED9D3', borderRadius: '8px', padding: '8px 12px', 
          fontSize: '14px', outline: 'none', backgroundColor: '#FBFBF9', color: '#5D4A3E', 
          width: '100%', transition: 'all 0.2s' 
        }}
        onFocus={(e) => { e.currentTarget.style.borderColor = '#A67B3E'; e.currentTarget.style.backgroundColor = '#FFF'; }}
        onBlur={(e) => { e.currentTarget.style.borderColor = '#DED9D3'; e.currentTarget.style.backgroundColor = '#FBFBF9'; }}
      />
    </div>
  );
}