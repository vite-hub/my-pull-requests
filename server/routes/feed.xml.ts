import { Feed } from 'feed'
import { appendHeader, defineEventHandler, getRequestURL } from 'h3'

import { contributions } from '../collections/contributions'

export default defineEventHandler(async (event) => {
  const domain = getRequestURL(event).origin
  const { user, prs } = (await contributions.get(['github', 'recent'])).contributions
  const favicon = new URL('/favicon.png', domain).href
  const feed = new Feed({
    title: `${user.name} is contributing...`,
    description: `Discover ${user.name}'s recent pull requests on GitHub`,
    id: domain,
    link: domain,
    language: 'en',
    image: favicon,
    favicon,
    copyright: `CC BY-NC-SA 4.0 2024 © ${user.name}`,
    feedLinks: {
      rss: `${domain}/feed.xml`,
    },
  })

  for (const pr of prs) {
    feed.addItem({
      link: pr.url,
      date: new Date(pr.created_at),
      title: pr.title,
      image: `https://github.com/${pr.repo.split('/')[0]}.png`,
      description: `<a href="${pr.url}">${pr.title}</a>`,
    })
  }

  appendHeader(event, 'Content-Type', 'application/xml')
  return feed.rss2()
})
