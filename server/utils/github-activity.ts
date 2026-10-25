import type { ActivityKind } from '../../shared/utils/activity-query'

export type GitHubItem = {
  createdAt: string
  isDraft?: boolean
  mergedAt?: string | null
  number: number
  repository: {
    isPrivate: boolean
    nameWithOwner: string
    owner: { __typename: 'Organization' | 'User' }
    stargazerCount: number
  }
  state: 'CLOSED' | 'MERGED' | 'OPEN'
  title: string
  url: string
}

export type GitHubSearch = {
  issueCount: number
  nodes: Array<GitHubItem | null>
  pageInfo: { endCursor: string | null, hasNextPage: boolean }
}

export type GitHubActivity = {
  issues?: GitHubSearch
  pullRequests?: GitHubSearch
  viewer: {
    avatarUrl: string
    login: string
    name: string | null
    repositoriesContributedTo: { totalCount: number }
  }
}

type GitHubError = { response?: { headers?: Record<string, string | undefined> }, status?: number }

export function getGitHubStatus(error: unknown) {
  if (!error || typeof error !== 'object') return
  const { response, status } = error as GitHubError
  if (typeof status !== 'number') return
  const headers = response?.headers
  return status === 403 && (headers?.['retry-after'] !== undefined || headers?.['x-ratelimit-remaining'] === '0')
    ? 429
    : status
}

function normalizePullRequest(pr: GitHubItem | null): PullRequest[] {
  if (!pr || pr.repository.isPrivate) return []
  return [{
    created_at: pr.createdAt,
    number: pr.number,
    repo: pr.repository.nameWithOwner,
    stars: pr.repository.stargazerCount,
    state: pr.mergedAt || pr.state === 'MERGED' ? 'merged' : pr.state === 'CLOSED' ? 'closed' : pr.isDraft ? 'draft' : 'open',
    title: pr.title,
    type: pr.repository.owner.__typename,
    url: pr.url,
  }]
}

function normalizeIssue(issue: GitHubItem | null): Issue[] {
  if (!issue || issue.repository.isPrivate) return []
  return [{
    created_at: issue.createdAt,
    number: issue.number,
    repo: issue.repository.nameWithOwner,
    stars: issue.repository.stargazerCount,
    state: issue.state === 'OPEN' ? 'open' : 'closed',
    title: issue.title,
    type: issue.repository.owner.__typename,
    url: issue.url,
  }]
}

export function normalizeGitHubSearch(kind: 'issues', search: GitHubSearch | undefined): ActivityPage<Issue>
export function normalizeGitHubSearch(kind: 'prs', search: GitHubSearch | undefined): ActivityPage<PullRequest>
export function normalizeGitHubSearch(kind: ActivityKind, search: GitHubSearch | undefined): ActivityPage<Issue | PullRequest> {
  if (!search) return { cursor: null, items: [], total: 0 }
  return {
    cursor: search.pageInfo.hasNextPage ? search.pageInfo.endCursor : null,
    items: search.nodes.flatMap(kind === 'prs' ? normalizePullRequest : normalizeIssue),
    total: search.issueCount,
  }
}

export function normalizeGitHubActivity(data: GitHubActivity, filtered: boolean): Activity {
  return {
    issues: normalizeGitHubSearch('issues', data.issues),
    prs: normalizeGitHubSearch('prs', data.pullRequests),
    repositories: filtered ? null : data.viewer.repositoriesContributedTo.totalCount,
    user: {
      avatar: data.viewer.avatarUrl,
      name: data.viewer.name ?? data.viewer.login,
      username: data.viewer.login,
    },
  }
}
