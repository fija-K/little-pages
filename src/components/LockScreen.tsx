import React, { useState } from 'react';
import { Lock, KeyRound, Eye, EyeOff, HelpCircle, Sparkles } from 'lucide-react';
import { unlockVault } from '../utils/crypto';
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
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!passphrase) {
      setError('Please enter your passphrase.');
      return;
    }

    setIsDecrypting(true);

    try {
      const key = await unlockVault(passphrase, vaultConfig);
      if (key) {
        onUnlockSuccess(key);
      } else {
        setError('Incorrect passphrase. Please try again.');
      }
    } catch (err) {
      setError('Failed to verify passphrase.');
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
          Your diary is encrypted. Enter your passphrase to decrypt your entries.
        </p>

        <form onSubmit={handleUnlock} className="lock-screen-form">
          <div className="passphrase-field-container">
            <div className="passphrase-input-wrapper">
              <KeyRound className="w-4 h-4 text-stone-400 ml-3" />
              <input
                type={showPassphrase ? 'text' : 'password'}
                className="lock-text-input-large"
                placeholder="Enter journal passphrase..."
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                autoFocus
              />
              <button
                type="button"
                className="toggle-eye-btn mr-2"
                onClick={() => setShowPassphrase(!showPassphrase)}
              >
                {showPassphrase ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && <div className="lock-error-msg">{error}</div>}

          {vaultConfig.hint && (
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

          <button
            type="submit"
            className="unlock-submit-btn"
            disabled={isDecrypting}
          >
            <Lock className="w-4 h-4" />
            <span>{isDecrypting ? 'Decrypting Vault...' : 'Unlock Journal 📖'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
