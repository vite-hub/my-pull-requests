import { getGitHubMonthlyRecap } from '../../utils/github-monthly-recap'

export default async function (input: { month: string }) {
  'use step'

  return getGitHubMonthlyRecap(input.month)
}
