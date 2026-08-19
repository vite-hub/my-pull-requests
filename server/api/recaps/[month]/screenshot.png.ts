import { runBrowserContent } from 'vite-hub/browser/actions'
import { createError, defineEventHandler, getRequestURL, getRouterParam } from 'h3'

function findOgImage(html: string) {
  const match = html.match(/<meta\b(?=[^>]*\bproperty=["']og:image["'])(?=[^>]*\bcontent=["']([^"']+)["'])[^>]*>/i)
  return match?.[1]?.replaceAll('&amp;', '&')
}

export default defineEventHandler(async (event) => {
  const month = getRouterParam(event, 'month')
  if (!month || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    throw createError({ statusCode: 400, message: 'Month must use YYYY-MM' })
  }

  const recapUrl = new URL(`/recap/${month}`, getRequestURL(event).origin)
  const [pageError, html] = await runBrowserContent({
    url: recapUrl.toString(),
  })
  if (pageError) {
    throw createError({ statusCode: 502, message: pageError.message })
  }

  const imageUrl = findOgImage(html)
  if (!imageUrl) {
    throw createError({ statusCode: 502, message: 'Monthly recap page did not render an og:image URL' })
  }

  const image = await fetch(new URL(imageUrl, recapUrl).toString())
  if (!image.ok) {
    throw createError({ statusCode: 502, message: `Could not download monthly recap image: ${image.status}` })
  }

  return new Response(image.body, {
    headers: {
      'content-type': image.headers.get('content-type') || 'image/png',
      'cache-control': 'public, max-age=300, s-maxage=300',
    },
  })
})
