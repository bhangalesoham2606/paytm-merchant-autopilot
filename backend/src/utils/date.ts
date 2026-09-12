export function getTimezoneOffsetMinutes(timezone: string = 'Asia/Kolkata'): number {
  if (timezone === 'Asia/Kolkata' || timezone === 'IST') {
    return 330; // UTC +5:30
  }
  // Standard timezone calculation
  try {
    const now = new Date();
    const utcDate = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
    const tzDate = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
    return Math.round((tzDate.getTime() - utcDate.getTime()) / 60000);
  } catch {
    return 330;
  }
}

/**
 * Returns exact UTC Date objects for start and end of day in merchant's timezone.
 */
export function getDayBounds(dateStr: string, timezone = 'Asia/Kolkata'): { start: Date; end: Date; dateFormatted: string } {
  // Extract YYYY-MM-DD
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) {
    throw new Error(`Invalid date format '${dateStr}'. Expected YYYY-MM-DD.`);
  }

  const [_, yearStr, monthStr, dayStr] = match;
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1;
  const day = parseInt(dayStr, 10);

  const offsetMinutes = getTimezoneOffsetMinutes(timezone);
  const offsetMs = offsetMinutes * 60 * 1000;

  // Local midnight represented in UTC
  const localMidnightUtc = Date.UTC(year, month, day, 0, 0, 0, 0);
  const startUtc = new Date(localMidnightUtc - offsetMs);
  const endUtc = new Date(localMidnightUtc + 24 * 60 * 60 * 1000 - 1 - offsetMs);

  const dateFormatted = `${yearStr}-${monthStr}-${dayStr}`;

  return {
    start: startUtc,
    end: endUtc,
    dateFormatted,
  };
}

/**
 * Formats a Date object to YYYY-MM-DD in the specified timezone
 */
export function formatDateInTz(date: Date, timezone = 'Asia/Kolkata'): string {
  const offsetMinutes = getTimezoneOffsetMinutes(timezone);
  const localTime = new Date(date.getTime() + offsetMinutes * 60 * 1000);
  const year = localTime.getUTCFullYear();
  const month = String(localTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(localTime.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export type ComparisonPreset =
  | 'today_vs_yesterday'
  | 'today_vs_same_weekday_last_week'
  | 'this_week_vs_previous_week'
  | 'mtd_vs_previous_mtd';

export interface ComparisonPeriod {
  currentFrom: Date;
  currentTo: Date;
  previousFrom: Date;
  previousTo: Date;
  currentFromFormatted: string;
  currentToFormatted: string;
  previousFromFormatted: string;
  previousToFormatted: string;
}

/**
 * Calculates deterministic comparison date ranges based on standard merchant presets
 */
export function getComparisonWindows(
  referenceDateStr: string,
  preset: ComparisonPreset,
  timezone = 'Asia/Kolkata'
): ComparisonPeriod {
  const { start: refStart, dateFormatted } = getDayBounds(referenceDateStr, timezone);
  const refDate = new Date(refStart);

  // Helper to add days
  const addDays = (d: Date, days: number) => new Date(d.getTime() + days * 24 * 60 * 60 * 1000);

  if (preset === 'today_vs_yesterday') {
    const currentBounds = getDayBounds(dateFormatted, timezone);
    const prevDateFormatted = formatDateInTz(addDays(refDate, -1), timezone);
    const prevBounds = getDayBounds(prevDateFormatted, timezone);

    return {
      currentFrom: currentBounds.start,
      currentTo: currentBounds.end,
      previousFrom: prevBounds.start,
      previousTo: prevBounds.end,
      currentFromFormatted: currentBounds.dateFormatted,
      currentToFormatted: currentBounds.dateFormatted,
      previousFromFormatted: prevBounds.dateFormatted,
      previousToFormatted: prevBounds.dateFormatted,
    };
  }

  if (preset === 'today_vs_same_weekday_last_week') {
    const currentBounds = getDayBounds(dateFormatted, timezone);
    const prevDateFormatted = formatDateInTz(addDays(refDate, -7), timezone);
    const prevBounds = getDayBounds(prevDateFormatted, timezone);

    return {
      currentFrom: currentBounds.start,
      currentTo: currentBounds.end,
      previousFrom: prevBounds.start,
      previousTo: prevBounds.end,
      currentFromFormatted: currentBounds.dateFormatted,
      currentToFormatted: currentBounds.dateFormatted,
      previousFromFormatted: prevBounds.dateFormatted,
      previousToFormatted: prevBounds.dateFormatted,
    };
  }

  if (preset === 'this_week_vs_previous_week') {
    // Current week: 7 days up to reference date
    const curStartFormatted = formatDateInTz(addDays(refDate, -6), timezone);
    const curEndFormatted = dateFormatted;
    const prevStartFormatted = formatDateInTz(addDays(refDate, -13), timezone);
    const prevEndFormatted = formatDateInTz(addDays(refDate, -7), timezone);

    return {
      currentFrom: getDayBounds(curStartFormatted, timezone).start,
      currentTo: getDayBounds(curEndFormatted, timezone).end,
      previousFrom: getDayBounds(prevStartFormatted, timezone).start,
      previousTo: getDayBounds(prevEndFormatted, timezone).end,
      currentFromFormatted: curStartFormatted,
      currentToFormatted: curEndFormatted,
      previousFromFormatted: prevStartFormatted,
      previousToFormatted: prevEndFormatted,
    };
  }

  // MTD vs Previous MTD
  // From 1st of month to reference day, compared to 1st of previous month to same relative day
  const offsetMinutes = getTimezoneOffsetMinutes(timezone);
  const localDate = new Date(refDate.getTime() + offsetMinutes * 60 * 1000);
  const year = localDate.getUTCFullYear();
  const month = localDate.getUTCMonth(); // 0-indexed
  const day = localDate.getUTCDate();

  const curStart = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const curEnd = dateFormatted;

  const prevMonthDate = new Date(Date.UTC(year, month - 1, 1));
  const prevYear = prevMonthDate.getUTCFullYear();
  const prevMonth = prevMonthDate.getUTCMonth();
  const daysInPrevMonth = new Date(Date.UTC(prevYear, prevMonth + 1, 0)).getUTCDate();
  const targetPrevDay = Math.min(day, daysInPrevMonth);

  const prevStart = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-01`;
  const prevEnd = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(targetPrevDay).padStart(2, '0')}`;

  return {
    currentFrom: getDayBounds(curStart, timezone).start,
    currentTo: getDayBounds(curEnd, timezone).end,
    previousFrom: getDayBounds(prevStart, timezone).start,
    previousTo: getDayBounds(prevEnd, timezone).end,
    currentFromFormatted: curStart,
    currentToFormatted: curEnd,
    previousFromFormatted: prevStart,
    previousToFormatted: prevEnd,
  };
}
