import type { DeepPartial } from '@nuxt/ui'
import type { CustomAppConfig } from '@nuxt/schema'

// TODO: Restore `defineAppConfig` once https://github.com/nuxt/ui/issues/6791 is fixed upstream.
const ui = {
  avatar: {
    slots: {
      root: 'ring ring-default shadow-sm',
    },
  },
  button: {
    slots: {
      base: ['transition-[color,background-color,border-color,box-shadow,transform] duration-150 ease-out active:scale-[0.98]'],
    },
  },
  colors: {
    neutral: 'stone',
    primary: 'violet',
  },
  dropdownMenu: {
    slots: {
      content: 'border border-default shadow-xl',
    },
  },
} satisfies DeepPartial<CustomAppConfig['ui']>

export default { ui }
