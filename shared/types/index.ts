export type User = {
  username: string
  name: string
  avatar: string
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
}

export type ActivityPage<T> = {
  /** Cursor for the next page, or `null` when every result is loaded. */
  cursor: string | null
  items: T[]
  total: number
}

export type Activity = {
  issues: ActivityPage<Issue>
  prs: ActivityPage<PullRequest>
  /** Every public repository with a pull request or issue, or `null` for filtered results. */
  repositories: number | null
  user: User
}

export type ContributedRepository = {
  name: string
  stars: number
  type: 'User' | 'Organization'
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
