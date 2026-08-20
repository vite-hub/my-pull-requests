export default defineAppConfig({
  ui: {
    avatar: {
      slots: {
        root: 'ring ring-default shadow-sm',
      },
    },
    button: {
      slots: {
        base: 'transition-[color,background-color,border-color,box-shadow,transform] duration-150 ease-out active:scale-[0.98]',
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
  },
})
