export interface FontOption {
  id: string;
  name: string;
  family: string;
  category: 'favorite' | 'more' | 'title';
  badge?: string; // e.g. "हिंदी ✓"
  note?: string; // e.g. "short text only"
  previewText?: string;
}

export type FontSizeOption = 'small' | 'medium' | 'large';

export const FAVORITE_FONTS: FontOption[] = [
  {
    id: 'patrick-hand',
    name: 'Patrick Hand',
    family: "'Patrick Hand', cursive, sans-serif",
    category: 'favorite',
    previewText: 'Neat & friendly handwriting'
  },
  {
    id: 'caveat',
    name: 'Caveat',
    family: "'Caveat', cursive, sans-serif",
    category: 'favorite',
    previewText: 'Cozy handwritten cursive~'
  },
  {
    id: 'kalam',
    name: 'Kalam',
    family: "'Kalam', cursive, sans-serif",
    category: 'favorite',
    badge: 'हिंदी ✓',
    previewText: 'आज का दिन कैसा था? (Hindi & Eng)'
  },
  {
    id: 'shadows-into-light',
    name: 'Shadows Into Light',
    family: "'Shadows Into Light', cursive, sans-serif",
    category: 'favorite',
    previewText: 'Delicate & airy script'
  },
  {
    id: 'nunito',
    name: 'Nunito',
    family: "'Nunito', sans-serif",
    category: 'favorite',
    previewText: 'Soft, clean & easy to read~'
  }
];

export const MORE_FONTS: FontOption[] = [
  {
    id: 'indie-flower',
    name: 'Indie Flower',
    family: "'Indie Flower', cursive, sans-serif",
    category: 'more',
    previewText: 'Carefree & playful notes'
  },
  {
    id: 'gaegu',
    name: 'Gaegu',
    family: "'Gaegu', cursive, sans-serif",
    category: 'more',
    previewText: 'Cute rounded handwriting'
  },
  {
    id: 'delius',
    name: 'Delius',
    family: "'Delius', cursive, sans-serif",
    category: 'more',
    previewText: 'Comic comic-strip feel'
  },
  {
    id: 'lora',
    name: 'Lora',
    family: "'Lora', serif",
    category: 'more',
    previewText: 'Classic literary storytelling'
  },
  {
    id: 'courier-prime',
    name: 'Courier Prime',
    family: "'Courier Prime', monospace",
    category: 'more',
    previewText: 'Vintage typewriter memo'
  }
];

export const TITLE_FONTS: FontOption[] = [
  {
    id: 'amatic-sc',
    name: 'Amatic SC',
    family: "'Amatic SC', cursive, sans-serif",
    category: 'title',
    note: 'short text only',
    previewText: 'Tall & whimsical caps'
  },
  {
    id: 'homemade-apple',
    name: 'Homemade Apple',
    family: "'Homemade Apple', cursive, sans-serif",
    category: 'title',
    note: 'short text only',
    previewText: 'Authentic messy cursive'
  },
  {
    id: 'sacramento',
    name: 'Sacramento',
    family: "'Sacramento', cursive, sans-serif",
    category: 'title',
    note: 'short text only',
    previewText: 'Elegant flowing header'
  }
];

export const ALL_FONTS: FontOption[] = [
  ...FAVORITE_FONTS,
  ...MORE_FONTS,
  ...TITLE_FONTS
];

export const FONT_MAP: Record<string, FontOption> = ALL_FONTS.reduce((acc, font) => {
  acc[font.id] = font;
  return acc;
}, {} as Record<string, FontOption>);

export const DEFAULT_FONT_ID = 'nunito';
export const DEFAULT_FONT_SIZE: FontSizeOption = 'medium';

export function getFontFamilyCss(fontId?: string): string {
  if (!fontId || !FONT_MAP[fontId]) {
    return "'Nunito', sans-serif";
  }
  return FONT_MAP[fontId].family;
}

export function getFontSizeCss(size?: FontSizeOption): string {
  switch (size) {
    case 'small':
      return '0.92rem';
    case 'large':
      return '1.25rem';
    case 'medium':
    default:
      return '1.05rem';
  }
}
