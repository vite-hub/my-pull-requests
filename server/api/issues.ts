export default defineEventHandler(async () => {
  try {
    const octokit = useOctokit()
    const userResponse = await octokit.request('GET /user')
    const user = buildUser(userResponse)

    const { data } = await octokit.request('GET /search/issues', {
      q: `type:issue+author:"${user.username}"`,
      per_page: 50,
      page: 1,
      advanced_search: 'true',
    })

    const issuesWithRepos = await Promise.all(
      data.items.map(async (issue) => {
        const parts = issue.repository_url.split('/')
        const owner = parts.at(-2)
        const name = parts.at(-1)
        if (!owner || !name) return null

        const repo = await fetchRepo(owner, name)
        // If the token can see private repos, don't leak them in the public response.
        if (repo?.private) return null
        return {
          repo: `${owner}/${name}`,
          title: issue.title,
          url: issue.html_url,
          created_at: issue.created_at,
          state: issue.state as 'open' | 'closed',
          number: issue.number,
          type: repo.owner.type,
          stars: repo.stargazers_count,
        } satisfies Issue
      }),
    )

    const issues = issuesWithRepos.filter((i): i is Issue => i !== null)
    return { user, issues } satisfies Issues
  }
  catch (err) {
    const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null
    const getNumber = (v: unknown): number | undefined => typeof v === 'number' ? v : undefined
    const getString = (v: unknown): string | undefined => typeof v === 'string' ? v : undefined

    const status = isRecord(err) ? getNumber(err.status) : undefined
    const response = isRecord(err) && isRecord(err.response) ? err.response : undefined
    const headers = response && isRecord(response.headers) ? response.headers : undefined

    const rateRemaining = headers ? getString(headers['x-ratelimit-remaining']) : undefined
    const isRateLimited = status === 403 && rateRemaining === '0'

    console.error('[api/issues] GitHub request failed', {
      status,
      message: err instanceof Error ? err.message : String(err),
      rateLimited: isRateLimited || undefined,
    })

    if (status === 401) {
      throw createError({ statusCode: 401, message: 'GitHub token invalid/expired' })
    }
    if (isRateLimited) {
      throw createError({ statusCode: 429, message: 'GitHub rate limit exceeded' })
    }
    if (status === 403) {
      throw createError({ statusCode: 403, message: 'GitHub API forbidden' })
    }

    if (isRecord(err) && getNumber(err.statusCode)) {
      throw err
    }

    throw createError({ statusCode: 500, message: 'Failed to fetch issues' })
  }
})
