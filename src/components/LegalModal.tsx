import React from 'react';
import { X, ShieldCheck, FileText, Lock, Mail, ExternalLink, Sparkles } from 'lucide-react';
import { SUMMARY_POINTS, PRIVACY_POLICY_DATA, TERMS_DATA, PUBLIC_SOURCE_LINK, CONTACT_EMAIL, LAST_UPDATED } from '../config/legalText';

export type LegalTabType = 'summary' | 'privacy' | 'terms';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: LegalTabType;
}

export const LegalModal: React.FC<LegalModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'summary'
}) => {
  const [activeTab, setActiveTab] = React.useState<LegalTabType>(initialTab);

  React.useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop-blur z-[100]">
      <div className="bg-white rounded-3xl p-6 max-w-2xl w-full border-2 border-pink-200 shadow-2xl space-y-4 max-h-[88vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-stone-200 pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-pink-100 rounded-2xl text-pink-600">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-handwritten text-2xl font-bold text-stone-800">
                Privacy & Trust 🔒
              </h3>
              <p className="text-xs text-stone-500">Last updated: {LAST_UPDATED}</p>
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

        {/* 3 Main Tabs */}
        <div className="flex gap-2 border-b border-stone-200 pb-2 shrink-0">
          <button
            type="button"
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'summary'
                ? 'bg-pink-500 text-white shadow-sm'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
            onClick={() => setActiveTab('summary')}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Summary</span>
          </button>
          <button
            type="button"
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
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
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'terms'
                ? 'bg-pink-500 text-white shadow-sm'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
            onClick={() => setActiveTab('terms')}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Terms</span>
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="overflow-y-auto space-y-4 pr-1 text-xs text-stone-700 leading-relaxed flex-1">
          
          {/* TAB 1: SUMMARY */}
          {activeTab === 'summary' && (
            <div className="space-y-3">
              <div className="p-3 bg-pink-50/70 rounded-2xl border border-pink-200 text-stone-800 text-xs font-medium">
                Here is a quick overview of how Little Pages protects your privacy and journal data.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {SUMMARY_POINTS.map((pt, idx) => (
                  <div key={idx} className="p-3 bg-stone-50 rounded-2xl border border-stone-200 flex items-start gap-2.5">
                    <span className="text-xl shrink-0">{pt.icon}</span>
                    <div className="space-y-0.5">
                      <h4 className="font-bold text-stone-900 text-xs">{pt.title}</h4>
                      <p className="text-[11px] text-stone-600 leading-snug">{pt.text}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Source code audit link */}
              <div className="p-3 bg-emerald-50/70 rounded-2xl border border-emerald-200 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-emerald-900 text-xs font-semibold">
                  <Lock className="w-4 h-4 text-emerald-600" />
                  <span>Transparent & Open Source Code</span>
                </div>
                <a
                  href={PUBLIC_SOURCE_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-[11px] flex items-center gap-1 shadow-sm transition-all"
                >
                  <span>How is this checked?</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}

          {/* TAB 2: PRIVACY POLICY */}
          {activeTab === 'privacy' && (
            <div className="space-y-4">
              {/* Section A */}
              <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-200 space-y-2">
                <h4 className="font-handwritten text-lg font-bold text-amber-900">
                  {PRIVACY_POLICY_DATA.localOnly.heading}
                </h4>
                <div className="space-y-2">
                  {PRIVACY_POLICY_DATA.localOnly.bullets.map((b, idx) => (
                    <div key={idx} className="text-xs">
                      <strong className="text-amber-950">{b.label}:</strong>{' '}
                      <span className="text-stone-700">{b.details}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section B */}
              <div className="p-4 bg-purple-50/60 rounded-2xl border border-purple-200 space-y-2">
                <h4 className="font-handwritten text-lg font-bold text-purple-900">
                  {PRIVACY_POLICY_DATA.signedInSync.heading}
                </h4>
                <div className="space-y-2">
                  {PRIVACY_POLICY_DATA.signedInSync.bullets.map((b, idx) => (
                    <div key={idx} className="text-xs">
                      <strong className="text-purple-950">{b.label}:</strong>{' '}
                      <span className="text-stone-700">{b.details}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: TERMS */}
          {activeTab === 'terms' && (
            <div className="space-y-3 p-4 bg-blue-50/60 rounded-2xl border border-blue-200">
              <h4 className="font-handwritten text-xl font-bold text-blue-900">
                {TERMS_DATA.title}
              </h4>
              <ul className="space-y-2 list-disc list-inside text-stone-700 text-xs">
                {TERMS_DATA.points.map((pt, idx) => (
                  <li key={idx} className="leading-relaxed">
                    {pt}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Footer Contact Info */}
          <div className="pt-2 border-t border-stone-200 flex items-center justify-between text-stone-500 text-[11px]">
            <div className="flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-pink-500 shrink-0" />
              <span>Contact: <a href={`mailto:${CONTACT_EMAIL}`} className="text-pink-600 underline font-semibold">{CONTACT_EMAIL}</a></span>
            </div>
            <span className="text-stone-400 font-mono">v2.1 E2EE</span>
          </div>

        </div>
      </div>
    </div>
  );
};
