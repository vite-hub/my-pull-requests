import { HTTPError } from 'h3'
import { defineCachedFunction } from 'nitro/cache'

import {
  formatActivityQuery,
  isActivityFilterEmpty,
  parseActivityQuery,
  toGitHubSearchQuery,
  type ActivityKind,
  type ActivitySort,
} from '../../shared/utils/activity-query'
import {
  getGitHubStatus,
  normalizeGitHubActivity,
  normalizeGitHubSearch,
  type GitHubActivity,
  type GitHubSearch,
} from '../utils/github-activity'
import { createGitHubClient } from '../utils/github-client'

export const ACTIVITY_PAGE_SIZE = 50

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
    owner { __typename }
  }
`

const GITHUB_ACTIVITY_QUERY = `#graphql
  query GitHubActivity($pullRequests: String!, $issues: String!, $withIssues: Boolean!, $first: Int!) {
    viewer {
      avatarUrl
      login
      name
      repositoriesContributedTo(first: 0, includeUserRepositories: true, privacy: PUBLIC, contributionTypes: [PULL_REQUEST, ISSUE]) {
        totalCount
      }
    }
    pullRequests: search(query: $pullRequests, type: ISSUE_ADVANCED, first: $first) { ${SEARCH_FIELDS} }
    issues: search(query: $issues, type: ISSUE_ADVANCED, first: $first) @include(if: $withIssues) { ${SEARCH_FIELDS} }
  }
  ${REPOSITORY_FRAGMENT}
`

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

type GitHubRepositories = {
  viewer: {
    repositoriesContributedTo: {
      nodes: Array<{ isPrivate: boolean, nameWithOwner: string, owner: { __typename: 'Organization' | 'User' }, stargazerCount: number } | null>
      pageInfo: { endCursor: string | null, hasNextPage: boolean }
    }
  }
}

async function withGitHubErrors<T>(request: () => Promise<T>) {
  try {
    return await request()
  }
  catch (error) {
    const status = getGitHubStatus(error)
    if (status === 401) throw new HTTPError({ status: 401, statusText: 'Unauthorized', message: 'GitHub token invalid/expired' })
    if (status === 429) throw new HTTPError({ status: 429, statusText: 'Too Many Requests', message: 'GitHub rate limit exceeded' })
    if (status === 403) throw new HTTPError({ status: 403, statusText: 'Forbidden', message: 'GitHub API forbidden' })
    if (status) throw new HTTPError({ status: 502, statusText: 'Bad Gateway', message: 'Failed to fetch GitHub activity' })
    throw error
  }
}

/** Normalizes the URL query so equivalent queries share one cache entry. */
export function normalizeActivityQuery(query: unknown) {
  return formatActivityQuery(parseActivityQuery(query))
}

export const contributions = {
  /** First page of pull requests and issues, with totals. Pass a normalized query. */
  get: defineCachedFunction(async (query: string = '', sort: ActivitySort = 'newest') => {
    const filter = parseActivityQuery(query)
    const issues = toGitHubSearchQuery(filter, 'issues', sort)
    const activity = await withGitHubErrors(() => createGitHubClient().graphql<GitHubActivity>(GITHUB_ACTIVITY_QUERY, {
      first: ACTIVITY_PAGE_SIZE,
      issues: issues ?? '',
      pullRequests: toGitHubSearchQuery(filter, 'prs', sort)!,
      withIssues: issues !== null,
    }))
    return normalizeGitHubActivity(activity, !isActivityFilterEmpty(filter))
  }, {
    maxAge: 60 * 5,
    name: 'github-activity',
    swr: false,
  }),

  /** A later page of one kind, continuing from the cursor of the previous page. */
  page: defineCachedFunction(async (kind: ActivityKind, query: string, sort: ActivitySort, after: string) => {
    const search = toGitHubSearchQuery(parseActivityQuery(query), kind, sort)
    if (!search) return { cursor: null, items: [], total: 0 }
    const { search: result } = await withGitHubErrors(() => createGitHubClient().graphql<{ search: GitHubSearch }>(GITHUB_ACTIVITY_PAGE_QUERY, {
      after,
      first: ACTIVITY_PAGE_SIZE,
      search,
    }))
    return kind === 'prs' ? normalizeGitHubSearch('prs', result) : normalizeGitHubSearch('issues', result)
  }, {
    maxAge: 60 * 5,
    name: 'github-activity-page',
    swr: false,
  }),

  /** Public repositories with a pull request or issue, most starred first. */
  repositories: defineCachedFunction(async () => {
    const github = createGitHubClient()
    const repositories: ContributedRepository[] = []
    let after: string | null = null
    do {
      const { viewer }: GitHubRepositories = await withGitHubErrors(() => github.graphql<GitHubRepositories>(GITHUB_REPOSITORIES_QUERY, { after }))
      const page = viewer.repositoriesContributedTo
      for (const repository of page.nodes) {
        if (!repository || repository.isPrivate) continue
        repositories.push({ name: repository.nameWithOwner, stars: repository.stargazerCount, type: repository.owner.__typename })
      }
      after = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null
    } while (after && repositories.length < 1000)
    return repositories.sort((a, b) => b.stars - a.stars)
  }, {
    getKey: () => 'repositories',
    maxAge: 60 * 60,
    name: 'github-repositories',
    swr: false,
  }),
}
