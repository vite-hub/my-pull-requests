import { defineBrowser } from 'vite-hub/browser'

export default defineBrowser(async (
  input: { url: string },
  { browser },
) => {
  const session = await browser.open()
  await session.page.goto(input.url)

  const imageUrl = await session.page.locator('meta[property="og:image"]').getAttribute('content')

  if (!imageUrl) throw new Error('Monthly recap page did not render an og:image URL.')
  return new URL(imageUrl, input.url).toString()
})
