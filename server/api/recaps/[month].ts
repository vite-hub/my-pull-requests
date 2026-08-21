import { defineHandler, getRouterParam, HTTPError } from 'h3'
import { kv } from 'vite-hub/kv'

export default defineHandler(async (event) => {
  const month = getRouterParam(event, 'month')
  if (!month || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    throw new HTTPError({ status: 400, statusText: 'Bad Request', message: 'Month must use YYYY-MM' })
  }

  const [error, recap] = await kv.get<MonthlyRecap>(`monthly-recap:${month}`)
  if (error) throw error
  if (!recap) throw new HTTPError({ status: 404, statusText: 'Not Found', message: 'Monthly recap not found' })
  return recap
})
