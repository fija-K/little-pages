import React, { useRef, useState } from 'react';
import { X, Upload, ShieldCheck, Lock, AlertTriangle, FileText, Trash2, Shield } from 'lucide-react';
import type { JournalEntry, GoalItem } from '../types/journal';
import type { ThemeId } from '../config/themes';
import type { LegalTabType } from './LegalModal';
import { encryptText, decryptText } from '../utils/crypto';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: JournalEntry[];
  goals: GoalItem[];
  encryptionKey: CryptoKey | null;
  onImportBackup: (importedEntries: JournalEntry[], importedGoals: GoalItem[]) => void;
  onDeleteAllData: () => void;
  activeTheme?: ThemeId;
  onSelectTheme?: (theme: ThemeId) => void;
  onOpenLegal?: (tab: LegalTabType) => void;
}

export const BackupModal: React.FC<BackupModalProps> = ({
  isOpen,
  onClose,
  entries,
  goals,
  encryptionKey,
  onImportBackup,
  onDeleteAllData,
  activeTheme,
  onSelectTheme,
  onOpenLegal
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showUnencryptedWarning, setShowUnencryptedWarning] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  if (!isOpen) return null;

  // Default: Encrypted backup download
  const handleExportEncryptedJSON = async () => {
    if (!encryptionKey) {
      alert('Vault is locked. Please unlock your journal before exporting a backup.');
      return;
    }

    try {
      const dataToEncrypt = JSON.stringify({
        version: 2,
        exportedAt: new Date().toISOString(),
        theme: activeTheme,
        entries,
        goals
      });

      const { ciphertext, iv } = await encryptText(dataToEncrypt, encryptionKey);

      const encryptedPayload = {
        version: 2,
        encrypted: true,
        exportedAt: new Date().toISOString(),
        theme: activeTheme,
        ciphertext,
        iv
      };

      const dataStr = JSON.stringify(encryptedPayload, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `littlepages-backup.encrypted.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to generate encrypted backup. Please try again.');
    }
  };

  // Secondary option: Unencrypted plain text backup
  const handleExportPlainJSON = () => {
    const backupPayload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      theme: activeTheme,
      entries,
      goals
    };
    const dataStr = JSON.stringify(backupPayload, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `littlepages-backup-readable-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setShowUnencryptedWarning(false);
  };

const MAX_BACKUP_FILE_BYTES = 15 * 1024 * 1024; // 15 MB file size limit

function sanitizeImportedEntry(raw: any): JournalEntry | null {
  if (!raw || typeof raw !== 'object') return null;

  const id = typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : `entry-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const date = typeof raw.date === 'string' ? raw.date.substring(0, 10) : new Date().toISOString().split('T')[0];
  const title = typeof raw.title === 'string' ? raw.title : 'Untitled Page';
  const content = typeof raw.content === 'string' ? raw.content : '';
  const mood = typeof raw.mood === 'string' && ['happy', 'cozy', 'tired', 'anxious', 'excited', 'blah'].includes(raw.mood) ? raw.mood : 'happy';
  const pageColor = typeof raw.pageColor === 'string' && ['blush', 'lavender', 'sage', 'butter', 'peach', 'sky'].includes(raw.pageColor) ? raw.pageColor : 'blush';
  const tags = Array.isArray(raw.tags) ? raw.tags.filter((t: any) => typeof t === 'string') : [];
  const stickers = Array.isArray(raw.stickers)
    ? raw.stickers.filter((s: any) => s && typeof s === 'object' && typeof s.id === 'string')
    : [];

  return {
    id,
    date,
    title,
    content,
    mood: mood as any,
    pageColor: pageColor as any,
    tags,
    stickers,
    createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : Date.now(),
    updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : Date.now(),
    isFavorite: !!raw.isFavorite
  };
}

function sanitizeImportedGoal(raw: any): GoalItem | null {
  if (!raw || typeof raw !== 'object') return null;

  const id = typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : `goal-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const text = typeof raw.text === 'string' ? raw.text : '';
  const type = typeof raw.type === 'string' && ['short-term', 'long-term'].includes(raw.type) ? raw.type : 'short-term';
  const completed = !!raw.completed;
  const deadline = typeof raw.deadline === 'string' ? raw.deadline.substring(0, 10) : undefined;
  const subItems = Array.isArray(raw.subItems)
    ? raw.subItems.filter((s: any) => s && typeof s === 'object' && typeof s.id === 'string' && typeof s.text === 'string').map((s: any) => ({
        id: s.id,
        text: s.text,
        completed: !!s.completed
      }))
    : [];

  return {
    id,
    text,
    type: type as any,
    completed,
    deadline,
    subItems,
    createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : Date.now(),
    updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : Date.now()
  };
}

  // Dual Restore (Encrypted + Legacy Plaintext with strict validation)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_BACKUP_FILE_BYTES) {
      alert('Backup file is too large (exceeds 15 MB limit).');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);

        // Check if file is encrypted (Version 2)
        if (parsed && typeof parsed === 'object' && parsed.encrypted && parsed.ciphertext && parsed.iv) {
          if (!encryptionKey) {
            alert('Vault is locked. Please unlock your journal before restoring an encrypted backup.');
            return;
          }

          try {
            const decryptedString = await decryptText(parsed.ciphertext, parsed.iv, encryptionKey);
            const decryptedPayload = JSON.parse(decryptedString);

            const rawEntries = Array.isArray(decryptedPayload.entries) ? decryptedPayload.entries : [];
            const rawGoals = Array.isArray(decryptedPayload.goals) ? decryptedPayload.goals : [];

            const importedEntries = rawEntries.map(sanitizeImportedEntry).filter(Boolean) as JournalEntry[];
            const importedGoals = rawGoals.map(sanitizeImportedGoal).filter(Boolean) as GoalItem[];

            if (decryptedPayload.theme && onSelectTheme) {
              onSelectTheme(decryptedPayload.theme);
            }

            onImportBackup(importedEntries, importedGoals);
            alert(`Successfully restored ${importedEntries.length} journal pages and ${importedGoals.length} goals from encrypted backup! 🔐✨`);
            onClose();
          } catch (decErr) {
            alert('Failed to decrypt backup. Please ensure this backup file was created with the same vault passphrase.');
          }
        }
        // Legacy Plaintext format (Array or object with entries/goals)
        else if (Array.isArray(parsed)) {
          const importedEntries = parsed.map(sanitizeImportedEntry).filter(Boolean) as JournalEntry[];
          onImportBackup(importedEntries, []);
          alert(`Successfully imported ${importedEntries.length} journal pages! ✨`);
          onClose();
        } else if (parsed && typeof parsed === 'object' && Array.isArray(parsed.entries)) {
          const rawEntries = Array.isArray(parsed.entries) ? parsed.entries : [];
          const rawGoals = Array.isArray(parsed.goals) ? parsed.goals : [];

          const importedEntries = rawEntries.map(sanitizeImportedEntry).filter(Boolean) as JournalEntry[];
          const importedGoals = rawGoals.map(sanitizeImportedGoal).filter(Boolean) as GoalItem[];

          if (parsed.theme && onSelectTheme) {
            onSelectTheme(parsed.theme);
          }
          onImportBackup(importedEntries, importedGoals);
          alert(`Successfully imported ${importedEntries.length} journal pages and ${importedGoals.length} goals! ✨`);
          onClose();
        } else {
          alert('Invalid backup file format. Expected a valid Little Pages backup JSON.');
        }
      } catch (err) {
        alert('Could not parse JSON file. Please ensure it is a valid backup file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="modal-backdrop-blur">
      <div className="backup-modal-card">
        <div className="modal-header-row">
          <div className="modal-title-group">
            <h3 className="modal-title font-handwritten text-2xl">
              Backup & Data Settings 📦
            </h3>
            <p className="modal-subtitle">Keep your diary entries & goals safe & portable</p>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="modal-body-content">
          {/* Primary Action: Encrypted Backup */}
          <div className="backup-card-option border-pink-200 bg-pink-50/50">
            <div className="option-icon-box bg-pink-100 text-pink-600">
              <Lock className="w-5 h-5" />
            </div>
            <div className="option-text flex-1">
              <div className="flex items-center gap-1.5">
                <h4 className="option-title">Export Encrypted Backup</h4>
                <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-sans font-medium">Recommended</span>
              </div>
              <p className="option-desc">
                Protected with your vault key (AES-256-GCM). Safe to store in cloud backups.
              </p>
            </div>
            <button
              type="button"
              className="export-action-btn"
              onClick={handleExportEncryptedJSON}
            >
              Export Encrypted
            </button>
          </div>

          {/* Secondary Action: Unencrypted Readable Export */}
          <div className="backup-card-option">
            <div className="option-icon-box bg-amber-100 text-amber-600">
              <FileText className="w-5 h-5" />
            </div>
            <div className="option-text flex-1">
              <h4 className="option-title">Export Readable Copy</h4>
              <p className="option-desc">
                Unencrypted plain text file. Readable on any device without a passphrase.
              </p>
            </div>
            <button
              type="button"
              className="px-3 py-1.5 text-xs rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-100 font-medium"
              onClick={() => setShowUnencryptedWarning(true)}
            >
              Export Readable
            </button>
          </div>

          {/* Import / Restore */}
          <div className="backup-card-option">
            <div className="option-icon-box bg-purple-100 text-purple-600">
              <Upload className="w-5 h-5" />
            </div>
            <div className="option-text flex-1">
              <h4 className="option-title">Restore Backup</h4>
              <p className="option-desc">
                Accepts both encrypted (.encrypted.json) and legacy plain JSON backups.
              </p>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              type="button"
              className="import-action-btn"
              onClick={() => fileInputRef.current?.click()}
            >
              Select File
            </button>
          </div>

          {/* Privacy & Terms Direct Button */}
          {onOpenLegal && (
            <div className="backup-card-option border-blue-200 bg-blue-50/40">
              <div className="option-icon-box bg-blue-100 text-blue-600">
                <Shield className="w-5 h-5" />
              </div>
              <div className="option-text flex-1">
                <h4 className="option-title">Privacy Policy & Guarantees</h4>
                <p className="option-desc">
                  Read how your local & cloud data is protected under zero-knowledge encryption.
                </p>
              </div>
              <button
                type="button"
                className="px-3 py-1.5 text-xs rounded-xl border border-blue-300 text-blue-700 hover:bg-blue-100 font-semibold transition-colors"
                onClick={() => {
                  onClose();
                  onOpenLegal('privacy');
                }}
              >
                Read Policy
              </button>
            </div>
          )}

          <div className="privacy-note">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Your journal entries & goals are encrypted locally using AES-256-GCM before storage or export.
            </span>
          </div>

          {/* Danger Zone: Delete All My Data */}
          <div className="pt-3 border-t border-stone-200">
            <button
              type="button"
              className="text-xs text-rose-600 hover:text-rose-700 font-medium underline flex items-center gap-1 mx-auto"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete all my data...</span>
            </button>
          </div>
        </div>
      </div>

      {/* Warning Popup for Unencrypted Readable Export */}
      {showUnencryptedWarning && (
        <div className="modal-backdrop-blur z-[100]">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border-2 border-amber-200 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-amber-600">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="font-handwritten text-xl font-bold">Unencrypted Backup Warning</h3>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              This unencrypted file will contain all your journal entries, goals, and stickers in <strong>readable plain text</strong>. Anyone with access to this file can read your diary without a passphrase.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                className="px-3.5 py-1.5 text-xs rounded-xl border border-stone-300 text-stone-600 hover:bg-stone-100"
                onClick={() => setShowUnencryptedWarning(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-3.5 py-1.5 text-xs rounded-xl bg-amber-500 text-white hover:bg-amber-600 font-medium shadow-sm"
                onClick={handleExportPlainJSON}
              >
                I Understand, Export Plaintext
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete All My Data Modal */}
      {showDeleteConfirm && (
        <div className="modal-backdrop-blur z-[100]">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border-2 border-rose-300 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <Trash2 className="w-6 h-6 shrink-0" />
              <h3 className="font-handwritten text-xl font-bold">Delete All My Data</h3>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              This will <strong>permanently delete ALL</strong> your journal entries, goals, stickers, vault setup, and cloud backup documents. This action <strong>CANNOT be undone</strong>.
            </p>

            <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 flex items-center justify-between">
              <span className="text-xs text-amber-800">Would you like to export a backup first?</span>
              <button
                type="button"
                className="text-xs font-bold text-amber-700 underline hover:text-amber-800"
                onClick={handleExportEncryptedJSON}
              >
                Download Backup
              </button>
            </div>

            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-medium text-stone-700">
                Type <span className="font-mono font-bold text-rose-600 select-none">DELETE</span> to confirm:
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 text-sm border-2 border-stone-200 rounded-xl font-mono focus:border-rose-400 outline-none"
                placeholder="Type DELETE..."
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                className="px-3.5 py-1.5 text-xs rounded-xl border border-stone-300 text-stone-600 hover:bg-stone-100"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteConfirmText('');
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`px-3.5 py-1.5 text-xs rounded-xl font-bold shadow-sm transition-all ${
                  deleteConfirmText === 'DELETE'
                    ? 'bg-rose-600 text-white hover:bg-rose-700'
                    : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                }`}
                disabled={deleteConfirmText !== 'DELETE'}
                onClick={() => {
                  setShowDeleteConfirm(false);
                  onDeleteAllData();
                }}
              >
                Permanently Delete Everything
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
