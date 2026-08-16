import type { JournalEntry } from '../types/journal';
import { getTodayIsoString } from './dateUtils';

const STORAGE_KEY = 'little_pages_entries_v1';

export const INITIAL_SAMPLE_ENTRIES: JournalEntry[] = [
  {
    id: 'sample-entry-1',
    date: getTodayIsoString(),
    title: 'Warm tea & cozy morning thoughts',
    content: 'Started the morning with a hot mug of chamomile tea and listened to the gentle rain outside my window. Worked on project ideas and took a short walk around the block in my oversized sweater.\n\nFeeling really grounded and grateful for quiet moments like this.',
    mood: 'cozy',
    pageColor: 'blush',
    tags: ['thoughts', 'reading', 'nature'],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isFavorite: true
  },
  {
    id: 'sample-entry-2',
    date: getYesterdayIsoString(),
    title: 'Late night coding & Skulk sync',
    content: 'Made so much progress today! Worked on Skulk and sketched out little UI details for my diary. Sometimes when inspiration strikes late at night, everything just flows seamlessly.',
    mood: 'excited',
    pageColor: 'butter',
    tags: ['skulk', 'college', 'doodles'],
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now() - 86400000,
    isFavorite: false
  },
  {
    id: 'sample-entry-3',
    date: getDaysAgoIsoString(2),
    title: 'Gym session & evening walk',
    content: 'Pushed through my workout today even though I felt pretty sluggish at first. Afterward, grabbed a matcha latte and sat on a park bench watching the sunset colors fade from dusty pink to soft lavender.',
    mood: 'happy',
    pageColor: 'sage',
    tags: ['gym', 'nature'],
    createdAt: Date.now() - 86400000 * 2,
    updatedAt: Date.now() - 86400000 * 2,
    isFavorite: false
  }
];

function getYesterdayIsoString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getDaysAgoIsoString(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function getLocalEntries(): JournalEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      saveLocalEntries(INITIAL_SAMPLE_ENTRIES);
      return INITIAL_SAMPLE_ENTRIES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : INITIAL_SAMPLE_ENTRIES;
  } catch (err) {
    console.error('Failed to parse local entries:', err);
    return INITIAL_SAMPLE_ENTRIES;
  }
}

export function saveLocalEntries(entries: JournalEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch (err) {
    console.error('Failed to save to localStorage:', err);
  }
}

export function saveLocalEntry(entry: JournalEntry): JournalEntry[] {
  const current = getLocalEntries();
  const index = current.findIndex(e => e.id === entry.id);
  let updated: JournalEntry[];

  if (index >= 0) {
    updated = [...current];
    updated[index] = { ...entry, updatedAt: Date.now() };
  } else {
    updated = [entry, ...current];
  }

  saveLocalEntries(updated);
  return updated;
}

export function deleteLocalEntry(id: string): JournalEntry[] {
  const current = getLocalEntries();
  const updated = current.filter(e => e.id !== id);
  saveLocalEntries(updated);
  return updated;
}
