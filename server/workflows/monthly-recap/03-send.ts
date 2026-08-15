import { useServerEnv } from '#vitehub/env/server'
import { renderEmailMarkdown } from 'vite-hub/email/markdown'
import { email } from 'vite-hub/email/server'

import renderMonthlyRecap from '#vitehub/emails/monthly-recap'

export default async function (recap: MonthlyRecap) {
  'use step'

  const { from, siteUrl, to } = useServerEnv().recap

  await email.send({
    ...await renderEmailMarkdown(await renderMonthlyRecap({
      recap,
      url: new URL(`/recap/${recap.month}`, siteUrl).toString(),
    })),
    from,
    subject: `${recap.label}: your GitHub recap`,
    to,
  })

  return recap
}
