export type ThemeId = 'strawberry' | 'chocolate';

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  emoji: string;
  description: string;
  previewBg: string;
  previewCard: string;
  previewAccent: string;
}

export const THEMES: Record<ThemeId, ThemeConfig> = {
  strawberry: {
    id: 'strawberry',
    name: 'Strawberry 🍓',
    emoji: '🍓',
    description: 'Cozy pastel pink, cream & soft lavender',
    previewBg: '#FFF6EE',
    previewCard: '#FDEFF3',
    previewAccent: '#F4A6BA'
  },
  chocolate: {
    id: 'chocolate',
    name: 'Chocolate 🍫',
    emoji: '🍫',
    description: 'Warm cocoa, creamy mocha & caramel',
    previewBg: '#EAD8C8',
    previewCard: '#F7EFE8',
    previewAccent: '#8C4E28'
  }
};
