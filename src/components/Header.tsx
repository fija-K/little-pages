import React from 'react';
import { Calendar, BookOpen, Plus, Cloud, Download, LogIn, LogOut } from 'lucide-react';
import type { User } from '../firebase';
import { StreakBadge } from './StreakBadge';

interface HeaderProps {
  currentView: 'list' | 'calendar' | 'editor';
  onNavigate: (view: 'list' | 'calendar' | 'editor') => void;
  onNewEntry: () => void;
  currentStreak: number;
  user: User | null;
  onSignIn: () => void;
  onSignOut: () => void;
  onOpenBackup: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onNavigate,
  onNewEntry,
  currentStreak,
  user,
  onSignIn,
  onSignOut,
  onOpenBackup
}) => {
  return (
    <header className="diary-header">
      <div className="header-top-bar">
        <div className="title-area">
          <div className="notebook-spine-accent" />
          <div className="diary-logo-group">
            <h1 className="diary-main-title">
              Little Pages <span className="sparkle-doodle">✨</span>
            </h1>
            <p className="diary-subtitle">your cozy handwritten corner~</p>
          </div>
        </div>

        <div className="header-actions-right">
          <StreakBadge currentStreak={currentStreak} />

          <button
            type="button"
            className="backup-btn-pill"
            onClick={onOpenBackup}
            title="Backup & Restore entries as JSON"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Backup</span>
          </button>

          {user ? (
            <div className="user-profile-pill">
              <span className="cloud-indicator" title="Connected to Cloud Firestore">
                <Cloud className="w-3.5 h-3.5 text-emerald-600 inline" />
              </span>
              <img
                src={user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.uid}`}
                alt={user.displayName || 'User'}
                className="user-avatar"
              />
              <span className="user-name hidden md:inline">{user.displayName?.split(' ')[0]}</span>
              <button
                type="button"
                className="logout-btn"
                onClick={onSignOut}
                title="Sign out of Firebase"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="cloud-sync-btn"
              onClick={onSignIn}
              title="Sign in with Google to sync entries with Firebase"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sync Cloud</span>
            </button>
          )}
        </div>
      </div>

      <nav className="header-nav-tabs">
        <button
          type="button"
          className={`nav-tab-btn ${currentView === 'list' ? 'active' : ''}`}
          onClick={() => onNavigate('list')}
        >
          <BookOpen className="w-4 h-4" />
          <span>Journal Pages</span>
        </button>

        <button
          type="button"
          className={`nav-tab-btn ${currentView === 'calendar' ? 'active' : ''}`}
          onClick={() => onNavigate('calendar')}
        >
          <Calendar className="w-4 h-4" />
          <span>Calendar</span>
        </button>

        <button
          type="button"
          className="new-page-cta-btn"
          onClick={onNewEntry}
        >
          <Plus className="w-4 h-4" />
          <span>+ New Page</span>
        </button>
      </nav>
    </header>
  );
};
