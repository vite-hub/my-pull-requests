import { useServerEnv } from '#vitehub/env/server'
import { renderEmailMarkdown } from 'vite-hub/email/markdown'
import { email } from 'vite-hub/email/server'

import { monthlyRecapEmail } from '../../templates/monthly-recap'

export default async function (recap: MonthlyRecap) {
  const { from, siteUrl, to } = useServerEnv().recap

  await email.send({
    ...await renderEmailMarkdown(monthlyRecapEmail, {
      data: {
        recap,
        url: new URL(`/recap/${recap.month}`, siteUrl).toString(),
      },
    }),
    from,
    subject: `${recap.label}: your GitHub recap`,
    to,
  })

  return recap
}
