import { env } from 'vite-hub/env'

export default defineNuxtConfig({
  modules: ['vite-hub/nuxt', '@nuxt/eslint', '@nuxt/ui', '@vueuse/nuxt', 'nuxt-og-image', 'nuxt-skill-hub'],

  $production: {
    routeRules: {
      '/': { isr: 60 * 5 },
      '/api/activity': { isr: 60 * 5 },
      '/feed.xml': { isr: 60 * 5 },
    },
  },

  devtools: false,
  css: ['~/assets/css/main.css'],
  compatibilityDate: '2026-06-30',

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
    preset: 'cloudflare',
    kv: true,
    schedule: true,
    workflow: true,
    email: {
      driver: 'unemail/driver/cloudflare-email',
    },
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
