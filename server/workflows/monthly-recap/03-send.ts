import { renderTemplate } from '#vitehub/templates'
import { useServerEnv } from '#vitehub/env/server'
import { renderEmailMarkdown } from 'vite-hub/email/markdown'
import { email } from 'vite-hub/email/server'

export default async function (recap: MonthlyRecap) {
  const { from, siteUrl, to } = useServerEnv().recap

  await email.send({
    ...await renderEmailMarkdown(await renderTemplate('monthly-recap', {
      recap,
      url: new URL(`/recap/${recap.month}`, siteUrl).toString(),
    })),
    from,
    subject: `${recap.label}: your GitHub recap`,
    to,
  })

  return recap
}
