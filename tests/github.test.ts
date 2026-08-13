import assert from 'node:assert/strict'
import test from 'node:test'

import { githubGraphql } from '@vite-hub/source'
import { getViteHubErrorShape } from '@vite-hub/runtime'

import { mapGitHubActivity } from '../server/utils/github.ts'

const publicRepo = {
  isPrivate: false,
  nameWithOwner: 'vite-hub/vitehub',
  owner: { __typename: 'Organization' as const },
  stargazerCount: 18,
}

test('maps public GitHub activity and excludes private or unmerged records', () => {
  const activity = mapGitHubActivity({
    viewer: { avatarUrl: 'https://example.com/avatar.png', login: 'onmax', name: null },
    pullRequests: {
      nodes: [
        { createdAt: '2026-08-13T00:00:00Z', isDraft: false, mergedAt: null, number: 1, repository: publicRepo, state: 'OPEN', title: 'Open', url: 'https://example.com/1' },
        { createdAt: '2026-08-12T00:00:00Z', isDraft: false, mergedAt: null, number: 2, repository: publicRepo, state: 'CLOSED', title: 'Closed', url: 'https://example.com/2' },
        { createdAt: '2026-08-11T00:00:00Z', isDraft: false, mergedAt: '2026-08-12T00:00:00Z', number: 3, repository: publicRepo, state: 'MERGED', title: 'Merged', url: 'https://example.com/3' },
      ],
    },
    issues: {
      nodes: [
        { createdAt: '2026-08-13T00:00:00Z', number: 4, repository: publicRepo, state: 'OPEN', title: 'Issue', url: 'https://example.com/4' },
        { createdAt: '2026-08-13T00:00:00Z', number: 5, repository: { ...publicRepo, isPrivate: true }, state: 'OPEN', title: 'Private', url: 'https://example.com/5' },
      ],
    },
  })

  assert.equal(activity.contributions.user.name, 'onmax')
  assert.deepEqual(activity.contributions.prs.map(pr => pr.state), ['open', 'merged'])
  assert.deepEqual(activity.issues.issues.map(issue => issue.number), [4])
})

test('GitHub GraphQL Source deduplicates and scopes cached results by auth', async () => {
  let calls = 0
  let token = 'first'
  const source = githubGraphql<{ viewer: string }>({
    auth: () => token,
    cache: { maxAge: 60 },
    query: '{ viewer { login } }',
    async request(_query, parameters) {
      calls += 1
      return { viewer: String(parameters?.headers && (parameters.headers as Record<string, string>).authorization) }
    },
  })
  const context = { rootDir: process.cwd() }

  const [first, duplicate] = await Promise.all([
    source.getItem('result', context),
    source.getItem('result', context),
  ])
  token = 'second'
  const second = await source.getItem('result', context)

  assert.equal(calls, 2)
  assert.deepEqual(first.data, duplicate.data)
  assert.notDeepEqual(first.data, second.data)
})

test('GitHub GraphQL Source normalizes rate limits', async () => {
  const source = githubGraphql({
    query: '{ viewer { login } }',
    async request() {
      throw { headers: { 'x-ratelimit-remaining': '0', 'status': '403' } }
    },
  })

  await assert.rejects(
    source.getItem('result', { rootDir: process.cwd() }),
    error => getViteHubErrorShape(error)?.details?.status === 429,
  )
})
