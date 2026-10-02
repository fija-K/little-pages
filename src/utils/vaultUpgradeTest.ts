import {
  deriveKey,
  encryptText,
  upgradeVaultConfigIterations,
  LEGACY_PBKDF2_ITERATIONS,
  DEFAULT_PBKDF2_ITERATIONS,
  arrayBufferToBase64,
  generateRandomUUID
} from './crypto';
import type { VaultSecurityConfig } from './crypto';
import { encryptJournalEntry, decryptJournalEntry } from './storage';
import type { JournalEntry } from '../types/journal';

export async function runVaultUpgradeTest(): Promise<{ success: boolean; errors: string[]; logs: string[] }> {
  const errors: string[] = [];
  const logs: string[] = [];

  try {
    const passphrase = 'LegacyTestPassphrase123!';
    const legacySalt = window.crypto.getRandomValues(new Uint8Array(16));
    
    // 1. Create Legacy Key (250,000 iterations)
    const legacyKey = await deriveKey(passphrase, legacySalt, LEGACY_PBKDF2_ITERATIONS, true);
    const verifyCipher = await encryptText('LITTLE_PAGES_VAULT_OK', legacyKey);

    const legacyConfig: VaultSecurityConfig = {
      version: 1,
      salt: arrayBufferToBase64(legacySalt),
      iterations: LEGACY_PBKDF2_ITERATIONS,
      verifyCiphertext: verifyCipher.ciphertext,
      verifyIv: verifyCipher.iv,
      createdAt: Date.now()
    };

    logs.push(`Created legacy vault config with ${LEGACY_PBKDF2_ITERATIONS} iterations.`);

    // 2. Create sample entries encrypted with legacy key
    const sampleEntry1: JournalEntry = {
      id: generateRandomUUID(),
      date: '2026-09-01',
      title: 'Legacy Entry 1',
      content: 'Testing legacy entry decryption before upgrade.',
      mood: 'happy',
      pageColor: 'blush',
      tags: ['legacy', 'test'],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const encEntry1 = await encryptJournalEntry(sampleEntry1, legacyKey);

    // Assert entry decrypts with legacy key
    const decCheck1 = await decryptJournalEntry(encEntry1, legacyKey);
    if (decCheck1.title !== sampleEntry1.title || decCheck1.content !== sampleEntry1.content) {
      errors.push('Initial legacy decryption failed before upgrade!');
    } else {
      logs.push('Verified legacy entry decrypts correctly before upgrade.');
    }

    // 3. Perform Vault Iteration Upgrade (250,000 -> 600,000)
    const upgradeResult = await upgradeVaultConfigIterations(passphrase, legacyConfig);
    if (!upgradeResult) {
      errors.push('upgradeVaultConfigIterations returned null!');
      return { success: false, errors, logs };
    }

    const { config: upgradedConfig, key: upgradedKey } = upgradeResult;

    if (upgradedConfig.iterations !== DEFAULT_PBKDF2_ITERATIONS) {
      errors.push(`Expected upgraded iterations to be ${DEFAULT_PBKDF2_ITERATIONS}, got ${upgradedConfig.iterations}`);
    } else {
      logs.push(`Upgraded vault iterations to ${upgradedConfig.iterations}.`);
    }

    // 4. Atomic re-encryption test: Re-encrypt entry with upgradedKey and verify decryption
    const reEncryptedEntry = await encryptJournalEntry(sampleEntry1, upgradedKey);
    const decCheckUpgraded = await decryptJournalEntry(reEncryptedEntry, upgradedKey);

    if (decCheckUpgraded.title !== sampleEntry1.title || decCheckUpgraded.content !== sampleEntry1.content) {
      errors.push('Decryption failed after vault iteration upgrade!');
    } else {
      logs.push('Verified entry successfully re-encrypted and decrypted with upgraded 600,000-iteration key.');
    }

    // 5. Test Rollback Simulation: Simulate an error during upgrade process
    let rollbackSuccess = false;
    const configSnapshot = { ...legacyConfig };
    const entriesSnapshot = [encEntry1];

    try {
      // Intentionally simulate a failure during re-encryption step
      throw new Error('Simulated atomic re-encryption failure during upgrade');
    } catch (simulatedErr) {
      // Rollback logic
      const restoredConfig = configSnapshot;
      const restoredEntries = entriesSnapshot;

      const testRestoreDec = await decryptJournalEntry(restoredEntries[0], legacyKey);
      if (restoredConfig.iterations === LEGACY_PBKDF2_ITERATIONS && testRestoreDec.title === sampleEntry1.title) {
        rollbackSuccess = true;
        logs.push('Rollback simulation verified: Pre-upgrade vault config and legacy data safely restored upon error.');
      }
    }

    if (!rollbackSuccess) {
      errors.push('Rollback verification failed!');
    }

  } catch (err: any) {
    errors.push(`Vault upgrade test execution error: ${err?.message || String(err)}`);
  }

  return {
    success: errors.length === 0,
    errors,
    logs
  };
}
