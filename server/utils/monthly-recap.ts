export function getPreviousMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - 1, 1)).toISOString().slice(0, 7)
}

export function getMonthRange(month: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new TypeError('Month must use YYYY-MM')
  const start = new Date(`${month}-01T00:00:00.000Z`)
  const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1))
  return {
    end,
    endDate: new Date(end.getTime() - 1).toISOString().slice(0, 10),
    start,
    startDate: start.toISOString().slice(0, 10),
  }
}

export function assertCompleteSearchResults(response: { data: { incomplete_results?: boolean, total_count: number } }, query: string) {
  if (response.data.incomplete_results) throw new Error(`GitHub returned incomplete search results for: ${query}`)
  if (response.data.total_count > 1000) throw new Error(`GitHub search is capped at 1000 results for: ${query}`)
}

export function buildMonthlyRecap({ events, metrics, month, user }: {
  events: Array<{ at: string, kind: 'completed' | 'opened', repo: string }>
  metrics: MonthlyRecap['metrics']
  month: string
  user: User
}): MonthlyRecap {
  const { end, start } = getMonthRange(month)
  const days: MonthlyRecapDay[] = []
  const hourCounts = new Map<number, number>()
  const repositories = new Map<string, number>()

  for (let date = new Date(start); date < end; date.setUTCDate(date.getUTCDate() + 1)) {
    days.push({ completed: 0, date: date.toISOString().slice(0, 10), opened: 0 })
  }

  const daysByDate = new Map(days.map(day => [day.date, day]))
  for (const event of events) {
    const at = new Date(event.at)
    if (Number.isNaN(at.getTime()) || at < start || at >= end) continue
    const date = at.toISOString().slice(0, 10)
    const day = daysByDate.get(date)
    if (!day) continue
    day[event.kind] += 1
    hourCounts.set(at.getUTCHours(), (hourCounts.get(at.getUTCHours()) ?? 0) + 1)
    repositories.set(event.repo, (repositories.get(event.repo) ?? 0) + 1)
  }

  const busiestDay = days.reduce((busiest, day) => day.opened + day.completed > busiest.opened + busiest.completed ? day : busiest)
  const busiestHourEntry = [...hourCounts].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]
  const topRepositoryEntry = [...repositories].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]
  const busiestHour = busiestHourEntry?.[0] ?? 0

  return {
    busiestDay: {
      count: busiestDay.opened + busiestDay.completed,
      date: busiestDay.date,
      label: new Intl.DateTimeFormat('en', { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(`${busiestDay.date}T00:00:00Z`)),
    },
    busiestHour: {
      count: busiestHourEntry?.[1] ?? 0,
      hour: busiestHour,
      label: `${String(busiestHour).padStart(2, '0')}:00 UTC`,
    },
    days,
    label: new Intl.DateTimeFormat('en', { month: 'long', timeZone: 'UTC', year: 'numeric' }).format(start),
    metrics,
    month,
    topRepository: topRepositoryEntry ? { count: topRepositoryEntry[1], name: topRepositoryEntry[0] } : null,
    user,
  }
}
