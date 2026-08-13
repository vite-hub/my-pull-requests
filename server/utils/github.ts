import { githubGraphql, registerSource, useSource } from '@vite-hub/source'
import { getViteHubErrorShape } from '@vite-hub/runtime'
import { createError } from 'h3'
import { useRuntimeConfig } from 'nitro/runtime-config'

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

const githubActivity = githubGraphql<GitHubActivity>({
  auth: () => {
    const token = useRuntimeConfig().githubToken
    if (!token) throw createError({ statusCode: 500, message: 'Server misconfigured: set NUXT_GITHUB_TOKEN' })
    return token
  },
  cache: { maxAge: 5 * 60 },
  query,
  variables: {
    issues: 'type:issue author:@me is:public',
    pullRequests: 'type:pr author:@me is:public',
  },
})

declare global {
  interface ViteHubSourceMap {
    githubActivity: typeof githubActivity
  }
}

registerSource('githubActivity', githubActivity)

type Activity = ReturnType<typeof mapGitHubActivity>

export async function readGitHubActivity<TKey extends keyof Activity>(key: TKey): Promise<Activity[TKey]> {
  try {
    const item = await useSource('githubActivity').get('result')
    if (!item.data) throw createError({ statusCode: 500, message: 'GitHub activity source returned no data' })
    return mapGitHubActivity(item.data)[key]
  }
  catch (error) {
    const status = getViteHubErrorShape(error)?.details?.status
    if (status === 401) throw createError({ statusCode: 401, message: 'GitHub token invalid/expired' })
    if (status === 429) throw createError({ statusCode: 429, message: 'GitHub rate limit exceeded' })
    if (status === 403) throw createError({ statusCode: 403, message: 'GitHub API forbidden' })
    if (typeof status === 'number') throw createError({ statusCode: 502, message: 'Failed to fetch GitHub activity' })
    throw error
  }
}
