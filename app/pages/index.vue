<script setup lang="ts">
const { data: activity, error: activityError } = await useFetch('/api/activity', { key: 'github-activity' })

if (activityError.value) {
  throw createError(activityError.value)
}

if (!activity.value) {
  throw createError('Could not load User activity')
}

const { user, prs } = activity.value.contributions
const { issues } = activity.value.issues
type ActiveTab = 'issues' | 'prs'
type Sort = 'least-stars' | 'most-stars' | 'newest' | 'oldest'

const activeTab = shallowRef<ActiveTab>('prs')
const sort = shallowRef<Sort>('newest')
const userUrl = `https://github.com/${user.username}`
const tabs = [
  { count: prs.length, icon: 'i-lucide-git-pull-request', label: 'Pull requests', value: 'prs' },
  { count: issues.length, icon: 'i-lucide-circle-dot', label: 'Issues', value: 'issues' },
] as const
const summaryMetrics = [
  { label: 'Pull requests', value: prs.length },
  { label: 'Issues', value: issues.length },
  { label: 'Repositories', value: new Set([...prs, ...issues].map(item => item.repo)).size },
]

useHead({
  link: [
    { rel: 'icon', href: '/favicon.png' },
    { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
    { rel: 'alternate', type: 'application/rss+xml', title: `${user.name}'s recent pull requests`, href: '/feed.xml' },
  ],
})
const url = useRequestURL()
useSeoMeta({
  title: `${user.name} is Contributing`,
  description: `Discover ${user.name} recent pull requests and issues on GitHub.`,
  ogTitle: `${user.name} is Contributing`,
  ogDescription: `Discover ${user.name} recent pull requests and issues on GitHub.`,
  twitterCard: 'summary_large_image',
  ogImage: `${url.origin}/og.png`,
  twitterImage: `${url.origin}/og.png`,
})

const items = computed(() => [
  [{
    label: 'Newest',
    icon: 'i-lucide-arrow-down-narrow-wide',
    checked: sort.value === 'newest',
    type: 'checkbox' as const,
    onUpdateChecked(checked: boolean) {
      if (checked) sort.value = 'newest'
    },
  }, {
    label: 'Oldest',
    icon: 'i-lucide-arrow-up-narrow-wide',
    checked: sort.value === 'oldest',
    type: 'checkbox' as const,
    onUpdateChecked(checked: boolean) {
      if (checked) sort.value = 'oldest'
    },
  }],
  [{
    label: 'Most starred',
    icon: 'i-lucide-star',
    checked: sort.value === 'most-stars',
    type: 'checkbox' as const,
    onUpdateChecked(checked: boolean) {
      if (checked) sort.value = 'most-stars'
    },
  }, {
    label: 'Least starred',
    icon: 'i-lucide-star-off',
    checked: sort.value === 'least-stars',
    type: 'checkbox' as const,
    onUpdateChecked(checked: boolean) {
      if (checked) sort.value = 'least-stars'
    },
  }],
])

const sortLabel = computed(() => ({
  'least-stars': 'Least starred',
  'most-stars': 'Most starred',
  'newest': 'Newest',
  'oldest': 'Oldest',
})[sort.value])

const orderedItems = computed(() => {
  const sourceItems = activeTab.value === 'prs' ? [...prs] : [...issues]
  sourceItems.sort((a, b) => {
    if (sort.value === 'most-stars') return b.stars - a.stars
    if (sort.value === 'least-stars') return a.stars - b.stars
    const difference = new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    return sort.value === 'oldest' ? -difference : difference
  })
  return sourceItems
})

function onTabKeydown(event: KeyboardEvent, index: number) {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return

  event.preventDefault()
  const nextIndex = event.key === 'Home'
    ? 0
    : event.key === 'End'
      ? tabs.length - 1
      : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length

  activeTab.value = tabs[nextIndex]!.value
  const tablist = (event.currentTarget as HTMLElement).parentElement
  tablist?.querySelectorAll<HTMLElement>('[role="tab"]')[nextIndex]?.focus()
}
</script>

<template>
  <main class="dashboard-page">
    <UContainer class="dashboard-container">
      <section class="dashboard-card">
        <ContributionHeader
          :avatar="user.avatar"
          :avatar-alt="user.name"
          :avatar-href="userUrl"
          :title="`${user.name} is contributing.`"
          description="Recent pull requests and issues across open source."
        >
          <template #actions>
            <UButton
              :to="userUrl"
              external
              target="_blank"
              label="GitHub profile"
              icon="i-lucide-github"
              color="neutral"
              variant="subtle"
            />
            <div class="dashboard-header-icons">
              <UButton
                to="/feed.xml"
                external
                target="_blank"
                aria-label="RSS feed"
                icon="i-lucide-rss"
                color="neutral"
                variant="ghost"
              />
              <UColorModeButton color="neutral" variant="ghost" />
            </div>
          </template>
        </ContributionHeader>

        <dl class="dashboard-metrics" aria-label="Recent activity totals">
          <div v-for="metric in summaryMetrics" :key="metric.label">
            <dt>{{ metric.label }}</dt>
            <dd>{{ metric.value }}</dd>
          </div>
        </dl>

        <section class="activity-section" aria-labelledby="activity-heading">
          <div class="activity-heading">
            <div>
              <p class="dashboard-kicker">
                Latest work
              </p>
              <h2 id="activity-heading">
                Recent activity
              </h2>
            </div>

            <div class="activity-controls">
              <div class="activity-tabs" role="tablist" aria-label="Contribution type">
                <UButton
                  v-for="(tab, index) in tabs"
                  :id="`activity-tab-${tab.value}`"
                  :key="tab.value"
                  :aria-controls="`activity-panel-${tab.value}`"
                  :aria-selected="activeTab === tab.value"
                  color="neutral"
                  :icon="tab.icon"
                  :label="tab.label"
                  :tabindex="activeTab === tab.value ? 0 : -1"
                  :variant="activeTab === tab.value ? 'solid' : 'ghost'"
                  role="tab"
                  size="sm"
                  @click="activeTab = tab.value"
                  @keydown="onTabKeydown($event, index)"
                >
                  <template #trailing>
                    <span class="tab-count">{{ tab.count }}</span>
                  </template>
                </UButton>
              </div>

              <UDropdownMenu
                :items="items"
                :content="{ align: 'end', side: 'bottom', sideOffset: 8 }"
                :ui="{ content: 'w-48' }"
                size="sm"
              >
                <UButton
                  :label="sortLabel"
                  class="activity-sort"
                  icon="i-lucide-arrow-up-down"
                  trailing-icon="i-lucide-chevron-down"
                  color="neutral"
                  variant="ghost"
                  size="sm"
                />
              </UDropdownMenu>
            </div>
          </div>

          <div
            :id="`activity-panel-${activeTab}`"
            :aria-labelledby="`activity-tab-${activeTab}`"
            class="contribution-list"
            role="tabpanel"
            tabindex="0"
          >
            <ContributionItem
              v-for="item of orderedItems"
              :key="item.url"
              :data="item"
              :kind="activeTab === 'prs' ? 'pull-request' : 'issue'"
            />
            <p v-if="orderedItems.length === 0" class="empty-state">
              No {{ activeTab === 'prs' ? 'pull requests' : 'issues' }} found.
            </p>
          </div>
        </section>
      </section>
    </UContainer>
  </main>
</template>

<style scoped>
.dashboard-page {
  background: var(--app-canvas);
  min-height: 100svh;
  padding: clamp(.75rem, 2vw, 2rem);
}

.dashboard-container {
  padding: 0;
}

.dashboard-card {
  background: var(--ui-bg);
  border: 1px solid var(--ui-border);
  border-radius: 1.25rem;
  display: grid;
  gap: clamp(1rem, 2vh, 1.5rem);
  margin: 0 auto;
  padding: clamp(1.25rem, 2.5vw, 2.25rem);
}

.dashboard-kicker {
  color: var(--ui-text-muted);
  font-size: .75rem;
  font-weight: 700;
  letter-spacing: .12em;
  margin-bottom: .75rem;
  text-transform: uppercase;
}

.dashboard-header-icons {
  align-items: center;
  display: flex;
  gap: .25rem;
}

.dashboard-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.dashboard-metrics div {
  display: flex;
  flex-direction: column-reverse;
  min-width: 0;
  padding: clamp(.75rem, 1.5vw, 1.25rem);
}

.dashboard-metrics dt {
  color: var(--ui-text-muted);
  font-size: .8125rem;
}

.dashboard-metrics dd {
  color: var(--ui-text-highlighted);
  font-size: clamp(2.25rem, 4vw, 3.75rem);
  font-weight: 650;
  letter-spacing: -.07em;
  line-height: .9;
  margin-bottom: .5rem;
}

.activity-section {
  min-width: 0;
}

.activity-heading {
  align-items: flex-end;
  display: flex;
  gap: 1rem;
  justify-content: space-between;
  margin-bottom: 1.25rem;
}

.activity-heading h2 {
  color: var(--ui-text-highlighted);
  font-size: clamp(1.5rem, 3vw, 2rem);
  font-weight: 650;
  letter-spacing: -.04em;
  line-height: 1;
}

.activity-heading .dashboard-kicker {
  margin-bottom: .5rem;
}

.activity-controls,
.activity-tabs {
  display: flex;
  gap: .5rem;
}

.activity-controls {
  align-items: stretch;
}

.activity-tabs {
  align-items: center;
}

.activity-tabs,
.activity-sort {
  background: var(--ui-bg-muted);
  border: 1px solid var(--ui-border-muted);
  border-radius: .75rem;
}

.activity-tabs {
  gap: .125rem;
  padding: .25rem;
}

.activity-sort:hover {
  background: var(--ui-bg-accented);
}

.tab-count {
  align-items: center;
  background: color-mix(in srgb, currentColor 10%, transparent);
  border-radius: .25rem;
  display: inline-flex;
  font-size: .6875rem;
  height: 1.25rem;
  justify-content: center;
  min-width: 1.25rem;
  padding: 0 .25rem;
}

.contribution-list {
  border: 1px solid var(--ui-border);
  border-radius: .875rem;
  overflow: hidden;
}

.contribution-list:focus-visible {
  outline: 3px solid color-mix(in srgb, var(--ui-primary) 25%, transparent);
  outline-offset: 2px;
}

.empty-state {
  color: var(--ui-text-muted);
  padding: 3rem 1.25rem;
  text-align: center;
}

@media (max-width: 767px) {
  .activity-heading {
    align-items: flex-start;
    flex-direction: column;
  }

  .activity-controls {
    width: 100%;
  }

  .activity-controls {
    align-items: stretch;
    flex-direction: column;
  }

  .activity-tabs > :deep(*) {
    flex: 1;
    justify-content: center;
  }
}

@media (max-width: 479px) {
  .dashboard-metrics {
    grid-template-columns: 1fr;
  }
}
</style>
