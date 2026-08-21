import { env } from 'vite-hub/env'

export default defineNuxtConfig({
  modules: [
    'vite-hub/nuxt',
    '@nuxt/eslint',
    '@nuxt/ui',
    '@vueuse/nuxt',
    'nuxt-og-image',
    'nuxt-skill-hub',
  ],

  $production: {
    routeRules: {
      '/': { isr: 60 * 5 },
      '/api/recaps/**': { isr: 60 * 5 },
      '/recap/**': { isr: 60 * 5 },
    },
  },

  devtools: false,
  css: ['~/assets/css/main.css'],
  compatibilityDate: '2026-08-14',

  nitro: {
    wasm: {
      lazy: true,
    },
    cloudflare: {
      wrangler: {
        observability: {
          enabled: true,
          logs: {
            enabled: true,
            invocation_logs: true,
          },
          traces: {
            enabled: true,
          },
        },
      },
    },
  },

  eslint: {
    config: {
      stylistic: {
        quotes: 'single',
      },
    },
  },

  skillHub: {
    targets: ['codex'],
    generationMode: 'prepare',
  },

  vitehub: {
    name: 'my-pull-requests',
    preset: process.env.VERCEL ? 'vercel' : 'cloudflare',
    kv: true,
    schedule: true,
    workflow: true,
    email: process.env.VERCEL ? { driver: 'unemail/driver/resend' } : true,
    env: {
      server: {
        githubToken: env({
          secret: true,
          source: env.source(['GITHUB_TOKEN', 'NUXT_GITHUB_TOKEN']),
        }),
        recap: {
          from: env({ source: env.source('RECAP_FROM') }),
          siteUrl: env({ source: env.source('RECAP_SITE_URL') }),
          to: env({ source: env.source('RECAP_TO') }),
        },
      },
    },
  },
})
