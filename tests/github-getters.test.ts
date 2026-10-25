import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import { mock, test } from 'node:test'

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (context.parentURL?.includes('/server/') && specifier.startsWith('.') && !specifier.endsWith('.ts')) {
      return nextResolve(`${specifier}.ts`, context)
    }
    return nextResolve(specifier, context)
  },
})

let graphqlCalls = 0
const graphqlVariables: Array<Record<string, unknown>> = []
let githubError: unknown
let incompleteResults = false
const repository = { isPrivate: false, nameWithOwner: 'nuxt/nuxt', owner: { __typename: 'Organization' }, stargazerCount: 60000 }
const search = (nodes: unknown[]) => ({ issueCount: 4165, nodes, pageInfo: { endCursor: 'cursor-1', hasNextPage: true } })
const pullRequests = search([
  { createdAt: '2026-10-01T00:00:00Z', isDraft: false, mergedAt: null, number: 1, repository, state: 'CLOSED', title: 'perf: closed', url: 'https://github.com/nuxt/nuxt/pull/1' },
  { createdAt: '2026-10-02T00:00:00Z', isDraft: false, mergedAt: '2026-10-03T00:00:00Z', number: 2, repository, state: 'MERGED', title: 'perf: merged', url: 'https://github.com/nuxt/nuxt/pull/2' },
  { createdAt: '2026-10-04T00:00:00Z', isDraft: true, mergedAt: null, number: 3, repository: { ...repository, isPrivate: true }, state: 'OPEN', title: 'secret', url: 'https://github.com/nuxt/secret/pull/3' },
])
// The mock answers every GraphQL query: `search` is the field the page query reads.
const activity = {
  issues: search([]),
  pullRequests,
  search: pullRequests,
  viewer: { avatarUrl: 'https://example.com/avatar.png', login: 'learner', name: null, repositoriesContributedTo: { totalCount: 148 } },
}

mock.module(new URL('../server/utils/github-client.ts', import.meta.url).href, {
  namedExports: {
    createGitHubClient: () => ({
      graphql: async (_query: string, variables: Record<string, unknown>) => {
        graphqlCalls++
        graphqlVariables.push(variables)
        if (githubError) throw githubError
        return activity
      },
      paginate: {
        iterator: async function* () {
          yield {
            data: Object.assign([], { incomplete_results: incompleteResults, total_count: 0 }),
          }
        },
      },
      rest: {
        search: { issuesAndPullRequests: () => {} },
        users: { getAuthenticated: async () => ({ data: { avatar_url: activity.viewer.avatarUrl, login: 'learner', name: null } }) },
      },
    }),
  },
})

const { contributions } = await import('../server/sources/contributions.ts')
const { monthlyRecaps } = await import('../server/sources/monthly-recaps.ts')

test('caches activity and preserves provider error status', async () => {
  const first = await contributions.get()
  const second = await contributions.get()
  assert.deepEqual(second, first)
  assert.equal(first.user.name, 'learner')
  assert.equal(first.prs.total, 4165)
  assert.equal(first.prs.cursor, 'cursor-1')
  assert.equal(first.repositories, 148)
  assert.deepEqual(first.prs.items.map(item => [item.number, item.state]), [[1, 'closed'], [2, 'merged']])
  assert.equal(graphqlCalls, 1)

  const filtered = await contributions.get('perf org:nuxt is:merged')
  assert.equal(filtered.repositories, null)
  assert.equal(graphqlVariables.at(-1)!.pullRequests, 'type:pr author:@me is:public is:merged user:nuxt in:title "perf" sort:created-desc')
  assert.equal(graphqlVariables.at(-1)!.withIssues, false)

  const page = await contributions.page('prs', 'perf', 'oldest', 'cursor-1')
  assert.deepEqual(page.items.map(item => item.number), [1, 2])
  // Octokit reserves `query`, `method` and `url` as GraphQL variable names.
  assert.deepEqual(Object.keys(graphqlVariables.at(-1)!).sort(), ['after', 'first', 'search'])
  assert.equal(graphqlVariables.at(-1)!.search, 'type:pr author:@me is:public (is:open OR is:merged) in:title "perf" sort:created-asc')

  for (const [error, status] of [
    [{ status: 401 }, 401],
    [{ status: 403 }, 403],
    [{ response: { headers: { 'x-ratelimit-remaining': '0' } }, status: 403 }, 429],
    [{ status: 500 }, 502],
  ] as const) {
    await contributions.get.invalidate()
    githubError = error
    await assert.rejects(contributions.get(), { status })
  }
  githubError = undefined
})

test('loads the requested month and rejects incomplete searches', async () => {
  const recap = await monthlyRecaps.get('2026-09')
  assert.equal(recap.month, '2026-09')
  assert.equal(recap.user.username, 'learner')
  assert.equal(recap.days.length, 30)

  incompleteResults = true
  await assert.rejects(monthlyRecaps.get('2026-09'), /incomplete search results/)
})
