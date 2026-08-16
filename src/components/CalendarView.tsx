import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { MOODS, PAGE_COLORS } from '../types/journal';
import type { JournalEntry } from '../types/journal';
import { getMonthDaysGrid, formatShortDate, getTodayIsoString } from '../utils/dateUtils';

interface CalendarViewProps {
  entries: JournalEntry[];
  onSelectDate: (dateIso: string) => void;
  onEditEntry: (entry: JournalEntry) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  entries,
  onSelectDate,
  onEditEntry
}) => {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [hoveredEntry, setHoveredEntry] = useState<JournalEntry | null>(null);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const todayIso = getTodayIsoString();

  const entriesByDate = React.useMemo(() => {
    const map = new Map<string, JournalEntry>();
    entries.forEach((e) => {
      if (!map.has(e.date) || e.updatedAt > map.get(e.date)!.updatedAt) {
        map.set(e.date, e);
      }
    });
    return map;
  }, [entries]);

  const daysGrid = getMonthDaysGrid(currentYear, currentMonth);

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleToday = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
  };

  return (
    <div className="calendar-view-card">
      <div className="calendar-header-bar">
        <div className="month-title-group">
          <h2 className="calendar-month-name">
            {monthNames[currentMonth]} {currentYear}
          </h2>
          <button
            type="button"
            className="calendar-today-btn"
            onClick={handleToday}
          >
            Today
          </button>
        </div>

        <div className="calendar-nav-buttons">
          <button
            type="button"
            className="calendar-nav-btn"
            onClick={handlePrevMonth}
            title="Previous month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            className="calendar-nav-btn"
            onClick={handleNextMonth}
            title="Next month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="calendar-weekdays-row">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="weekday-header">
            {day}
          </div>
        ))}
      </div>

      <div className="calendar-days-grid">
        {daysGrid.map(({ day, dateIso, isCurrentMonth }, idx) => {
          const entry = entriesByDate.get(dateIso);
          const isToday = dateIso === todayIso;
          const moodConfig = entry ? MOODS[entry.mood] : null;
          const pageColorCfg = entry ? PAGE_COLORS[entry.pageColor] : null;

          return (
            <div
              key={`${dateIso}-${idx}`}
              className={`calendar-day-cell ${!isCurrentMonth ? 'other-month' : ''} ${
                isToday ? 'today-cell' : ''
              } ${entry ? 'has-entry' : ''}`}
              style={
                pageColorCfg && isCurrentMonth
                  ? ({ '--cell-bg': pageColorCfg.bg, '--cell-border': pageColorCfg.border } as React.CSSProperties)
                  : {}
              }
              onClick={() => {
                if (entry) {
                  onEditEntry(entry);
                } else {
                  onSelectDate(dateIso);
                }
              }}
              onMouseEnter={() => entry && setHoveredEntry(entry)}
              onMouseLeave={() => setHoveredEntry(null)}
            >
              <div className="day-number-row">
                <span className="day-number">{day}</span>
                {isToday && <span className="today-badge-dot">●</span>}
              </div>

              {entry && moodConfig && (
                <div
                  className="calendar-mood-dot"
                  style={{
                    backgroundColor: moodConfig.bgColor,
                    borderColor: moodConfig.borderColor,
                    color: moodConfig.color
                  }}
                  title={`${entry.title} (${moodConfig.label})`}
                >
                  <span className="calendar-mood-emoji">{moodConfig.emoji}</span>
                  <span className="calendar-mood-label-short hidden sm:inline">
                    {moodConfig.label}
                  </span>
                </div>
              )}

              {!entry && isCurrentMonth && (
                <div className="add-entry-hover-icon">
                  <Plus className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {hoveredEntry && (
        <div className="calendar-preview-popover">
          <div className="popover-header">
            <span className="popover-date">{formatShortDate(hoveredEntry.date)}</span>
            <span className="popover-mood">
              {MOODS[hoveredEntry.mood]?.emoji} {MOODS[hoveredEntry.mood]?.label}
            </span>
          </div>
          <h4 className="popover-title">{hoveredEntry.title || 'Untitled Page'}</h4>
          <p className="popover-snippet">
            {hoveredEntry.content.slice(0, 100)}...
          </p>
        </div>
      )}

      <div className="calendar-legend">
        <span className="legend-title">Mood Key:</span>
        <div className="legend-items">
          {Object.values(MOODS).map((m) => (
            <div key={m.id} className="legend-item">
              <span className="legend-dot" style={{ backgroundColor: m.borderColor }} />
              <span className="legend-emoji">{m.emoji}</span>
              <span className="legend-label">{m.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
