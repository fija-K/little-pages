import React from 'react';
import { Search, X, RotateCcw } from 'lucide-react';
import { MOODS } from '../types/journal';
import type { FilterState, MoodType } from '../types/journal';

interface SearchFilterProps {
  filter: FilterState;
  onFilterChange: (newFilter: FilterState) => void;
  availableTags: string[];
}

export const SearchFilter: React.FC<SearchFilterProps> = ({
  filter,
  onFilterChange,
  availableTags
}) => {
  const moodKeys = Object.keys(MOODS) as MoodType[];

  const isFiltered =
    filter.searchQuery.trim() !== '' ||
    filter.selectedMood !== 'all' ||
    filter.selectedTag !== 'all';

  const handleClear = () => {
    onFilterChange({
      searchQuery: '',
      selectedMood: 'all',
      selectedTag: 'all',
      sortBy: 'newest'
    });
  };

  return (
    <div className="search-filter-card">
      <div className="search-input-wrapper">
        <Search className="w-4 h-4 search-icon" />
        <input
          type="text"
          className="search-text-input"
          placeholder="Search entry titles, thoughts, or dates..."
          value={filter.searchQuery}
          onChange={(e) =>
            onFilterChange({ ...filter, searchQuery: e.target.value })
          }
        />
        {filter.searchQuery && (
          <button
            type="button"
            className="clear-search-btn"
            onClick={() => onFilterChange({ ...filter, searchQuery: '' })}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="filter-chips-row">
        <div className="filter-group">
          <span className="filter-group-label">Mood:</span>
          <div className="filter-pills-scroll">
            <button
              type="button"
              className={`filter-pill ${filter.selectedMood === 'all' ? 'active' : ''}`}
              onClick={() => onFilterChange({ ...filter, selectedMood: 'all' })}
            >
              All Moods
            </button>
            {moodKeys.map((moodKey) => {
              const cfg = MOODS[moodKey];
              return (
                <button
                  key={moodKey}
                  type="button"
                  className={`filter-pill ${filter.selectedMood === moodKey ? 'active' : ''}`}
                  onClick={() => onFilterChange({ ...filter, selectedMood: moodKey })}
                >
                  <span>{cfg.emoji}</span>
                  <span>{cfg.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {availableTags.length > 0 && (
          <div className="filter-group mt-2">
            <span className="filter-group-label">Tag:</span>
            <div className="filter-pills-scroll">
              <button
                type="button"
                className={`filter-pill ${filter.selectedTag === 'all' ? 'active' : ''}`}
                onClick={() => onFilterChange({ ...filter, selectedTag: 'all' })}
              >
                All Tags
              </button>
              {availableTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className={`filter-pill ${filter.selectedTag === tag ? 'active' : ''}`}
                  onClick={() => onFilterChange({ ...filter, selectedTag: tag })}
                >
                  #{tag}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {isFiltered && (
        <div className="reset-filter-row">
          <span className="filtering-active-text">Filter active</span>
          <button
            type="button"
            className="reset-filter-btn"
            onClick={handleClear}
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset filters</span>
          </button>
        </div>
      )}
    </div>
  );
};
