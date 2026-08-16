import React from 'react';

interface StreakBadgeProps {
  currentStreak: number;
}

export const StreakBadge: React.FC<StreakBadgeProps> = ({ currentStreak }) => {
  if (currentStreak <= 0) return null;

  return (
    <div 
      className="streak-badge"
      title={`Keep your writing rhythm going! Best streak: ${currentStreak} days`}
    >
      <span className="streak-icon">🌱</span>
      <span className="streak-text">
        You've written {currentStreak} {currentStreak === 1 ? 'day' : 'days'} in a row!
      </span>
    </div>
  );
};
