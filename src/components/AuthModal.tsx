import React, { useState } from 'react';
import { X, LogIn, Mail, Lock, ShieldCheck, AlertCircle } from 'lucide-react';
import { auth, googleProvider, signInWithPopup } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import type { LegalTabType } from './LegalModal';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenLegal: (tab: LegalTabType) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onOpenLegal
}) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!agreedToTerms) {
      setError('Please accept the Privacy Policy and Terms of Use to enable Cloud Sync.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (isSignUp) {
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        // Strip profile name/photo
        if (credential.user) {
          await updateProfile(credential.user, { displayName: '', photoURL: '' });
        }
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your email and password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    if (!agreedToTerms) {
      setError('Please accept the Privacy Policy and Terms of Use to enable Cloud Sync.');
      return;
    }

    try {
      const result = await signInWithPopup(auth, googleProvider);
      // Strip Google display name and photoURL from profile to enforce data minimization
      if (result.user) {
        await updateProfile(result.user, { displayName: '', photoURL: '' });
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Google sign-in status.');
    }
  };

  return (
    <div className="modal-backdrop-blur z-[100]">
      <div className="bg-white rounded-3xl p-6 max-w-md w-full border-2 border-pink-200 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-pink-100 rounded-2xl text-pink-600">
              <LogIn className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-handwritten text-2xl font-bold text-stone-800">
                {isSignUp ? 'Create Cloud Sync Account' : 'Sign in to Cloud Sync ☁️'}
              </h3>
              <p className="text-xs text-stone-500">Sync encrypted entries across devices</p>
            </div>
          </div>
          <button
            type="button"
            className="p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full transition-colors"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* One-time Cloud Encryption Notice */}
        <div className="p-3 bg-purple-50 rounded-2xl border border-purple-200 text-xs text-purple-900 flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
          <div>
            <strong>Zero-Knowledge Cloud Notice:</strong> Your encrypted data will be stored in the cloud. We cannot read it, but if you forget your passphrase and recovery key, it cannot be recovered.
          </div>
        </div>

        {/* Primary Option: Email / Password Auth */}
        <form onSubmit={handleEmailAuth} className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-stone-700 flex items-center gap-1">
              <Mail className="w-3.5 h-3.5 text-stone-500" />
              <span>Email Address</span>
            </label>
            <input
              type="email"
              required
              className="w-full px-3 py-2 text-sm border-2 border-stone-200 rounded-xl focus:border-pink-400 outline-none"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-stone-700 flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-stone-500" />
              <span>Password</span>
            </label>
            <input
              type="password"
              required
              minLength={6}
              className="w-full px-3 py-2 text-sm border-2 border-stone-200 rounded-xl focus:border-pink-400 outline-none"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {/* Consent Checkbox */}
          <label className="flex items-start gap-2 pt-1 text-xs text-stone-600 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 mt-0.5 rounded text-pink-600 focus:ring-pink-400"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
            />
            <span>
              I've read and agree to the{' '}
              <button
                type="button"
                className="text-pink-600 underline font-medium"
                onClick={() => onOpenLegal('privacy')}
              >
                Privacy Policy
              </button>{' '}
              and{' '}
              <button
                type="button"
                className="text-pink-600 underline font-medium"
                onClick={() => onOpenLegal('terms')}
              >
                Terms of Use
              </button>.
            </span>
          </label>

          {error && <div className="text-xs text-rose-600 bg-rose-50 p-2 rounded-xl border border-rose-200">{error}</div>}

          <button
            type="submit"
            className="w-full py-2.5 bg-gradient-to-r from-pink-500 to-rose-400 text-white rounded-xl text-xs font-bold shadow-md hover:opacity-95 transition-opacity"
            disabled={isSubmitting}
          >
            {isSignUp ? 'Create Cloud Account' : 'Sign In with Email'}
          </button>
        </form>

        <div className="text-center">
          <button
            type="button"
            className="text-xs text-stone-500 hover:text-stone-800 underline"
            onClick={() => setIsSignUp(!isSignUp)}
          >
            {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Create one'}
          </button>
        </div>

        <div className="relative my-2">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-stone-200" /></div>
          <div className="relative flex justify-center text-[10px] uppercase tracking-wider text-stone-400 bg-white px-2">or</div>
        </div>

        {/* Secondary Option: Google Sign-In with Data Minimization Note */}
        <div className="space-y-2">
          <button
            type="button"
            className="w-full py-2.5 px-4 border-2 border-stone-200 hover:border-pink-300 rounded-xl text-xs font-bold text-stone-700 bg-white hover:bg-stone-50 flex items-center justify-center gap-2 transition-all shadow-sm"
            onClick={handleGoogleSignIn}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z"/>
              <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"/>
              <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 10.8 0 12.3s.7 2.6 1.9 5l3.7-2.5z"/>
              <path fill="#34A853" d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16.5C3.7 20.3 7.5 23.5 12 23.5z"/>
            </svg>
            <span>Continue with Google</span>
          </button>
          <p className="text-[10px] text-stone-500 bg-stone-50 p-2 rounded-xl border border-stone-200 flex items-start gap-1">
            <AlertCircle className="w-3 h-3 text-stone-400 shrink-0 mt-0.5" />
            <span>
              Google shares your name and photo with the sign-in system. Little Pages never uses or stores them. Use email sign-in to avoid sharing them.
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};
