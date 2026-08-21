import { HTTPError } from 'h3'
import { defineCachedFunction } from 'nitro/cache'
import { combineSources, defineSource } from 'vite-hub/source'

import { getGitHubStatus, normalizeGitHubActivity, type GitHubActivity } from '../utils/github-activity'
import { createGitHubClient } from '../utils/github-client'

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

const getRecentGitHubContributions = defineCachedFunction(async () => {
  try {
    const github = createGitHubClient()
    const activity = await github.graphql<GitHubActivity>(GITHUB_ACTIVITY_QUERY, {
      issues: 'type:issue author:@me is:public sort:created-desc',
      pullRequests: 'type:pr author:@me is:public sort:created-desc',
    })
    return normalizeGitHubActivity(activity)
  }
  catch (error) {
    const status = getGitHubStatus(error)
    if (status === 401) throw new HTTPError({ status: 401, statusText: 'Unauthorized', message: 'GitHub token invalid/expired' })
    if (status === 429) throw new HTTPError({ status: 429, statusText: 'Too Many Requests', message: 'GitHub rate limit exceeded' })
    if (status === 403) throw new HTTPError({ status: 403, statusText: 'Forbidden', message: 'GitHub API forbidden' })
    if (status) throw new HTTPError({ status: 502, statusText: 'Bad Gateway', message: 'Failed to fetch GitHub activity' })
    throw error
  }
}, {
  getKey: () => 'activity',
  maxAge: 60 * 5,
  name: 'github-activity',
  swr: false,
})

export const contributions = combineSources({
  sources: {
    github: defineSource({
      get: (_range: 'recent') => getRecentGitHubContributions(),
    }),
  },
})
