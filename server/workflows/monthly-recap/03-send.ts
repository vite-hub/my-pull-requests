import { useServerEnv } from 'vite-hub/env'
import { renderEmailMarkdown } from 'vite-hub/email/markdown'
import { email } from 'vite-hub/email'

import renderMonthlyRecap from '#vitehub/emails/monthly-recap'

export default async function (recap: MonthlyRecap) {
  const { from, siteUrl, to } = useServerEnv().recap

  const forge = recap.forge ?? 'GitHub'
  const [error] = await email.send({
    ...await renderEmailMarkdown(await renderMonthlyRecap({
      forge,
      recap,
      url: new URL(`/recap/${recap.month}`, siteUrl).toString(),
    })),
    from,
    subject: `${recap.label}: your ${forge} recap`,
    to,
  })
  if (error) throw error

  return recap
}
