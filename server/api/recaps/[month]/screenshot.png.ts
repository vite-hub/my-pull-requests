import type { H3Event } from 'h3'
import { createError, defineEventHandler, getRequestURL, getRouterParam } from 'h3'

type BrowserRun = {
  quickAction: (action: 'screenshot', options: {
    url: string
    viewport?: {
      width: number
      height: number
      deviceScaleFactor?: number
    }
    screenshotOptions?: {
      type?: 'png' | 'jpeg'
    }
  }) => Promise<Response>
}

type CloudflareRequest = Request & {
  runtime?: {
    cloudflare?: {
      env?: {
        BROWSER?: BrowserRun
      }
    }
  }
}

function getBrowserBinding(event: H3Event) {
  return (event.node?.req as unknown as CloudflareRequest | undefined)?.runtime?.cloudflare?.env?.BROWSER
}

export default defineEventHandler(async (event) => {
  const month = getRouterParam(event, 'month')
  if (!month || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    throw createError({ statusCode: 400, message: 'Month must use YYYY-MM' })
  }

  const browserBinding = getBrowserBinding(event)
  if (!browserBinding) {
    throw createError({ statusCode: 501, message: 'Cloudflare Browser binding BROWSER is not configured' })
  }

  const screenshot = await browserBinding.quickAction('screenshot', {
    url: new URL(`/recap/${month}?capture=1`, getRequestURL(event).origin).toString(),
    viewport: { width: 1200, height: 630, deviceScaleFactor: 2 },
    screenshotOptions: { type: 'png' },
  })

  return new Response(screenshot.body, {
    headers: {
      'content-type': 'image/png',
      'cache-control': 'public, max-age=300, s-maxage=300',
    },
  })
})
