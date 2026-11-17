import { useServerEnv } from 'vite-hub/env'
import { renderEmailMarkdown } from 'vite-hub/email/markdown'
import { email } from 'vite-hub/email'
import { resolvePublicUrl } from 'vite-hub/runtime'

import renderMonthlyRecap from '#vitehub/emails/monthly-recap'

export default async function (recap: MonthlyRecap) {
  const { from, to } = useServerEnv().recap

  const forge = recap.forge ?? 'GitHub'
  const [error] = await email.send({
    ...await renderEmailMarkdown(await renderMonthlyRecap({
      forge,
      // The template types a value read inside `::if` as optional, which takes `undefined` but not `null`.
      recap: { ...recap, topRepository: recap.topRepository ?? undefined },
      url: new URL(`/recap/${recap.month}`, resolvePublicUrl() ?? 'http://localhost:3000').toString(),
    })),
    from,
    subject: `${recap.label}: your ${forge} recap`,
    to,
  })
  if (error) throw error

  return recap
}
