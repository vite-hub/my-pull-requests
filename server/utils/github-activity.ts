import type { GitHubProvider } from 'forges/github'

import {
  isActivityFilterEmpty,
  toGitHubSearchQuery,
  type ActivityFilter,
  type ActivityKind,
  type ActivitySort,
} from '../../shared/utils/activity-query'

export const GITHUB_PAGE_SIZE = 50

type GitHubRepository = {
  isPrivate: boolean
  nameWithOwner: string
  owner: { __typename: 'Organization' | 'User', avatarUrl: string }
  stargazerCount: number
  url: string
}

export type GitHubItem = {
  createdAt: string
  isDraft?: boolean
  mergedAt?: string | null
  number: number
  repository: GitHubRepository
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
    url: string
  }
}

type GitHubRepositories = {
  viewer: {
    repositoriesContributedTo: {
      nodes: Array<GitHubRepository | null>
      pageInfo: { endCursor: string | null, hasNextPage: boolean }
    }
  }
}

const SEARCH_FIELDS = `#graphql
  issueCount
  pageInfo { endCursor hasNextPage }
  nodes {
    ... on PullRequest {
      createdAt
      isDraft
      mergedAt
      number
      state
      title
      url
      repository { ...ActivityRepository }
    }
    ... on Issue {
      createdAt
      number
      state
      title
      url
      repository { ...ActivityRepository }
    }
  }
`

const REPOSITORY_FRAGMENT = `#graphql
  fragment ActivityRepository on Repository {
    isPrivate
    nameWithOwner
    stargazerCount
    url
    owner { __typename avatarUrl }
  }
`

const GITHUB_ACTIVITY_QUERY = `#graphql
  query GitHubActivity($pullRequests: String!, $issues: String!, $withIssues: Boolean!, $first: Int!) {
    viewer {
      avatarUrl
      login
      name
      url
      repositoriesContributedTo(first: 0, includeUserRepositories: true, privacy: PUBLIC, contributionTypes: [PULL_REQUEST, ISSUE]) {
        totalCount
      }
    }
    pullRequests: search(query: $pullRequests, type: ISSUE_ADVANCED, first: $first) { ${SEARCH_FIELDS} }
    issues: search(query: $issues, type: ISSUE_ADVANCED, first: $first) @include(if: $withIssues) { ${SEARCH_FIELDS} }
  }
  ${REPOSITORY_FRAGMENT}
`

// Octokit, and the forges GitHub provider, reserve `query` as a variable name.
const GITHUB_ACTIVITY_PAGE_QUERY = `#graphql
  query GitHubActivityPage($search: String!, $after: String!, $first: Int!) {
    search(query: $search, type: ISSUE_ADVANCED, first: $first, after: $after) { ${SEARCH_FIELDS} }
  }
  ${REPOSITORY_FRAGMENT}
`

const GITHUB_REPOSITORIES_QUERY = `#graphql
  query GitHubContributedRepositories($after: String) {
    viewer {
      repositoriesContributedTo(first: 100, after: $after, includeUserRepositories: true, privacy: PUBLIC, contributionTypes: [PULL_REQUEST, ISSUE], orderBy: { field: STARGAZERS, direction: DESC }) {
        pageInfo { endCursor hasNextPage }
        nodes { ...ActivityRepository }
      }
    }
  }
  ${REPOSITORY_FRAGMENT}
`

function itemRepository(repository: GitHubRepository) {
  return {
    ownerAvatar: repository.owner.avatarUrl,
    repo: repository.nameWithOwner,
    repoUrl: repository.url,
    stars: repository.stargazerCount,
    type: repository.owner.__typename,
  }
}

function normalizePullRequest(pr: GitHubItem | null): PullRequest[] {
  if (!pr || pr.repository.isPrivate) return []
  return [{
    ...itemRepository(pr.repository),
    created_at: pr.createdAt,
    number: pr.number,
    state: pr.mergedAt || pr.state === 'MERGED' ? 'merged' : pr.state === 'CLOSED' ? 'closed' : pr.isDraft ? 'draft' : 'open',
    title: pr.title,
    url: pr.url,
  }]
}

function normalizeIssue(issue: GitHubItem | null): Issue[] {
  if (!issue || issue.repository.isPrivate) return []
  return [{
    ...itemRepository(issue.repository),
    created_at: issue.createdAt,
    number: issue.number,
    state: issue.state === 'OPEN' ? 'open' : 'closed',
    title: issue.title,
    url: issue.url,
  }]
}

export function normalizeGitHubSearch(kind: 'issues', search: GitHubSearch | undefined): ActivityPage<Issue>
export function normalizeGitHubSearch(kind: 'prs', search: GitHubSearch | undefined): ActivityPage<PullRequest>
export function normalizeGitHubSearch(kind: ActivityKind, search: GitHubSearch | undefined): ActivityPage<Issue | PullRequest>
export function normalizeGitHubSearch(kind: ActivityKind, search: GitHubSearch | undefined): ActivityPage<Issue | PullRequest> {
  if (!search) return { cursor: null, items: [], total: 0 }
  return {
    cursor: search.pageInfo.hasNextPage ? search.pageInfo.endCursor : null,
    items: search.nodes.flatMap(kind === 'prs' ? normalizePullRequest : normalizeIssue),
    total: search.issueCount,
  }
}

export function normalizeGitHubActivity(data: GitHubActivity, filtered: boolean, forge: ForgeInfo): Activity {
  return {
    forge,
    issues: normalizeGitHubSearch('issues', data.issues),
    prs: normalizeGitHubSearch('prs', data.pullRequests),
    repositories: filtered ? null : data.viewer.repositoriesContributedTo.totalCount,
    user: {
      avatar: data.viewer.avatarUrl,
      name: data.viewer.name ?? data.viewer.login,
      url: data.viewer.url,
      username: data.viewer.login,
    },
  }
}

export async function fetchGitHubActivity(provider: GitHubProvider, forge: ForgeInfo, filter: ActivityFilter, sort: ActivitySort) {
  const issues = toGitHubSearchQuery(filter, 'issues', sort)
  const activity = await provider.graphql<GitHubActivity>(GITHUB_ACTIVITY_QUERY, {
    first: GITHUB_PAGE_SIZE,
    issues: issues ?? '',
    pullRequests: toGitHubSearchQuery(filter, 'prs', sort)!,
    withIssues: issues !== null,
  })
  return normalizeGitHubActivity(activity, !isActivityFilterEmpty(filter), forge)
}

export async function fetchGitHubActivityPage(provider: GitHubProvider, kind: ActivityKind, filter: ActivityFilter, sort: ActivitySort, after: string) {
  const search = toGitHubSearchQuery(filter, kind, sort)
  if (!search) return { cursor: null, items: [], total: 0 }
  const { search: result } = await provider.graphql<{ search: GitHubSearch }>(GITHUB_ACTIVITY_PAGE_QUERY, {
    after,
    first: GITHUB_PAGE_SIZE,
    search,
  })
  return normalizeGitHubSearch(kind, result)
}

/** Public repositories with a pull request or issue, most starred first. */
export async function fetchGitHubRepositories(provider: GitHubProvider) {
  const repositories: ContributedRepository[] = []
  let after: string | null = null
  do {
    const response: GitHubRepositories = await provider.graphql<GitHubRepositories>(GITHUB_REPOSITORIES_QUERY, { after })
    const page: GitHubRepositories['viewer']['repositoriesContributedTo'] = response.viewer.repositoriesContributedTo
    for (const repository of page.nodes) {
      if (!repository || repository.isPrivate) continue
      const { ownerAvatar, repo, repoUrl, stars, type } = itemRepository(repository)
      repositories.push({ name: repo, ownerAvatar, stars, type, url: repoUrl })
    }
    after = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null
  } while (after && repositories.length < 1000)
  return repositories.sort((a, b) => b.stars - a.stars)
}
