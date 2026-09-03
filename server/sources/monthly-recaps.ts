import { defineSource } from 'vite-hub/source/server'

import { createGitHubClient } from '../utils/github-client'
import { assertCompleteSearchResults, buildMonthlyRecap, getMonthRange } from '../utils/monthly-recap'

type SearchItem = Awaited<ReturnType<ReturnType<typeof createGitHubClient>['rest']['search']['issuesAndPullRequests']>>['data']['items'][number]

function repositoryName(item: SearchItem) {
  return item.repository_url.split('/').slice(-2).join('/')
}

async function search(github: ReturnType<typeof createGitHubClient>, query: string) {
  const items: SearchItem[] = []
  let total = 0
  for await (const response of github.paginate.iterator(github.rest.search.issuesAndPullRequests, { per_page: 100, q: query })) {
    assertCompleteSearchResults(response, query)
    total = response.data.total_count
    items.push(...response.data)
  }
  return { items, total }
}

async function fetchGitHubMonthlyRecap(month: string) {
  const github = createGitHubClient()
  const { data: viewer } = await github.rest.users.getAuthenticated()
  const { endDate, startDate } = getMonthRange(month)
  const author = `author:${viewer.login} is:public`
  const [openedPullRequests, mergedPullRequests, openedIssues, closedIssues] = await Promise.all([
    search(github, `type:pr ${author} created:${startDate}..${endDate}`),
    search(github, `type:pr ${author} is:merged merged:${startDate}..${endDate}`),
    search(github, `type:issue ${author} created:${startDate}..${endDate}`),
    search(github, `type:issue ${author} is:closed closed:${startDate}..${endDate}`),
  ])
  return buildMonthlyRecap({
    events: [
      ...openedPullRequests.items.map(item => ({ at: item.created_at, kind: 'opened' as const, repo: repositoryName(item) })),
      ...mergedPullRequests.items.flatMap(item => item.pull_request?.merged_at
        ? [{ at: item.pull_request.merged_at, kind: 'completed' as const, repo: repositoryName(item) }]
        : []),
      ...openedIssues.items.map(item => ({ at: item.created_at, kind: 'opened' as const, repo: repositoryName(item) })),
      ...closedIssues.items.flatMap(item => item.closed_at
        ? [{ at: item.closed_at, kind: 'completed' as const, repo: repositoryName(item) }]
        : []),
    ],
    metrics: {
      closedIssues: closedIssues.total,
      mergedPullRequests: mergedPullRequests.total,
      openedIssues: openedIssues.total,
      openedPullRequests: openedPullRequests.total,
    },
    month,
    user: {
      avatar: viewer.avatar_url,
      name: viewer.name ?? viewer.login,
      username: viewer.login,
    },
  })
}

export const monthlyRecaps = defineSource({ get: fetchGitHubMonthlyRecap })
