import React, { useState } from 'react';
import { Lock, ShieldAlert, Sparkles, KeyRound, Eye, EyeOff, Copy, Download, Check, AlertCircle } from 'lucide-react';
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

  // Recovery Key step state
  const [createdResult, setCreatedResult] = useState<{ config: VaultSecurityConfig; key: CryptoKey; recoveryKey: string } | null>(null);
  const [hasCopied, setHasCopied] = useState(false);
  const [hasSavedCheckbox, setHasSavedCheckbox] = useState(false);

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
      const result = await setupVaultLock(passphrase, hint);
      setCreatedResult(result);
    } catch (err) {
      setError('Failed to create encryption vault lock.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyRecoveryKey = () => {
    if (!createdResult) return;
    navigator.clipboard.writeText(createdResult.recoveryKey);
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 2000);
  };

  const handleDownloadRecoveryKit = () => {
    if (!createdResult) return;
    const text = `LITTLE PAGES EMERGENCY RECOVERY KEY
-------------------------------------------
Recovery Key: ${createdResult.recoveryKey}
Created At: ${new Date().toLocaleString()}

IMPORTANT: Keep this key in a safe place. If you ever forget your passphrase, you can use this key to unlock your Little Pages journal vault.
-------------------------------------------`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `LittlePages_RecoveryKey_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFinalizeSetup = () => {
    if (!createdResult) return;
    onCompleteSetup(createdResult.config, createdResult.key);
  };

  return (
    <div className="modal-backdrop-blur">
      <div className="lock-modal-card">
        <div className="modal-header-center">
          <div className="lock-icon-badge">
            <Lock className="w-6 h-6 text-pink-500" />
            <Sparkles className="w-3.5 h-3.5 text-amber-300 absolute -top-1 -right-1" />
          </div>
          <h2 className="lock-modal-title">
            {createdResult ? 'Save Your Emergency Recovery Key 🔑' : 'Set up your journal lock'}
          </h2>
          <p className="lock-modal-subtitle">
            {createdResult
              ? 'Your recovery key allows you to unlock your vault if you ever forget your passphrase.'
              : 'Protect your thoughts with end-to-end encryption'}
          </p>
        </div>

        {!createdResult ? (
          <>
            <div className="warning-banner-callout">
              <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="warning-text-group">
                <h4 className="warning-title">Important Security Notice:</h4>
                <p className="warning-desc">
                  We do not store your passphrase or have a master reset key. If you forget your passphrase, your recovery key will be your <strong>only way back in</strong>.
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
                <div className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-xl border border-amber-200 flex items-start gap-1.5 mb-1">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <span><strong>Warning:</strong> Don't write your passphrase or an obvious clue to it. Anyone who sees this hint could unlock your diary.</span>
                </div>
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
                <span>{isSubmitting ? 'Deriving Encryption Key...' : 'Continue to Recovery Key 🔒'}</span>
              </button>
            </form>
          </>
        ) : (
          <div className="space-y-4 pt-2">
            <div className="p-4 bg-stone-900 rounded-2xl text-center space-y-2 border-2 border-amber-300/40 shadow-inner">
              <span className="text-xs uppercase tracking-wider text-amber-400 font-medium">Your One-Time Recovery Key</span>
              <div className="font-mono text-lg font-bold text-white tracking-widest select-all py-1">
                {createdResult.recoveryKey}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 bg-pink-100 text-pink-700 hover:bg-pink-200 rounded-xl text-xs font-medium transition-colors"
                onClick={handleCopyRecoveryKey}
              >
                {hasCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{hasCopied ? 'Copied!' : 'Copy Key'}</span>
              </button>
              <button
                type="button"
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 bg-purple-100 text-purple-700 hover:bg-purple-200 rounded-xl text-xs font-medium transition-colors"
                onClick={handleDownloadRecoveryKit}
              >
                <Download className="w-4 h-4" />
                <span>Download Kit (.txt)</span>
              </button>
            </div>

            <label className="flex items-center gap-2.5 p-3 rounded-xl bg-pink-50 border border-pink-200 cursor-pointer text-xs text-stone-700">
              <input
                type="checkbox"
                className="w-4 h-4 rounded text-pink-600 focus:ring-pink-400"
                checked={hasSavedCheckbox}
                onChange={(e) => setHasSavedCheckbox(e.target.checked)}
              />
              <span>I have saved my emergency recovery key in a safe place.</span>
            </label>

            <button
              type="button"
              className={`w-full py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 shadow-md transition-all ${
                hasSavedCheckbox
                  ? 'bg-gradient-to-r from-pink-500 to-rose-400 text-white hover:opacity-90'
                  : 'bg-stone-200 text-stone-400 cursor-not-allowed'
              }`}
              disabled={!hasSavedCheckbox}
              onClick={handleFinalizeSetup}
            >
              <Lock className="w-4 h-4" />
              <span>Complete Setup & Unlock Journal 📖</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
