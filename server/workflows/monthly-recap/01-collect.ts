import { useSource } from 'vite-hub/source'

import '../../sources/github-monthly-recap'

export default async function collectMonthlyRecap(input: { month: string }) {
  const item = await useSource('githubMonthlyRecap').get(input.month)
  if (!item.data) throw new Error(`GitHub recap Source returned no data for ${input.month}`)
  return item.data
}
