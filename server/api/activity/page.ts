import { defineHandler, getQuery, HTTPError } from 'h3'

import { contributions, normalizeActivityQuery } from '../../sources/contributions'

export default defineHandler((event) => {
  const { after, kind, q, sort } = getQuery(event)
  if (kind !== 'issues' && kind !== 'prs') throw new HTTPError({ status: 400, message: 'Unknown activity kind' })
  if (typeof after !== 'string' || !after || after.length > 200) throw new HTTPError({ status: 400, message: 'Missing page cursor' })
  return contributions.page(kind, normalizeActivityQuery(q), sort === 'oldest' ? 'oldest' : 'newest', after)
})
