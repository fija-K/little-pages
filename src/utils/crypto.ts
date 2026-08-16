/**
 * End-to-End Encryption (E2EE) module using Web Crypto API (SubtleCrypto)
 * Standard: PBKDF2 (SHA-256, 250,000 iterations) + AES-GCM (256-bit)
 */

export interface VaultSecurityConfig {
  version: number;
  salt: string; // Base64 encoded PBKDF2 salt
  verifyCiphertext: string; // Base64 encoded test ciphertext to verify key correctness
  verifyIv: string; // Base64 encoded test IV
  hint?: string; // Optional user self-hint
  createdAt: number;
}

export interface EncryptedPayload {
  ciphertext: string; // Base64
  iv: string; // Base64
}

const PBKDF2_ITERATIONS = 250000;
const KEY_LENGTH_BITS = 256;
const VERIFY_MAGIC_WORD = 'LITTLE_PAGES_VAULT_OK';

// Utility helper to convert ArrayBuffer to Base64
function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Utility helper to convert Base64 to Uint8Array
function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Derive a 256-bit AES-GCM CryptoKey from a user passphrase and salt via PBKDF2
 */
export async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
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
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256'
    },
    baseKey,
    { name: 'AES-GCM', length: KEY_LENGTH_BITS },
    false, // Non-extractable for security
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
 * Initialize a new vault lock config using a user passphrase
 */
export async function setupVaultLock(passphrase: string, hint?: string): Promise<{ config: VaultSecurityConfig; key: CryptoKey }> {
  // Generate random 16-byte salt
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKey(passphrase, salt);

  // Encrypt verification magic word to allow validating passphrase later
  const { ciphertext, iv } = await encryptText(VERIFY_MAGIC_WORD, key);

  const config: VaultSecurityConfig = {
    version: 1,
    salt: arrayBufferToBase64(salt),
    verifyCiphertext: ciphertext,
    verifyIv: iv,
    hint: hint?.trim() || undefined,
    createdAt: Date.now()
  };

  return { config, key };
}

/**
 * Validate a user passphrase against stored VaultSecurityConfig
 * Returns the derived CryptoKey if valid, or null if invalid passphrase
 */
export async function unlockVault(passphrase: string, config: VaultSecurityConfig): Promise<CryptoKey | null> {
  try {
    const salt = base64ToUint8Array(config.salt);
    const key = await deriveKey(passphrase, salt);

    // Try decrypting the magic word
    const decrypted = await decryptText(config.verifyCiphertext, config.verifyIv, key);

    if (decrypted === VERIFY_MAGIC_WORD) {
      return key;
    }
    return null;
  } catch (err) {
    // Decryption failure indicates wrong passphrase
    return null;
  }
}
