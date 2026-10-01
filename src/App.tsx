import { useState, useEffect, useCallback, useRef } from 'react';
import type { JournalEntry, EncryptedJournalEntry, FilterState, GoalItem, EncryptedGoalItem, GoalType } from './types/journal';
import type { VaultSecurityConfig } from './utils/crypto';
import {
  getVaultConfig,
  saveVaultConfig,
  getStoredEncryptedEntries,
  saveStoredEncryptedEntries,
  getStoredEncryptedGoals,
  saveStoredEncryptedGoals,
  encryptJournalEntry,
  decryptJournalEntry,
  encryptGoalItem,
  decryptGoalItem
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
import { GoalsModal } from './components/GoalsModal';

const IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes idle timeout

export function App() {
  const [vaultConfig, setVaultConfig] = useState<VaultSecurityConfig | null>(() => getVaultConfig());
  const [encryptionKey, setEncryptionKey] = useState<CryptoKey | null>(null);
  
  // Entries state
  const [decryptedEntries, setDecryptedEntries] = useState<JournalEntry[]>([]);
  const [encryptedEntries, setEncryptedEntries] = useState<EncryptedJournalEntry[]>([]);

  // Goals state
  const [decryptedGoals, setDecryptedGoals] = useState<GoalItem[]>([]);
  const [encryptedGoals, setEncryptedGoals] = useState<EncryptedGoalItem[]>([]);
  const [activeGoalsPanel, setActiveGoalsPanel] = useState<GoalType | null>(null);

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

  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear legacy sample entries on initial mount
  useEffect(() => {
    const stored = getStoredEncryptedEntries();
    const cleaned = stored.filter(e => !e.id.startsWith('sample-entry-'));
    if (stored.length !== cleaned.length) {
      saveStoredEncryptedEntries(cleaned);
      setEncryptedEntries(cleaned);
    }
  }, []);

  // Manual Lock action
  const handleLockNow = useCallback(() => {
    setEncryptionKey(null);
    setDecryptedEntries([]);
    setDecryptedGoals([]);
    setEditingEntry(null);
    setActiveGoalsPanel(null);
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
      if (encryptedItem.id.startsWith('sample-entry-')) continue;
      try {
        const decrypted = await decryptJournalEntry(encryptedItem, key);
        decryptedList.push(decrypted);
      } catch (err) {
        console.error('Failed to decrypt entry:', err);
      }
    }
    setDecryptedEntries(decryptedList);
  }, []);

  // Decrypt encrypted goals when key is unlocked
  const loadAndDecryptGoals = useCallback(async (key: CryptoKey, storedList: EncryptedGoalItem[]) => {
    const decryptedList: GoalItem[] = [];
    for (const encryptedItem of storedList) {
      try {
        const decrypted = await decryptGoalItem(encryptedItem, key);
        decryptedList.push(decrypted);
      } catch (err) {
        console.error('Failed to decrypt goal:', err);
      }
    }
    setDecryptedGoals(decryptedList);
  }, []);

  // Unlock callback
  const handleUnlockSuccess = async (key: CryptoKey) => {
    setEncryptionKey(key);
    const storedEntries = getStoredEncryptedEntries();
    const storedGoals = getStoredEncryptedGoals();
    setEncryptedEntries(storedEntries);
    setEncryptedGoals(storedGoals);
    await loadAndDecryptEntries(key, storedEntries);
    await loadAndDecryptGoals(key, storedGoals);
  };

  // Complete initial vault setup callback
  const handleCompleteSetup = async (config: VaultSecurityConfig, key: CryptoKey) => {
    saveVaultConfig(config);
    setVaultConfig(config);
    setEncryptionKey(key);

    if (user) {
      try {
        const configDocRef = doc(db, 'users', user.uid, 'vault_config', 'config');
        await setDoc(configDocRef, config, { merge: true });
      } catch (err) {
        console.warn('Vault config Cloud sync requires Firestore rules update:', err);
      }
    }

    setEncryptedEntries([]);
    setDecryptedEntries([]);
    setEncryptedGoals([]);
    setDecryptedGoals([]);
    saveStoredEncryptedEntries([]);
    saveStoredEncryptedGoals([]);
  };

  // Firebase Auth listener & cross-device Firestore sync
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        // 1. Sync Vault Config from Firestore
        const configDocRef = doc(db, 'users', currentUser.uid, 'vault_config', 'config');
        const unsubscribeConfig = onSnapshot(
          configDocRef,
          (docSnap) => {
            if (docSnap.exists()) {
              const remoteConfig = docSnap.data() as VaultSecurityConfig;
              setVaultConfig(remoteConfig);
              saveVaultConfig(remoteConfig);
            } else {
              const localConfig = getVaultConfig();
              if (localConfig) {
                setDoc(configDocRef, localConfig, { merge: true }).catch(() => {});
              }
            }
          },
          (err) => {
            console.warn('Firestore vault_config sync info:', err.message);
          }
        );

        // 2. Sync Encrypted Journal Entries from Firestore across devices
        const userEntriesRef = collection(db, 'users', currentUser.uid, 'journal_entries');
        const qEntries = query(userEntriesRef);

        const unsubscribeEntries = onSnapshot(
          qEntries,
          async (snapshot) => {
            const remoteEncrypted: EncryptedJournalEntry[] = [];
            snapshot.forEach((docSnap) => {
              const data = docSnap.data() as EncryptedJournalEntry;
              if (!data.id.startsWith('sample-entry-')) {
                remoteEncrypted.push(data);
              }
            });

            if (remoteEncrypted.length > 0) {
              setEncryptedEntries(remoteEncrypted);
              saveStoredEncryptedEntries(remoteEncrypted);

              if (encryptionKey) {
                await loadAndDecryptEntries(encryptionKey, remoteEncrypted);
              }
            }
          },
          (err) => {
            console.warn('Firestore journal_entries sync info:', err.message);
          }
        );

        // 3. Sync Encrypted Goals from Firestore across devices
        const userGoalsRef = collection(db, 'users', currentUser.uid, 'goals');
        const qGoals = query(userGoalsRef);

        const unsubscribeGoals = onSnapshot(
          qGoals,
          async (snapshot) => {
            const remoteEncryptedGoals: EncryptedGoalItem[] = [];
            snapshot.forEach((docSnap) => {
              remoteEncryptedGoals.push(docSnap.data() as EncryptedGoalItem);
            });

            if (remoteEncryptedGoals.length > 0) {
              setEncryptedGoals(remoteEncryptedGoals);
              saveStoredEncryptedGoals(remoteEncryptedGoals);

              if (encryptionKey) {
                await loadAndDecryptGoals(encryptionKey, remoteEncryptedGoals);
              }
            }
          },
          (err) => {
            console.warn('Firestore goals sync info:', err.message);
          }
        );

        return () => {
          unsubscribeConfig();
          unsubscribeEntries();
          unsubscribeGoals();
        };
      }
    });

    return () => unsubscribeAuth();
  }, [encryptionKey, loadAndDecryptEntries, loadAndDecryptGoals]);

  const { currentStreak } = calculateStreak(decryptedEntries);

  // Google Sign-In
  const handleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: unknown) {
      const authError = err as { code?: string; message?: string };
      console.error('Sign-in error:', authError);

      if (authError?.code === 'auth/unauthorized-domain') {
        const currentHost = window.location.hostname;
        alert(
          `Firebase Authorization Action Required:\n\nTo allow Google sign-in on "${currentHost}", please add it to Authorized Domains in Firebase Console:\n\n1. Go to Firebase Console\n2. Navigate to Authentication -> Settings -> Authorized domains\n3. Click "Add domain" and enter "${currentHost}"`
        );
      } else {
        alert(`Sign-in status: ${authError?.message || 'Sign-in cancelled'}`);
      }
    }
  };

  // Sign-Out
  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setUser(null);
      handleLockNow();
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

  // Save entry (Encrypt plaintext before storing & syncing to Firestore!)
  const handleSaveEntry = async (savedPlaintext: JournalEntry) => {
    if (!encryptionKey) {
      alert('Vault is locked. Please unlock to save entries.');
      return;
    }

    const encryptedPayload = await encryptJournalEntry(savedPlaintext, encryptionKey);

    const updatedDecryptedIndex = decryptedEntries.findIndex(e => e.id === savedPlaintext.id);
    let updatedDecrypted: JournalEntry[];
    if (updatedDecryptedIndex >= 0) {
      updatedDecrypted = [...decryptedEntries];
      updatedDecrypted[updatedDecryptedIndex] = savedPlaintext;
    } else {
      updatedDecrypted = [savedPlaintext, ...decryptedEntries];
    }
    setDecryptedEntries(updatedDecrypted);

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

    if (user) {
      try {
        const docRef = doc(db, 'users', user.uid, 'journal_entries', encryptedPayload.id);
        await setDoc(docRef, encryptedPayload, { merge: true });

        if (vaultConfig) {
          const configDocRef = doc(db, 'users', user.uid, 'vault_config', 'config');
          await setDoc(configDocRef, vaultConfig, { merge: true });
        }
      } catch (err: unknown) {
        console.warn('Failed to sync encrypted entry to Firestore:', err);
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
        console.warn('Firestore delete note: Saved locally.', err);
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

  // Goal handlers
  const handleAddGoal = async (text: string, type: GoalType, deadline?: string) => {
    if (!encryptionKey) return;
    const newGoal: GoalItem = {
      id: `goal-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      text,
      type,
      completed: false,
      deadline,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const encrypted = await encryptGoalItem(newGoal, encryptionKey);
    const updatedDecrypted = [newGoal, ...decryptedGoals];
    const updatedEncrypted = [encrypted, ...encryptedGoals];

    setDecryptedGoals(updatedDecrypted);
    setEncryptedGoals(updatedEncrypted);
    saveStoredEncryptedGoals(updatedEncrypted);

    if (user) {
      try {
        const docRef = doc(db, 'users', user.uid, 'goals', encrypted.id);
        await setDoc(docRef, encrypted, { merge: true });
      } catch (err) {
        console.warn('Failed to sync goal to Firestore:', err);
      }
    }
  };

  const handleToggleGoal = async (id: string) => {
    if (!encryptionKey) return;
    const target = decryptedGoals.find((g) => g.id === id);
    if (!target) return;

    const updatedGoal: GoalItem = {
      ...target,
      completed: !target.completed,
      updatedAt: Date.now()
    };

    const encrypted = await encryptGoalItem(updatedGoal, encryptionKey);
    const updatedDecrypted = decryptedGoals.map((g) => (g.id === id ? updatedGoal : g));
    const updatedEncrypted = encryptedGoals.map((g) => (g.id === id ? encrypted : g));

    setDecryptedGoals(updatedDecrypted);
    setEncryptedGoals(updatedEncrypted);
    saveStoredEncryptedGoals(updatedEncrypted);

    if (user) {
      try {
        const docRef = doc(db, 'users', user.uid, 'goals', encrypted.id);
        await setDoc(docRef, encrypted, { merge: true });
      } catch (err) {
        console.warn('Failed to sync updated goal to Firestore:', err);
      }
    }
  };

  const handleEditGoal = async (id: string, newText: string, newDeadline?: string) => {
    if (!encryptionKey) return;
    const target = decryptedGoals.find((g) => g.id === id);
    if (!target) return;

    const updatedGoal: GoalItem = {
      ...target,
      text: newText,
      deadline: newDeadline,
      updatedAt: Date.now()
    };

    const encrypted = await encryptGoalItem(updatedGoal, encryptionKey);
    const updatedDecrypted = decryptedGoals.map((g) => (g.id === id ? updatedGoal : g));
    const updatedEncrypted = encryptedGoals.map((g) => (g.id === id ? encrypted : g));

    setDecryptedGoals(updatedDecrypted);
    setEncryptedGoals(updatedEncrypted);
    saveStoredEncryptedGoals(updatedEncrypted);

    if (user) {
      try {
        const docRef = doc(db, 'users', user.uid, 'goals', encrypted.id);
        await setDoc(docRef, encrypted, { merge: true });
      } catch (err) {
        console.warn('Failed to sync edited goal to Firestore:', err);
      }
    }
  };

  const handleDeleteGoal = async (id: string) => {
    const updatedDecrypted = decryptedGoals.filter((g) => g.id !== id);
    const updatedEncrypted = encryptedGoals.filter((g) => g.id !== id);

    setDecryptedGoals(updatedDecrypted);
    setEncryptedGoals(updatedEncrypted);
    saveStoredEncryptedGoals(updatedEncrypted);

    if (user) {
      try {
        const docRef = doc(db, 'users', user.uid, 'goals', id);
        await deleteDoc(docRef);
      } catch (err) {
        console.warn('Failed to delete goal from Firestore:', err);
      }
    }
  };

  // Toggle goals panel modal
  const handleOpenGoals = (type: GoalType) => {
    if (activeGoalsPanel === type) {
      setActiveGoalsPanel(null);
    } else {
      setActiveGoalsPanel(type);
    }
  };

  // Import JSON backup (entries + goals)
  const handleImportBackup = async (importedEntries: JournalEntry[], importedGoals: GoalItem[]) => {
    if (!encryptionKey) return;

    const reEncryptedEntries: EncryptedJournalEntry[] = [];
    for (const item of importedEntries) {
      const enc = await encryptJournalEntry(item, encryptionKey);
      reEncryptedEntries.push(enc);
    }

    const reEncryptedGoals: EncryptedGoalItem[] = [];
    for (const goal of importedGoals) {
      const enc = await encryptGoalItem(goal, encryptionKey);
      reEncryptedGoals.push(enc);
    }

    setDecryptedEntries(importedEntries);
    setEncryptedEntries(reEncryptedEntries);
    saveStoredEncryptedEntries(reEncryptedEntries);

    setDecryptedGoals(importedGoals);
    setEncryptedGoals(reEncryptedGoals);
    saveStoredEncryptedGoals(reEncryptedGoals);
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
            activeGoalsPanel={activeGoalsPanel}
            onOpenGoals={handleOpenGoals}
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
        goals={decryptedGoals}
        onImportBackup={handleImportBackup}
      />

      {activeGoalsPanel && (
        <GoalsModal
          isOpen={!!activeGoalsPanel}
          onClose={() => setActiveGoalsPanel(null)}
          type={activeGoalsPanel}
          goals={decryptedGoals}
          onAddGoal={handleAddGoal}
          onToggleGoal={handleToggleGoal}
          onEditGoal={handleEditGoal}
          onDeleteGoal={handleDeleteGoal}
        />
      )}
    </div>
  );
}

export default App;
