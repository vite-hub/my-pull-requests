import { monthlyRecaps } from '../../collections/monthly-recaps'

export default async function (input: { month: string }) {
  'use step'

  return monthlyRecaps.get(['github', input.month])
}
