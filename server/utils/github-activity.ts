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

export type GitHubActivity = {
  issues: { nodes: Array<GitHubItem | null> }
  pullRequests: { nodes: Array<GitHubItem | null> }
  viewer: { avatarUrl: string, login: string, name: string | null }
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

export function normalizeGitHubActivity(data: GitHubActivity) {
  const user = {
    avatar: data.viewer.avatarUrl,
    name: data.viewer.name ?? data.viewer.login,
    username: data.viewer.login,
  }

  return {
    contributions: {
      prs: data.pullRequests.nodes.flatMap((pr): PullRequest[] => {
        if (!pr || pr.repository.isPrivate || (pr.state === 'CLOSED' && !pr.mergedAt)) return []
        return [{
          created_at: pr.createdAt,
          number: pr.number,
          repo: pr.repository.nameWithOwner,
          stars: pr.repository.stargazerCount,
          state: pr.mergedAt || pr.state === 'MERGED' ? 'merged' : pr.isDraft ? 'draft' : 'open',
          title: pr.title,
          type: pr.repository.owner.__typename,
          url: pr.url,
        }]
      }),
      user,
    },
    issues: {
      issues: data.issues.nodes.flatMap((issue): Issue[] => {
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
      }),
      user,
    },
  }
}
