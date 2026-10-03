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
let githubError: unknown
let incompleteResults = false
const activity = {
  issues: { nodes: [] },
  pullRequests: { nodes: [] },
  viewer: { avatarUrl: 'https://example.com/avatar.png', login: 'learner', name: null },
}

mock.module(new URL('../server/utils/github-client.ts', import.meta.url).href, {
  namedExports: {
    createGitHubClient: () => ({
      graphql: async () => {
        graphqlCalls++
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
  const first = await contributions.get('recent')
  const second = await contributions.get('recent')
  assert.deepEqual(second, first)
  assert.equal(first.contributions.user.name, 'learner')
  assert.equal(graphqlCalls, 1)

  for (const [error, status] of [
    [{ status: 401 }, 401],
    [{ status: 403 }, 403],
    [{ response: { headers: { 'x-ratelimit-remaining': '0' } }, status: 403 }, 429],
    [{ status: 500 }, 502],
  ] as const) {
    await contributions.get.invalidate('recent')
    githubError = error
    await assert.rejects(contributions.get('recent'), { status })
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
