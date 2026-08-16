export function getTodayIsoString(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatHandwrittenDate(isoString: string): string {
  if (!isoString) return '';
  const [year, month, day] = isoString.split('-').map(Number);
  const dateObj = new Date(year, month - 1, day);

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayName = days[dateObj.getDay()];
  const monthName = months[dateObj.getMonth()];

  const getOrdinal = (n: number) => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  return `${dayName}, ${monthName} ${getOrdinal(day)}, ${year}`;
}

export function formatShortDate(isoString: string): string {
  if (!isoString) return '';
  const [year, month, day] = isoString.split('-').map(Number);
  const dateObj = new Date(year, month - 1, day);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[dateObj.getMonth()]} ${day}, ${year}`;
}

export function getMonthDaysGrid(year: number, month: number) {
  // month is 0-indexed (0 = Jan)
  const firstDay = new Date(year, month, 1);
  const startingDayOfWeek = firstDay.getDay(); // 0 = Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const grid: ({ day: number; dateIso: string; isCurrentMonth: boolean })[] = [];

  // Previous month padding
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    const prevDay = prevMonthLastDay - i;
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    const dateIso = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(prevDay).padStart(2, '0')}`;
    grid.push({ day: prevDay, dateIso, isCurrentMonth: false });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const dateIso = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    grid.push({ day: d, dateIso, isCurrentMonth: true });
  }

  // Next month padding to fill grid (35 or 42 cells)
  const totalCells = grid.length > 35 ? 42 : 35;
  const remaining = totalCells - grid.length;
  for (let n = 1; n <= remaining; n++) {
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    const dateIso = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(n).padStart(2, '0')}`;
    grid.push({ day: n, dateIso, isCurrentMonth: false });
  }

  return grid;
}
