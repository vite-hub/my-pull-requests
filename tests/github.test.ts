import assert from 'node:assert/strict'
import test from 'node:test'

import { getGitHubStatus, normalizeGitHubActivity } from '../server/utils/github.ts'

const publicRepo = {
  isPrivate: false,
  nameWithOwner: 'vite-hub/vitehub',
  owner: { __typename: 'Organization' as const },
  stargazerCount: 18,
}

test('maps public GitHub activity and excludes private or unmerged records', () => {
  const activity = normalizeGitHubActivity({
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

test('normalizes GitHub response statuses', () => {
  assert.equal(getGitHubStatus({ response: { headers: { 'x-ratelimit-remaining': '0' } }, status: 403 }), 429)
  assert.equal(getGitHubStatus({ response: { headers: { 'retry-after': '60' } }, status: 403 }), 429)
  assert.equal(getGitHubStatus({ status: 401 }), 401)
  assert.equal(getGitHubStatus({ response: { headers: { 'retry-after': '60' } }, status: 500 }), 500)
  assert.equal(getGitHubStatus({ response: { status: 401 } }), undefined)
})
