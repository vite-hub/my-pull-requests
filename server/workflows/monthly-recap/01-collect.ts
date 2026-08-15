import { monthlyRecaps } from '../../utils/github-monthly-recap'

export default async function (input: { month: string }) {
  'use step'

  return monthlyRecaps.get(['github', input.month])
}
