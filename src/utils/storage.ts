import type { JournalEntry, EncryptedJournalEntry } from '../types/journal';
import type { VaultSecurityConfig } from './crypto';
import { encryptText, decryptText } from './crypto';
import { getTodayIsoString } from './dateUtils';

const VAULT_CONFIG_KEY = 'little_pages_vault_config';
const ENCRYPTED_STORAGE_KEY = 'little_pages_encrypted_entries_v1';

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

// Vault config persistence
export function getVaultConfig(): VaultSecurityConfig | null {
  try {
    const raw = localStorage.getItem(VAULT_CONFIG_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.error('Failed to parse vault config:', err);
    return null;
  }
}

export function saveVaultConfig(config: VaultSecurityConfig): void {
  try {
    localStorage.setItem(VAULT_CONFIG_KEY, JSON.stringify(config));
  } catch (err) {
    console.error('Failed to save vault config:', err);
  }
}

// Encrypt a single entry
export async function encryptJournalEntry(entry: JournalEntry, key: CryptoKey): Promise<EncryptedJournalEntry> {
  const titleEnc = await encryptText(entry.title || '', key);
  const contentEnc = await encryptText(entry.content || '', key);

  return {
    id: entry.id,
    date: entry.date,
    encryptedTitle: titleEnc.ciphertext,
    titleIv: titleEnc.iv,
    encryptedContent: contentEnc.ciphertext,
    contentIv: contentEnc.iv,
    mood: entry.mood,
    pageColor: entry.pageColor,
    tags: entry.tags,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
    isFavorite: entry.isFavorite
  };
}

// Decrypt a single entry
export async function decryptJournalEntry(encrypted: EncryptedJournalEntry, key: CryptoKey): Promise<JournalEntry> {
  let title = 'Untitled Page';
  let content = '';

  try {
    title = await decryptText(encrypted.encryptedTitle, encrypted.titleIv, key);
  } catch (e) {
    console.error('Failed to decrypt title:', e);
  }

  try {
    content = await decryptText(encrypted.encryptedContent, encrypted.contentIv, key);
  } catch (e) {
    console.error('Failed to decrypt content:', e);
  }

  return {
    id: encrypted.id,
    date: encrypted.date,
    title,
    content,
    mood: encrypted.mood,
    pageColor: encrypted.pageColor,
    tags: encrypted.tags,
    createdAt: encrypted.createdAt,
    updatedAt: encrypted.updatedAt,
    isFavorite: encrypted.isFavorite
  };
}

// Encrypted entries persistence
export function getStoredEncryptedEntries(): EncryptedJournalEntry[] {
  try {
    const raw = localStorage.getItem(ENCRYPTED_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to load encrypted entries:', err);
    return [];
  }
}

export function saveStoredEncryptedEntries(entries: EncryptedJournalEntry[]): void {
  try {
    localStorage.setItem(ENCRYPTED_STORAGE_KEY, JSON.stringify(entries));
  } catch (err) {
    console.error('Failed to save encrypted entries to localStorage:', err);
  }
}
