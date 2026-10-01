import React from 'react';
import type { LegalTabType } from './LegalModal';

interface FooterLinksProps {
  onOpenLegal: (tab: LegalTabType) => void;
  isLocalOnly?: boolean;
}

export const FooterLinks: React.FC<FooterLinksProps> = ({
  onOpenLegal,
  isLocalOnly = true
}) => {
  return (
    <footer className="w-full py-4 text-center space-y-1.5 text-xs text-stone-500 font-sans">
      {isLocalOnly && (
        <p className="text-[11px] text-stone-400">
          🌱 Local mode: Your pages live only in this browser unless cloud sync is enabled.
        </p>
      )}

      <div className="flex items-center justify-center gap-2 flex-wrap">
        <button
          type="button"
          className="hover:text-pink-600 hover:underline transition-colors cursor-pointer"
          onClick={() => onOpenLegal('privacy')}
        >
          Privacy Policy
        </button>
        <span className="text-stone-300">•</span>
        <button
          type="button"
          className="hover:text-pink-600 hover:underline transition-colors cursor-pointer"
          onClick={() => onOpenLegal('protection')}
        >
          Data Protection & Security
        </button>
        <span className="text-stone-300">•</span>
        <button
          type="button"
          className="hover:text-pink-600 hover:underline transition-colors cursor-pointer"
          onClick={() => onOpenLegal('terms')}
        >
          Terms of Use
        </button>
      </div>
    </footer>
  );
};
