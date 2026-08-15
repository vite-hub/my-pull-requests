<script setup lang="ts">
const props = defineProps<{
  data: PullRequest | Issue
  kind: 'issue' | 'pull-request'
}>()

const owner = computed(() => props.data.repo.split('/')[0])
const repoName = computed(() => props.data.repo.split('/')[1])
const timeAgo = useTimeAgo(() => new Date(props.data.created_at))
const stateIcons: Record<string, string> = {
  'issue:closed': 'i-lucide-circle-check',
  'issue:open': 'i-lucide-circle-dot',
  'pull-request:closed': 'i-lucide-git-pull-request-closed',
  'pull-request:draft': 'i-lucide-git-pull-request-draft',
  'pull-request:merged': 'i-lucide-git-merge',
  'pull-request:open': 'i-lucide-git-pull-request-arrow',
}
const stateIcon = computed(() => stateIcons[`${props.kind}:${props.data.state}`]!)
</script>

<template>
  <div class="flex items-center gap-2 sm:gap-4">
    <a
      :href="`https://github.com/${data.repo}`"
      target="_blank"
      rel="noopener noreferrer"
      :class="['size-10 sm:size-12 shrink-0 border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-sm relative', data.type === 'Organization' ? 'rounded-lg' : 'rounded-full']"
    >
      <img
        :src="`https://github.com/${owner}.png`"
        :alt="data.repo"
        class="size-full"
        loading="lazy"
        decoding="async"
      >
    </a>

    <div class="flex-1 flex justify-between gap-2 lg:gap-4 min-w-0">
      <div class="flex flex-col min-w-0 gap-0.5 sm:gap-1">
        <a
          :href="data.url"
          target="_blank"
          rel="noopener noreferrer"
          class="text-sm sm:text-base flex items-center gap-0.5 sm:gap-1 hover:underline text-neutral-900 dark:text-white"
        >
          <UIcon
            :name="stateIcon"
            :class="{
              'text-green-500 dark:text-green-400': data.state === 'open',
              'text-neutral-500 dark:text-neutral-400': data.state === 'draft',
              'text-purple-500 dark:text-purple-400': data.state === 'merged' || (kind === 'issue' && data.state === 'closed'),
              'text-red-500 dark:text-red-400': kind === 'pull-request' && data.state === 'closed',
            }"
            class="size-4 sm:size-5 shrink-0"
          />
          <span class="truncate">{{ data.title }}</span>
        </a>

        <div class="flex gap-2 items-bottom">
          <a
            :href="`https://github.com/${data.repo}`"
            target="_blank"
            rel="noopener noreferrer"
            class="text-sm sm:text-base inline-flex gap-1 hover:text-black dark:hover:text-white truncate"
          >
            <span class="opacity-75">{{ owner }}</span>
            <span class="opacity-50">/</span>
            <span class="truncate">{{ repoName }}</span>
          </a>
          <a
            :href="`https://github.com/${data.repo}`"
            target="_blank"
            rel="noopener noreferrer"
            class="items-center hidden sm:inline-flex gap-0.5 text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white truncate"
          >
            <UIcon name="i-lucide-star" class="size-3 shrink-0" />
            <span class="text-xs">{{ formatStars(data.stars) }}</span>
          </a>
        </div>
      </div>

      <div class="flex flex-col justify-between shrink-0 text-right">
        <a
          :href="data.url"
          target="_blank"
          rel="noopener noreferrer"
          class="hover:underline text-xs sm:text-sm"
        >
          #{{ data.number }}
        </a>
        <time :datetime="data.created_at" class="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">{{ timeAgo }}</time>
      </div>
    </div>
  </div>
</template>
