import { Octokit } from 'octokit'
import { createError } from 'h3'

let _octokit: Octokit

export function useOctokit() {
  if (!_octokit) {
    const { githubToken } = useRuntimeConfig()
    if (!githubToken) {
      throw createError({ statusCode: 500, message: 'Server misconfigured: set NUXT_GITHUB_TOKEN' })
    }
    _octokit = new Octokit({ auth: githubToken })
  }
  return _octokit
}

// In memory cache as this is called internally in /api/contributions
const RepoCache = new Map()

// Read more about caching functions https://hub.nuxt.com/docs/features/cache#server-functions-caching
export async function fetchRepo(owner: string, name: string) {
  if (RepoCache.has(`${owner}/${name}`)) {
    return RepoCache.get(`${owner}/${name}`)
  }
  // Fetch repository details to get owner type
  const { data } = await useOctokit().request('GET /repos/{owner}/{name}', {
    owner,
    name,
  })

  RepoCache.set(`${owner}/${name}`, data)
  return data
}
