export default defineNuxtConfig({
  modules: ['@nuxt/eslint', '@nuxt/ui', '@vueuse/nuxt', 'nuxt-skill-hub'],

  $production: {
    routeRules: {
      '/': { isr: 60 * 5 },
      '/api/activity': { isr: 60 * 5 },
      '/api/contributions': { isr: 60 * 5 },
      '/api/issues': { isr: 60 * 5 },
      '/feed.xml': { isr: 60 * 5 },
    },
  },

  devtools: false,
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    githubToken: '',
  },

  compatibilityDate: '2026-06-30',
  nitro: { preset: 'cloudflare-module' },

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
})
