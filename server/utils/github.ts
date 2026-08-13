import { defineSource, registerSource, useSource, type Source } from '@vite-hub/source'
import { createError } from 'h3'
import { useRuntimeConfig } from 'nitro/runtime-config'

type ActivityKey = 'contributions' | 'issues'

type GitHubRepository = {
  isPrivate: boolean
  nameWithOwner: string
  owner: { __typename: 'Organization' | 'User' }
  stargazerCount: number
}

type GitHubPullRequest = {
  createdAt: string
  isDraft: boolean
  mergedAt: string | null
  number: number
  repository: GitHubRepository
  state: 'CLOSED' | 'MERGED' | 'OPEN'
  title: string
  url: string
}

type GitHubIssue = {
  createdAt: string
  number: number
  repository: GitHubRepository
  state: 'CLOSED' | 'OPEN'
  title: string
  url: string
}

type GitHubActivityResponse = {
  issues: { nodes: Array<GitHubIssue | null> }
  pullRequests: { nodes: Array<GitHubPullRequest | null> }
  viewer: { avatarUrl: string, login: string, name: string | null }
}

type Activity = {
  contributions: Contributions
  issues: Issues
}

const query = `query($pullRequests: String!, $issues: String!) {
  viewer { avatarUrl login name }
  pullRequests: search(query: $pullRequests, type: ISSUE, first: 50) {
    nodes {
      ... on PullRequest {
        createdAt isDraft mergedAt number state title url
        repository { isPrivate nameWithOwner stargazerCount owner { __typename } }
      }
    }
  }
  issues: search(query: $issues, type: ISSUE, first: 50) {
    nodes {
      ... on Issue {
        createdAt number state title url
        repository { isPrivate nameWithOwner stargazerCount owner { __typename } }
      }
    }
  }
}`

export function mapGitHubActivity(data: GitHubActivityResponse): Activity {
  const user = {
    avatar: data.viewer.avatarUrl,
    name: data.viewer.name ?? data.viewer.login,
    username: data.viewer.login,
  }
  const prs = data.pullRequests.nodes.flatMap((pr): PullRequest[] => {
    if (!pr || pr.repository.isPrivate || (pr.state === 'CLOSED' && !pr.mergedAt)) return []
    return [{
      created_at: pr.createdAt,
      number: pr.number,
      repo: pr.repository.nameWithOwner,
      stars: pr.repository.stargazerCount,
      state: pr.mergedAt || pr.state === 'MERGED' ? 'merged' : pr.isDraft ? 'draft' : pr.state.toLowerCase() as 'open' | 'closed',
      title: pr.title,
      type: pr.repository.owner.__typename,
      url: pr.url,
    }]
  })
  const issues = data.issues.nodes.flatMap((issue): Issue[] => {
    if (!issue || issue.repository.isPrivate) return []
    return [{
      created_at: issue.createdAt,
      number: issue.number,
      repo: issue.repository.nameWithOwner,
      stars: issue.repository.stargazerCount,
      state: issue.state.toLowerCase() as Issue['state'],
      title: issue.title,
      type: issue.repository.owner.__typename,
      url: issue.url,
    }]
  })

  return {
    contributions: { prs, user },
    issues: { issues, user },
  }
}

let cached: { expiresAt: number, value: Activity } | undefined
let pending: Promise<Activity> | undefined

async function fetchActivity(): Promise<Activity> {
  const { githubToken } = useRuntimeConfig()
  if (!githubToken) {
    throw createError({ statusCode: 500, message: 'Server misconfigured: set NUXT_GITHUB_TOKEN' })
  }

  const response = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      'accept': 'application/vnd.github+json',
      'authorization': `Bearer ${githubToken}`,
      'content-type': 'application/json',
      'user-agent': 'prs.onmax.me',
    },
    body: JSON.stringify({
      query,
      variables: {
        issues: 'type:issue author:@me is:public',
        pullRequests: 'type:pr author:@me is:public',
      },
    }),
  })
  const body = await response.json() as { data?: GitHubActivityResponse, errors?: unknown[] }
  const rateLimited = response.status === 403 && response.headers.get('x-ratelimit-remaining') === '0'

  if (!response.ok || body.errors?.length || !body.data) {
    console.error('[github-activity] GitHub request failed', {
      status: response.status,
      rateLimited: rateLimited || undefined,
    })
    if (response.status === 401) throw createError({ statusCode: 401, message: 'GitHub token invalid/expired' })
    if (rateLimited) throw createError({ statusCode: 429, message: 'GitHub rate limit exceeded' })
    if (response.status === 403) throw createError({ statusCode: 403, message: 'GitHub API forbidden' })
    throw createError({ statusCode: 502, message: 'Failed to fetch GitHub activity' })
  }

  return mapGitHubActivity(body.data)
}

function loadActivity() {
  if (cached && cached.expiresAt > Date.now()) return Promise.resolve(cached.value)
  pending ??= fetchActivity()
    .then((value) => {
      cached = { expiresAt: Date.now() + 5 * 60 * 1000, value }
      return value
    })
    .finally(() => {
      pending = undefined
    })
  return pending
}

const githubActivity = defineSource({
  name: 'github-activity',
  cache: { maxAge: 5 * 60 },
  fingerprint: { provider: 'github-graphql' },
  async getKeys() {
    return ['contributions', 'issues']
  },
  async getItem(key) {
    return { key, data: (await loadActivity())[key] }
  },
  async getItems() {
    const activity = await loadActivity()
    return [
      { key: 'contributions', data: activity.contributions },
      { key: 'issues', data: activity.issues },
    ]
  },
} satisfies Source<ActivityKey, Activity[ActivityKey]>)

declare global {
  interface ViteHubSourceMap {
    githubActivity: typeof githubActivity
  }
}

registerSource('githubActivity', githubActivity)

export function readGitHubActivity(key: 'contributions'): Promise<Contributions>
export function readGitHubActivity(key: 'issues'): Promise<Issues>
export async function readGitHubActivity(key: ActivityKey) {
  const item = await useSource('githubActivity').get(key)
  if (!item.data) throw createError({ statusCode: 500, message: 'GitHub activity source returned no data' })
  return item.data
}
