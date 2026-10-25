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
      // Vercel caches one page per shared filter link.
      '/': { isr: { expiration: 60 * 5, allowQuery: ['q', 'sort', 'tab'] } },
      '/api/recaps/**': { isr: 60 * 5 },
      '/recap/**': { isr: 60 * 5 },
    },
  },

  devtools: false,
  css: ['~/assets/css/main.css'],
  compatibilityDate: '2026-08-14',

  nitro: {
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
    email: process.env.VERCEL
      ? {
          driver: 'resend',
          options: {
            apiKey: env({ secret: true, source: env.source('RESEND_API_KEY') }),
          },
        }
      : true,
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
