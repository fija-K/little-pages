import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { JournalEntry, EncryptedJournalEntry, FilterState } from './types/journal';
import type { VaultSecurityConfig } from './utils/crypto';
import {
  getVaultConfig,
  saveVaultConfig,
  getStoredEncryptedEntries,
  saveStoredEncryptedEntries,
  encryptJournalEntry,
  decryptJournalEntry,
  INITIAL_SAMPLE_ENTRIES
} from './utils/storage';
import { calculateStreak } from './utils/streakUtils';
import {
  auth,
  googleProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  db,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query
} from './firebase';
import type { User } from './firebase';
import { Header } from './components/Header';
import { EntryList } from './components/EntryList';
import { CalendarView } from './components/CalendarView';
import { EntryEditor } from './components/EntryEditor';
import { BackupModal } from './components/BackupModal';
import { LockSetupModal } from './components/LockSetupModal';
import { LockScreen } from './components/LockScreen';

const IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes idle timeout

export function App() {
  const [vaultConfig, setVaultConfig] = useState<VaultSecurityConfig | null>(() => getVaultConfig());
  const [encryptionKey, setEncryptionKey] = useState<CryptoKey | null>(null);
  const [decryptedEntries, setDecryptedEntries] = useState<JournalEntry[]>([]);
  const [encryptedEntries, setEncryptedEntries] = useState<EncryptedJournalEntry[]>([]);
  
  const [currentView, setCurrentView] = useState<'list' | 'calendar' | 'editor'>('list');
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [editorInitialDate, setEditorInitialDate] = useState<string | undefined>(undefined);
  const [isBackupOpen, setIsBackupOpen] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);

  const [filter, setFilter] = useState<FilterState>({
    searchQuery: '',
    selectedMood: 'all',
    selectedTag: 'all',
    sortBy: 'newest'
  });

  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Manual Lock action
  const handleLockNow = useCallback(() => {
    setEncryptionKey(null);
    setDecryptedEntries([]);
    setEditingEntry(null);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
  }, []);

  // Idle timeout reset
  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (encryptionKey) {
      idleTimerRef.current = setTimeout(() => {
        handleLockNow();
      }, IDLE_TIMEOUT_MS);
    }
  }, [encryptionKey, handleLockNow]);

  // Activity listeners for idle timer reset
  useEffect(() => {
    if (!encryptionKey) return;

    const handleUserActivity = () => resetIdleTimer();
    window.addEventListener('mousemove', handleUserActivity);
    window.addEventListener('keydown', handleUserActivity);
    window.addEventListener('click', handleUserActivity);

    resetIdleTimer();

    return () => {
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      window.removeEventListener('click', handleUserActivity);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [encryptionKey, resetIdleTimer]);

  // Decrypt encrypted entries when key is unlocked
  const loadAndDecryptEntries = useCallback(async (key: CryptoKey, storedList: EncryptedJournalEntry[]) => {
    const decryptedList: JournalEntry[] = [];
    for (const encryptedItem of storedList) {
      try {
        const decrypted = await decryptJournalEntry(encryptedItem, key);
        decryptedList.push(decrypted);
      } catch (err) {
        console.error('Failed to decrypt entry:', err);
      }
    }
    setDecryptedEntries(decryptedList);
  }, []);

  // Unlock callback
  const handleUnlockSuccess = async (key: CryptoKey) => {
    setEncryptionKey(key);
    const stored = getStoredEncryptedEntries();
    setEncryptedEntries(stored);
    await loadAndDecryptEntries(key, stored);
  };

  // Complete initial setup callback
  const handleCompleteSetup = async (config: VaultSecurityConfig, key: CryptoKey) => {
    saveVaultConfig(config);
    setVaultConfig(config);
    setEncryptionKey(key);

    // Encrypt sample entries for first time experience
    const initialEncrypted: EncryptedJournalEntry[] = [];
    for (const sample of INITIAL_SAMPLE_ENTRIES) {
      const enc = await encryptJournalEntry(sample, key);
      initialEncrypted.push(enc);
    }

    saveStoredEncryptedEntries(initialEncrypted);
    setEncryptedEntries(initialEncrypted);
    setDecryptedEntries(INITIAL_SAMPLE_ENTRIES);
  };

  // Firebase Auth listener & Firestore sync
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);

      if (currentUser && encryptionKey) {
        const userEntriesRef = collection(db, 'users', currentUser.uid, 'journal_entries');
        const q = query(userEntriesRef);

        const unsubscribeSnapshot = onSnapshot(
          q,
          async (snapshot) => {
            const remoteEncrypted: EncryptedJournalEntry[] = [];
            snapshot.forEach((docSnap) => {
              remoteEncrypted.push(docSnap.data() as EncryptedJournalEntry);
            });

            if (remoteEncrypted.length > 0) {
              setEncryptedEntries(remoteEncrypted);
              saveStoredEncryptedEntries(remoteEncrypted);
              await loadAndDecryptEntries(encryptionKey, remoteEncrypted);
            }
          },
          (err) => {
            console.warn('Firestore snapshot listener error:', err);
          }
        );

        return () => unsubscribeSnapshot();
      }
    });

    return () => unsubscribeAuth();
  }, [encryptionKey, loadAndDecryptEntries]);

  const { currentStreak } = calculateStreak(decryptedEntries);

  // Google Sign-In
  const handleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error('Sign-in error:', err);
      alert('Sign-in cancelled or failed.');
    }
  };

  // Sign-Out
  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setUser(null);
    } catch (err) {
      console.error('Sign-out error:', err);
    }
  };

  // Navigation handlers
  const handleNewEntry = (dateIso?: string) => {
    setEditingEntry(null);
    setEditorInitialDate(dateIso);
    setCurrentView('editor');
  };

  const handleEditEntry = (entry: JournalEntry) => {
    setEditingEntry(entry);
    setCurrentView('editor');
  };

  // Save entry (Encrypt plaintext before storing!)
  const handleSaveEntry = async (savedPlaintext: JournalEntry) => {
    if (!encryptionKey) {
      alert('Vault is locked. Please unlock to save entries.');
      return;
    }

    // Encrypt entry with Web Crypto AES-256-GCM
    const encryptedPayload = await encryptJournalEntry(savedPlaintext, encryptionKey);

    // Update in-memory decrypted list
    const updatedDecryptedIndex = decryptedEntries.findIndex(e => e.id === savedPlaintext.id);
    let updatedDecrypted: JournalEntry[];
    if (updatedDecryptedIndex >= 0) {
      updatedDecrypted = [...decryptedEntries];
      updatedDecrypted[updatedDecryptedIndex] = savedPlaintext;
    } else {
      updatedDecrypted = [savedPlaintext, ...decryptedEntries];
    }
    setDecryptedEntries(updatedDecrypted);

    // Update encrypted entries list in localStorage
    const updatedEncryptedIndex = encryptedEntries.findIndex(e => e.id === encryptedPayload.id);
    let updatedEncrypted: EncryptedJournalEntry[];
    if (updatedEncryptedIndex >= 0) {
      updatedEncrypted = [...encryptedEntries];
      updatedEncrypted[updatedEncryptedIndex] = encryptedPayload;
    } else {
      updatedEncrypted = [encryptedPayload, ...encryptedEntries];
    }
    setEncryptedEntries(updatedEncrypted);
    saveStoredEncryptedEntries(updatedEncrypted);

    // Sync encrypted payload to Firestore if signed in
    if (user) {
      try {
        const docRef = doc(db, 'users', user.uid, 'journal_entries', encryptedPayload.id);
        await setDoc(docRef, encryptedPayload, { merge: true });
      } catch (err) {
        console.error('Failed to sync encrypted entry to Firestore:', err);
      }
    }

    setCurrentView('list');
    setEditingEntry(null);
  };

  // Delete entry
  const handleDeleteEntry = async (id: string) => {
    const updatedDecrypted = decryptedEntries.filter(e => e.id !== id);
    setDecryptedEntries(updatedDecrypted);

    const updatedEncrypted = encryptedEntries.filter(e => e.id !== id);
    setEncryptedEntries(updatedEncrypted);
    saveStoredEncryptedEntries(updatedEncrypted);

    if (user) {
      try {
        const docRef = doc(db, 'users', user.uid, 'journal_entries', id);
        await deleteDoc(docRef);
      } catch (err) {
        console.error('Failed to delete from Firestore:', err);
      }
    }

    if (currentView === 'editor') {
      setCurrentView('list');
      setEditingEntry(null);
    }
  };

  // Toggle favorite
  const handleToggleFavorite = async (id: string) => {
    const target = decryptedEntries.find((e) => e.id === id);
    if (!target) return;

    const updated = { ...target, isFavorite: !target.isFavorite, updatedAt: Date.now() };
    await handleSaveEntry(updated);
  };

  // Import JSON backup
  const handleImportEntries = async (imported: JournalEntry[]) => {
    if (!encryptionKey) return;
    const reEncrypted: EncryptedJournalEntry[] = [];
    for (const item of imported) {
      const enc = await encryptJournalEntry(item, encryptionKey);
      reEncrypted.push(enc);
    }
    setDecryptedEntries(imported);
    setEncryptedEntries(reEncrypted);
    saveStoredEncryptedEntries(reEncrypted);
  };

  const isUnlocked = encryptionKey !== null;

  return (
    <div className="diary-app-root">
      {!vaultConfig && (
        <LockSetupModal
          isOpen={true}
          onCompleteSetup={handleCompleteSetup}
        />
      )}

      {vaultConfig && !isUnlocked && (
        <LockScreen
          vaultConfig={vaultConfig}
          onUnlockSuccess={handleUnlockSuccess}
        />
      )}

      <Header
        currentView={currentView}
        onNavigate={(view) => {
          setCurrentView(view);
          if (view !== 'editor') setEditingEntry(null);
        }}
        onNewEntry={() => handleNewEntry()}
        currentStreak={currentStreak}
        user={user}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
        onOpenBackup={() => setIsBackupOpen(true)}
        isUnlocked={isUnlocked}
        onLockNow={handleLockNow}
      />

      <main className="diary-app-body">
        {currentView === 'list' && (
          <EntryList
            entries={decryptedEntries}
            onEdit={handleEditEntry}
            onDelete={handleDeleteEntry}
            onToggleFavorite={handleToggleFavorite}
            onNewEntry={() => handleNewEntry()}
            filter={filter}
            onFilterChange={setFilter}
          />
        )}

        {currentView === 'calendar' && (
          <CalendarView
            entries={decryptedEntries}
            onSelectDate={(dateIso) => handleNewEntry(dateIso)}
            onEditEntry={handleEditEntry}
          />
        )}

        {currentView === 'editor' && (
          <EntryEditor
            entry={editingEntry}
            initialDateIso={editorInitialDate}
            onSave={handleSaveEntry}
            onCancel={() => {
              setCurrentView('list');
              setEditingEntry(null);
            }}
            onDelete={handleDeleteEntry}
          />
        )}
      </main>

      <BackupModal
        isOpen={isBackupOpen}
        onClose={() => setIsBackupOpen(false)}
        entries={decryptedEntries}
        onImportEntries={handleImportEntries}
      />
    </div>
  );
}

export default App;
