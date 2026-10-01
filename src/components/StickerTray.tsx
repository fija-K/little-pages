import React, { useState } from 'react';
import { X, Sparkles } from 'lucide-react';
import { STICKER_PACKS } from '../config/stickerPacks';

interface StickerTrayProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSticker: (packId: string, stickerId: string) => void;
}

export const StickerTray: React.FC<StickerTrayProps> = ({
  isOpen,
  onClose,
  onSelectSticker
}) => {
  const [activePackId, setActivePackId] = useState<string>('cute-doodles');

  if (!isOpen) return null;

  const currentPack = STICKER_PACKS.find((p) => p.id === activePackId) || STICKER_PACKS[0];

  return (
    <div className="sticker-tray-overlay" onClick={onClose}>
      <div
        className="sticker-tray-sheet"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticker-tray-header">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-pink-500 animate-pulse" />
            <h3 className="sticker-tray-title font-handwritten text-2xl">
              Sticker Collection
            </h3>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Pack Tabs */}
        <div className="sticker-pack-tabs">
          {STICKER_PACKS.map((pack) => (
            <button
              key={pack.id}
              type="button"
              className={`pack-tab-btn ${activePackId === pack.id ? 'active' : ''}`}
              onClick={() => setActivePackId(pack.id)}
            >
              <span>{pack.icon}</span>
              <span>{pack.name}</span>
            </button>
          ))}
        </div>

        {/* Stickers Grid */}
        <div className="sticker-grid-scroll">
          {currentPack.stickers.map((sticker) => (
            <button
              key={sticker.id}
              type="button"
              className="sticker-grid-item-btn"
              onClick={() => {
                onSelectSticker(currentPack.id, sticker.id);
                // Keep tray open or allow continuous sticker adding
              }}
              title={`Add ${sticker.name}`}
            >
              <img
                src={sticker.url}
                alt={sticker.name}
                className="sticker-grid-img"
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
