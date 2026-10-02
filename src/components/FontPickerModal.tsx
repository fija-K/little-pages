import React, { useState } from 'react';
import { X, Type, Check, Sparkles, Star, Heading } from 'lucide-react';
import type { FontOption, FontSizeOption } from '../config/fonts';
import {
  FAVORITE_FONTS,
  MORE_FONTS,
  TITLE_FONTS
} from '../config/fonts';

interface FontPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedFont: string;
  selectedTitleFont?: string;
  selectedFontSize: FontSizeOption;
  onSelectFont: (fontId: string) => void;
  onSelectTitleFont: (titleFontId: string | undefined) => void;
  onSelectFontSize: (size: FontSizeOption) => void;
  onSetAsDefault?: (fontId: string, titleFontId: string | undefined, size: FontSizeOption) => void;
}

export const FontPickerModal: React.FC<FontPickerModalProps> = ({
  isOpen,
  onClose,
  selectedFont,
  selectedTitleFont,
  selectedFontSize,
  onSelectFont,
  onSelectTitleFont,
  onSelectFontSize,
  onSetAsDefault
}) => {
  const [activeTab, setActiveTab] = useState<'body' | 'title'>('body');
  const [defaultSavedToast, setDefaultSavedToast] = useState<boolean>(false);
  const [appliedToast, setAppliedToast] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSaveDefault = () => {
    if (onSetAsDefault) {
      onSetAsDefault(selectedFont, selectedTitleFont, selectedFontSize);
      setDefaultSavedToast(true);
      setTimeout(() => setDefaultSavedToast(false), 2000);
    }
  };

  const handleFontClick = (fontId: string, fontName: string, isTitleOption: boolean = false) => {
    if (isTitleOption) {
      onSelectTitleFont(selectedTitleFont === fontId ? undefined : fontId);
    } else {
      onSelectFont(fontId);
    }
    setAppliedToast(fontName);
    setTimeout(() => setAppliedToast(null), 1600);
  };

  const renderFontItem = (font: FontOption, isTitleOption: boolean = false) => {
    const isSelected = isTitleOption
      ? selectedTitleFont === font.id
      : selectedFont === font.id;

    return (
      <button
        key={font.id}
        type="button"
        className={`font-option-card ${isSelected ? 'selected' : ''}`}
        onClick={() => handleFontClick(font.id, font.name, isTitleOption)}
        style={{ fontFamily: font.family }}
      >
        <div className="font-card-header">
          <span className="font-card-name" style={{ fontFamily: font.family }}>
            {font.name}
          </span>
          {font.badge && <span className="font-badge-hindi">{font.badge}</span>}
          {font.note && <span className="font-note-tag">{font.note}</span>}
          {isSelected && <Check className="w-4 h-4 text-emerald-600 font-check-icon" />}
        </div>
        <div className="font-preview-line" style={{ fontFamily: font.family }}>
          {font.previewText || 'Today I felt peaceful & cozy...'}
        </div>
      </button>
    );
  };

  return (
    <div className="modal-backdrop-blur z-[100]" onClick={onClose}>
      <div
        className="font-picker-sheet"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-header-title flex items-center gap-2">
            <Type className="w-5 h-5 text-pink-500 inline mr-1" />
            <span className="font-bold text-lg">Typography & Font Choice</span>
            {appliedToast && (
              <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full animate-bounce transition-all">
                Applied {appliedToast}! ✨
              </span>
            )}
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Font Target Tabs & Size Selector */}
        <div className="font-controls-bar">
          <div className="font-target-tabs">
            <button
              type="button"
              className={`font-target-tab ${activeTab === 'body' ? 'active' : ''}`}
              onClick={() => setActiveTab('body')}
            >
              <Type className="w-3.5 h-3.5" />
              <span>Body Font</span>
            </button>
            <button
              type="button"
              className={`font-target-tab ${activeTab === 'title' ? 'active' : ''}`}
              onClick={() => setActiveTab('title')}
            >
              <Heading className="w-3.5 h-3.5" />
              <span>Title Font</span>
            </button>
          </div>

          <div className="font-size-selector">
            <span className="font-size-label text-xs font-semibold">Size:</span>
            <div className="font-size-pills">
              {(['small', 'medium', 'large'] as FontSizeOption[]).map((sz) => (
                <button
                  key={sz}
                  type="button"
                  className={`size-pill ${selectedFontSize === sz ? 'active' : ''}`}
                  onClick={() => onSelectFontSize(sz)}
                >
                  {sz === 'small' && 'Small'}
                  {sz === 'medium' && 'Medium'}
                  {sz === 'large' && 'Large'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Font List Container */}
        <div className="font-picker-scroll-body">
          {activeTab === 'body' && (
            <>
              {/* Section 1: Favorites */}
              <div className="font-section">
                <div className="font-section-header">
                  <Star className="w-4 h-4 text-amber-500" />
                  <span>Favorites</span>
                </div>
                <div className="font-options-grid">
                  {FAVORITE_FONTS.map((font) => renderFontItem(font, false))}
                </div>
              </div>

              {/* Section 2: More Fonts */}
              <div className="font-section mt-4">
                <div className="font-section-header">
                  <Sparkles className="w-4 h-4 text-pink-400" />
                  <span>More Fonts</span>
                </div>
                <div className="font-options-grid">
                  {MORE_FONTS.map((font) => renderFontItem(font, false))}
                </div>
              </div>
            </>
          )}

          {activeTab === 'title' && (
            <>
              {/* Separate Title Font Options */}
              <div className="font-section">
                <div className="font-section-header">
                  <Heading className="w-4 h-4 text-purple-500" />
                  <span>Best for Titles</span>
                  <span className="font-note-tag text-xs ml-auto">short text only</span>
                </div>
                <div className="title-font-same-option mb-3">
                  <button
                    type="button"
                    className={`font-option-card ${!selectedTitleFont ? 'selected' : ''}`}
                    onClick={() => onSelectTitleFont(undefined)}
                  >
                    <div className="font-card-header">
                      <span className="font-card-name font-semibold">Use Body Font for Title</span>
                      {!selectedTitleFont && <Check className="w-4 h-4 text-emerald-600 ml-auto" />}
                    </div>
                    <div className="font-preview-line text-xs text-stone-500">
                      Matches whatever body font you choose.
                    </div>
                  </button>
                </div>
                <div className="font-options-grid">
                  {TITLE_FONTS.map((font) => renderFontItem(font, true))}
                </div>
              </div>

              <div className="font-section mt-4">
                <div className="font-section-header text-stone-600">
                  <span>Or use any Body Font for Title:</span>
                </div>
                <div className="font-options-grid">
                  {[...FAVORITE_FONTS, ...MORE_FONTS].map((font) => renderFontItem(font, true))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer actions */}
        <div className="font-picker-footer">
          {onSetAsDefault && (
            <button
              type="button"
              className="save-default-font-btn"
              onClick={handleSaveDefault}
            >
              {defaultSavedToast ? (
                <span className="text-emerald-700 font-bold">✓ Saved as default for new pages!</span>
              ) : (
                <span>Set as default for new pages</span>
              )}
            </button>
          )}

          <button
            type="button"
            className="font-done-btn"
            onClick={onClose}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
