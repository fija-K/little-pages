import React, { useState, useEffect } from 'react';
import type { JournalEntry, FilterState } from './types/journal';
import {
  getLocalEntries,
  saveLocalEntries,
  saveLocalEntry,
  deleteLocalEntry
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

export function App() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
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

  useEffect(() => {
    const initial = getLocalEntries();
    setEntries(initial);
  }, []);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        const userEntriesRef = collection(db, 'users', currentUser.uid, 'journal_entries');
        const q = query(userEntriesRef);

        const unsubscribeSnapshot = onSnapshot(
          q,
          (snapshot) => {
            const remoteEntries: JournalEntry[] = [];
            snapshot.forEach((docSnap) => {
              remoteEntries.push(docSnap.data() as JournalEntry);
            });

            if (remoteEntries.length > 0) {
              setEntries(remoteEntries);
              saveLocalEntries(remoteEntries);
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
  }, []);

  const { currentStreak } = calculateStreak(entries);

  const handleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error('Sign-in error:', err);
      alert('Sign-in cancelled or failed.');
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setUser(null);
    } catch (err) {
      console.error('Sign-out error:', err);
    }
  };

  const handleNewEntry = (dateIso?: string) => {
    setEditingEntry(null);
    setEditorInitialDate(dateIso);
    setCurrentView('editor');
  };

  const handleEditEntry = (entry: JournalEntry) => {
    setEditingEntry(entry);
    setCurrentView('editor');
  };

  const handleSaveEntry = async (savedEntry: JournalEntry) => {
    const updatedLocal = saveLocalEntry(savedEntry);
    setEntries(updatedLocal);

    if (user) {
      try {
        const docRef = doc(db, 'users', user.uid, 'journal_entries', savedEntry.id);
        await setDoc(docRef, savedEntry, { merge: true });
      } catch (err) {
        console.error('Failed to sync entry to Firestore:', err);
      }
    }

    setCurrentView('list');
    setEditingEntry(null);
  };

  const handleDeleteEntry = async (id: string) => {
    const updatedLocal = deleteLocalEntry(id);
    setEntries(updatedLocal);

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

  const handleToggleFavorite = async (id: string) => {
    const target = entries.find((e) => e.id === id);
    if (!target) return;

    const updated = { ...target, isFavorite: !target.isFavorite, updatedAt: Date.now() };
    await handleSaveEntry(updated);
  };

  const handleImportEntries = (imported: JournalEntry[]) => {
    setEntries(imported);
    saveLocalEntries(imported);
  };

  return (
    <div className="diary-app-root">
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
        onOpenBackup={() => setIsBackupOpen(false)}
      />

      <main className="diary-app-body">
        {currentView === 'list' && (
          <EntryList
            entries={entries}
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
            entries={entries}
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
        entries={entries}
        onImportEntries={handleImportEntries}
      />
    </div>
  );
}

export default App;
