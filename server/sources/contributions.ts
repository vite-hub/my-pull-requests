import type { ForgeProvider, RepoRef } from 'forges'
import { HTTPError } from 'h3'
import { defineCachedFunction } from 'nitro/cache'

import {
  formatActivityQuery,
  parseActivityQuery,
  restrictActivityFilter,
  type ActivityCapabilities,
  type ActivityKind,
  type ActivitySort,
} from '../../shared/utils/activity-query'
import { useForge } from '../utils/forge'
import {
  decodeCursor,
  fetchForgeActivity,
  fetchForgePage,
  fetchForgeRepositories,
  fetchForgeUser,
  readRepository,
  toForgeSearchQuery,
} from '../utils/forge-activity'
import { withForgeErrors } from '../utils/forge-errors'
import { fetchGitHubActivity, fetchGitHubActivityPage, fetchGitHubRepositories } from '../utils/github-activity'

/** Normalizes the URL query to what the forge can apply, so equivalent queries share one cache entry. */
export function normalizeActivityQuery(query: unknown, capabilities: ActivityCapabilities = useForge().info.capabilities) {
  return formatActivityQuery(restrictActivityFilter(parseActivityQuery(query), capabilities))
}

/** The search order. Star sorting reorders loaded results in the page. */
export function normalizeActivityOrder(sort: unknown, capabilities: ActivityCapabilities = useForge().info.capabilities): ActivitySort {
  return sort === 'oldest' && capabilities.oldest ? 'oldest' : 'newest'
}

const cachedRepository = defineCachedFunction((provider: ForgeProvider, repo: RepoRef) => readRepository(provider, repo), {
  getKey: (_provider: ForgeProvider, repo: RepoRef) => `${repo.instance}/${repo.owner}/${repo.name}`,
  maxAge: 60 * 60,
  name: 'forge-repository',
  swr: false,
})

const cachedUser = defineCachedFunction((provider: ForgeProvider) => fetchForgeUser(provider), {
  getKey: () => 'me',
  maxAge: 60 * 60,
  name: 'forge-user',
  swr: false,
})

export const contributions = {
  /** First page of pull requests and issues, with totals. Pass a normalized query. */
  get: defineCachedFunction(async (query: string = '', sort: ActivitySort = 'newest') => {
    const forge = useForge()
    const filter = parseActivityQuery(query)
    return withForgeErrors(() => forge.kind === 'github'
      ? fetchGitHubActivity(forge.provider, forge.info, filter, sort)
      : cachedUser(forge.provider).then(user => fetchForgeActivity(forge.provider, forge.info, user, filter, sort, forge.token, cachedRepository)))
  }, {
    maxAge: 60 * 5,
    name: 'activity',
    swr: false,
  }),

  /** A later page of one kind, continuing from the cursor of the previous page. */
  page: defineCachedFunction(async (kind: ActivityKind, query: string, sort: ActivitySort, after: string) => {
    const forge = useForge()
    const filter = parseActivityQuery(query)
    if (forge.kind === 'github') return withForgeErrors(() => fetchGitHubActivityPage(forge.provider, kind, filter, sort, after))

    const cursor = await decodeCursor(after, forge.token)
    if (!cursor) throw new HTTPError({ status: 400, message: 'Invalid page cursor' })
    return withForgeErrors(async () => {
      const { username } = await cachedUser(forge.provider)
      return fetchForgePage(forge.provider, toForgeSearchQuery(forge.provider, filter, kind, sort, username), forge.token, cachedRepository, cursor)
    })
  }, {
    maxAge: 60 * 5,
    name: 'activity-page',
    swr: false,
  }),

  /** Public repositories with a pull request or issue, most starred first. */
  repositories: defineCachedFunction(async () => {
    const forge = useForge()
    return withForgeErrors(() => forge.kind === 'github'
      ? fetchGitHubRepositories(forge.provider)
      : cachedUser(forge.provider).then(user => fetchForgeRepositories(forge.provider, user, cachedRepository)))
  }, {
    getKey: () => 'repositories',
    maxAge: 60 * 60,
    name: 'repositories',
    swr: false,
  }),
}
