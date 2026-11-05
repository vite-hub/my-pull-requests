import { defineHandler, getQuery } from 'h3'

import { contributions, normalizeActivityOrder, normalizeActivityQuery } from '../../sources/contributions'

export default defineHandler((event) => {
  const { q, sort } = getQuery(event)
  return contributions.get(normalizeActivityQuery(q), normalizeActivityOrder(sort))
})
