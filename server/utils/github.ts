import { createOctokit } from '@github-tools/sdk'
import { custom, registerSource, useSource, type Source } from '@vite-hub/source'
import { createError } from 'h3'
import { useRuntimeConfig } from 'nitro/runtime-config'

type ActivityKey = 'contributions' | 'issues'

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

export function githubStatus(error: unknown) {
  if (!error || typeof error !== 'object') return
  const headers = 'headers' in error && error.headers && typeof error.headers === 'object' ? error.headers : undefined
  if (headers && 'x-ratelimit-remaining' in headers && headers['x-ratelimit-remaining'] === '0') return 429
  const status = 'status' in error ? error.status : headers && 'status' in headers ? headers.status : undefined
  return typeof status === 'number' ? status : typeof status === 'string' ? Number(status) : undefined
}

export function mapGitHubActivity(data: GitHubActivity) {
  const user = {
    avatar: data.viewer.avatarUrl,
    name: data.viewer.name ?? data.viewer.login,
    username: data.viewer.login,
  }
  const prs = data.pullRequests.nodes.flatMap((pr): PullRequest[] => {
    if (!pr || pr.repository.isPrivate || (pr.state === 'CLOSED' && !pr.mergedAt)) return []
    const state: PullRequest['state'] = pr.mergedAt || pr.state === 'MERGED' ? 'merged' : pr.isDraft ? 'draft' : 'open'
    return [{
      created_at: pr.createdAt,
      number: pr.number,
      repo: pr.repository.nameWithOwner,
      stars: pr.repository.stargazerCount,
      state,
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
      state: issue.state === 'OPEN' ? 'open' : 'closed',
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

type Activity = ReturnType<typeof mapGitHubActivity>

async function fetchActivity() {
  try {
    const token = useRuntimeConfig().githubToken
    if (!token) throw createError({ statusCode: 500, message: 'Server misconfigured: set NUXT_GITHUB_TOKEN' })
    const data = await createOctokit(token).graphql<GitHubActivity>(query, {
      issues: 'type:issue author:@me is:public',
      pullRequests: 'type:pr author:@me is:public',
    })
    return mapGitHubActivity(data)
  }
  catch (error) {
    const status = githubStatus(error)
    if (status === 401) throw createError({ statusCode: 401, message: 'GitHub token invalid/expired' })
    if (status === 429) throw createError({ statusCode: 429, message: 'GitHub rate limit exceeded' })
    if (status === 403) throw createError({ statusCode: 403, message: 'GitHub API forbidden' })
    if (status) throw createError({ statusCode: 502, message: 'Failed to fetch GitHub activity' })
    throw error
  }
}

const githubActivity = custom({
  name: 'github-activity',
  async getKeys() {
    return ['contributions', 'issues']
  },
  async getItem(key) {
    return { key, data: (await fetchActivity())[key] }
  },
} satisfies Source<ActivityKey, Activity[ActivityKey]>)

declare global {
  interface ViteHubSourceMap {
    githubActivity: typeof githubActivity
  }
}

registerSource('githubActivity', githubActivity)

export async function readGitHubActivity<TKey extends ActivityKey>(key: TKey): Promise<Activity[TKey]> {
  const item = await useSource('githubActivity').get(key)
  if (!item.data) throw createError({ statusCode: 500, message: 'GitHub activity source returned no data' })
  return item.data as Activity[TKey]
}
