import React, { useState, useMemo } from 'react';
import { Lock, ShieldAlert, Sparkles, KeyRound, Eye, EyeOff, Copy, Download, Check, AlertCircle } from 'lucide-react';
import { setupVaultLock } from '../utils/crypto';
import type { VaultSecurityConfig } from '../utils/crypto';
import { FooterLinks } from './FooterLinks';
import type { LegalTabType } from './LegalModal';

interface LockSetupModalProps {
  isOpen: boolean;
  onCompleteSetup: (config: VaultSecurityConfig, key: CryptoKey) => void;
  onOpenLegal: (tab: LegalTabType) => void;
}

function evaluatePassphraseStrength(pass: string): { score: number; label: string; colorClass: string; warning?: string } {
  if (!pass) return { score: 0, label: 'Min 10 characters', colorClass: 'bg-stone-200' };

  const commonList = ['password', '1234567890', '12345678', 'littlepages', 'admin12345', 'qwertyuiop', 'journal123', 'myjournal'];
  const isCommon = commonList.some(c => pass.toLowerCase().includes(c));

  if (pass.length < 10) {
    return {
      score: 1,
      label: `Too short (${pass.length}/10 chars)`,
      colorClass: 'bg-rose-500',
      warning: 'Passphrase must be at least 10 characters long.'
    };
  }

  if (isCommon) {
    return {
      score: 1,
      label: 'Weak (Common pattern)',
      colorClass: 'bg-rose-500',
      warning: 'This passphrase contains a common pattern. Choose a unique passphrase.'
    };
  }

  let score = 2;
  if (pass.length >= 14) score += 1;
  if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score += 1;
  if (/[0-9]/.test(pass) || /[^A-Za-z0-9]/.test(pass)) score += 1;

  if (score >= 4) {
    return { score: 4, label: 'Strong Passphrase 🔐', colorClass: 'bg-emerald-500' };
  } else {
    return { score: 3, label: 'Good / Medium Strength', colorClass: 'bg-amber-500' };
  }
}

export const LockSetupModal: React.FC<LockSetupModalProps> = ({
  isOpen,
  onCompleteSetup,
  onOpenLegal
}) => {
  const [passphrase, setPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [showHintField, setShowHintField] = useState(false);
  const [hint, setHint] = useState('');
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Recovery Key step state
  const [createdResult, setCreatedResult] = useState<{ config: VaultSecurityConfig; key: CryptoKey; recoveryKey: string } | null>(null);
  const [hasCopied, setHasCopied] = useState(false);
  const [hasSavedCheckbox, setHasSavedCheckbox] = useState(false);

  const strengthInfo = useMemo(() => evaluatePassphraseStrength(passphrase), [passphrase]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (passphrase.length < 10) {
      setError('Passphrase must be at least 10 characters long.');
      return;
    }

    if (strengthInfo.warning && strengthInfo.score < 2) {
      setError(strengthInfo.warning);
      return;
    }

    if (passphrase !== confirmPassphrase) {
      setError('Passphrases do not match.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await setupVaultLock(passphrase, showHintField ? hint : undefined);
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
    const text = `LITTLE PAGES EMERGENCY RECOVERY KEY (128-bit)
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
    <div className="modal-backdrop-blur flex flex-col justify-between items-center py-6 overflow-y-auto z-[100]">
      <div className="lock-modal-card my-auto">
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
              ? 'Your 128-bit recovery key allows you to unlock your vault if you ever forget your passphrase.'
              : 'Protect your thoughts with end-to-end AES-256-GCM encryption'}
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
                  <span>Choose Passphrase (min. 10 characters)</span>
                </label>
                <div className="passphrase-input-wrapper">
                  <input
                    type={showPassphrase ? 'text' : 'password'}
                    className="lock-text-input"
                    placeholder="Enter passphrase (min. 10 characters)..."
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

                {/* Passphrase Strength Meter */}
                {passphrase && (
                  <div className="space-y-1 mt-1">
                    <div className="flex items-center justify-between text-[11px] font-semibold">
                      <span className="text-stone-500">Strength:</span>
                      <span className={strengthInfo.score >= 3 ? 'text-emerald-600' : strengthInfo.score === 2 ? 'text-amber-600' : 'text-rose-600'}>
                        {strengthInfo.label}
                      </span>
                    </div>
                    <div className="w-full bg-stone-200 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${strengthInfo.colorClass}`}
                        style={{ width: `${Math.max(15, (strengthInfo.score / 4) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}
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

              {/* Optional Password Hint (Off by default) */}
              <div className="form-field-group pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-stone-700 select-none">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded text-pink-500"
                    checked={showHintField}
                    onChange={(e) => {
                      setShowHintField(e.target.checked);
                      if (!e.target.checked) setHint('');
                    }}
                  />
                  <span>Add optional passphrase hint (stored unencrypted)</span>
                </label>

                {showHintField && (
                  <div className="space-y-2 mt-2 pl-2 border-l-2 border-amber-300">
                    <div className="text-[11px] text-amber-900 bg-amber-50 p-2.5 rounded-xl border border-amber-200 flex items-start gap-1.5">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <span>Don't write your passphrase or an obvious clue to it. The hint isn't encrypted.</span>
                    </div>
                    <input
                      type="text"
                      className="lock-text-input w-full"
                      placeholder="e.g. Favorite childhood book + graduation year"
                      value={hint}
                      onChange={(e) => setHint(e.target.value)}
                    />
                  </div>
                )}
              </div>

              {error && <div className="lock-error-msg">{error}</div>}

              <button
                type="submit"
                className="setup-lock-submit-btn"
                disabled={isSubmitting || passphrase.length < 10 || passphrase !== confirmPassphrase}
              >
                <Lock className="w-4 h-4" />
                <span>{isSubmitting ? 'Deriving Key (600,000 PBKDF2)...' : 'Continue to Recovery Key 🔒'}</span>
              </button>
            </form>
          </>
        ) : (
          <div className="space-y-4 pt-2">
            <div className="p-4 bg-stone-900 rounded-2xl text-center space-y-2 border-2 border-amber-300/40 shadow-inner">
              <span className="text-xs uppercase tracking-wider text-amber-400 font-medium">Your One-Time 128-bit Recovery Key</span>
              <div className="font-mono text-base sm:text-lg font-bold text-white tracking-wider select-all py-1 break-all">
                {createdResult.recoveryKey}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 bg-pink-100 text-pink-700 hover:bg-pink-200 rounded-xl text-xs font-medium transition-colors cursor-pointer"
                onClick={handleCopyRecoveryKey}
              >
                {hasCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{hasCopied ? 'Copied!' : 'Copy Key'}</span>
              </button>
              <button
                type="button"
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 bg-purple-100 text-purple-700 hover:bg-purple-200 rounded-xl text-xs font-medium transition-colors cursor-pointer"
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
                  ? 'bg-gradient-to-r from-pink-500 to-rose-400 text-white hover:opacity-90 cursor-pointer'
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

      <FooterLinks onOpenLegal={onOpenLegal} isLocalOnly={true} />
    </div>
  );
};
