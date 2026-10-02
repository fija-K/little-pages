import React, { useState, useEffect, useRef } from 'react';
import { Save, ArrowLeft, Trash2, Heart, Palette, Sparkles, Check, RotateCcw, Type } from 'lucide-react';
import confetti from 'canvas-confetti';
import { PAGE_COLORS } from '../types/journal';
import type { JournalEntry, MoodType, PageColor, PlacedSticker } from '../types/journal';
import { formatHandwrittenDate, getTodayIsoString } from '../utils/dateUtils';
import { generateRandomUUID } from '../utils/crypto';
import { MoodPicker } from './MoodPicker';
import { TagInput } from './TagInput';
import { StickerTray } from './StickerTray';
import { StickerLayer } from './StickerLayer';
import { FontPickerModal } from './FontPickerModal';
import type { FontSizeOption } from '../config/fonts';
import { DEFAULT_FONT_ID, DEFAULT_FONT_SIZE, getFontFamilyCss, getFontSizeCss } from '../config/fonts';

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
  const cardRef = useRef<HTMLFormElement>(null);

  const defaultFont = localStorage.getItem('little_pages_default_font') || DEFAULT_FONT_ID;
  const defaultTitleFont = localStorage.getItem('little_pages_default_title_font') || undefined;
  const defaultFontSize = (localStorage.getItem('little_pages_default_font_size') as FontSizeOption) || DEFAULT_FONT_SIZE;

  const [date, setDate] = useState<string>(
    entry?.date || initialDateIso || getTodayIsoString()
  );
  const [title, setTitle] = useState<string>(entry?.title || '');
  const [content, setContent] = useState<string>(entry?.content || '');
  const [mood, setMood] = useState<MoodType>(entry?.mood || 'happy');
  const [pageColor, setPageColor] = useState<PageColor>(entry?.pageColor || 'blush');
  const [tags, setTags] = useState<string[]>(entry?.tags || []);
  const [isFavorite, setIsFavorite] = useState<boolean>(entry?.isFavorite || false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [showSavedStamp, setShowSavedStamp] = useState<boolean>(false);

  // Font state
  const [fontFamily, setFontFamily] = useState<string>(entry?.fontFamily || defaultFont);
  const [titleFontFamily, setTitleFontFamily] = useState<string | undefined>(entry?.titleFontFamily || defaultTitleFont);
  const [fontSize, setFontSize] = useState<FontSizeOption>(entry?.fontSize || defaultFontSize);
  const [isFontPickerOpen, setIsFontPickerOpen] = useState<boolean>(false);

  // Sticker state
  const [stickers, setStickers] = useState<PlacedSticker[]>(entry?.stickers || []);
  const [selectedStickerId, setSelectedStickerId] = useState<string | null>(null);
  const [isTrayOpen, setIsTrayOpen] = useState<boolean>(false);
  const [history, setHistory] = useState<PlacedSticker[][]>([]);

  useEffect(() => {
    if (entry) {
      setDate(entry.date);
      setTitle(entry.title);
      setContent(entry.content);
      setMood(entry.mood);
      setPageColor(entry.pageColor);
      setTags(entry.tags || []);
      setStickers(entry.stickers || []);
      setIsFavorite(entry.isFavorite || false);
      setFontFamily(entry.fontFamily || defaultFont);
      setTitleFontFamily(entry.titleFontFamily || defaultTitleFont);
      setFontSize(entry.fontSize || defaultFontSize);
    }
  }, [entry]);

  const pageTheme = PAGE_COLORS[pageColor];

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const charCount = content.length;
  const readTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));

  // Push state to history before mutation for Undo
  const pushHistory = (currentStickers: PlacedSticker[]) => {
    setHistory((prev) => [...prev.slice(-15), currentStickers]);
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    setStickers(previous);
    setSelectedStickerId(null);
  };

  const handleAddStickerFromTray = (packId: string, stickerId: string) => {
    pushHistory(stickers);

    const newSticker: PlacedSticker = {
      id: generateRandomUUID(),
      packId,
      stickerId,
      x: 50,
      y: 40,
      scale: 1.0,
      rotation: 0,
      zIndex: stickers.length + 1,
      flipped: false
    };

    const updated = [...stickers, newSticker];
    setStickers(updated);
    setSelectedStickerId(newSticker.id);
  };

  const handleUpdateSticker = (updated: PlacedSticker) => {
    setStickers((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  };

  const handleDeleteSticker = (id: string) => {
    pushHistory(stickers);
    setStickers((prev) => prev.filter((s) => s.id !== id));
    if (selectedStickerId === id) setSelectedStickerId(null);
  };

  const handleDuplicateSticker = (id: string) => {
    const target = stickers.find((s) => s.id === id);
    if (!target) return;
    pushHistory(stickers);

    const duplicated: PlacedSticker = {
      ...target,
      id: generateRandomUUID(),
      x: Math.min(90, target.x + 4),
      y: Math.min(90, target.y + 4),
      zIndex: stickers.length + 1
    };

    const updated = [...stickers, duplicated];
    setStickers(updated);
    setSelectedStickerId(duplicated.id);
  };

  const handleBringForward = (id: string) => {
    pushHistory(stickers);
    setStickers((prev) =>
      prev.map((s) => (s.id === id ? { ...s, zIndex: (s.zIndex || 1) + 1 } : s))
    );
  };

  const handleSendBackward = (id: string) => {
    pushHistory(stickers);
    setStickers((prev) =>
      prev.map((s) => (s.id === id ? { ...s, zIndex: Math.max(1, (s.zIndex || 1) - 1) } : s))
    );
  };

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
      id: entry?.id || generateRandomUUID(),
      date,
      title: title.trim() || 'Untitled Page',
      content: content.trim(),
      mood,
      pageColor,
      tags,
      stickers,
      createdAt: entry?.createdAt || Date.now(),
      updatedAt: Date.now(),
      isFavorite,
      fontFamily,
      titleFontFamily,
      fontSize
    };

    setTimeout(() => {
      onSave(savedEntry);
      setIsSaving(false);
    }, 600);
  };

  const handleSetAsDefaultFont = (newFont: string, newTitleFont: string | undefined, newSize: FontSizeOption) => {
    localStorage.setItem('little_pages_default_font', newFont);
    if (newTitleFont) {
      localStorage.setItem('little_pages_default_title_font', newTitleFont);
    } else {
      localStorage.removeItem('little_pages_default_title_font');
    }
    localStorage.setItem('little_pages_default_font_size', newSize);
  };

  const currentTitleFontCss = getFontFamilyCss(titleFontFamily || fontFamily);
  const currentBodyFontCss = getFontFamilyCss(fontFamily);
  const currentFontSizeCss = getFontSizeCss(fontSize);

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
          {history.length > 0 && (
            <button
              type="button"
              className="undo-pill-btn"
              onClick={handleUndo}
              title="Undo last sticker action"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Undo</span>
            </button>
          )}

          <button
            type="button"
            className="decorate-pill-btn font-pill-btn"
            onClick={() => setIsFontPickerOpen(true)}
            title="Choose typography & font size"
          >
            <Type className="w-4 h-4 text-purple-500" />
            <span>Aa Font</span>
          </button>

          <button
            type="button"
            className="decorate-pill-btn"
            onClick={() => setIsTrayOpen(true)}
            title="Open sticker tray to decorate page"
          >
            <Sparkles className="w-4 h-4 text-pink-500" />
            <span>Decorate</span>
          </button>

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
        ref={cardRef}
        onSubmit={handleSave}
        className="ruled-diary-page-card relative"
        style={{
          backgroundColor: pageTheme.bg,
          borderColor: pageTheme.border,
          '--accent-color': pageTheme.accent
        } as React.CSSProperties}
        onClick={() => setSelectedStickerId(null)}
      >
        {/* Render interactive placed stickers overlay */}
        <StickerLayer
          stickers={stickers}
          selectedStickerId={selectedStickerId}
          onSelectSticker={setSelectedStickerId}
          onUpdateSticker={handleUpdateSticker}
          onDeleteSticker={handleDeleteSticker}
          onDuplicateSticker={handleDuplicateSticker}
          onBringForward={handleBringForward}
          onSendBackward={handleSendBackward}
          containerRef={cardRef}
        />

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
            style={{ fontFamily: currentTitleFontCss }}
          />
        </div>

        <div className="editor-section lined-paper-container">
          <textarea
            className="ruled-textarea"
            placeholder="Dear Diary, today was..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            style={{ fontFamily: currentBodyFontCss, fontSize: currentFontSizeCss }}
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

      <StickerTray
        isOpen={isTrayOpen}
        onClose={() => setIsTrayOpen(false)}
        onSelectSticker={handleAddStickerFromTray}
      />

      <FontPickerModal
        isOpen={isFontPickerOpen}
        onClose={() => setIsFontPickerOpen(false)}
        selectedFont={fontFamily}
        selectedTitleFont={titleFontFamily}
        selectedFontSize={fontSize}
        onSelectFont={setFontFamily}
        onSelectTitleFont={setTitleFontFamily}
        onSelectFontSize={setFontSize}
        onSetAsDefault={handleSetAsDefaultFont}
      />
    </div>
  );
};
