import type { Cursor, ForgeProvider, Thread, ThreadSearchQuery } from 'forges'

import { useForge } from '../utils/forge'
import { fetchForgeUser, readRepository, searchThreadsPage } from '../utils/forge-activity'
import { withForgeErrors } from '../utils/forge-errors'
import { assertCompleteSearch, buildMonthlyRecap, getMonthRange } from '../utils/monthly-recap'

type RecapEvent = Parameters<typeof buildMonthlyRecap>[0]['events'][number]

function repositoryName(thread: Thread) {
  return `${thread.ref.repo.owner}/${thread.ref.repo.name}`
}

async function search(provider: ForgeProvider, query: ThreadSearchQuery, label: string, cap?: number) {
  const items: Thread[] = []
  let total = 0
  let cursor: Cursor | undefined
  do {
    const page = await searchThreadsPage(provider, { ...query, cursor, perPage: 100 })
    assertCompleteSearch(page, label, cap)
    total = page.total ?? total
    items.push(...page.items)
    cursor = page.cursor
  } while (cursor)
  return { items, total: Math.max(total, items.length) }
}

function events(threads: Thread[], kind: RecapEvent['kind'], at: (thread: Thread) => Date | undefined): RecapEvent[] {
  return threads.flatMap((thread) => {
    const date = at(thread)
    return date ? [{ at: date.toISOString(), kind, repo: repositoryName(thread) }] : []
  })
}

/** GitHub searches by created, merged and closed date, so each total is exact. */
async function fetchGitHubMonth(provider: ForgeProvider, username: string, month: string) {
  const { endDate, startDate } = getMonthRange(month)
  const author = `author:${username} is:public`
  // GitHub search stops at 1000 results.
  const githubSearch = (queryRaw: string) => search(provider, { queryRaw }, queryRaw, 1000)
  const [openedPullRequests, mergedPullRequests, openedIssues, closedIssues] = await Promise.all([
    githubSearch(`type:pr ${author} created:${startDate}..${endDate}`),
    githubSearch(`type:pr ${author} is:merged merged:${startDate}..${endDate}`),
    githubSearch(`type:issue ${author} created:${startDate}..${endDate}`),
    githubSearch(`type:issue ${author} is:closed closed:${startDate}..${endDate}`),
  ])
  return {
    events: [
      ...events(openedPullRequests.items, 'opened', thread => thread.createdAt),
      ...events(mergedPullRequests.items, 'completed', thread => thread.mergedAt),
      ...events(openedIssues.items, 'opened', thread => thread.createdAt),
      ...events(closedIssues.items, 'completed', thread => thread.closedAt),
    ],
    metrics: {
      closedIssues: closedIssues.total,
      mergedPullRequests: mergedPullRequests.total,
      openedIssues: openedIssues.total,
      openedPullRequests: openedPullRequests.total,
    },
  }
}

/**
 * Other forges search by update time only. Anything opened, merged or closed in the month was updated in it
 * or later, so one search per kind finds it, and the dates pick the month back out.
 */
async function fetchForgeMonth(provider: ForgeProvider, username: string, month: string) {
  const { end, start } = getMonthRange(month)
  const inMonth = (date: Date | undefined) => date && date >= start && date < end ? date : undefined
  const publicRepositories = new Map<string, Promise<boolean>>()
  const isPublic = (thread: Thread) => {
    const name = repositoryName(thread)
    if (!publicRepositories.has(name)) publicRepositories.set(name, readRepository(provider, thread.ref.repo).then(details => details.public))
    return publicRepositories.get(name)!
  }
  const publicThreads = async (kind: ThreadSearchQuery['kind']) => {
    const { items } = await search(provider, { author: username, kind, since: start, sort: 'updated' }, `${kind} updated since ${start.toISOString()}`)
    const visible = await Promise.all(items.map(isPublic))
    return items.filter((_, index) => visible[index])
  }
  const [pullRequests, issues] = await Promise.all([publicThreads('pull_request'), publicThreads('issue')])
  const opened = [...pullRequests, ...issues].filter(thread => inMonth(thread.createdAt))
  const merged = pullRequests.filter(thread => inMonth(thread.mergedAt))
  const closed = issues.filter(thread => thread.state === 'closed' && inMonth(thread.closedAt))
  return {
    events: [
      ...events(opened, 'opened', thread => thread.createdAt),
      ...events(merged, 'completed', thread => thread.mergedAt),
      ...events(closed, 'completed', thread => thread.closedAt),
    ],
    metrics: {
      closedIssues: closed.length,
      mergedPullRequests: merged.length,
      openedIssues: opened.filter(thread => thread.kind === 'issue').length,
      openedPullRequests: opened.filter(thread => thread.kind !== 'issue').length,
    },
  }
}

async function fetchMonthlyRecap(month: string) {
  getMonthRange(month)
  const forge = useForge()
  return withForgeErrors(async () => {
    const user = await fetchForgeUser(forge.provider)
    const { events, metrics } = forge.kind === 'github'
      ? await fetchGitHubMonth(forge.provider, user.username, month)
      : await fetchForgeMonth(forge.provider, user.username, month)
    return buildMonthlyRecap({ events, forge: forge.info.name, metrics, month, user })
  })
}

export const monthlyRecaps = { get: fetchMonthlyRecap }
