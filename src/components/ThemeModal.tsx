import React from 'react';
import { X, Check, Palette } from 'lucide-react';
import { THEMES } from '../config/themes';
import type { ThemeId } from '../config/themes';

interface ThemeModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTheme: ThemeId;
  onSelectTheme: (themeId: ThemeId) => void;
}

export const ThemeModal: React.FC<ThemeModalProps> = ({
  isOpen,
  onClose,
  activeTheme,
  onSelectTheme
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop-blur">
      <div className="bg-white rounded-3xl p-6 max-w-md w-full border-2 border-pink-200 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-pink-100 rounded-2xl text-pink-600">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-handwritten text-2xl font-bold text-stone-800">
                Choose App Theme 🎨
              </h3>
              <p className="text-xs text-stone-500">Customize the cozy look of Little Pages</p>
            </div>
          </div>
          <button
            type="button"
            className="p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full transition-colors"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {(Object.keys(THEMES) as ThemeId[]).map((id) => {
            const theme = THEMES[id];
            const isSelected = activeTheme === id;
            return (
              <button
                key={id}
                type="button"
                className={`flex items-center justify-between p-4 rounded-2xl border-2 text-left transition-all ${
                  isSelected
                    ? 'border-pink-400 bg-pink-50/50 shadow-md scale-[1.01]'
                    : 'border-stone-200 hover:border-pink-200 hover:bg-stone-50/60'
                }`}
                onClick={() => {
                  onSelectTheme(id);
                  onClose();
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-2xl border border-stone-300 shadow-inner flex items-center justify-center relative overflow-hidden"
                    style={{ backgroundColor: theme.previewBg }}
                  >
                    <div
                      className="w-6 h-6 rounded-lg border shadow-sm flex items-center justify-center text-xs"
                      style={{ backgroundColor: theme.previewCard, borderColor: theme.previewAccent }}
                    >
                      {theme.emoji}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-handwritten text-lg font-bold text-stone-800 flex items-center gap-1.5">
                      <span>{theme.name}</span>
                    </h4>
                    <p className="text-xs text-stone-500">{theme.description}</p>
                  </div>
                </div>

                {isSelected && (
                  <div className="w-6 h-6 rounded-full bg-pink-500 text-white flex items-center justify-center shrink-0">
                    <Check className="w-4 h-4" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
