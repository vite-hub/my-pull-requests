import { createError, defineEventHandler, getRouterParam } from 'h3'
import { kv } from 'vite-hub/kv'

export default defineEventHandler(async (event) => {
  const month = getRouterParam(event, 'month')
  if (!month || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    throw createError({ statusCode: 400, message: 'Month must use YYYY-MM' })
  }

  const [error, recap] = await kv.get<MonthlyRecap>(`monthly-recap:${month}`)
  if (error) throw error
  if (!recap) throw createError({ statusCode: 404, message: 'Monthly recap not found' })
  return recap
})
