import type { JournalEntry, EncryptedJournalEntry, GoalItem, EncryptedGoalItem, GoalSubItem, PlacedSticker } from '../types/journal';
import type { VaultSecurityConfig } from './crypto';
import { encryptText, decryptText } from './crypto';

const VAULT_CONFIG_KEY = 'little_pages_vault_config';
const ENCRYPTED_STORAGE_KEY = 'little_pages_encrypted_entries_v1';
const ENCRYPTED_GOALS_KEY = 'little_pages_encrypted_goals_v1';

export const INITIAL_SAMPLE_ENTRIES: JournalEntry[] = [];

// Vault config persistence locally
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

export function clearLocalVaultConfig(): void {
  localStorage.removeItem(VAULT_CONFIG_KEY);
}

// Encrypt a single entry (title, content, tags, stickers AND metadata)
export async function encryptJournalEntry(entry: JournalEntry, key: CryptoKey): Promise<EncryptedJournalEntry> {
  const titleEnc = await encryptText(entry.title || '', key);
  const contentEnc = await encryptText(entry.content || '', key);
  
  // Encrypt JSON-serialized tags array
  const tagsJson = JSON.stringify(entry.tags || []);
  const tagsEnc = await encryptText(tagsJson, key);

  // Encrypt JSON-serialized stickers array
  const stickersJson = JSON.stringify(entry.stickers || []);
  const stickersEnc = await encryptText(stickersJson, key);

  // Encrypt JSON-serialized metadata object
  const metadataJson = JSON.stringify({
    mood: entry.mood,
    pageColor: entry.pageColor,
    isFavorite: !!entry.isFavorite,
    date: entry.date,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
    fontFamily: entry.fontFamily,
    titleFontFamily: entry.titleFontFamily,
    fontSize: entry.fontSize
  });
  const metadataEnc = await encryptText(metadataJson, key);

  return {
    id: entry.id,
    encryptedTitle: titleEnc.ciphertext,
    titleIv: titleEnc.iv,
    encryptedContent: contentEnc.ciphertext,
    contentIv: contentEnc.iv,
    encryptedTags: tagsEnc.ciphertext,
    tagsIv: tagsEnc.iv,
    encryptedStickers: stickersEnc.ciphertext,
    stickersIv: stickersEnc.iv,
    encryptedMetadata: metadataEnc.ciphertext,
    metadataIv: metadataEnc.iv
  };
}

// Decrypt a single entry (title, content, tags, stickers AND metadata)
export async function decryptJournalEntry(encrypted: EncryptedJournalEntry, key: CryptoKey): Promise<JournalEntry> {
  let title = 'Untitled Page';
  let content = '';
  let tags: string[] = [];
  let stickers: PlacedSticker[] = [];

  let mood = encrypted.mood || 'happy';
  let pageColor = encrypted.pageColor || 'blush';
  let isFavorite = !!encrypted.isFavorite;
  let date = encrypted.date || new Date().toISOString().split('T')[0];
  let createdAt = encrypted.createdAt || Date.now();
  let updatedAt = encrypted.updatedAt || Date.now();
  let fontFamily: string | undefined = undefined;
  let titleFontFamily: string | undefined = undefined;
  let fontSize: 'small' | 'medium' | 'large' | undefined = undefined;

  // Decrypt metadata payload if available
  if (encrypted.encryptedMetadata && encrypted.metadataIv) {
    try {
      const rawMeta = await decryptText(encrypted.encryptedMetadata, encrypted.metadataIv, key);
      const parsedMeta = JSON.parse(rawMeta);
      if (parsedMeta && typeof parsedMeta === 'object') {
        if (parsedMeta.mood) mood = parsedMeta.mood;
        if (parsedMeta.pageColor) pageColor = parsedMeta.pageColor;
        if (typeof parsedMeta.isFavorite === 'boolean') isFavorite = parsedMeta.isFavorite;
        if (parsedMeta.date) date = parsedMeta.date;
        if (parsedMeta.createdAt) createdAt = parsedMeta.createdAt;
        if (parsedMeta.updatedAt) updatedAt = parsedMeta.updatedAt;
        if (parsedMeta.fontFamily) fontFamily = parsedMeta.fontFamily;
        if (parsedMeta.titleFontFamily) titleFontFamily = parsedMeta.titleFontFamily;
        if (parsedMeta.fontSize) fontSize = parsedMeta.fontSize;
      }
    } catch (e) {
      console.error('Failed to decrypt entry metadata:', e);
    }
  }

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

  if (encrypted.encryptedTags && encrypted.tagsIv) {
    try {
      const tagsRaw = await decryptText(encrypted.encryptedTags, encrypted.tagsIv, key);
      const parsed = JSON.parse(tagsRaw);
      if (Array.isArray(parsed)) {
        tags = parsed;
      }
    } catch (e) {
      console.error('Failed to decrypt tags:', e);
    }
  } else if (Array.isArray(encrypted.tags)) {
    tags = encrypted.tags;
  }

  if (encrypted.encryptedStickers && encrypted.stickersIv) {
    try {
      const stickersRaw = await decryptText(encrypted.encryptedStickers, encrypted.stickersIv, key);
      const parsed = JSON.parse(stickersRaw);
      if (Array.isArray(parsed)) {
        stickers = parsed;
      }
    } catch (e) {
      console.error('Failed to decrypt stickers:', e);
    }
  }

  return {
    id: encrypted.id,
    date,
    title,
    content,
    mood,
    pageColor,
    tags,
    stickers,
    createdAt,
    updatedAt,
    isFavorite,
    fontFamily,
    titleFontFamily,
    fontSize
  };
}

// Encrypted entries persistence locally
export function getStoredEncryptedEntries(): EncryptedJournalEntry[] {
  try {
    const raw = localStorage.getItem(ENCRYPTED_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(e => !e.id.startsWith('sample-entry-'));
  } catch (err) {
    console.error('Failed to load encrypted entries:', err);
    return [];
  }
}

export function saveStoredEncryptedEntries(entries: EncryptedJournalEntry[]): void {
  try {
    const cleaned = entries.filter(e => !e.id.startsWith('sample-entry-'));
    localStorage.setItem(ENCRYPTED_STORAGE_KEY, JSON.stringify(cleaned));
  } catch (err) {
    console.error('Failed to save encrypted entries to localStorage:', err);
  }
}

// Goal Encryption & Decryption
export async function encryptGoalItem(goal: GoalItem, key: CryptoKey): Promise<EncryptedGoalItem> {
  const textEnc = await encryptText(goal.text || '', key);
  
  const subItemsJson = JSON.stringify(goal.subItems || []);
  const subItemsEnc = await encryptText(subItemsJson, key);

  // Encrypt JSON-serialized goal metadata object
  const goalMetaJson = JSON.stringify({
    type: goal.type,
    completed: goal.completed,
    deadline: goal.deadline,
    createdAt: goal.createdAt,
    updatedAt: goal.updatedAt
  });
  const goalMetaEnc = await encryptText(goalMetaJson, key);

  return {
    id: goal.id,
    encryptedText: textEnc.ciphertext,
    textIv: textEnc.iv,
    encryptedSubItems: subItemsEnc.ciphertext,
    subItemsIv: subItemsEnc.iv,
    encryptedGoalMeta: goalMetaEnc.ciphertext,
    goalMetaIv: goalMetaEnc.iv
  };
}

export async function decryptGoalItem(encrypted: EncryptedGoalItem, key: CryptoKey): Promise<GoalItem> {
  let text = '';
  let subItems: GoalSubItem[] = [];

  let type = encrypted.type || 'short-term';
  let completed = !!encrypted.completed;
  let deadline = encrypted.deadline;
  let createdAt = encrypted.createdAt || Date.now();
  let updatedAt = encrypted.updatedAt || Date.now();

  if (encrypted.encryptedGoalMeta && encrypted.goalMetaIv) {
    try {
      const rawMeta = await decryptText(encrypted.encryptedGoalMeta, encrypted.goalMetaIv, key);
      const parsedMeta = JSON.parse(rawMeta);
      if (parsedMeta && typeof parsedMeta === 'object') {
        if (parsedMeta.type) type = parsedMeta.type;
        if (typeof parsedMeta.completed === 'boolean') completed = parsedMeta.completed;
        if (parsedMeta.deadline !== undefined) deadline = parsedMeta.deadline;
        if (parsedMeta.createdAt) createdAt = parsedMeta.createdAt;
        if (parsedMeta.updatedAt) updatedAt = parsedMeta.updatedAt;
      }
    } catch (e) {
      console.error('Failed to decrypt goal metadata:', e);
    }
  }

  try {
    text = await decryptText(encrypted.encryptedText, encrypted.textIv, key);
  } catch (e) {
    console.error('Failed to decrypt goal text:', e);
  }

  if (encrypted.encryptedSubItems && encrypted.subItemsIv) {
    try {
      const raw = await decryptText(encrypted.encryptedSubItems, encrypted.subItemsIv, key);
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        subItems = parsed;
      }
    } catch (e) {
      console.error('Failed to decrypt subItems:', e);
    }
  } else if (Array.isArray(encrypted.subItems)) {
    subItems = encrypted.subItems;
  }

  return {
    id: encrypted.id,
    text,
    type,
    completed,
    deadline,
    subItems,
    createdAt,
    updatedAt
  };
}

export function getStoredEncryptedGoals(): EncryptedGoalItem[] {
  try {
    const raw = localStorage.getItem(ENCRYPTED_GOALS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to load encrypted goals:', err);
    return [];
  }
}

export function saveStoredEncryptedGoals(goals: EncryptedGoalItem[]): void {
  try {
    localStorage.setItem(ENCRYPTED_GOALS_KEY, JSON.stringify(goals));
  } catch (err) {
    console.error('Failed to save encrypted goals to localStorage:', err);
  }
}

export function clearLocalEntries(): void {
  localStorage.removeItem(ENCRYPTED_STORAGE_KEY);
  localStorage.removeItem(ENCRYPTED_GOALS_KEY);
  localStorage.removeItem('little_pages_entries_v1');
}
