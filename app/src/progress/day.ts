// Day-boundary helpers (SRS-04) — LOCAL CALENDAR dates, never timestamp deltas.
// Store timestamps as UTC ISO; compare local calendar days. Local midnight is
// the v1 rollover policy (Anki-style 4am rollover is a v2 nice-to-have).
import type { ProgressMeta } from './db'

export const localDayKey = (d = new Date()): string => {
  // "YYYY-MM-DD" in device TZ
  const y = d.getFullYear(),
    m = String(d.getMonth() + 1).padStart(2, '0'),
    dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

export const startOfLocalDay = (d = new Date()): Date =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate())

export const startOfLocalWeek = (d = new Date()): Date => {
  // Monday-based week
  const s = startOfLocalDay(d)
  const dow = (s.getDay() + 6) % 7
  s.setDate(s.getDate() - dow)
  return s
}

// Streak: update on any review. If localDayKey(now) === lastActiveDay → no change.
// If it's exactly the next local day → streakCount++. If gap > 1 day → streakCount = 1.
export function bumpStreak(meta: ProgressMeta, now = new Date()): ProgressMeta {
  const today = localDayKey(now)
  if (meta.lastActiveDay === today) return meta
  const yesterday = localDayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1))
  const streakCount = meta.lastActiveDay === yesterday ? meta.streakCount + 1 : 1
  return { ...meta, streakCount, lastActiveDay: today }
}
