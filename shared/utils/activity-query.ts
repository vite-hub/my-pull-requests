export type ActivityKind = 'issues' | 'prs'
export type ActivitySort = 'least-stars' | 'most-stars' | 'newest' | 'oldest'
export type ActivityState = 'closed' | 'draft' | 'merged' | 'open'

export type ActivityFilter = {
  created: string | null
  owners: string[]
  repos: string[]
  states: ActivityState[]
  terms: string[]
}

export const ACTIVITY_STATES: ActivityState[] = ['open', 'draft', 'merged', 'closed']
export const ACTIVITY_SORTS: ActivitySort[] = ['newest', 'oldest', 'most-stars', 'least-stars']
export const ACTIVITY_QUERY_MAX_LENGTH = 256

const OWNER = /^[a-z\d](?:[a-z\d-]{0,38})$/i
const REPO = /^[a-z\d][a-z\d-]{0,38}\/[\w.-]{1,100}$/i
const DATE = /^\d{4}-\d{2}-\d{2}$/
const CREATED = /^(?:[<>]=?\d{4}-\d{2}-\d{2}|\d{4}-\d{2}-\d{2}(?:\.\.\d{4}-\d{2}-\d{2})?)$/

/** Splits a query into `[key, value]` pairs. A quoted phrase without a key is always a title term. */
function tokenize(query: string) {
  return [...query.slice(0, ACTIVITY_QUERY_MAX_LENGTH).matchAll(/(?:(\S+?):)?"([^"]*)"?|\S+/g)]
    .map(([token, key, quoted]): [string, string] => {
      if (quoted !== undefined) return [key?.toLowerCase() ?? '', quoted]
      const separator = token.indexOf(':')
      return separator > 0 ? [token.slice(0, separator).toLowerCase(), token.slice(separator + 1)] : ['', token]
    })
}

function addUnique(list: string[], value: string) {
  if (!list.some(item => item.toLowerCase() === value.toLowerCase())) list.push(value)
}

/**
 * Reads the GitHub-like query from the URL. Only the qualifiers below survive,
 * so a shared link can never widen the search beyond the owner's public work.
 */
export function parseActivityQuery(query: unknown): ActivityFilter {
  const filter: ActivityFilter = { created: null, owners: [], repos: [], states: [], terms: [] }
  if (typeof query !== 'string') return filter

  for (const [key, value] of tokenize(query)) {
    if (key === 'repo' && REPO.test(value)) addUnique(filter.repos, value)
    else if ((key === 'org' || key === 'user' || key === 'owner') && OWNER.test(value)) addUnique(filter.owners, value)
    else if (key === 'is' && ACTIVITY_STATES.includes(value.toLowerCase() as ActivityState)) addUnique(filter.states, value.toLowerCase())
    else if (key === 'created' && CREATED.test(value)) filter.created = value
    else if (!key) {
      const term = value.replaceAll('"', '').trim()
      if (term) addUnique(filter.terms, term)
    }
  }

  filter.states.sort((a, b) => ACTIVITY_STATES.indexOf(a) - ACTIVITY_STATES.indexOf(b))
  return filter
}

function quote(term: string) {
  return /\s/.test(term) ? `"${term}"` : term
}

export function formatActivityQuery(filter: ActivityFilter) {
  return [
    ...filter.terms.map(quote),
    ...filter.states.map(state => `is:${state}`),
    ...filter.owners.map(owner => `org:${owner}`),
    ...filter.repos.map(repo => `repo:${repo}`),
    ...filter.created ? [`created:${filter.created}`] : [],
  ].join(' ')
}

export function isActivityFilterEmpty(filter: ActivityFilter) {
  return !filter.created && !filter.owners.length && !filter.repos.length && !filter.states.length && !filter.terms.length
}

export function parseActivitySort(sort: unknown): ActivitySort {
  return ACTIVITY_SORTS.includes(sort as ActivitySort) ? sort as ActivitySort : 'newest'
}

export function isActivityDate(value: string) {
  return DATE.test(value)
}

function anyOf(clauses: string[]) {
  return clauses.length > 1 ? `(${clauses.join(' OR ')})` : clauses[0]
}

const PULL_REQUEST_STATES: Record<ActivityState, string> = {
  closed: '(is:closed is:unmerged)',
  draft: 'is:draft',
  merged: 'is:merged',
  open: 'is:open',
}

const ISSUE_STATES: Partial<Record<ActivityState, string>> = {
  closed: 'is:closed',
  open: 'is:open',
}

/**
 * Builds a query for GitHub's advanced issue search (`ISSUE_ADVANCED`).
 * Every free-text term is quoted, so it cannot act as a qualifier or as `OR`.
 * Returns `null` when the filter cannot match anything of this kind.
 */
export function toGitHubSearchQuery(filter: ActivityFilter, kind: ActivityKind, sort: ActivitySort) {
  const states = kind === 'prs'
    // Closed pull requests that were never merged stay hidden unless asked for.
    ? (filter.states.length ? filter.states : ['open', 'merged'] as ActivityState[]).map(state => PULL_REQUEST_STATES[state])
    : filter.states.flatMap(state => ISSUE_STATES[state] ?? [])
  // Issues cannot be draft or merged, so a pull-request-only state selects no issues.
  if (kind === 'issues' && filter.states.length && !states.length) return null
  const scope = [...filter.owners.map(owner => `user:${owner}`), ...filter.repos.map(repo => `repo:${repo}`)]

  return [
    kind === 'prs' ? 'type:pr' : 'type:issue',
    'author:@me',
    'is:public',
    states.length ? anyOf(states) : '',
    scope.length ? anyOf(scope) : '',
    filter.created ? `created:${filter.created}` : '',
    filter.terms.length ? `in:title ${filter.terms.map(term => `"${term}"`).join(' ')}` : '',
    sort === 'oldest' ? 'sort:created-asc' : 'sort:created-desc',
  ].filter(Boolean).join(' ')
}
