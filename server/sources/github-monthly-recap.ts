import { custom, registerSource, type Source } from 'vite-hub/source'

import { useGitHub } from '../utils/github-client'
import { buildMonthlyRecap, monthRange } from '../utils/monthly-recap'

type SearchItem = Awaited<ReturnType<ReturnType<typeof useGitHub>['rest']['search']['issuesAndPullRequests']>>['data']['items'][number]

function repositoryName(item: SearchItem) {
  return item.repository_url.split('/').slice(-2).join('/')
}

async function search(query: string) {
  const github = useGitHub()
  const items: SearchItem[] = []
  let total = 0
  for await (const response of github.paginate.iterator(github.rest.search.issuesAndPullRequests, { per_page: 100, q: query })) {
    total = response.data.total_count
    items.push(...response.data)
  }
  return { items, total }
}

const githubMonthlyRecap = custom({
  name: 'github-monthly-recap',
  async getKeys() {
    return []
  },
  async getItem(month) {
    const { data: viewer } = await useGitHub().rest.users.getAuthenticated()
    const { endDate, startDate } = monthRange(month)
    const author = `author:${viewer.login} is:public`
    const [openedPullRequests, mergedPullRequests, openedIssues, closedIssues] = await Promise.all([
      search(`type:pr ${author} created:${startDate}..${endDate}`),
      search(`type:pr ${author} is:merged merged:${startDate}..${endDate}`),
      search(`type:issue ${author} created:${startDate}..${endDate}`),
      search(`type:issue ${author} is:closed closed:${startDate}..${endDate}`),
    ])
    return {
      key: month,
      data: buildMonthlyRecap({
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
      }),
    }
  },
} satisfies Source<string, MonthlyRecap>)

export const useGitHubMonthlyRecap = registerSource('githubMonthlyRecap', githubMonthlyRecap)
