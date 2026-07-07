import { describe, expect, it } from 'vitest'
import { bumpStreak, localDayKey, startOfLocalDay, startOfLocalWeek } from './day'
import type { ProgressMeta } from './db'

function meta(overrides: Partial<ProgressMeta> = {}): ProgressMeta {
  return {
    key: 'singleton',
    streakCount: 3,
    lastActiveDay: '2026-04-14',
    points: 42,
    displayMode: 'A',
    romajiVisible: true,
    newCardsToday: 0,
    newCardsDay: '2026-04-14',
    appVersion: 1,
    ...overrides,
  }
}

describe('localDayKey', () => {
  it('returns YYYY-MM-DD from local calendar components', () => {
    expect(localDayKey(new Date(2026, 3, 14, 12, 0, 0))).toBe('2026-04-14')
  })

  it('pads month and day', () => {
    expect(localDayKey(new Date(2026, 0, 5, 8, 0, 0))).toBe('2026-01-05')
  })

  it('is TZ-independent for a fixed local date: late-evening local time never leaks into the next UTC day', () => {
    // 23:59 local. A UTC-based implementation (toISOString) would shift the day
    // whenever the runner TZ is not UTC — local-calendar math never does.
    const lateEvening = new Date(2026, 11, 31, 23, 59, 59)
    expect(localDayKey(lateEvening)).toBe('2026-12-31')
    const earlyMorning = new Date(2026, 0, 1, 0, 0, 1)
    expect(localDayKey(earlyMorning)).toBe('2026-01-01')
  })
})

describe('startOfLocalDay', () => {
  it('truncates to local midnight', () => {
    const d = startOfLocalDay(new Date(2026, 3, 14, 17, 45, 12))
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 3, 14])
    expect([d.getHours(), d.getMinutes(), d.getSeconds()]).toEqual([0, 0, 0])
  })
})

describe('startOfLocalWeek (Monday-based)', () => {
  it('returns the same day for a Monday', () => {
    // 2026-04-13 is a Monday
    const d = startOfLocalWeek(new Date(2026, 3, 13, 15, 0))
    expect(localDayKey(d)).toBe('2026-04-13')
  })

  it('returns the preceding Monday for a Wednesday', () => {
    // 2026-04-15 is a Wednesday
    const d = startOfLocalWeek(new Date(2026, 3, 15, 9, 0))
    expect(localDayKey(d)).toBe('2026-04-13')
  })

  it('returns the preceding Monday for a Sunday (not the same-week Sunday start)', () => {
    // 2026-04-19 is a Sunday
    const d = startOfLocalWeek(new Date(2026, 3, 19, 23, 0))
    expect(localDayKey(d)).toBe('2026-04-13')
  })
})

describe('bumpStreak', () => {
  it('same local day: streak unchanged', () => {
    const m = meta({ lastActiveDay: '2026-04-14', streakCount: 3 })
    const out = bumpStreak(m, new Date(2026, 3, 14, 22, 0))
    expect(out.streakCount).toBe(3)
    expect(out.lastActiveDay).toBe('2026-04-14')
  })

  it('exactly the next local day: streak increments', () => {
    const m = meta({ lastActiveDay: '2026-04-14', streakCount: 3 })
    const out = bumpStreak(m, new Date(2026, 3, 15, 8, 0))
    expect(out.streakCount).toBe(4)
    expect(out.lastActiveDay).toBe('2026-04-15')
  })

  it('crossing local midnight by five minutes counts as the next day', () => {
    const m = meta({ lastActiveDay: '2026-04-14', streakCount: 1 })
    const out = bumpStreak(m, new Date(2026, 3, 15, 0, 5))
    expect(out.streakCount).toBe(2)
    expect(out.lastActiveDay).toBe('2026-04-15')
  })

  it('increments across a month boundary (calendar math, not string math)', () => {
    const m = meta({ lastActiveDay: '2026-04-30', streakCount: 6 })
    const out = bumpStreak(m, new Date(2026, 4, 1, 10, 0))
    expect(out.streakCount).toBe(7)
    expect(out.lastActiveDay).toBe('2026-05-01')
  })

  it('gap of more than one day resets the streak to 1', () => {
    const m = meta({ lastActiveDay: '2026-04-14', streakCount: 9 })
    const out = bumpStreak(m, new Date(2026, 3, 17, 12, 0))
    expect(out.streakCount).toBe(1)
    expect(out.lastActiveDay).toBe('2026-04-17')
  })

  it('does not mutate the input meta', () => {
    const m = meta({ lastActiveDay: '2026-04-14', streakCount: 3 })
    bumpStreak(m, new Date(2026, 3, 15, 8, 0))
    expect(m.streakCount).toBe(3)
    expect(m.lastActiveDay).toBe('2026-04-14')
  })
})
