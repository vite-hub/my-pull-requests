import { renderTemplate } from '#vitehub/templates'
import { useServerEnv } from '#vitehub/env/server'
import { renderEmailMarkdown } from 'vite-hub/email/markdown'
import { email } from 'vite-hub/email/server'

export default async function sendMonthlyRecap(recap: MonthlyRecap) {
  const { from, siteUrl, to } = useServerEnv().recap
  const url = new URL(`/recap/${recap.month}`, siteUrl).toString()
  const markdown = await renderTemplate('monthly-recap', { recap, url })

  await email.send({
    ...await renderEmailMarkdown(markdown),
    from,
    subject: `${recap.label}: your GitHub recap`,
    to,
  })

  return recap
}
