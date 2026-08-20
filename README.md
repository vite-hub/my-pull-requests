# ViteHub Pull Requests

A public dashboard for recent open source contributions, plus a shareable GitHub recap generated every month.

[View it live →](https://prs.onmax.me)

## Recent contributions

See my latest pull requests and issues at [prs.onmax.me](https://prs.onmax.me).

[![Recent GitHub contributions](.github/assets/landing.jpg)](https://prs.onmax.me)

## Monthly recap

Every month, get an email with a summary of what you shipped. See my [July 2026 recap](https://prs.onmax.me/recap/2026-07).

[![Monthly GitHub recap](.github/assets/monthly-recap.jpg)](https://prs.onmax.me/recap/2026-07)

## Features

- 🔎 **Browse and sort contributions** across public GitHub repositories
- 📰 **Follow new activity** through an RSS feed
- 📅 **Generate monthly recaps** with totals, trends, and a top repository
- 🖼️ **Share or email each recap** as a page, image, or message

## Build with ViteHub

- 🔗 **Fetch GitHub activity** with Sources and Collections
- ⏱️ **Run monthly jobs** with Schedule and Workflow
- 💾 **Store recaps** with portable KV
- 📨 **Send Markdown email** through provider adapters
- 🌍 **Deploy across hosts** with Cloudflare, Vercel, or Node presets

## Stack

[ViteHub](https://vitehub.dev) · Nuxt · Vue · Nuxt UI · Nitro · GitHub API

## Start

Requires Node.js 24.15+ and pnpm 11.

```sh
git clone https://github.com/vite-hub/my-pull-requests.git
cd my-pull-requests
pnpm install
cp .env.example .env
```

Add a [fine-grained GitHub token](https://github.com/settings/personal-access-tokens/new) to `.env`:

```dotenv
NUXT_GITHUB_TOKEN=your-github-token
```

```sh
pnpm dev
```

Monthly email also needs `RECAP_FROM`, `RECAP_TO`, and `RECAP_SITE_URL`.

## Deploy

Choose a ViteHub preset in `nuxt.config.ts`, configure KV and email for that host, then run `pnpm build`. See the [host support matrix](https://vitehub.dev/docs/frameworks-hosts/support-matrix).

## Credits

Based on [atinux/my-pull-requests](https://github.com/atinux/my-pull-requests), inspired by [Anthony Fu](https://github.com/antfu)'s [releases.antfu.me](https://github.com/antfu/releases.antfu.me).

## License

[MIT](./LICENSE)
