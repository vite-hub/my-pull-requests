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
  <article class="contribution-item">
    <a
      :href="`https://github.com/${data.repo}`"
      target="_blank"
      rel="noopener noreferrer"
      class="repo-avatar"
    >
      <UAvatar
        :src="`https://github.com/${owner}.png`"
        :alt="data.repo"
        size="xl"
        :class="data.type === 'Organization' ? 'rounded-lg' : 'rounded-full'"
      />
    </a>

    <div class="contribution-content">
      <div class="contribution-main">
        <a
          :href="data.url"
          target="_blank"
          rel="noopener noreferrer"
          class="contribution-title"
        >
          <UIcon
            :name="stateIcon"
            :class="{
              'text-success': data.state === 'open',
              'text-muted': data.state === 'draft',
              'text-primary': data.state === 'merged' || (kind === 'issue' && data.state === 'closed'),
              'text-error': kind === 'pull-request' && data.state === 'closed',
            }"
            class="state-icon"
          />
          <span class="truncate">{{ data.title }}</span>
        </a>

        <div class="contribution-meta">
          <a
            :href="`https://github.com/${data.repo}`"
            target="_blank"
            rel="noopener noreferrer"
            class="repo-link"
          >
            <span>{{ owner }}</span>
            <span class="text-dimmed">/</span>
            <span class="truncate">{{ repoName }}</span>
          </a>
          <a
            :href="`https://github.com/${data.repo}`"
            target="_blank"
            rel="noopener noreferrer"
            class="star-count"
          >
            <UIcon name="i-lucide-star" class="size-3.5 shrink-0" />
            <span>{{ formatStars(data.stars) }}</span>
          </a>
        </div>
      </div>

      <div class="contribution-aside">
        <a
          :href="data.url"
          target="_blank"
          rel="noopener noreferrer"
          class="issue-number"
        >
          #{{ data.number }}
        </a>
        <time :datetime="data.created_at">{{ timeAgo }}</time>
      </div>
    </div>
  </article>
</template>

<style scoped>
.contribution-item {
  align-items: center;
  display: flex;
  gap: 1rem;
  padding: 1rem 1.125rem;
  transition: background-color 150ms ease;
}

.contribution-item + .contribution-item {
  border-top: 1px solid var(--ui-border-muted);
}

.contribution-item:hover {
  background: var(--ui-bg-muted);
}

.repo-avatar {
  flex: none;
}

.contribution-content {
  display: flex;
  flex: 1;
  gap: 1rem;
  justify-content: space-between;
  min-width: 0;
}

.contribution-main {
  display: flex;
  flex-direction: column;
  gap: .375rem;
  min-width: 0;
}

.contribution-title {
  align-items: center;
  color: var(--ui-text-highlighted);
  display: flex;
  font-size: .9375rem;
  font-weight: 600;
  gap: .5rem;
  min-width: 0;
}

.contribution-title:hover,
.issue-number:hover {
  text-decoration: underline;
  text-underline-offset: 3px;
}

.state-icon {
  flex: none;
  height: 1.125rem;
  width: 1.125rem;
}

.contribution-meta {
  align-items: center;
  color: var(--ui-text-muted);
  display: flex;
  font-size: .8125rem;
  gap: .75rem;
  min-width: 0;
}

.repo-link,
.star-count {
  align-items: center;
  display: inline-flex;
}

.repo-link {
  gap: .25rem;
  min-width: 0;
}

.repo-link:hover,
.star-count:hover {
  color: var(--ui-text-highlighted);
}

.star-count {
  flex: none;
  gap: .25rem;
}

.contribution-aside {
  align-items: flex-end;
  color: var(--ui-text-muted);
  display: flex;
  flex: none;
  flex-direction: column;
  font-size: .8125rem;
  justify-content: space-between;
  text-align: right;
}

.issue-number {
  color: var(--ui-text-toned);
  font-variant-numeric: tabular-nums;
}

@media (max-width: 479px) {
  .contribution-item {
    align-items: flex-start;
    gap: .75rem;
    padding: .875rem;
  }

  .contribution-content {
    gap: .5rem;
  }

  .star-count {
    display: none;
  }
}
</style>
