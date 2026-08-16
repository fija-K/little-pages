import type { JournalEntry } from '../types/journal';

export function calculateStreak(entries: JournalEntry[]): { currentStreak: number; bestStreak: number } {
  if (!entries || entries.length === 0) {
    return { currentStreak: 0, bestStreak: 0 };
  }

  const dates = Array.from(new Set(entries.map(e => e.date))).sort((a, b) => b.localeCompare(a));
  if (dates.length === 0) return { currentStreak: 0, bestStreak: 0 };

  const today = new Date();
  const todayIso = formatDateIso(today);
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayIso = formatDateIso(yesterday);

  let streak = 0;

  if (dates[0] === todayIso || dates[0] === yesterdayIso) {
    streak = 1;
    let curr = new Date(dates[0]);

    for (let i = 1; i < dates.length; i++) {
      const prevDate = new Date(curr);
      prevDate.setDate(prevDate.getDate() - 1);
      const expectedIso = formatDateIso(prevDate);

      if (dates[i] === expectedIso) {
        streak++;
        curr = prevDate;
      } else {
        break;
      }
    }
  }

  let best = streak;
  let tempStreak = 1;

  for (let i = 0; i < dates.length - 1; i++) {
    const d1 = new Date(dates[i]);
    const d2 = new Date(dates[i + 1]);
    const diffTime = Math.abs(d1.getTime() - d2.getTime());
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      tempStreak++;
    } else {
      tempStreak = 1;
    }
    if (tempStreak > best) {
      best = tempStreak;
    }
  }

  return { currentStreak: streak, bestStreak: Math.max(best, streak) };
}

function formatDateIso(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
