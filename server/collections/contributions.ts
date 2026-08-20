import { createError } from 'h3'
import { defineCachedFunction } from 'nitro/cache'
import { defineCollection, defineSource } from 'vite-hub/source'

type GitHubItem = {
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

type GitHubActivity = {
  issues: { nodes: Array<GitHubItem | null> }
  pullRequests: { nodes: Array<GitHubItem | null> }
  viewer: { avatarUrl: string, login: string, name: string | null }
}

type GitHubError = { response?: { headers?: Record<string, string | undefined> }, status?: number }

const GITHUB_ACTIVITY_QUERY = `#graphql
  query GitHubActivity($pullRequests: String!, $issues: String!) {
    viewer {
      avatarUrl
      login
      name
    }
    pullRequests: search(query: $pullRequests, type: ISSUE, first: 50) {
      nodes {
        ... on PullRequest {
          createdAt
          isDraft
          mergedAt
          number
          state
          title
          url
          repository {
            isPrivate
            nameWithOwner
            stargazerCount
            owner { __typename }
          }
        }
      }
    }
    issues: search(query: $issues, type: ISSUE, first: 50) {
      nodes {
        ... on Issue {
          createdAt
          number
          state
          title
          url
          repository {
            isPrivate
            nameWithOwner
            stargazerCount
            owner { __typename }
          }
        }
      }
    }
  }
`

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

const getRecentGitHubContributions = defineCachedFunction(async () => {
  try {
    const github = (await import('../utils/github-client.ts')).createGitHubClient()
    const activity = await github.graphql<GitHubActivity>(GITHUB_ACTIVITY_QUERY, {
      issues: 'type:issue author:@me is:public sort:created-desc',
      pullRequests: 'type:pr author:@me is:public sort:created-desc',
    })
    return normalizeGitHubActivity(activity)
  }
  catch (error) {
    const status = getGitHubStatus(error)
    if (status === 401) throw createError({ statusCode: 401, message: 'GitHub token invalid/expired' })
    if (status === 429) throw createError({ statusCode: 429, message: 'GitHub rate limit exceeded' })
    if (status === 403) throw createError({ statusCode: 403, message: 'GitHub API forbidden' })
    if (status) throw createError({ statusCode: 502, message: 'Failed to fetch GitHub activity' })
    throw error
  }
}, {
  getKey: () => 'activity',
  maxAge: 60 * 5,
  name: 'github-activity',
  swr: false,
})

export const contributions = defineCollection({
  sources: {
    github: defineSource({
      get: (_range: 'recent') => getRecentGitHubContributions(),
    }),
  },
})
