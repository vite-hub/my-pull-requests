import { defineHandler, getQuery } from 'h3'

import { contributions, normalizeActivityQuery } from '../../sources/contributions'

export default defineHandler((event) => {
  const { q, sort } = getQuery(event)
  return contributions.get(normalizeActivityQuery(q), sort === 'oldest' ? 'oldest' : 'newest')
})
