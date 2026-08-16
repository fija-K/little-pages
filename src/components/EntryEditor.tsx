import React, { useState, useEffect } from 'react';
import { Save, ArrowLeft, Trash2, Heart, Palette, Sparkles, Check } from 'lucide-react';
import confetti from 'canvas-confetti';
import { PAGE_COLORS } from '../types/journal';
import type { JournalEntry, MoodType, PageColor } from '../types/journal';
import { formatHandwrittenDate, getTodayIsoString } from '../utils/dateUtils';
import { MoodPicker } from './MoodPicker';
import { TagInput } from './TagInput';

interface EntryEditorProps {
  entry: JournalEntry | null;
  initialDateIso?: string;
  onSave: (entry: JournalEntry) => void;
  onCancel: () => void;
  onDelete?: (id: string) => void;
}

export const EntryEditor: React.FC<EntryEditorProps> = ({
  entry,
  initialDateIso,
  onSave,
  onCancel,
  onDelete
}) => {
  const [date, setDate] = useState<string>(
    entry?.date || initialDateIso || getTodayIsoString()
  );
  const [title, setTitle] = useState<string>(entry?.title || '');
  const [content, setContent] = useState<string>(entry?.content || '');
  const [mood, setMood] = useState<MoodType>(entry?.mood || 'happy');
  const [pageColor, setPageColor] = useState<PageColor>(entry?.pageColor || 'blush');
  const [tags, setTags] = useState<string[]>(entry?.tags || ['thoughts']);
  const [isFavorite, setIsFavorite] = useState<boolean>(entry?.isFavorite || false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [showSavedStamp, setShowSavedStamp] = useState<boolean>(false);

  useEffect(() => {
    if (entry) {
      setDate(entry.date);
      setTitle(entry.title);
      setContent(entry.content);
      setMood(entry.mood);
      setPageColor(entry.pageColor);
      setTags(entry.tags || []);
      setIsFavorite(entry.isFavorite || false);
    }
  }, [entry]);

  const pageTheme = PAGE_COLORS[pageColor];

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const charCount = content.length;
  const readTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!title.trim() && !content.trim()) {
      alert('Please write a title or a few words before saving your page~');
      return;
    }

    setIsSaving(true);
    setShowSavedStamp(true);

    confetti({
      particleCount: 40,
      spread: 60,
      origin: { y: 0.7 },
      colors: ['#F4A6BA', '#C9B6E4', '#B8CFAE', '#F6D186']
    });

    const savedEntry: JournalEntry = {
      id: entry?.id || `entry-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      date,
      title: title.trim() || 'Untitled Page',
      content: content.trim(),
      mood,
      pageColor,
      tags,
      createdAt: entry?.createdAt || Date.now(),
      updatedAt: Date.now(),
      isFavorite
    };

    setTimeout(() => {
      onSave(savedEntry);
      setIsSaving(false);
    }, 600);
  };

  return (
    <div className={`entry-editor-wrapper ${showSavedStamp ? 'stamp-animation' : ''}`}>
      <div className="editor-top-actions">
        <button
          type="button"
          className="back-btn"
          onClick={onCancel}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Journal</span>
        </button>

        <div className="top-right-actions">
          <button
            type="button"
            className={`fav-toggle-btn ${isFavorite ? 'active' : ''}`}
            onClick={() => setIsFavorite(!isFavorite)}
            title={isFavorite ? 'Favorited page' : 'Mark as favorite'}
          >
            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-pink-500 text-pink-500' : ''}`} />
          </button>

          {entry && onDelete && (
            <button
              type="button"
              className="editor-delete-btn"
              onClick={() => {
                if (window.confirm('Delete this diary entry?')) {
                  onDelete(entry.id);
                }
              }}
              title="Delete page"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            className="save-page-btn"
            onClick={() => handleSave()}
            disabled={isSaving}
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Stamp & Saving...' : 'Save Page'}</span>
          </button>
        </div>
      </div>

      <form
        onSubmit={handleSave}
        className="ruled-diary-page-card"
        style={{
          backgroundColor: pageTheme.bg,
          borderColor: pageTheme.border,
          '--accent-color': pageTheme.accent
        } as React.CSSProperties}
      >
        <div className="binder-holes-strip">
          <div className="hole" />
          <div className="hole" />
          <div className="hole" />
        </div>
        <div className="washi-tape-header" />

        <div className="date-header-group">
          <div className="friendly-date-display">
            <h2 className="friendly-date-text">{formatHandwrittenDate(date)}</h2>
          </div>
          <input
            type="date"
            className="date-picker-input"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <div className="editor-section">
          <MoodPicker
            selectedMood={mood}
            onSelectMood={setMood}
          />
        </div>

        <div className="editor-section page-color-picker-row">
          <div className="color-picker-label">
            <Palette className="w-4 h-4 text-stone-600" />
            <span>Page Color:</span>
          </div>
          <div className="color-swatches-row">
            {(Object.keys(PAGE_COLORS) as PageColor[]).map((key) => {
              const theme = PAGE_COLORS[key];
              const isSelected = pageColor === key;
              return (
                <button
                  key={key}
                  type="button"
                  className={`color-swatch-btn ${isSelected ? 'selected' : ''}`}
                  style={{ backgroundColor: theme.bg, borderColor: theme.border }}
                  onClick={() => setPageColor(key)}
                  title={theme.name}
                >
                  {isSelected && <Check className="w-3.5 h-3.5 text-stone-700 mx-auto" />}
                </button>
              );
            })}
          </div>
        </div>

        <div className="editor-section">
          <input
            type="text"
            className="diary-title-input"
            placeholder="Give this page a title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="editor-section lined-paper-container">
          <textarea
            className="ruled-textarea"
            placeholder="Dear Diary, today was..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={12}
          />
        </div>

        <div className="editor-section">
          <TagInput
            tags={tags}
            onChangeTags={setTags}
          />
        </div>

        <div className="editor-footer-bar">
          <div className="live-writing-stats">
            <span>{wordCount} words</span>
            <span className="dot-divider">•</span>
            <span>{charCount} characters</span>
            <span className="dot-divider">•</span>
            <span>~{readTimeMinutes} min read</span>
          </div>

          <button
            type="submit"
            className="save-page-btn-large"
            disabled={isSaving}
          >
            <Sparkles className="w-4.5 h-4.5" />
            <span>Save to My Journal 📖</span>
          </button>
        </div>
      </form>
    </div>
  );
};
