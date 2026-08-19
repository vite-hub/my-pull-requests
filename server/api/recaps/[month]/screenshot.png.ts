import { runBrowser } from 'vite-hub/browser'
import { createError, defineEventHandler, getRequestURL, getRouterParam } from 'h3'

const monthlyRecapImageBrowser = String('monthly-recap-image')

export default defineEventHandler(async (event) => {
  const month = getRouterParam(event, 'month')
  if (!month || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    throw createError({ statusCode: 400, message: 'Month must use YYYY-MM' })
  }

  const [error, imageUrl] = await runBrowser(monthlyRecapImageBrowser, {
    url: new URL(`/recap/${month}`, getRequestURL(event).origin).toString(),
  })
  if (error) throw createError({ statusCode: 502, message: error.message })
  if (typeof imageUrl !== 'string') {
    throw createError({ statusCode: 502, message: 'Monthly recap image URL was not returned' })
  }

  const image = await fetch(imageUrl)
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
