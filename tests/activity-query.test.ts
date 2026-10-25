import assert from 'node:assert/strict'
import { test } from 'node:test'

import { formatActivityQuery, parseActivityQuery, toGitHubSearchQuery } from '../shared/utils/activity-query.ts'

test('keeps supported qualifiers and drops the rest', () => {
  const filter = parseActivityQuery('perf "server entry" is:Merged org:nuxt repo:vuejs/core created:>=2026-01-01 author:atinux is:private label:perf')
  assert.deepEqual(filter, {
    created: '>=2026-01-01',
    owners: ['nuxt'],
    repos: ['vuejs/core'],
    states: ['merged'],
    terms: ['perf', 'server entry'],
  })
  assert.equal(formatActivityQuery(filter), 'perf "server entry" is:merged org:nuxt repo:vuejs/core created:>=2026-01-01')
})

test('normalizes equivalent queries to one string', () => {
  assert.equal(
    formatActivityQuery(parseActivityQuery('  repo:nuxt/nuxt  is:open perf is:draft repo:Nuxt/Nuxt user:unjs ')),
    'perf is:open is:draft org:unjs repo:nuxt/nuxt',
  )
  assert.equal(formatActivityQuery(parseActivityQuery(undefined)), '')
  assert.equal(formatActivityQuery(parseActivityQuery(['perf'])), '')
})

test('quotes every title term so it cannot widen the search', () => {
  const filter = parseActivityQuery('OR author:atinux "a) OR (is:private"')
  assert.equal(
    toGitHubSearchQuery(filter, 'prs', 'newest'),
    'type:pr author:@me is:public (is:open OR is:merged) in:title "OR" "a) OR (is:private" sort:created-desc',
  )
})

test('builds pull request and issue searches', () => {
  const filter = parseActivityQuery('is:closed is:merged org:nuxt repo:vuejs/core created:2026-01-01..2026-06-30')
  assert.equal(
    toGitHubSearchQuery(filter, 'prs', 'oldest'),
    'type:pr author:@me is:public (is:merged OR (is:closed is:unmerged)) (user:nuxt OR repo:vuejs/core) created:2026-01-01..2026-06-30 sort:created-asc',
  )
  assert.equal(
    toGitHubSearchQuery(filter, 'issues', 'newest'),
    'type:issue author:@me is:public is:closed (user:nuxt OR repo:vuejs/core) created:2026-01-01..2026-06-30 sort:created-desc',
  )
  assert.equal(toGitHubSearchQuery(parseActivityQuery('is:merged'), 'issues', 'newest'), null)
  assert.equal(toGitHubSearchQuery(parseActivityQuery(''), 'issues', 'newest'), 'type:issue author:@me is:public sort:created-desc')
})
