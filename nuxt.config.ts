import { env } from 'vite-hub/env'

const isVercel = Boolean(process.env.VERCEL)

export default defineNuxtConfig({
  modules: [
    'vite-hub/nuxt',
    '@nuxt/eslint',
    '@nuxt/ui',
    '@vueuse/nuxt',
    'nuxt-charts',
    'nuxt-og-image',
    'nuxt-skill-hub',
  ],

  $production: {
    routeRules: {
      '/': { isr: 60 * 5 },
      '/api/activity': { isr: 60 * 5 },
      '/api/recaps/**': { isr: 60 * 5 },
      '/feed.xml': { isr: 60 * 5 },
      '/recap/**': { isr: 60 * 5 },
    },
  },

  devtools: false,
  css: ['~/assets/css/main.css'],
  compatibilityDate: '2026-08-14',

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
    preset: isVercel ? 'vercel' : 'cloudflare',
    kv: true,
    schedule: isVercel ? { providerOutput: 'standalone' } : true,
    workflow: true,
    email: isVercel
      ? {
          driver: 'unemail/driver/resend',
          options: {
            apiKey: env({ secret: true, source: env.source('RESEND_API_KEY') }),
          },
        }
      : {
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
