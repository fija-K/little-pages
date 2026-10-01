import React, { useState } from 'react';
import { Lock, KeyRound, Eye, EyeOff, HelpCircle, Sparkles, Key } from 'lucide-react';
import { unlockVault, unlockVaultWithRecoveryKey } from '../utils/crypto';
import type { VaultSecurityConfig } from '../utils/crypto';

interface LockScreenProps {
  vaultConfig: VaultSecurityConfig;
  onUnlockSuccess: (key: CryptoKey) => void;
}

export const LockScreen: React.FC<LockScreenProps> = ({
  vaultConfig,
  onUnlockSuccess
}) => {
  const [passphrase, setPassphrase] = useState('');
  const [useRecoveryKeyMode, setUseRecoveryKeyMode] = useState(false);
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!passphrase.trim()) {
      setError(useRecoveryKeyMode ? 'Please enter your recovery key.' : 'Please enter your passphrase.');
      return;
    }

    setIsDecrypting(true);

    try {
      let key: CryptoKey | null = null;
      if (useRecoveryKeyMode) {
        key = await unlockVaultWithRecoveryKey(passphrase, vaultConfig);
      } else {
        key = await unlockVault(passphrase, vaultConfig);
      }

      if (key) {
        onUnlockSuccess(key);
      } else {
        setError(
          useRecoveryKeyMode
            ? 'Invalid recovery key. Please check your key and try again.'
            : 'Incorrect passphrase. Please try again.'
        );
      }
    } catch (err) {
      setError('Failed to verify encryption credentials.');
    } finally {
      setIsDecrypting(false);
    }
  };

  return (
    <div className="lock-screen-overlay">
      <div className="lock-screen-card">
        <div className="lock-hero-illustration">
          <div className="lock-circle-graphic">
            <Lock className="w-8 h-8 text-pink-500" />
            <Sparkles className="w-4 h-4 text-amber-300 absolute -top-1 -right-1" />
          </div>
        </div>

        <h2 className="lock-screen-title">Unlock your Little Pages 🔐✨</h2>
        <p className="lock-screen-subtitle">
          {useRecoveryKeyMode
            ? 'Enter your 24-character Emergency Recovery Key to restore access.'
            : 'Your diary is encrypted. Enter your passphrase to decrypt your entries.'}
        </p>

        <form onSubmit={handleUnlock} className="lock-screen-form">
          <div className="passphrase-field-container">
            <div className="passphrase-input-wrapper">
              <KeyRound className="w-4 h-4 text-stone-400 ml-3" />
              <input
                type={showPassphrase || useRecoveryKeyMode ? 'text' : 'password'}
                className="lock-text-input-large font-mono"
                placeholder={useRecoveryKeyMode ? 'e.g. LP-A8F3-9B7C-1D2E-4F5A' : 'Enter journal passphrase...'}
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                autoFocus
              />
              {!useRecoveryKeyMode && (
                <button
                  type="button"
                  className="toggle-eye-btn mr-2"
                  onClick={() => setShowPassphrase(!showPassphrase)}
                >
                  {showPassphrase ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              )}
            </div>
          </div>

          {error && <div className="lock-error-msg">{error}</div>}

          <div className="flex flex-col gap-2 items-center text-xs text-stone-500">
            {!useRecoveryKeyMode && vaultConfig.hint && (
              <div className="hint-toggle-row">
                <button
                  type="button"
                  className="show-hint-btn"
                  onClick={() => setShowHint(!showHint)}
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>{showHint ? 'Hide hint' : 'Show passphrase hint'}</span>
                </button>

                {showHint && (
                  <div className="hint-box-popover">
                    💡 Hint: <em>{vaultConfig.hint}</em>
                  </div>
                )}
              </div>
            )}

            {vaultConfig.recoverySalt && (
              <button
                type="button"
                className="text-pink-600 hover:text-pink-700 underline font-medium flex items-center gap-1 mt-1"
                onClick={() => {
                  setUseRecoveryKeyMode(!useRecoveryKeyMode);
                  setError(null);
                  setPassphrase('');
                }}
              >
                <Key className="w-3.5 h-3.5" />
                <span>{useRecoveryKeyMode ? 'Switch back to Passphrase' : 'Forgot passphrase? Unlock with Recovery Key'}</span>
              </button>
            )}
          </div>

          <button
            type="submit"
            className="unlock-submit-btn"
            disabled={isDecrypting}
          >
            <Lock className="w-4 h-4" />
            <span>{isDecrypting ? 'Decrypting Vault...' : useRecoveryKeyMode ? 'Unlock with Recovery Key 🔑' : 'Unlock Journal 📖'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
