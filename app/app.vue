<script setup>
useHead({
  htmlAttrs: {
    lang: 'en',
  },
})

const { y: scroll } = useWindowScroll({ behavior: 'smooth' })
</script>

<template>
  <UApp>
    <NuxtPage />
    <p v-if="!$route.path.startsWith('/recap/')" class="py-6 pb-10 text-sm flex items-center justify-center gap-2 flex-wrap px-4">
      <UButton
        to="https://github.com/atinux/my-pull-requests"
        rel="noopener"
        target="_blank"
        color="neutral"
        variant="subtle"
        size="sm"
        icon="i-simple-icons-github"
      >
        Source code
      </UButton>
    </p>
    <UButton
      title="Scroll to top"
      aria-label="Scroll to top"
      color="neutral"
      variant="ghost"
      class="z-100 fixed bottom-3 right-3 h-10 w-10 flex justify-center items-center rounded-full transition duration-300 text-neutral-600 hover:bg-[#8882] hover:opacity-100 dark:text-white dark:hover:bg-[#8883] print:hidden"
      icon="i-lucide-arrow-up"
      :class="scroll > 200 ? 'opacity-40' : 'opacity-0! pointer-events-none'"
      @click="scroll = 0"
    />
  </UApp>
</template>
