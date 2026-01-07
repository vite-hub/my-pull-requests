export default defineEventHandler(async () => {
  try {
    const octokit = useOctokit()
    const userResponse = await octokit.request('GET /user')
    const user = buildUser(userResponse)

    const { data } = await octokit.request('GET /search/issues', {
      q: `type:pr+author:"${user.username}"`,
      per_page: 50,
      page: 1,
      advanced_search: 'true',
    })

    const filteredPrs = data.items.filter(pr => !(pr.state === 'closed' && !pr.pull_request?.merged_at))

    const prsWithRepos = await Promise.all(
      filteredPrs.map(async (pr) => {
        const parts = pr.repository_url.split('/')
        const owner = parts.at(-2)
        const name = parts.at(-1)
        if (!owner || !name) return null

        const repo = await fetchRepo(owner, name)
        return {
          repo: `${owner}/${name}`,
          title: pr.title,
          url: pr.html_url,
          created_at: pr.created_at,
          state: pr.pull_request?.merged_at ? 'merged' : pr.draft ? 'draft' : pr.state as 'open' | 'closed',
          number: pr.number,
          type: repo.owner.type,
          stars: repo.stargazers_count,
        } satisfies PullRequest
      }),
    )

    const prs = prsWithRepos.filter((p): p is PullRequest => p !== null)
    return { user, prs } satisfies Contributions
  }
  catch {
    throw createError({ statusCode: 500, message: 'Failed to fetch contributions' })
  }
})
