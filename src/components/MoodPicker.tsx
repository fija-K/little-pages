import React from 'react';
import { MOODS } from '../types/journal';
import type { MoodType } from '../types/journal';

interface MoodPickerProps {
  selectedMood: MoodType;
  onSelectMood: (mood: MoodType) => void;
  showLabels?: boolean;
}

export const MoodPicker: React.FC<MoodPickerProps> = ({
  selectedMood,
  onSelectMood,
  showLabels = true
}) => {
  const moodKeys = Object.keys(MOODS) as MoodType[];

  return (
    <div className="mood-picker-container">
      <span className="mood-picker-title">How are you feeling?</span>
      <div className="mood-sticker-row">
        {moodKeys.map((key) => {
          const config = MOODS[key];
          const isSelected = selectedMood === key;

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectMood(key)}
              className={`mood-sticker-btn ${isSelected ? 'selected' : ''}`}
              style={{
                '--sticker-bg': config.bgColor,
                '--sticker-border': config.borderColor,
                '--sticker-color': config.color
              } as React.CSSProperties}
              title={`${config.label} - ${config.description}`}
            >
              <div className="sticker-blob">
                <span className="sticker-emoji">{config.emoji}</span>
              </div>
              {showLabels && <span className="sticker-label">{config.label}</span>}
              {isSelected && <div className="sticker-check-ring" />}
            </button>
          );
        })}
      </div>
    </div>
  );
};
