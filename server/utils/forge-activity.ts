import { NotFoundError, repoRef, type Cursor, type ForgeOrigin, type ForgeProvider, type RepoRef, type Thread, type ThreadSearchQuery } from 'forges'

import type { ActivityFilter, ActivityKind, ActivitySort } from '../../shared/utils/activity-query'
import { searchOwnForgejoThreads } from './gaps/forgejo-search'

export const FORGE_PAGE_SIZE = 50

type RepositoryDetails = Omit<ContributedRepository, 'name'> & { public: boolean }

/** Reads repository details for the stars and owner that search results lack. */
export type RepositoryReader = (provider: ForgeProvider, repo: RepoRef) => Promise<RepositoryDetails>

export async function readRepository(provider: ForgeProvider, repo: RepoRef): Promise<RepositoryDetails> {
  try {
    const { owner, stars, url, visibility } = await provider.repos.get(repo)
    return {
      ownerAvatar: owner?.avatarUrl,
      public: visibility === 'public',
      stars: stars ?? 0,
      type: /org|group/i.test(owner?.typeRaw ?? '') ? 'Organization' : 'User',
      url: url ?? '',
    }
  }
  catch (error) {
    // A repository the token cannot see is treated as private.
    if (error instanceof NotFoundError) return { public: false, stars: 0, type: 'User', url: '' }
    throw error
  }
}

const encoder = new TextEncoder()

function base64url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
}

function fromBase64url(value: string) {
  return Uint8Array.from(atob(value.replaceAll('-', '+').replaceAll('_', '/')), char => char.charCodeAt(0))
}

async function cursorKey(secret: string) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(`activity-cursor:${secret}`))
  return crypto.subtle.importKey('raw', digest, { hash: 'SHA-256', name: 'HMAC' }, false, ['sign', 'verify'])
}

/**
 * A forge cursor can hold the URL of the next page, which the server requests with its token.
 * The cursor goes to the browser signed, so the server only follows cursors it issued.
 */
export async function encodeCursor(cursor: Cursor | undefined, secret: string) {
  if (!cursor) return null
  const payload = base64url(encoder.encode(JSON.stringify(cursor)))
  const signature = await crypto.subtle.sign('HMAC', await cursorKey(secret), encoder.encode(payload))
  return `${payload}.${base64url(new Uint8Array(signature))}`
}

export async function decodeCursor(value: string, secret: string): Promise<Cursor | null> {
  const [payload, signature, extra] = value.split('.')
  if (!payload || !signature || extra !== undefined) return null
  try {
    const valid = await crypto.subtle.verify('HMAC', await cursorKey(secret), fromBase64url(signature), encoder.encode(payload))
    return valid ? JSON.parse(new TextDecoder().decode(fromBase64url(payload))) as Cursor : null
  }
  catch {
    return null
  }
}

/** Builds a `forges` search. Expects a filter that `restrictActivityFilter()` limited to the forge. */
export function toForgeSearchQuery(origin: ForgeOrigin, filter: ActivityFilter, kind: ActivityKind, sort: ActivitySort, author: string): ThreadSearchQuery {
  const repo = filter.repos[0]
  const [state] = filter.states
  return {
    author,
    direction: sort === 'oldest' ? 'asc' : 'desc',
    kind: kind === 'prs' ? 'pull_request' : 'issue',
    owner: repo ? undefined : filter.owners[0],
    perPage: FORGE_PAGE_SIZE,
    repo: repo ? repoRef(origin, repo) : undefined,
    sort: 'created',
    // With both or neither of `is:open` and `is:closed`, every state matches.
    state: filter.states.length === 1 && (state === 'closed' || state === 'open') ? state : 'all',
    text: filter.terms.length ? filter.terms.join(' ') : undefined,
  }
}

async function toItem(provider: ForgeProvider, thread: Thread, readRepo: RepositoryReader): Promise<Issue | PullRequest | null> {
  const details = await readRepo(provider, thread.ref.repo)
  if (!details.public) return null
  const base = {
    created_at: thread.createdAt?.toISOString() ?? '',
    number: Number(thread.ref.number),
    ownerAvatar: details.ownerAvatar,
    repo: `${thread.ref.repo.owner}/${thread.ref.repo.name}`,
    repoUrl: details.url,
    stars: details.stars,
    title: thread.title,
    type: details.type,
    url: thread.url ?? details.url,
  }
  if (thread.kind === 'issue') return { ...base, state: thread.state === 'open' ? 'open' : 'closed' }
  return { ...base, state: thread.state === 'merged' ? 'merged' : thread.state === 'closed' ? 'closed' : thread.isDraft ? 'draft' : 'open' }
}

/** One page of a thread search. Searches by `author` expect the account the token belongs to. */
export function searchThreadsPage(provider: ForgeProvider, query: ThreadSearchQuery) {
  return provider.forge === 'forgejo' ? searchOwnForgejoThreads(provider, query) : provider.search.threads(query).page()
}

export async function fetchForgePage(provider: ForgeProvider, query: ThreadSearchQuery, secret: string, readRepo: RepositoryReader, cursor?: Cursor) {
  const page = await searchThreadsPage(provider, { ...query, cursor })
  const items = (await Promise.all(page.items.map(thread => toItem(provider, thread, readRepo)))).filter(item => item !== null)
  return {
    cursor: await encodeCursor(page.cursor, secret),
    items,
    total: page.total ?? null,
  }
}

export async function fetchForgeUser(provider: ForgeProvider): Promise<User> {
  const me = await provider.users.me()
  return { avatar: me.avatarUrl ?? '', name: me.name || me.login, url: me.url ?? '', username: me.login }
}

export async function fetchForgeActivity(provider: ForgeProvider, forge: ForgeInfo, user: User, filter: ActivityFilter, sort: ActivitySort, secret: string, readRepo: RepositoryReader): Promise<Activity> {
  const [prs, issues] = await Promise.all((['prs', 'issues'] as const).map(kind =>
    fetchForgePage(provider, toForgeSearchQuery(provider, filter, kind, sort, user.username), secret, readRepo)))
  return {
    forge,
    issues: issues as ActivityPage<Issue>,
    prs: prs as ActivityPage<PullRequest>,
    // Only GitHub counts the repositories a person contributed to.
    repositories: null,
    user,
  }
}

/** Repositories of the most recent pull requests and issues, most starred first. */
export async function fetchForgeRepositories(provider: ForgeProvider, user: User, readRepo: RepositoryReader) {
  const page = await searchThreadsPage(provider, { author: user.username, direction: 'desc', perPage: 100, sort: 'created' })
  const refs = new Map(page.items.map(thread => [`${thread.ref.repo.owner}/${thread.ref.repo.name}`, thread.ref.repo]))
  const repositories = await Promise.all([...refs].map(async ([name, ref]) => {
    const { public: isPublic, ...details } = await readRepo(provider, ref)
    return isPublic ? { name, ...details } : null
  }))
  return repositories.filter(repository => repository !== null).sort((a, b) => b.stars - a.stars)
}
