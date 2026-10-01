export interface StickerItem {
  id: string;
  name: string;
  url: string;
}

export interface StickerPack {
  id: string;
  name: string;
  icon: string;
  stickers: StickerItem[];
}

// Generate the 100 consolidated approved Cute Doodles stickers
const cuteDoodlesStickers: StickerItem[] = Array.from({ length: 100 }, (_, i) => {
  const numStr = String(i + 1).padStart(2, '0');
  return {
    id: `sticker_${numStr}`,
    name: `Cute Doodle ${i + 1}`,
    url: `/stickers/cute-doodles/sticker_${numStr}.png`
  };
});

export const STICKER_PACKS: StickerPack[] = [
  {
    id: 'cute-doodles',
    name: 'Cute Doodles',
    icon: '✨',
    stickers: cuteDoodlesStickers
  }
];

export function getStickerUrl(packId: string, stickerId: string): string | null {
  const pack = STICKER_PACKS.find((p) => p.id === packId);
  if (!pack) return null;
  const item = pack.stickers.find((s) => s.id === stickerId);
  return item ? item.url : null;
}
