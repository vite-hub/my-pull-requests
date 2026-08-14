import { useGitHubMonthlyRecap } from '../../sources/github-monthly-recap'

export default async function (input: { month: string }) {
  const item = await useGitHubMonthlyRecap().get(input.month)
  if (!item.data) throw new Error(`GitHub recap Source returned no data for ${input.month}`)
  return item.data
}
