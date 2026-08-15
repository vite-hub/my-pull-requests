import { defineWorkflow, type WorkflowExecutionContext } from 'vite-hub/workflow'

import collect from './01-collect'
import store from './02-store'
import send from './03-send'

type MonthlyRecapInput = { month: string }

async function durableMonthlyRecap({ payload }: WorkflowExecutionContext<MonthlyRecapInput>) {
  'use workflow'

  return send(await store(await collect(payload)))
}

export default defineWorkflow<MonthlyRecapInput, MonthlyRecap>(async ({ payload, steps }) => {
  let result: unknown = payload
  for (const step of Object.values(steps ?? {})) result = await step(result)
  return result as MonthlyRecap
}, { native: durableMonthlyRecap })
