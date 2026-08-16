import React, { useState } from 'react';
import { Plus, X, Tag } from 'lucide-react';
import { DEFAULT_TAGS } from '../types/journal';

interface TagInputProps {
  tags: string[];
  onChangeTags: (tags: string[]) => void;
}

const STICKY_COLORS = [
  { bg: '#FFF9E6', border: '#F6D186', text: '#5C4813' }, // Butter
  { bg: '#FDEFF3', border: '#F4A6BA', text: '#692534' }, // Blush
  { bg: '#EBF3E8', border: '#B8CFAE', text: '#264A1F' }, // Sage
  { bg: '#F3EEFF', border: '#C9B6E4', text: '#432E69' }, // Lavender
  { bg: '#E8F4F8', border: '#9BCBE3', text: '#1D495B' }, // Sky
];

export const TagInput: React.FC<TagInputProps> = ({ tags, onChangeTags }) => {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleAddTag = (tagToAdd: string) => {
    const cleaned = tagToAdd.trim().toLowerCase().replace(/^#/, '');
    if (cleaned && !tags.includes(cleaned)) {
      onChangeTags([...tags, cleaned]);
    }
    setInputValue('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onChangeTags(tags.filter(t => t !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddTag(inputValue);
    }
  };

  const unusedDefaults = DEFAULT_TAGS.filter(t => !tags.includes(t));

  return (
    <div className="sticky-tags-container">
      <div className="tags-label-row">
        <Tag className="w-4 h-4 text-amber-700" />
        <span className="tags-header-text">Sticky Note Labels:</span>
      </div>

      <div className="sticky-tags-wrapper">
        {tags.map((tag, idx) => {
          const colorObj = STICKY_COLORS[idx % STICKY_COLORS.length];
          return (
            <div
              key={tag}
              className="sticky-note-chip"
              style={{
                backgroundColor: colorObj.bg,
                borderColor: colorObj.border,
                color: colorObj.text,
                transform: `rotate(${((idx % 5) - 2) * 1.5}deg)`
              }}
            >
              <span className="sticky-pin">📌</span>
              <span className="sticky-tag-text">#{tag}</span>
              <button
                type="button"
                className="sticky-remove-btn"
                onClick={() => handleRemoveTag(tag)}
                title="Remove tag"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}

        <div className="tag-input-box">
          <input
            type="text"
            className="tag-text-field"
            placeholder="Add sticky note tag..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          />
          {inputValue.trim() && (
            <button
              type="button"
              className="tag-add-btn"
              onClick={() => handleAddTag(inputValue)}
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}

          {showSuggestions && unusedDefaults.length > 0 && (
            <div className="tag-suggestions-popover">
              <span className="popover-title">Suggested tags:</span>
              <div className="suggestions-list">
                {unusedDefaults.map((defTag) => (
                  <button
                    key={defTag}
                    type="button"
                    className="suggestion-chip"
                    onClick={() => handleAddTag(defTag)}
                  >
                    +#{defTag}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
