import { forgejo, gitea, github, gitlab, type ForgeProvider } from 'forges'
import type { GitHubProvider } from 'forges/github'
import { useServerEnv } from '#vitehub/env/server'

import { forgeCapabilities, type ForgeKind } from '../../shared/utils/activity-query'

export type Forge
  = | { info: ForgeInfo, kind: 'github', provider: GitHubProvider, token: string }
    | { info: ForgeInfo, kind: Exclude<ForgeKind, 'github'>, provider: ForgeProvider, token: string }

function forgeName(kind: ForgeKind, baseUrl: string | undefined) {
  const host = baseUrl ? new URL(baseUrl).host : undefined
  if (kind === 'github') return 'GitHub'
  if (kind === 'gitlab') return 'GitLab'
  if (kind === 'forgejo') return !host || host === 'codeberg.org' ? 'Codeberg' : 'Forgejo'
  return 'Gitea'
}

/** The one forge this deployment reads, from the `FORGE`, `FORGE_BASE_URL` and `FORGE_TOKEN` Server Env. */
export function useForge(): Forge {
  const { forge } = useServerEnv()
  const kind = forge.kind
  const baseUrl = forge.baseUrl || undefined
  const token = forge.token.unseal()
  // `forges` sends no User-Agent where `WorkerGlobalScope` exists, as in Cloudflare Workers, and GitHub rejects
  // requests without one.
  const options = { auth: { type: 'token' as const, token }, baseUrl, userAgent: 'my-pull-requests (+https://github.com/vite-hub/my-pull-requests)' }
  const info = { capabilities: forgeCapabilities(kind), kind, name: forgeName(kind, baseUrl) }
  if (kind === 'github') return { info, kind, provider: github(options), token }
  if (kind === 'gitlab') return { info, kind, provider: gitlab(options), token }
  if (kind === 'forgejo') return { info, kind, provider: forgejo(options), token }
  return { info, kind, provider: gitea(options), token }
}
