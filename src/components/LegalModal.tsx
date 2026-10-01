import React from 'react';
import { X, ShieldCheck, FileText, Lock, Mail } from 'lucide-react';
import { PROTECTION_TEXT, PRIVACY_TEXT, TERMS_TEXT } from '../config/legalText';
import type { LegalPageContent } from '../config/legalText';

export type LegalTabType = 'protection' | 'privacy' | 'terms';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: LegalTabType;
}

export const LegalModal: React.FC<LegalModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'protection'
}) => {
  const [activeTab, setActiveTab] = React.useState<LegalTabType>(initialTab);

  React.useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  if (!isOpen) return null;

  let content: LegalPageContent = PROTECTION_TEXT;
  if (activeTab === 'privacy') content = PRIVACY_TEXT;
  if (activeTab === 'terms') content = TERMS_TEXT;

  return (
    <div className="modal-backdrop-blur z-[100]">
      <div className="bg-white rounded-3xl p-6 max-w-2xl w-full border-2 border-pink-200 shadow-2xl space-y-5 max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-stone-200 pb-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-pink-100 rounded-2xl text-pink-600">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-handwritten text-2xl font-bold text-stone-800">
                {content.title}
              </h3>
              <p className="text-xs text-stone-500">Last updated: {content.lastUpdated}</p>
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

        {/* Sub-Nav Tabs */}
        <div className="flex gap-2 border-b border-stone-200 pb-3 shrink-0">
          <button
            type="button"
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'protection'
                ? 'bg-pink-500 text-white shadow-sm'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
            onClick={() => setActiveTab('protection')}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Data Protection</span>
          </button>
          <button
            type="button"
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'privacy'
                ? 'bg-pink-500 text-white shadow-sm'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
            onClick={() => setActiveTab('privacy')}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Privacy Policy</span>
          </button>
          <button
            type="button"
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'terms'
                ? 'bg-pink-500 text-white shadow-sm'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
            onClick={() => setActiveTab('terms')}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Terms of Use</span>
          </button>
        </div>

        {/* Scrollable Modal Body */}
        <div className="overflow-y-auto space-y-4 pr-1 text-xs text-stone-700 leading-relaxed flex-1">
          <p className="p-3 bg-pink-50/60 rounded-2xl border border-pink-200/60 font-medium text-stone-800">
            {content.summary}
          </p>

          <div className="space-y-2 p-4 bg-amber-50/50 rounded-2xl border border-amber-200/60">
            <h4 className="font-handwritten text-lg font-bold text-amber-900 flex items-center gap-1.5">
              <span>{content.localMode.heading}</span>
            </h4>
            <ul className="space-y-1.5 list-disc list-inside text-stone-700">
              {content.localMode.points.map((pt, idx) => (
                <li key={idx}>{pt}</li>
              ))}
            </ul>
          </div>

          <div className="space-y-2 p-4 bg-purple-50/50 rounded-2xl border border-purple-200/60">
            <h4 className="font-handwritten text-lg font-bold text-purple-900 flex items-center gap-1.5">
              <span>{content.syncMode.heading}</span>
            </h4>
            <ul className="space-y-1.5 list-disc list-inside text-stone-700">
              {content.syncMode.points.map((pt, idx) => (
                <li key={idx}>{pt}</li>
              ))}
            </ul>
          </div>

          <div className="pt-2 border-t border-stone-200 flex items-center gap-2 text-stone-500 text-[11px]">
            <Mail className="w-3.5 h-3.5 text-pink-500 shrink-0" />
            <span>{content.contact}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
