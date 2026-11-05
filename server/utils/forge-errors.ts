import { ForgeApiError, ForgeError, RateLimitedError } from 'forges'
import { HTTPError } from 'h3'

/** Maps a forge failure to the status this app answers with. */
export function forgeErrorStatus(error: unknown) {
  if (error instanceof RateLimitedError) return 429
  if (error instanceof ForgeApiError && (error.status === 401 || error.status === 403)) return error.status
  if (error instanceof ForgeError) return 502
}

export async function withForgeErrors<T>(request: () => Promise<T>) {
  try {
    return await request()
  }
  catch (error) {
    const status = forgeErrorStatus(error)
    if (status === 401) throw new HTTPError({ status: 401, statusText: 'Unauthorized', message: 'Forge token invalid/expired' })
    if (status === 429) throw new HTTPError({ status: 429, statusText: 'Too Many Requests', message: 'Forge rate limit exceeded' })
    if (status === 403) throw new HTTPError({ status: 403, statusText: 'Forbidden', message: 'Forge API forbidden' })
    if (status) throw new HTTPError({ status: 502, statusText: 'Bad Gateway', message: 'Failed to fetch forge activity' })
    throw error
  }
}
