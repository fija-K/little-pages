export type ThemeId = 'strawberry' | 'chocolate' | 'maroon_stars' | 'maroon_checkers' | 'leopard';

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
  },
  maroon_stars: {
    id: 'maroon_stars',
    name: 'Maroon Stars ⭐',
    emoji: '⭐',
    description: 'Creamy beige background with scattered maroon stars',
    previewBg: '#F6F0EA',
    previewCard: '#FDFBF7',
    previewAccent: '#8B0029'
  },
  maroon_checkers: {
    id: 'maroon_checkers',
    name: 'Maroon Checkers 🏁',
    emoji: '🏁',
    description: 'Warm painted maroon gingham & checkerboard pattern',
    previewBg: '#F5EFE6',
    previewCard: '#FAF6F0',
    previewAccent: '#800B28'
  },
  leopard: {
    id: 'leopard',
    name: 'Leopard Print 🐆',
    emoji: '🐆',
    description: 'Cozy warm safari cheetah fur pattern',
    previewBg: '#C89765',
    previewCard: '#FAF4EB',
    previewAccent: '#603B23'
  }
};
