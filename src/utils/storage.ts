import type { JournalEntry, EncryptedJournalEntry } from '../types/journal';
import type { VaultSecurityConfig } from './crypto';
import { encryptText, decryptText } from './crypto';

const VAULT_CONFIG_KEY = 'little_pages_vault_config';
const ENCRYPTED_STORAGE_KEY = 'little_pages_encrypted_entries_v1';

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

// Encrypt a single entry (title, content, AND tags)
export async function encryptJournalEntry(entry: JournalEntry, key: CryptoKey): Promise<EncryptedJournalEntry> {
  const titleEnc = await encryptText(entry.title || '', key);
  const contentEnc = await encryptText(entry.content || '', key);
  
  // Encrypt JSON-serialized tags array
  const tagsJson = JSON.stringify(entry.tags || []);
  const tagsEnc = await encryptText(tagsJson, key);

  return {
    id: entry.id,
    date: entry.date,
    encryptedTitle: titleEnc.ciphertext,
    titleIv: titleEnc.iv,
    encryptedContent: contentEnc.ciphertext,
    contentIv: contentEnc.iv,
    encryptedTags: tagsEnc.ciphertext,
    tagsIv: tagsEnc.iv,
    mood: entry.mood,
    pageColor: entry.pageColor,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
    isFavorite: entry.isFavorite
  };
}

// Decrypt a single entry (title, content, AND tags)
export async function decryptJournalEntry(encrypted: EncryptedJournalEntry, key: CryptoKey): Promise<JournalEntry> {
  let title = 'Untitled Page';
  let content = '';
  let tags: string[] = [];

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
    // Backward-compatible fallback for legacy unencrypted tags
    tags = encrypted.tags;
  }

  return {
    id: encrypted.id,
    date: encrypted.date,
    title,
    content,
    mood: encrypted.mood,
    pageColor: encrypted.pageColor,
    tags,
    createdAt: encrypted.createdAt,
    updatedAt: encrypted.updatedAt,
    isFavorite: encrypted.isFavorite
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

export function clearLocalEntries(): void {
  localStorage.removeItem(ENCRYPTED_STORAGE_KEY);
  localStorage.removeItem('little_pages_entries_v1');
}
