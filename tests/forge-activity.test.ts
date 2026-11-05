import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import { test } from 'node:test'

import type { ForgeProvider, RepoRef } from 'forges'

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (context.parentURL?.includes('/server/') && specifier.startsWith('.') && !specifier.endsWith('.ts')) {
      return nextResolve(`${specifier}.ts`, context)
    }
    return nextResolve(specifier, context)
  },
})

const { decodeCursor, encodeCursor, fetchForgePage, toForgeSearchQuery } = await import('../server/utils/forge-activity.ts')
const { forgeCapabilities, parseActivityQuery, restrictActivityFilter } = await import('../shared/utils/activity-query.ts')

const origin = { forge: 'gitlab', instance: 'gitlab.com' } as const
const repo = (owner: string, name: string) => ({ ...origin, name, owner }) as RepoRef
const thread = (number: number, state: string, repository: RepoRef, extra: object = {}) => ({
  createdAt: new Date(`2026-10-0${number}T00:00:00Z`),
  isDraft: false,
  kind: 'pull_request',
  ref: { ...origin, kind: 'pull_request', number: String(number), repo: repository },
  state,
  title: `perf: ${number}`,
  url: `https://gitlab.com/${repository.owner}/${repository.name}/-/merge_requests/${number}`,
  ...extra,
})

test('builds a forges search from a filter the forge can apply', () => {
  const gitlab = forgeCapabilities('gitlab')
  const filter = restrictActivityFilter(parseActivityQuery('perf is:merged is:open org:gitlab-org repo:gitlab-org/gitlab created:>=2026-01-01'), gitlab)
  assert.deepEqual(filter, { created: null, owners: [], repos: ['gitlab-org/gitlab'], states: ['open'], terms: ['perf'] })

  const query = toForgeSearchQuery(origin, filter, 'prs', 'oldest', 'learner')
  assert.equal(query.author, 'learner')
  assert.equal(query.kind, 'pull_request')
  assert.equal(query.state, 'open')
  assert.equal(query.text, 'perf')
  assert.equal(query.direction, 'asc')
  assert.equal(query.owner, undefined)
  assert.deepEqual([query.repo?.owner, query.repo?.name], ['gitlab-org', 'gitlab'])

  const owner = toForgeSearchQuery(origin, parseActivityQuery('org:gitlab-org/frontend'), 'issues', 'newest', 'learner')
  assert.deepEqual([owner.owner, owner.repo, owner.state, owner.kind, owner.direction], ['gitlab-org/frontend', undefined, 'all', 'issue', 'desc'])
})

test('keeps one scope on forges that search one at a time', () => {
  const forgejo = forgeCapabilities('forgejo')
  assert.deepEqual(restrictActivityFilter(parseActivityQuery('org:a org:b'), forgejo).owners, ['b'])
  assert.deepEqual(restrictActivityFilter(parseActivityQuery('org:a repo:a/x repo:b/y'), forgejo), { created: null, owners: [], repos: ['b/y'], states: [], terms: [] })
  assert.equal(forgejo.oldest, false)
})

test('reads a page without private repositories and signs its cursor', async () => {
  const project = repo('gitlab-org', 'gitlab')
  const secret = repo('learner', 'secret')
  const provider = {
    ...origin,
    search: {
      threads: () => ({
        page: async () => ({
          cursor: { nextUrl: 'https://gitlab.com/api/v4/merge_requests?page=2' },
          items: [
            thread(1, 'merged', project, { mergedAt: new Date('2026-10-02T00:00:00Z') }),
            thread(2, 'open', project, { isDraft: true }),
            thread(3, 'open', secret),
          ],
          total: 3,
        }),
      }),
    },
  } as unknown as ForgeProvider
  const readRepo = async (_provider: ForgeProvider, ref: RepoRef) => ref.name === 'secret'
    ? { public: false, stars: 0, type: 'User' as const, url: '' }
    : { ownerAvatar: 'https://gitlab.com/gitlab-org.png', public: true, stars: 24000, type: 'Organization' as const, url: 'https://gitlab.com/gitlab-org/gitlab' }

  const page = await fetchForgePage(provider, toForgeSearchQuery(origin, parseActivityQuery(''), 'prs', 'newest', 'learner'), 'token', readRepo)
  assert.equal(page.total, 3)
  assert.deepEqual(page.items.map(item => [item.number, item.state, item.repo, item.stars]), [
    [1, 'merged', 'gitlab-org/gitlab', 24000],
    [2, 'draft', 'gitlab-org/gitlab', 24000],
  ])
  assert.equal(page.items[0]!.repoUrl, 'https://gitlab.com/gitlab-org/gitlab')

  assert.deepEqual(await decodeCursor(page.cursor!, 'token'), { nextUrl: 'https://gitlab.com/api/v4/merge_requests?page=2' })
  assert.equal(await decodeCursor(page.cursor!, 'another token'), null)
  const forged = await encodeCursor({ nextUrl: 'https://attacker.example/steal' }, 'another token')
  assert.equal(await decodeCursor(forged!, 'token'), null)
  assert.equal(await decodeCursor('not-a-cursor', 'token'), null)
})

test('searches the signed-in account on Forgejo, which ignores created_by', async () => {
  const { searchOwnForgejoThreads } = await import('../server/utils/gaps/forgejo-search.ts')
  const requests: Array<{ path: string, query: Record<string, unknown> }> = []
  const issue = (number: number, login: string) => ({
    created_at: '2026-10-01T00:00:00Z',
    html_url: `https://codeberg.org/forgejo/forgejo/pulls/${number}`,
    number,
    pull_request: { draft: false, merged: true, merged_at: '2026-10-02T00:00:00Z' },
    repository: { full_name: 'forgejo/forgejo' },
    state: 'closed',
    title: `perf: ${number}`,
    user: { login },
  })
  const provider = {
    forge: 'forgejo',
    instance: 'codeberg.org',
    request: async (_method: string, path: string, options: { query: Record<string, unknown> }) => {
      requests.push({ path, query: options.query })
      return { data: [issue(1, 'Learner'), issue(2, 'someone-else')], headers: new Headers({ 'x-total-count': '120' }) }
    },
  } as unknown as ForgeProvider

  const page = await searchOwnForgejoThreads(provider, { author: 'learner', kind: 'pull_request', owner: 'forgejo', perPage: 50, state: 'all', text: 'perf' })
  assert.deepEqual(requests[0], { path: '/repos/issues/search', query: { created: true, limit: 50, owner: 'forgejo', page: 1, q: 'perf', since: undefined, state: 'all', type: 'pulls' } })
  assert.deepEqual(page.items.map(thread => [thread.ref.number, thread.state, thread.ref.repo.owner, thread.ref.repo.name]), [['1', 'merged', 'forgejo', 'forgejo']])
  assert.equal(page.total, 120)
  assert.deepEqual(page.cursor, { token: '2' })

  await searchOwnForgejoThreads(provider, { author: 'learner', cursor: { token: '3' }, kind: 'issue', repo: repo('forgejo', 'forgejo'), perPage: 50 })
  assert.equal(requests[1]!.path, '/repos/forgejo/forgejo/issues')
  assert.deepEqual([requests[1]!.query.created_by, requests[1]!.query.created, requests[1]!.query.page, requests[1]!.query.type], ['learner', undefined, 3, 'issues'])
})

test('continues Forgejo pagination when the total header is absent', async () => {
  const { searchOwnForgejoThreads } = await import('../server/utils/gaps/forgejo-search.ts')
  const provider = {
    forge: 'forgejo',
    instance: 'codeberg.org',
    request: async () => ({
      data: [{ number: 1, state: 'open', title: 'perf', repository: { full_name: 'forgejo/forgejo' }, user: { login: 'learner' } }],
      headers: new Headers(),
    }),
  } as unknown as ForgeProvider
  const page = await searchOwnForgejoThreads(provider, { author: 'learner', kind: 'issue', perPage: 1 })
  assert.equal(page.total, undefined)
  assert.deepEqual(page.cursor, { token: '2' })
})
