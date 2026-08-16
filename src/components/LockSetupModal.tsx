import React, { useState } from 'react';
import { Lock, ShieldAlert, Sparkles, KeyRound, Eye, EyeOff } from 'lucide-react';
import { setupVaultLock } from '../utils/crypto';
import type { VaultSecurityConfig } from '../utils/crypto';

interface LockSetupModalProps {
  isOpen: boolean;
  onCompleteSetup: (config: VaultSecurityConfig, key: CryptoKey) => void;
}

export const LockSetupModal: React.FC<LockSetupModalProps> = ({
  isOpen,
  onCompleteSetup
}) => {
  const [passphrase, setPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [hint, setHint] = useState('');
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (passphrase.length < 6) {
      setError('Passphrase must be at least 6 characters long.');
      return;
    }

    if (passphrase !== confirmPassphrase) {
      setError('Passphrases do not match.');
      return;
    }

    setIsSubmitting(true);

    try {
      const { config, key } = await setupVaultLock(passphrase, hint);
      onCompleteSetup(config, key);
    } catch (err) {
      setError('Failed to create encryption vault lock.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop-blur">
      <div className="lock-modal-card">
        <div className="modal-header-center">
          <div className="lock-icon-badge">
            <Lock className="w-6 h-6 text-pink-500" />
            <Sparkles className="w-3.5 h-3.5 text-amber-300 absolute -top-1 -right-1" />
          </div>
          <h2 className="lock-modal-title">Set up your journal lock</h2>
          <p className="lock-modal-subtitle">
            Protect your thoughts with end-to-end encryption
          </p>
        </div>

        <div className="warning-banner-callout">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="warning-text-group">
            <h4 className="warning-title">Important One-Time Warning:</h4>
            <p className="warning-desc">
              If you forget this passphrase, your entries <strong>cannot be recovered</strong>.
              We do not store your passphrase, have no master key, and cannot reset it for you.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="lock-form-fields">
          <div className="form-field-group">
            <label className="field-label">
              <KeyRound className="w-3.5 h-3.5 text-stone-500" />
              <span>Choose Passphrase</span>
            </label>
            <div className="passphrase-input-wrapper">
              <input
                type={showPassphrase ? 'text' : 'password'}
                className="lock-text-input"
                placeholder="Enter passphrase (min. 6 characters)..."
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                required
                autoFocus
              />
              <button
                type="button"
                className="toggle-eye-btn"
                onClick={() => setShowPassphrase(!showPassphrase)}
              >
                {showPassphrase ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="form-field-group">
            <label className="field-label">Confirm Passphrase</label>
            <input
              type={showPassphrase ? 'text' : 'password'}
              className="lock-text-input"
              placeholder="Confirm your passphrase..."
              value={confirmPassphrase}
              onChange={(e) => setConfirmPassphrase(e.target.value)}
              required
            />
          </div>

          <div className="form-field-group">
            <label className="field-label">
              Passphrase Hint <span className="text-stone-400 font-normal">(Optional, stored locally)</span>
            </label>
            <input
              type="text"
              className="lock-text-input"
              placeholder="e.g. Favorite book character + birth year"
              value={hint}
              onChange={(e) => setHint(e.target.value)}
            />
          </div>

          {error && <div className="lock-error-msg">{error}</div>}

          <button
            type="submit"
            className="setup-lock-submit-btn"
            disabled={isSubmitting}
          >
            <Lock className="w-4 h-4" />
            <span>{isSubmitting ? 'Deriving Encryption Key...' : 'Encrypt & Lock Journal 🔒'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
