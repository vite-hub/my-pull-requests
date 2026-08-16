import { kv } from 'vite-hub/kv'

export default async function (recap: MonthlyRecap) {
  const [error] = await kv.set(`monthly-recap:${recap.month}`, recap)
  if (error) throw error
  return recap
}
