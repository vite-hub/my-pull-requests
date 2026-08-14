// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  { ignores: ['.vitehub/**'] },
).overrideRules({
  'vue/max-attributes-per-line': ['warn', { singleline: 3 }],
})
