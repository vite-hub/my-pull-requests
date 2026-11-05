import type { Cursor, ForgeProvider, Page, Thread, ThreadSearchQuery } from 'forges'

type ForgejoIssue = {
  closed_at?: string | null
  created_at?: string
  html_url?: string
  number: number
  pull_request?: { draft?: boolean, merged?: boolean, merged_at?: string | null } | null
  repository?: { full_name: string }
  state: 'closed' | 'open'
  title: string
  user?: { login: string }
}

/**
 * Searches the threads of the account the token belongs to on Forgejo, or in one Gitea repository.
 *
 * Forgejo's issue search ignores `created_by`, which `search.threads({ author })` in `forges` 0.3 sends.
 * The search then returns every thread on the instance with its total, and `forges` drops the ones by
 * other authors, so pages come back nearly empty. The search does apply `created=true` to the signed-in
 * account, and a repository's issue list does apply `created_by`.
 * Gitea's `forges` repository search filters the global search after pagination, so use the repository
 * issue list there too, keeping both pages and totals scoped to the requested repository.
 */
export async function searchOwnForgejoThreads(provider: ForgeProvider, query: ThreadSearchQuery): Promise<Page<Thread>> {
  const page = Number(query.cursor?.token ?? 1)
  const limit = query.perPage ?? 50
  const repo = query.repo
  const response = await provider.request<ForgejoIssue[]>('GET', repo ? `/repos/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.name)}/issues` : '/repos/issues/search', {
    query: {
      limit,
      page,
      q: query.text,
      since: query.since?.toISOString(),
      state: query.state ?? 'all',
      type: query.kind === 'pull_request' ? 'pulls' : query.kind === 'issue' ? 'issues' : undefined,
      ...repo ? { created_by: query.author } : { created: true, owner: query.owner },
    },
    signal: query.signal,
  })
  const totalHeader = response.headers.get('x-total-count')
  const total = totalHeader === null ? undefined : Number(totalHeader)
  const items = (Array.isArray(response.data) ? response.data : []).flatMap((issue): Thread[] => {
    const [owner = '', name = ''] = issue.repository?.full_name.split('/') ?? []
    const repository = repo ?? (name ? { forge: provider.forge, instance: provider.instance, name, owner } : undefined)
    // A server that ignores `created` returns other authors too.
    if (!repository || issue.user?.login.toLowerCase() !== query.author?.toLowerCase()) return []
    const kind = issue.pull_request ? 'pull_request' : 'issue'
    const date = (value: string | null | undefined) => value ? new Date(value) : undefined
    return [{
      assignees: [],
      closedAt: date(issue.closed_at),
      createdAt: date(issue.created_at),
      mergedAt: date(issue.pull_request?.merged_at),
      isDraft: !!issue.pull_request?.draft,
      kind,
      labels: [],
      raw: issue,
      ref: { forge: provider.forge, instance: provider.instance, kind, number: String(issue.number), repo: repository },
      reviewers: [],
      state: issue.pull_request?.merged ? 'merged' : issue.state,
      title: issue.title,
      url: issue.html_url,
    }]
  })
  const reportedTotal = total !== undefined && Number.isFinite(total) ? total : undefined
  const hasNextPage = reportedTotal !== undefined ? page * limit < reportedTotal : response.data.length === limit
  const next: Cursor | undefined = hasNextPage ? { token: String(page + 1) } : undefined
  return { cursor: next, items, total: reportedTotal }
}
