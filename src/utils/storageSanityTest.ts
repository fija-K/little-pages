import { encryptJournalEntry, encryptGoalItem } from './storage';
import { setupVaultLock, generateRandomUUID } from './crypto';
import type { JournalEntry, GoalItem } from '../types/journal';

export const ALLOWED_READABLE_KEYS = new Set([
  'id',
  'encryptedTitle',
  'titleIv',
  'encryptedContent',
  'contentIv',
  'encryptedTags',
  'tagsIv',
  'encryptedStickers',
  'stickersIv',
  'encryptedMetadata',
  'metadataIv',
  'encryptedText',
  'textIv',
  'encryptedSubItems',
  'subItemsIv',
  'encryptedGoalMeta',
  'goalMetaIv'
]);

export async function runStorageSanityTest(): Promise<{ success: boolean; errors: string[] }> {
  const errors: string[] = [];

  try {
    const { key } = await setupVaultLock('TestPassphrase123!');

    // 1. Test Journal Entry Serialization
    const sampleEntry: JournalEntry = {
      id: generateRandomUUID(),
      date: '2026-10-02',
      title: 'Secret Title',
      content: 'Secret Content',
      mood: 'cozy',
      pageColor: 'blush',
      tags: ['skulk', 'reading'],
      stickers: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isFavorite: true
    };

    const encEntry = await encryptJournalEntry(sampleEntry, key);
    const entryKeys = Object.keys(encEntry);

    for (const k of entryKeys) {
      if (!ALLOWED_READABLE_KEYS.has(k)) {
        errors.push(`Unallowed readable property '${k}' found on encrypted journal entry! Value: ${(encEntry as any)[k]}`);
      }
    }

    // 2. Test Goal Item Serialization
    const sampleGoal: GoalItem = {
      id: generateRandomUUID(),
      text: 'Secret Goal Text',
      type: 'short-term',
      completed: false,
      deadline: '2026-12-31',
      subItems: [{ id: generateRandomUUID(), text: 'Subtask 1', completed: false }],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const encGoal = await encryptGoalItem(sampleGoal, key);
    const goalKeys = Object.keys(encGoal);

    for (const k of goalKeys) {
      if (!ALLOWED_READABLE_KEYS.has(k)) {
        errors.push(`Unallowed readable property '${k}' found on encrypted goal item! Value: ${(encGoal as any)[k]}`);
      }
    }
  } catch (err: any) {
    errors.push(`Sanity test execution error: ${err?.message || String(err)}`);
  }

  return {
    success: errors.length === 0,
    errors
  };
}
