/**
 * End-to-End Encryption (E2EE) module using Web Crypto API (SubtleCrypto)
 * Standard: PBKDF2 (SHA-256, 250,000 iterations) + AES-GCM (256-bit)
 */

export interface VaultSecurityConfig {
  version: number;
  salt: string; // Base64 encoded PBKDF2 salt for passphrase
  iterations?: number; // PBKDF2 iterations (250,000 legacy, 600,000 default)
  verifyCiphertext: string; // Base64 encoded test ciphertext to verify key correctness
  verifyIv: string; // Base64 encoded test IV
  recoverySalt?: string; // Base64 salt for recovery key
  recoveryMasterKeyCiphertext?: string; // Base64 wrapped raw master key
  recoveryMasterKeyIv?: string; // Base64 IV for wrapped master key
  hint?: string; // Optional user self-hint
  bgStickersEnabled?: boolean; // Toggle background scattered doodle pattern
  createdAt: number;
}

export interface EncryptedPayload {
  ciphertext: string; // Base64
  iv: string; // Base64
}

export const DEFAULT_PBKDF2_ITERATIONS = 600000;
export const LEGACY_PBKDF2_ITERATIONS = 250000;
const KEY_LENGTH_BITS = 256;
const VERIFY_MAGIC_WORD = 'LITTLE_PAGES_VAULT_OK';

// Utility helper to convert ArrayBuffer to Base64
export function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Utility helper to convert Base64 to Uint8Array
export function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Generate a secure 128-bit Recovery Key (32 hex chars, e.g. LP-A8F3-9B7C-1D2E-4F5A-6B7C-8D9E-0F1A-2B3C)
 */
export function generateRecoveryKey(): string {
  const bytes = window.crypto.getRandomValues(new Uint8Array(16)); // 16 bytes = 128 bits
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
    .join('');
  const formatted = hex.match(/.{1,4}/g)?.join('-') || hex;
  return `LP-${formatted}`;
}

/**
 * Derive a 256-bit AES-GCM CryptoKey from a user passphrase or recovery key via PBKDF2
 */
export async function deriveKey(
  passphrase: string,
  salt: Uint8Array,
  iterations = DEFAULT_PBKDF2_ITERATIONS,
  extractable = true
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passphraseBytes = encoder.encode(passphrase);

  // Import raw passphrase as key material
  const baseKey = await window.crypto.subtle.importKey(
    'raw',
    passphraseBytes,
    'PBKDF2',
    false,
    ['deriveKey']
  );

  // Derive AES-GCM 256-bit key using PBKDF2 with SHA-256
  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations,
      hash: 'SHA-256'
    },
    baseKey,
    { name: 'AES-GCM', length: KEY_LENGTH_BITS },
    extractable,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt a plaintext string using AES-GCM (256-bit)
 */
export async function encryptText(plaintext: string, key: CryptoKey): Promise<EncryptedPayload> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);

  // Generate random 12-byte IV (96 bits recommended for AES-GCM)
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv as BufferSource
    },
    key,
    data
  );

  return {
    ciphertext: arrayBufferToBase64(encryptedBuffer),
    iv: arrayBufferToBase64(iv)
  };
}

/**
 * Decrypt ciphertext using AES-GCM (256-bit)
 */
export async function decryptText(ciphertext: string, ivBase64: string, key: CryptoKey): Promise<string> {
  const ciphertextBytes = base64ToUint8Array(ciphertext);
  const ivBytes = base64ToUint8Array(ivBase64);

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: ivBytes as BufferSource
    },
    key,
    ciphertextBytes as BufferSource
  );

  const decoder = new TextDecoder();
  return decoder.decode(decryptedBuffer);
}

/**
 * Initialize a new vault lock config using a user passphrase and generated Recovery Key
 */
export async function setupVaultLock(
  passphrase: string,
  hint?: string
): Promise<{ config: VaultSecurityConfig; key: CryptoKey; recoveryKey: string }> {
  // Generate random 16-byte salt for passphrase
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKey(passphrase, salt, DEFAULT_PBKDF2_ITERATIONS, true);

  // Export raw key bytes to allow wrapping with recovery key
  const rawKeyBuffer = await window.crypto.subtle.exportKey('raw', key);

  // Generate 128-bit Recovery Key and its PBKDF2 salt
  const recoveryKey = generateRecoveryKey();
  const recoverySalt = window.crypto.getRandomValues(new Uint8Array(16));
  const recoveryDerivedKey = await deriveKey(
    recoveryKey.replace(/[^a-zA-Z0-9]/g, '').trim(),
    recoverySalt,
    DEFAULT_PBKDF2_ITERATIONS,
    false
  );

  // Encrypt raw master key using recovery derived key
  const recoveryIv = window.crypto.getRandomValues(new Uint8Array(12));
  const encryptedRawKeyBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: recoveryIv },
    recoveryDerivedKey,
    rawKeyBuffer
  );

  // Encrypt verification magic word to allow validating passphrase later
  const { ciphertext, iv } = await encryptText(VERIFY_MAGIC_WORD, key);

  const config: VaultSecurityConfig = {
    version: 2,
    salt: arrayBufferToBase64(salt),
    iterations: DEFAULT_PBKDF2_ITERATIONS,
    verifyCiphertext: ciphertext,
    verifyIv: iv,
    recoverySalt: arrayBufferToBase64(recoverySalt),
    recoveryMasterKeyCiphertext: arrayBufferToBase64(encryptedRawKeyBuffer),
    recoveryMasterKeyIv: arrayBufferToBase64(recoveryIv),
    hint: hint?.trim() || undefined,
    createdAt: Date.now()
  };

  return { config, key, recoveryKey };
}

/**
 * Validate a user passphrase against stored VaultSecurityConfig
 */
export async function unlockVault(passphrase: string, config: VaultSecurityConfig): Promise<CryptoKey | null> {
  try {
    const salt = base64ToUint8Array(config.salt);
    const iterations = config.iterations || LEGACY_PBKDF2_ITERATIONS;
    const key = await deriveKey(passphrase, salt, iterations, true);

    const decrypted = await decryptText(config.verifyCiphertext, config.verifyIv, key);

    if (decrypted === VERIFY_MAGIC_WORD) {
      return key;
    }
    return null;
  } catch (err) {
    return null;
  }
}

/**
 * Unlock vault using stored Recovery Key
 */
export async function unlockVaultWithRecoveryKey(
  recoveryKeyInput: string,
  config: VaultSecurityConfig
): Promise<CryptoKey | null> {
  if (!config.recoverySalt || !config.recoveryMasterKeyCiphertext || !config.recoveryMasterKeyIv) {
    return null;
  }

  try {
    const sanitizedKey = recoveryKeyInput.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const recoverySalt = base64ToUint8Array(config.recoverySalt);
    const iterations = config.iterations || LEGACY_PBKDF2_ITERATIONS;
    const recoveryDerivedKey = await deriveKey(sanitizedKey, recoverySalt, iterations, false);

    const ciphertext = base64ToUint8Array(config.recoveryMasterKeyCiphertext);
    const iv = base64ToUint8Array(config.recoveryMasterKeyIv);

    const rawKeyBuffer = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as BufferSource },
      recoveryDerivedKey,
      ciphertext as BufferSource
    );

    const importedKey = await window.crypto.subtle.importKey(
      'raw',
      rawKeyBuffer,
      { name: 'AES-GCM', length: KEY_LENGTH_BITS },
      true,
      ['encrypt', 'decrypt']
    );

    const verifyCheck = await decryptText(config.verifyCiphertext, config.verifyIv, importedKey);
    if (verifyCheck === VERIFY_MAGIC_WORD) {
      return importedKey;
    }
    return null;
  } catch (err) {
    console.error('Recovery key unlock failed:', err);
    return null;
  }
}

/**
 * Upgrade a legacy vault (250,000 iterations) to 600,000 iterations upon successful unlock
 */
export async function upgradeVaultConfigIterations(
  passphrase: string,
  oldConfig: VaultSecurityConfig
): Promise<{ config: VaultSecurityConfig; key: CryptoKey } | null> {
  try {
    const newSalt = window.crypto.getRandomValues(new Uint8Array(16));
    const newKey = await deriveKey(passphrase, newSalt, DEFAULT_PBKDF2_ITERATIONS, true);

    const { ciphertext, iv } = await encryptText(VERIFY_MAGIC_WORD, newKey);

    const upgradedConfig: VaultSecurityConfig = {
      ...oldConfig,
      version: 2,
      salt: arrayBufferToBase64(newSalt),
      iterations: DEFAULT_PBKDF2_ITERATIONS,
      verifyCiphertext: ciphertext,
      verifyIv: iv
    };

    return { config: upgradedConfig, key: newKey };
  } catch (err) {
    console.error('Failed to upgrade vault PBKDF2 iterations:', err);
    return null;
  }
}
