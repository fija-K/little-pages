import React from 'react';
import { Search, X, RotateCcw } from 'lucide-react';
import { MOODS } from '../types/journal';
import type { FilterState, MoodType, GoalType } from '../types/journal';

interface SearchFilterProps {
  filter: FilterState;
  onFilterChange: (newFilter: FilterState) => void;
  availableTags: string[];
  activeGoalsPanel?: GoalType | null;
  onOpenGoals: (type: GoalType) => void;
}

export const SearchFilter: React.FC<SearchFilterProps> = ({
  filter,
  onFilterChange,
  availableTags,
  activeGoalsPanel,
  onOpenGoals
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
    <div className="search-filter-card" data-pet-avoid="true">
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
        {/* Mood Row */}
        <div className="filter-row-container">
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
        </div>

        {/* Tag Row */}
        <div className="filter-row-container mt-2">
          <div className="filter-group">
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
        </div>

        {/* Dedicated Goals Row */}
        <div className="goals-quick-row">
          <button
            type="button"
            className={`filter-pill goal-pill-btn ${activeGoalsPanel === 'short-term' ? 'active' : ''}`}
            onClick={() => onOpenGoals('short-term')}
            title="Open short-term goals"
          >
            🌱 Short-term goals
          </button>
          <button
            type="button"
            className={`filter-pill goal-pill-btn ${activeGoalsPanel === 'long-term' ? 'active' : ''}`}
            onClick={() => onOpenGoals('long-term')}
            title="Open long-term goals"
          >
            🌳 Long-term goals
          </button>
        </div>
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
