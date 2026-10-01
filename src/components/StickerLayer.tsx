import React from 'react';
import type { PlacedSticker } from '../types/journal';
import { StickerCanvasItem } from './StickerCanvasItem';

interface StickerLayerProps {
  stickers: PlacedSticker[];
  selectedStickerId: string | null;
  isReadOnly?: boolean;
  onSelectSticker: (id: string | null) => void;
  onUpdateSticker: (updated: PlacedSticker) => void;
  onDeleteSticker: (id: string) => void;
  onDuplicateSticker: (id: string) => void;
  onBringForward: (id: string) => void;
  onSendBackward: (id: string) => void;
  containerRef: React.RefObject<HTMLElement | null>;
}

export const StickerLayer: React.FC<StickerLayerProps> = ({
  stickers,
  selectedStickerId,
  isReadOnly = false,
  onSelectSticker,
  onUpdateSticker,
  onDeleteSticker,
  onDuplicateSticker,
  onBringForward,
  onSendBackward,
  containerRef
}) => {
  if (!stickers || stickers.length === 0) return null;

  return (
    <div className="sticker-layer-overlay">
      {stickers.map((sticker) => (
        <StickerCanvasItem
          key={sticker.id}
          sticker={sticker}
          isSelected={selectedStickerId === sticker.id}
          isReadOnly={isReadOnly}
          onSelect={(e) => {
            e.stopPropagation();
            onSelectSticker(sticker.id);
          }}
          onChange={onUpdateSticker}
          onDelete={() => onDeleteSticker(sticker.id)}
          onDuplicate={() => onDuplicateSticker(sticker.id)}
          onBringForward={() => onBringForward(sticker.id)}
          onSendBackward={() => onSendBackward(sticker.id)}
          containerRef={containerRef}
        />
      ))}
    </div>
  );
};
