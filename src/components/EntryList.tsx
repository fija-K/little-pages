import React, { useMemo } from 'react';
import { PenTool, Sparkles, Feather } from 'lucide-react';
import type { JournalEntry, FilterState } from '../types/journal';
import { EntryCard } from './EntryCard';
import { SearchFilter } from './SearchFilter';

interface EntryListProps {
  entries: JournalEntry[];
  onEdit: (entry: JournalEntry) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onNewEntry: () => void;
  filter: FilterState;
  onFilterChange: (newFilter: FilterState) => void;
}

export const EntryList: React.FC<EntryListProps> = ({
  entries,
  onEdit,
  onDelete,
  onToggleFavorite,
  onNewEntry,
  filter,
  onFilterChange
}) => {
  const availableTags = useMemo(() => {
    const set = new Set<string>();
    entries.forEach((e) => e.tags?.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [entries]);

  const filteredEntries = useMemo(() => {
    return entries
      .filter((e) => {
        if (filter.selectedMood !== 'all' && e.mood !== filter.selectedMood) {
          return false;
        }
        if (filter.selectedTag !== 'all' && (!e.tags || !e.tags.includes(filter.selectedTag))) {
          return false;
        }
        if (filter.searchQuery.trim()) {
          const q = filter.searchQuery.toLowerCase();
          const titleMatch = e.title?.toLowerCase().includes(q);
          const contentMatch = e.content?.toLowerCase().includes(q);
          const dateMatch = e.date?.includes(q);
          const tagMatch = e.tags?.some((t) => t.toLowerCase().includes(q));
          if (!titleMatch && !contentMatch && !dateMatch && !tagMatch) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        if (filter.sortBy === 'newest') {
          return b.date.localeCompare(a.date) || b.createdAt - a.createdAt;
        }
        return a.date.localeCompare(b.date) || a.createdAt - b.createdAt;
      });
  }, [entries, filter]);

  return (
    <div className="entry-list-container">
      <SearchFilter
        filter={filter}
        onFilterChange={onFilterChange}
        availableTags={availableTags}
      />

      {filteredEntries.length === 0 ? (
        <div className="empty-state-card">
          <div className="doodle-graphic">
            <Feather className="w-12 h-12 text-pink-400 stroke-1 animate-pulse" />
            <Sparkles className="w-6 h-6 text-amber-300 absolute -top-2 -right-2" />
          </div>
          <h2 className="empty-title">Your pages are waiting~</h2>
          <p className="empty-subtitle">
            {entries.length === 0
              ? 'Start writing your first thoughts, cozy moments, or daily highlights.'
              : 'No journal pages match your search filters.'}
          </p>
          <button
            type="button"
            className="empty-write-btn"
            onClick={onNewEntry}
          >
            <PenTool className="w-4 h-4" />
            <span>Open a new page</span>
          </button>
        </div>
      ) : (
        <div className="entries-grid">
          {filteredEntries.map((entry) => (
            <EntryCard
              key={entry.id}
              entry={entry}
              onEdit={onEdit}
              onDelete={onDelete}
              onToggleFavorite={onToggleFavorite}
            />
          ))}
        </div>
      )}
    </div>
  );
};
