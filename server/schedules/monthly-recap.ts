import { defineSchedule } from 'vite-hub/schedule'
import { runWorkflow } from 'vite-hub/workflow'

import { previousMonth } from '../utils/monthly-recap'

export default defineSchedule({
  cron: '0 8 1 * *',
  handler({ scheduledAt, waitUntil }) {
    const month = previousMonth(scheduledAt)
    waitUntil(runWorkflow('monthly-recap', { month }, { id: `monthly-recap:${month}` }))
  },
})
