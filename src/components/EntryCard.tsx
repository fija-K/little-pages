import React from 'react';
import { Edit3, Trash2, Heart, Calendar as CalendarIcon } from 'lucide-react';
import { MOODS, PAGE_COLORS } from '../types/journal';
import type { JournalEntry } from '../types/journal';
import { formatShortDate } from '../utils/dateUtils';

interface EntryCardProps {
  entry: JournalEntry;
  onEdit: (entry: JournalEntry) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string) => void;
}

export const EntryCard: React.FC<EntryCardProps> = ({
  entry,
  onEdit,
  onDelete,
  onToggleFavorite
}) => {
  const moodCfg = MOODS[entry.mood] || MOODS.happy;
  const pageTheme = PAGE_COLORS[entry.pageColor] || PAGE_COLORS.blush;

  const snippet =
    entry.content.length > 160
      ? entry.content.slice(0, 160).trim() + '...'
      : entry.content;

  return (
    <article
      className="torn-paper-card"
      style={{
        backgroundColor: pageTheme.bg,
        borderColor: pageTheme.border,
        '--card-accent': pageTheme.accent
      } as React.CSSProperties}
    >
      <div className="washi-tape-strip" />

      <div className="card-header">
        <div className="card-date-badge">
          <CalendarIcon className="w-3.5 h-3.5 opacity-70" />
          <span className="card-date-text">{formatShortDate(entry.date)}</span>
        </div>

        <div className="card-mood-sticker" style={{ backgroundColor: moodCfg.bgColor, borderColor: moodCfg.borderColor }}>
          <span className="mood-sticker-emoji">{moodCfg.emoji}</span>
          <span className="mood-sticker-name">{moodCfg.label}</span>
        </div>
      </div>

      <h3 className="card-title">{entry.title || 'Untitled Entry'}</h3>

      <div className="card-ruled-content">
        <p className="card-snippet">{snippet}</p>
      </div>

      {entry.tags && entry.tags.length > 0 && (
        <div className="card-tags-row">
          {entry.tags.map((tag) => (
            <span key={tag} className="card-sticky-tag">
              #{tag}
            </span>
          ))}
        </div>
      )}

      <div className="card-footer">
        <button
          type="button"
          className={`favorite-btn ${entry.isFavorite ? 'active' : ''}`}
          onClick={() => onToggleFavorite(entry.id)}
          title={entry.isFavorite ? 'Favorited' : 'Add to favorites'}
        >
          <Heart className={`w-4 h-4 ${entry.isFavorite ? 'fill-pink-500 text-pink-500' : 'text-stone-400'}`} />
        </button>

        <div className="footer-actions-right">
          <button
            type="button"
            className="action-icon-btn edit-action"
            onClick={() => onEdit(entry)}
            title="Edit page"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit</span>
          </button>

          <button
            type="button"
            className="action-icon-btn delete-action"
            onClick={() => {
              if (window.confirm('Delete this diary entry?')) {
                onDelete(entry.id);
              }
            }}
            title="Delete entry"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </article>
  );
};
