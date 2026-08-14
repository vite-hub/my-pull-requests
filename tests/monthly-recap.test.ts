import assert from 'node:assert/strict'
import test from 'node:test'

import { buildMonthlyRecap, monthRange, previousMonth } from '../server/utils/monthly-recap.ts'

test('builds calendar totals and busiest moments', () => {
  const recap = buildMonthlyRecap({
    events: [
      { at: '2026-07-02T14:05:00Z', kind: 'opened', repo: 'vite-hub/vitehub' },
      { at: '2026-07-02T14:45:00Z', kind: 'completed', repo: 'vite-hub/vitehub' },
      { at: '2026-07-03T09:00:00Z', kind: 'completed', repo: 'onmax/my-pull-requests' },
    ],
    metrics: { closedIssues: 1, mergedPullRequests: 2, openedIssues: 0, openedPullRequests: 1 },
    month: '2026-07',
    user: { avatar: '', name: 'Maxi', username: 'onmax' },
  })

  assert.equal(previousMonth(new Date('2026-08-01T08:00:00Z')), '2026-07')
  assert.deepEqual(recap.busiestDay, { count: 2, date: '2026-07-02', label: 'July 2' })
  assert.deepEqual(recap.busiestHour, { count: 2, hour: 14, label: '14:00 UTC' })
  assert.deepEqual(recap.topRepository, { count: 2, name: 'vite-hub/vitehub' })
  assert.equal(recap.days.length, 31)
})

test('uses UTC month boundaries', () => {
  assert.equal(previousMonth(new Date('2026-01-01T00:00:00-08:00')), '2025-12')
  assert.deepEqual(monthRange('2024-02'), {
    end: new Date('2024-03-01T00:00:00.000Z'),
    endDate: '2024-02-29',
    start: new Date('2024-02-01T00:00:00.000Z'),
    startDate: '2024-02-01',
  })
  assert.throws(() => monthRange('2024-13'), /YYYY-MM/)
})
