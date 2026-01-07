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
  catch {
    throw createError({ statusCode: 500, message: 'Failed to fetch issues' })
  }
})
