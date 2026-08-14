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
      <UButton
        to="https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fatinux%2Fmy-pull-requests&env=NUXT_GITHUB_TOKEN&envDescription=Create%20a%20GitHub%20token%20with%20no%20special%20scope.&envLink=https%3A%2F%2Fgithub.com%2Fsettings%2Fpersonal-access-tokens%2Fnew&project-name=my-pull-requests&demo-title=My%20Pull%20Requests&demo-description=Create%20a%20website%20with%20an%20RSS%20feed%20of%20your%20recent%20GitHub%20pull%20requests%20across%20the%20Open%20Source%20projects%20you%20contribute%20to.&demo-url=https%3A%2F%2Fprs.atinux.com&demo-image=https%3A%2F%2Fprs.atinux.com%2Fog.png"
        target="_blank"
        rel="noopener"
        color="neutral"
        variant="solid"
        size="sm"
        icon="i-simple-icons-vercel"
      >
        Deploy with Vercel
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
