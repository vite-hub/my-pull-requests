import { createOctokit } from '@github-tools/sdk'
import { useServerEnv } from '#vitehub/env/server'

export function useGitHub() {
  return createOctokit(useServerEnv().githubToken.unseal())
}
