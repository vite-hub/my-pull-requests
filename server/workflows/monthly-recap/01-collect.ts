import { monthlyRecaps } from '../../sources/monthly-recaps'

export default async function (input: { month: string }) {
  return monthlyRecaps.get(input.month)
}
