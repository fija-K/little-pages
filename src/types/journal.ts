export type MoodType = 'happy' | 'cozy' | 'tired' | 'anxious' | 'excited' | 'blah';

export type PageColor = 'blush' | 'lavender' | 'sage' | 'butter' | 'peach' | 'sky';

export interface MoodConfig {
  id: MoodType;
  label: string;
  emoji: string;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
}

export interface JournalEntry {
  id: string;
  date: string; // ISO format YYYY-MM-DD
  title: string;
  content: string;
  mood: MoodType;
  pageColor: PageColor;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  isFavorite?: boolean;
}

export interface FilterState {
  searchQuery: string;
  selectedMood: MoodType | 'all';
  selectedTag: string | 'all';
  sortBy: 'newest' | 'oldest';
}

export const MOODS: Record<MoodType, MoodConfig> = {
  happy: {
    id: 'happy',
    label: 'Happy',
    emoji: '😊',
    color: '#E0983A',
    bgColor: '#FFF5E6',
    borderColor: '#F6D186',
    description: 'Sunshine & smiles'
  },
  cozy: {
    id: 'cozy',
    label: 'Cozy',
    emoji: '☕',
    color: '#D97762',
    bgColor: '#FDF0E6',
    borderColor: '#F8A99B',
    description: 'Warm blanket & tea'
  },
  tired: {
    id: 'tired',
    label: 'Tired',
    emoji: '🥱',
    color: '#8A7BB3',
    bgColor: '#F3EEFF',
    borderColor: '#C9B6E4',
    description: 'Need a long nap'
  },
  anxious: {
    id: 'anxious',
    label: 'Anxious',
    emoji: '🌧️',
    color: '#5C9BB0',
    bgColor: '#E8F4F8',
    borderColor: '#9BCBE3',
    description: 'Butterflies & rain'
  },
  excited: {
    id: 'excited',
    label: 'Excited',
    emoji: '✨',
    color: '#DA6488',
    bgColor: '#FDEFF3',
    borderColor: '#F4A6BA',
    description: 'Bouncing with joy'
  },
  blah: {
    id: 'blah',
    label: 'Blah',
    emoji: '☁️',
    color: '#7C8F75',
    bgColor: '#EBF3E8',
    borderColor: '#B8CFAE',
    description: 'Just existing today'
  }
};

export const PAGE_COLORS: Record<PageColor, { name: string; bg: string; border: string; accent: string }> = {
  blush: { name: 'Dusty Blush', bg: '#FDEFF3', border: '#F4A6BA', accent: '#E87A90' },
  lavender: { name: 'Soft Lavender', bg: '#F3EEFF', border: '#C9B6E4', accent: '#9B72CF' },
  sage: { name: 'Sage Green', bg: '#EBF3E8', border: '#B8CFAE', accent: '#6FA368' },
  butter: { name: 'Butter Yellow', bg: '#FFF9E6', border: '#F6D186', accent: '#E6A13B' },
  peach: { name: 'Sweet Peach', bg: '#FDF0E6', border: '#F8A99B', accent: '#E06B52' },
  sky: { name: 'Sky Blue', bg: '#E8F4F8', border: '#9BCBE3', accent: '#4E9BB9' }
};

export const DEFAULT_TAGS = ['skulk', 'college', 'gym', 'thoughts', 'reading', 'nature', 'doodles'];
