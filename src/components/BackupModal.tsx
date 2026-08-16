import React, { useRef } from 'react';
import { X, Download, Upload, ShieldCheck } from 'lucide-react';
import type { JournalEntry } from '../types/journal';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: JournalEntry[];
  onImportEntries: (importedEntries: JournalEntry[]) => void;
}

export const BackupModal: React.FC<BackupModalProps> = ({
  isOpen,
  onClose,
  entries,
  onImportEntries
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleExportJSON = () => {
    const dataStr = JSON.stringify(entries, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `little_pages_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed)) {
          onImportEntries(parsed);
          alert(`Successfully imported ${parsed.length} journal pages! ✨`);
          onClose();
        } else {
          alert('Invalid backup file format. Expected a JSON array of journal entries.');
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
              Backup & Restore 📦
            </h3>
            <p className="modal-subtitle">Keep your diary entries safe & portable</p>
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
          <div className="backup-card-option">
            <div className="option-icon-box bg-pink-100 text-pink-600">
              <Download className="w-5 h-5" />
            </div>
            <div className="option-text flex-1">
              <h4 className="option-title">Export to JSON</h4>
              <p className="option-desc">
                Download all your {entries.length} journal entries as a single JSON file.
              </p>
            </div>
            <button
              type="button"
              className="export-action-btn"
              onClick={handleExportJSON}
            >
              Export JSON
            </button>
          </div>

          <div className="backup-card-option">
            <div className="option-icon-box bg-purple-100 text-purple-600">
              <Upload className="w-5 h-5" />
            </div>
            <div className="option-text flex-1">
              <h4 className="option-title">Import JSON Backup</h4>
              <p className="option-desc">
                Restore or merge entries from a previously exported backup file.
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

          <div className="privacy-note">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Your journal entries are stored locally on your device and never sold or shared.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
