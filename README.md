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

- 🔎 **Browse and sort contributions** across public GitHub repositories with [Sources](./server/sources)
- 📰 **Follow new activity** through an RSS feed
- 📅 **Generate monthly recaps** with totals, trends, and a top repository using [Schedule](./server/schedules) and [Workflow](./server/workflows)
- 🖼️ **Share each recap** as a page or image, or send it with [Email](./server/emails)
- 💾 **Store generated recaps** with [KV](./server/workflows/monthly-recap/02-store.ts)
- 🔐 **Load GitHub and email configuration** with [Env](./nuxt.config.ts)

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
