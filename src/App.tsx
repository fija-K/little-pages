import { useState, useEffect, useCallback, useRef } from 'react';
import type { JournalEntry, EncryptedJournalEntry, FilterState, GoalItem, EncryptedGoalItem, GoalSubItem, GoalType } from './types/journal';
import { DEFAULT_PBKDF2_ITERATIONS, upgradeVaultConfigIterations, generateRandomUUID } from './utils/crypto';
import type { VaultSecurityConfig } from './utils/crypto';
import type { ThemeId } from './config/themes';
import {
  getVaultConfig,
  saveVaultConfig,
  clearLocalVaultConfig,
  clearLocalEntries,
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
  signOut,
  deleteUser,
  onAuthStateChanged,
  updateProfile,
  db,
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
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
import type { LegalTabType } from './components/LegalModal';
import { ThemeModal } from './components/ThemeModal';
import { LegalModal } from './components/LegalModal';
import { FooterLinks } from './components/FooterLinks';
import { AuthModal } from './components/AuthModal';
import { PetCompanionLayer } from './components/PetCompanionLayer';
import { DEFAULT_PET_ID } from './config/pets';

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

  // Theme, Background Sticker & Pet Companion States
  const [activeTheme, setActiveTheme] = useState<ThemeId>(() => (localStorage.getItem('little_pages_theme') as ThemeId) || 'strawberry');
  const [bgStickersEnabled, setBgStickersEnabled] = useState<boolean>(() => localStorage.getItem('little_pages_bg_stickers') !== 'false');
  const [petEnabled, setPetEnabled] = useState<boolean>(() => localStorage.getItem('little_pages_pet_enabled') !== 'false');
  const [selectedPetId, setSelectedPetId] = useState<string>(() => localStorage.getItem('little_pages_selected_pet') || DEFAULT_PET_ID);
  
  const [isThemeModalOpen, setIsThemeModalOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isLegalModalOpen, setIsLegalModalOpen] = useState<boolean>(false);
  const [legalModalTab, setLegalModalTab] = useState<LegalTabType>('summary');

  const petTypingHandlerRef = useRef<(() => void) | null>(null);
  const petSaveHandlerRef = useRef<(() => void) | null>(null);
  const insertPromptBodyHandlerRef = useRef<((text: string) => void) | null>(null);

  const handleTogglePetEnabled = useCallback(() => {
    setPetEnabled(prev => {
      const next = !prev;
      localStorage.setItem('little_pages_pet_enabled', String(next));
      return next;
    });
  }, []);

  const handleSelectPetId = useCallback((petId: string) => {
    setSelectedPetId(petId);
    localStorage.setItem('little_pages_selected_pet', petId);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', activeTheme);
    localStorage.setItem('little_pages_theme', activeTheme);
  }, [activeTheme]);

  const handleToggleBgStickers = useCallback(() => {
    setBgStickersEnabled(prev => {
      const next = !prev;
      localStorage.setItem('little_pages_bg_stickers', String(next));
      if (vaultConfig) {
        const updated = { ...vaultConfig, bgStickersEnabled: next };
        setVaultConfig(updated);
        saveVaultConfig(updated);
        if (user) {
          const configDocRef = doc(db, 'users', user.uid, 'vault_config', 'config');
          setDoc(configDocRef, updated, { merge: true }).catch(() => {});
        }
      }
      return next;
    });
  }, [vaultConfig, user]);

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

  // Unlock callback + Automated Metadata Migration + Atomic Iteration Upgrade (250,000 -> 600,000)
  const handleUnlockSuccess = async (unlockedKey: CryptoKey, passphrase?: string) => {
    let keyToUse = unlockedKey;
    const isUUID = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    // 1. Decrypt existing entries & goals with initial unlocked key
    const storedEntries = getStoredEncryptedEntries();
    const storedGoals = getStoredEncryptedGoals();

    const decryptedEntriesList: JournalEntry[] = [];
    for (const encryptedItem of storedEntries) {
      if (encryptedItem.id.startsWith('sample-entry-')) continue;
      try {
        const decrypted = await decryptJournalEntry(encryptedItem, unlockedKey);
        decryptedEntriesList.push(decrypted);
      } catch (err) {
        console.error('Failed to decrypt entry on unlock:', err);
      }
    }

    const decryptedGoalsList: GoalItem[] = [];
    for (const encryptedItem of storedGoals) {
      try {
        const decrypted = await decryptGoalItem(encryptedItem, unlockedKey);
        decryptedGoalsList.push(decrypted);
      } catch (err) {
        console.error('Failed to decrypt goal on unlock:', err);
      }
    }

    // 2. Atomic Vault PBKDF2 Iteration Upgrade (250,000 -> 600,000) with Rollback
    let currentConfig = vaultConfig;
    if (passphrase && currentConfig && (!currentConfig.iterations || currentConfig.iterations < DEFAULT_PBKDF2_ITERATIONS)) {
      const configSnapshot = { ...currentConfig };
      const entriesSnapshot = [...storedEntries];
      const goalsSnapshot = [...storedGoals];

      try {
        const upgradeResult = await upgradeVaultConfigIterations(passphrase, currentConfig);
        if (upgradeResult) {
          const upgradedKey = upgradeResult.key;
          
          // Verify re-encryption of all entries & goals with upgraded key
          const reEncryptedEntries: EncryptedJournalEntry[] = [];
          for (const entry of decryptedEntriesList) {
            const reEnc = await encryptJournalEntry(entry, upgradedKey);
            const verifyDec = await decryptJournalEntry(reEnc, upgradedKey);
            if (!verifyDec) throw new Error(`Re-encryption verification failed for entry ${entry.id}`);
            reEncryptedEntries.push(reEnc);
          }

          const reEncryptedGoals: EncryptedGoalItem[] = [];
          for (const goal of decryptedGoalsList) {
            const reEnc = await encryptGoalItem(goal, upgradedKey);
            const verifyDec = await decryptGoalItem(reEnc, upgradedKey);
            if (!verifyDec) throw new Error(`Re-encryption verification failed for goal ${goal.id}`);
            reEncryptedGoals.push(reEnc);
          }

          // Upgrade succeed - persist atomically
          saveVaultConfig(upgradeResult.config);
          setVaultConfig(upgradeResult.config);
          currentConfig = upgradeResult.config;
          keyToUse = upgradedKey;

          saveStoredEncryptedEntries(reEncryptedEntries);
          saveStoredEncryptedGoals(reEncryptedGoals);

          if (user) {
            const configDocRef = doc(db, 'users', user.uid, 'vault_config', 'config');
            setDoc(configDocRef, upgradeResult.config, { merge: true }).catch(() => {});
          }
        }
      } catch (upgErr) {
        console.error('Vault iteration upgrade failed, rolling back to pre-upgrade state:', upgErr);
        saveVaultConfig(configSnapshot);
        saveStoredEncryptedEntries(entriesSnapshot);
        saveStoredEncryptedGoals(goalsSnapshot);
        keyToUse = unlockedKey;
      }
    }

    setEncryptionKey(keyToUse);

    // 3. Automated Metadata Migration & Random UUID Migration
    const activeStoredEntries = getStoredEncryptedEntries();
    const activeStoredGoals = getStoredEncryptedGoals();

    let entryNeedsMigration = false;
    for (const item of activeStoredEntries) {
      if (!item.encryptedMetadata || !isUUID(item.id) || (item as any).pageColor !== undefined || (item as any).mood !== undefined || (item as any).date !== undefined) {
        entryNeedsMigration = true;
        break;
      }
    }

    let goalNeedsMigration = false;
    for (const item of activeStoredGoals) {
      if (!item.encryptedGoalMeta || !isUUID(item.id) || (item as any).type !== undefined || (item as any).completed !== undefined || (item as any).deadline !== undefined) {
        goalNeedsMigration = true;
        break;
      }
    }

    const finalDecryptedEntries: JournalEntry[] = [];
    const migratedEncryptedEntries: EncryptedJournalEntry[] = [];
    for (let i = 0; i < decryptedEntriesList.length; i++) {
      const entry = decryptedEntriesList[i];
      const oldId = entry.id;
      if (!isUUID(oldId)) {
        entry.id = generateRandomUUID();
        entryNeedsMigration = true;
      }
      finalDecryptedEntries.push(entry);

      const enc = await encryptJournalEntry(entry, keyToUse);
      migratedEncryptedEntries.push(enc);

      if (entryNeedsMigration && user) {
        try {
          if (oldId !== entry.id) {
            await deleteDoc(doc(db, 'users', user.uid, 'journal_entries', oldId));
          }
          await setDoc(doc(db, 'users', user.uid, 'journal_entries', enc.id), enc);
        } catch (e) {}
      }
    }
    setDecryptedEntries(finalDecryptedEntries);
    if (entryNeedsMigration) {
      setEncryptedEntries(migratedEncryptedEntries);
      saveStoredEncryptedEntries(migratedEncryptedEntries);
    } else {
      setEncryptedEntries(activeStoredEntries);
    }

    const finalDecryptedGoals: GoalItem[] = [];
    const migratedEncryptedGoals: EncryptedGoalItem[] = [];
    for (let i = 0; i < decryptedGoalsList.length; i++) {
      const goal = decryptedGoalsList[i];
      const oldId = goal.id;
      if (!isUUID(oldId)) {
        goal.id = generateRandomUUID();
        goalNeedsMigration = true;
      }
      finalDecryptedGoals.push(goal);

      const enc = await encryptGoalItem(goal, keyToUse);
      migratedEncryptedGoals.push(enc);

      if (goalNeedsMigration && user) {
        try {
          if (oldId !== goal.id) {
            await deleteDoc(doc(db, 'users', user.uid, 'goals', oldId));
          }
          await setDoc(doc(db, 'users', user.uid, 'goals', enc.id), enc);
        } catch (e) {}
      }
    }
    setDecryptedGoals(finalDecryptedGoals);
    if (goalNeedsMigration) {
      setEncryptedGoals(migratedEncryptedGoals);
      saveStoredEncryptedGoals(migratedEncryptedGoals);
    } else {
      setEncryptedGoals(activeStoredGoals);
    }
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
        // Clear personal profile metadata from Firebase Auth for privacy minimization
        if (currentUser.displayName || currentUser.photoURL) {
          updateProfile(currentUser, { displayName: '', photoURL: '' }).catch(() => {});
        }

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

  // Save entry
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

    petSaveHandlerRef.current?.();

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
  const handleAddGoal = async (text: string, type: GoalType, deadline?: string, subItems?: GoalSubItem[]) => {
    if (!encryptionKey) return;
    const newGoal: GoalItem = {
      id: `goal-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      text,
      type,
      completed: false,
      deadline,
      subItems,
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

  const handleAddMultipleGoals = async (newGoalsList: { text: string; type: GoalType; deadline?: string; subItems?: GoalSubItem[] }[]) => {
    if (!encryptionKey) return;
    const createdGoals: GoalItem[] = [];
    const createdEncrypted: EncryptedGoalItem[] = [];

    for (const item of newGoalsList) {
      const goal: GoalItem = {
        id: `goal-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        text: item.text,
        type: item.type,
        completed: false,
        deadline: item.deadline,
        subItems: item.subItems,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      const enc = await encryptGoalItem(goal, encryptionKey);
      createdGoals.push(goal);
      createdEncrypted.push(enc);

      if (user) {
        try {
          const docRef = doc(db, 'users', user.uid, 'goals', enc.id);
          await setDoc(docRef, enc, { merge: true });
        } catch (err) {
          console.warn('Failed to sync batch goal to Firestore:', err);
        }
      }
    }

    const updatedDecrypted = [...createdGoals, ...decryptedGoals];
    const updatedEncrypted = [...createdEncrypted, ...encryptedGoals];

    setDecryptedGoals(updatedDecrypted);
    setEncryptedGoals(updatedEncrypted);
    saveStoredEncryptedGoals(updatedEncrypted);
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

  const handleEditGoal = async (id: string, newText: string, newDeadline?: string, subItems?: GoalSubItem[]) => {
    if (!encryptionKey) return;
    const target = decryptedGoals.find((g) => g.id === id);
    if (!target) return;

    const updatedGoal: GoalItem = {
      ...target,
      text: newText,
      deadline: newDeadline,
      subItems: subItems !== undefined ? subItems : target.subItems,
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

  // Delete All Data (Purge local storage, all cloud Firestore collections/user doc, & delete Firebase Auth account)
  const handleDeleteAllData = async () => {
    if (user) {
      try {
        // 1. Delete all journal_entries documents
        const userEntriesRef = collection(db, 'users', user.uid, 'journal_entries');
        const snapshotEntries = await getDocs(query(userEntriesRef));
        for (const docSnap of snapshotEntries.docs) {
          await deleteDoc(doc(db, 'users', user.uid, 'journal_entries', docSnap.id));
        }

        // 2. Delete all goals documents
        const userGoalsRef = collection(db, 'users', user.uid, 'goals');
        const snapshotGoals = await getDocs(query(userGoalsRef));
        for (const docSnap of snapshotGoals.docs) {
          await deleteDoc(doc(db, 'users', user.uid, 'goals', docSnap.id));
        }

        // 3. Delete all vault_config documents
        const userConfigRef = collection(db, 'users', user.uid, 'vault_config');
        const snapshotConfig = await getDocs(query(userConfigRef));
        for (const docSnap of snapshotConfig.docs) {
          await deleteDoc(doc(db, 'users', user.uid, 'vault_config', docSnap.id));
        }

        // 4. Delete the parent user document itself
        await deleteDoc(doc(db, 'users', user.uid));

        // 5. Delete Firebase Auth user account
        await deleteUser(user);
      } catch (err: any) {
        console.warn('Error purging Firestore documents or deleting Auth user:', err);
        if (err?.code === 'auth/requires-recent-login') {
          alert('Deleting your Firebase account requires recent sign-in credentials. Please sign out, sign in again, and retry deleting your account.');
          return;
        }
      }
    }

    clearLocalVaultConfig();
    clearLocalEntries();
    localStorage.clear();
    sessionStorage.clear();

    setVaultConfig(null);
    setEncryptionKey(null);
    setDecryptedEntries([]);
    setEncryptedEntries([]);
    setDecryptedGoals([]);
    setEncryptedGoals([]);
    setEditingEntry(null);
    setActiveGoalsPanel(null);
    setUser(null);

    alert('All your local data and cloud Firestore documents, as well as your cloud account, have been permanently deleted.');
  };

  const isUnlocked = encryptionKey !== null;

  return (
    <div className="diary-app-root">
      <div className={`bg-sticker-overlay ${!bgStickersEnabled ? 'stickers-disabled' : ''}`} />

      {!vaultConfig && (
        <LockSetupModal
          isOpen={true}
          onCompleteSetup={handleCompleteSetup}
          onOpenLegal={(tab) => {
            setLegalModalTab(tab);
            setIsLegalModalOpen(true);
          }}
        />
      )}

      {vaultConfig && !isUnlocked && (
        <LockScreen
          vaultConfig={vaultConfig}
          onUnlockSuccess={handleUnlockSuccess}
          onOpenLegal={(tab) => {
            setLegalModalTab(tab);
            setIsLegalModalOpen(true);
          }}
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
        onSignIn={() => setIsAuthModalOpen(true)}
        onSignOut={handleSignOut}
        onOpenBackup={() => setIsBackupOpen(true)}
        isUnlocked={isUnlocked}
        onLockNow={handleLockNow}
        activeTheme={activeTheme}
        onToggleTheme={() => setActiveTheme(prev => prev === 'strawberry' ? 'chocolate' : 'strawberry')}
        onOpenLegal={(tab) => {
          setLegalModalTab(tab);
          setIsLegalModalOpen(true);
        }}
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
            onTyping={() => petTypingHandlerRef.current?.()}
            onRegisterInsertPromptBody={(handler) => {
              insertPromptBodyHandlerRef.current = handler;
            }}
          />
        )}
      </main>

      <footer className="diary-footer" style={{ textAlign: 'center', padding: '1.5rem 0', marginTop: '2rem' }}>
        <FooterLinks onOpenLegal={(tab) => {
          setLegalModalTab(tab);
          setIsLegalModalOpen(true);
        }} />
      </footer>

      <BackupModal
        isOpen={isBackupOpen}
        onClose={() => setIsBackupOpen(false)}
        entries={decryptedEntries}
        goals={decryptedGoals}
        encryptionKey={encryptionKey}
        onImportBackup={handleImportBackup}
        onDeleteAllData={handleDeleteAllData}
        activeTheme={activeTheme}
        onSelectTheme={(t) => setActiveTheme(t)}
        onOpenLegal={(tab) => {
          setLegalModalTab(tab);
          setIsLegalModalOpen(true);
        }}
      />

      {activeGoalsPanel && (
        <GoalsModal
          isOpen={!!activeGoalsPanel}
          onClose={() => setActiveGoalsPanel(null)}
          type={activeGoalsPanel}
          goals={decryptedGoals}
          onAddGoal={handleAddGoal}
          onAddMultipleGoals={handleAddMultipleGoals}
          onToggleGoal={handleToggleGoal}
          onEditGoal={handleEditGoal}
          onDeleteGoal={handleDeleteGoal}
        />
      )}

      <ThemeModal
        isOpen={isThemeModalOpen}
        onClose={() => setIsThemeModalOpen(false)}
        activeTheme={activeTheme}
        onSelectTheme={(t) => setActiveTheme(t)}
        bgStickersEnabled={bgStickersEnabled}
        onToggleBgStickers={handleToggleBgStickers}
        petEnabled={petEnabled}
        onTogglePetEnabled={handleTogglePetEnabled}
        selectedPetId={selectedPetId}
        onSelectPetId={handleSelectPetId}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onOpenLegal={(tab) => {
          setLegalModalTab(tab);
          setIsLegalModalOpen(true);
        }}
      />

      <LegalModal
        isOpen={isLegalModalOpen}
        onClose={() => setIsLegalModalOpen(false)}
        initialTab={legalModalTab}
      />

      <PetCompanionLayer
        petId={selectedPetId}
        enabled={petEnabled}
        isUnlocked={isUnlocked}
        currentView={currentView}
        isNewEntry={editingEntry === null || (!editingEntry.title && !editingEntry.content)}
        onOpenEditor={() => handleNewEntry()}
        onInsertPromptBody={(text) => insertPromptBodyHandlerRef.current?.(text)}
        onRegisterTypingHandler={(handler) => {
          petTypingHandlerRef.current = handler;
        }}
        onRegisterSaveHandler={(handler) => {
          petSaveHandlerRef.current = handler;
        }}
      />
    </div>
  );
}

export default App;
