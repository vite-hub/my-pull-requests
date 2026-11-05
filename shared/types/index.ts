import type { ActivityCapabilities, ForgeKind } from '../utils/activity-query'

export type User = {
  username: string
  name: string
  avatar: string
  url: string
}

export type ForgeInfo = {
  capabilities: ActivityCapabilities
  kind: ForgeKind
  /** Shown to readers, for example `GitHub` or `Codeberg`. */
  name: string
}

export type PullRequest = {
  repo: string
  title: string
  url: string
  created_at: string
  state: 'merged' | 'draft' | 'open' | 'closed'
  number: number
  type: 'User' | 'Organization'
  stars: number
  repoUrl: string
  ownerAvatar?: string
}

export type Issue = {
  repo: string
  title: string
  url: string
  created_at: string
  state: 'open' | 'closed'
  number: number
  type: 'User' | 'Organization'
  stars: number
  repoUrl: string
  ownerAvatar?: string
}

export type ActivityPage<T> = {
  /** Cursor for the next page, or `null` when every result is loaded. */
  cursor: string | null
  items: T[]
  /** Null when the forge does not report a total. */
  total: number | null
}

export type Activity = {
  forge: ForgeInfo
  issues: ActivityPage<Issue>
  prs: ActivityPage<PullRequest>
  /** Every public repository with a pull request or issue, or `null` for filtered results. */
  repositories: number | null
  user: User
}

export type ContributedRepository = {
  name: string
  ownerAvatar?: string
  stars: number
  type: 'User' | 'Organization'
  url: string
}

export type MonthlyRecapDay = {
  completed: number
  date: string
  opened: number
}

export type MonthlyRecap = {
  busiestDay: { count: number, date: string, label: string }
  busiestHour: { count: number, hour: number, label: string }
  days: MonthlyRecapDay[]
  /** The forge the recap was read from. Recaps stored before forges existed have none and come from GitHub. */
  forge?: string
  label: string
  metrics: {
    closedIssues: number
    mergedPullRequests: number
    openedIssues: number
    openedPullRequests: number
  }
  month: string
  topRepository: { count: number, name: string } | null
  user: User
}
