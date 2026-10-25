<script setup lang="ts">
import { HTTPError } from 'h3'

const route = useRoute()

const urlState = reactive({
  q: formatActivityQuery(parseActivityQuery(route.query.q)),
  sort: parseActivitySort(route.query.sort),
  tab: (route.query.tab === 'issues' ? 'issues' : 'prs') as ActivityKind,
})
const query = computed(() => urlState.q)
const filter = computed(() => parseActivityQuery(query.value))
const activeTab = computed(() => urlState.tab)
const sort = computed(() => urlState.sort)
// GitHub orders by creation date; star sorting reorders the loaded results.
const order = computed(() => sort.value === 'oldest' ? 'oldest' : undefined)

function encodeQueryValue(value: string) {
  return encodeURIComponent(value).replaceAll('%20', '+').replaceAll('%3A', ':').replaceAll('%2F', '/')
}

// Writes the state to the URL without a router navigation, which would refetch
// the whole page payload because `/` is an ISR route.
watch(urlState, ({ q, sort, tab }) => {
  const params = Object.entries({ q, sort: sort === 'newest' ? '' : sort, tab: tab === 'prs' ? '' : tab })
    .filter(([, value]) => value)
    .map(([key, value]) => `${key}=${encodeQueryValue(value)}`)
  window.history.replaceState(window.history.state, '', `${route.path}${params.length ? `?${params.join('&')}` : ''}${window.location.hash}`)
})

const { data: activity, error: activityError, status: activityStatus } = await useFetch('/api/activity', {
  key: computed(() => `github-activity:${query.value}:${order.value ?? 'newest'}`),
  query: { q: computed(() => query.value || undefined), sort: order },
})

if (activityError.value) {
  throw activityError.value
}

if (!activity.value) {
  throw new HTTPError({ status: 500, statusText: 'Internal Server Error', message: 'Could not load user activity' })
}

// Keeps the last results on screen while the next query loads, and holds the pages loaded after them.
const current = shallowRef<Activity>(activity.value)
watch(activity, (value) => {
  if (value) current.value = value
})

const user = current.value.user

const userUrl = `https://github.com/${user.username}`
const numberFormat = new Intl.NumberFormat('en-US')
const compactFormat = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 })
const isFiltered = computed(() => !isActivityFilterEmpty(filter.value))
const tabs = computed(() => [
  { count: current.value.prs.total, icon: 'i-lucide-git-pull-request', label: 'Pull requests', value: 'prs' },
  { count: current.value.issues.total, icon: 'i-lucide-circle-dot', label: 'Issues', value: 'issues' },
] as const)
const summaryMetrics = computed(() => {
  const { issues, prs, repositories } = current.value
  const loadedRepositories = new Set([...prs.items, ...issues.items].map(item => item.repo)).size
  return [
    { label: 'Pull requests', value: numberFormat.format(prs.total) },
    { label: 'Issues', value: numberFormat.format(issues.total) },
    {
      label: 'Repositories',
      value: repositories === null
        ? `${numberFormat.format(loadedRepositories)}${prs.cursor || issues.cursor ? '+' : ''}`
        : numberFormat.format(repositories),
    },
  ]
})

useHead({
  link: [
    { rel: 'icon', href: '/favicon.png' },
    { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
    { rel: 'alternate', type: 'application/rss+xml', title: `${user.name}'s recent pull requests`, href: '/feed.xml' },
  ],
})
const url = useRequestURL()
const description = computed(() => isFiltered.value
  ? `${numberFormat.format(current.value.prs.total)} pull requests and ${numberFormat.format(current.value.issues.total)} issues by ${user.name} matching “${query.value}”.`
  : `Discover ${user.name} recent pull requests and issues on GitHub.`)
useSeoMeta({
  title: `${user.name} is Contributing`,
  description,
  ogTitle: `${user.name} is Contributing`,
  ogDescription: description,
  twitterCard: 'summary_large_image',
  ogImage: `${url.origin}/og.png`,
  twitterImage: `${url.origin}/og.png`,
})

const sortOptions: Array<{ icon: string, label: string, value: ActivitySort }> = [
  { icon: 'i-lucide-arrow-down-narrow-wide', label: 'Newest', value: 'newest' },
  { icon: 'i-lucide-arrow-up-narrow-wide', label: 'Oldest', value: 'oldest' },
  { icon: 'i-lucide-star', label: 'Most starred', value: 'most-stars' },
  { icon: 'i-lucide-star-off', label: 'Least starred', value: 'least-stars' },
]

function setSort(value: ActivitySort) {
  urlState.sort = value
}

function setTab(value: ActivityKind) {
  urlState.tab = value
}

function setQuery(value: string) {
  urlState.q = formatActivityQuery(parseActivityQuery(value))
}

const items = computed(() => [sortOptions.slice(0, 2), sortOptions.slice(2)].map(group => group.map(option => ({
  checked: sort.value === option.value,
  icon: option.icon,
  label: option.label,
  type: 'checkbox' as const,
  onUpdateChecked(checked: boolean) {
    if (checked) setSort(option.value)
  },
}))))

const sortLabel = computed(() => sortOptions.find(option => option.value === sort.value)!.label)

const activePage = computed(() => current.value[activeTab.value])

const orderedItems = computed(() => {
  const sourceItems: Array<Issue | PullRequest> = [...activePage.value.items]
  if (sort.value === 'most-stars') sourceItems.sort((a, b) => b.stars - a.stars)
  if (sort.value === 'least-stars') sourceItems.sort((a, b) => a.stars - b.stars)
  return sourceItems
})

const loadingMore = shallowRef(false)
const loadMoreError = shallowRef('')

async function loadMore() {
  const kind = activeTab.value
  const from = current.value
  const page = from[kind]
  if (!page.cursor || loadingMore.value) return

  loadingMore.value = true
  loadMoreError.value = ''
  try {
    const next = await $fetch<ActivityPage<Issue | PullRequest>>('/api/activity/page', {
      query: { after: page.cursor, kind, q: query.value || undefined, sort: order.value },
    })
    // Ignore a page that arrives after the query changed.
    if (current.value !== from) return
    const seen = new Set(page.items.map(item => item.url))
    current.value = {
      ...from,
      [kind]: { ...page, cursor: next.cursor, items: [...page.items, ...next.items.filter(item => !seen.has(item.url))] },
    }
  }
  catch {
    loadMoreError.value = 'Could not load more results. Try again.'
  }
  finally {
    loadingMore.value = false
  }
}

function onTabKeydown(event: KeyboardEvent, index: number) {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return

  event.preventDefault()
  const nextIndex = event.key === 'Home'
    ? 0
    : event.key === 'End'
      ? tabs.value.length - 1
      : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.value.length) % tabs.value.length

  setTab(tabs.value[nextIndex]!.value)
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
                  @click="setTab(tab.value)"
                  @keydown="onTabKeydown($event, index)"
                >
                  <template #trailing>
                    <span class="tab-count" :title="numberFormat.format(tab.count)">{{ compactFormat.format(tab.count) }}</span>
                  </template>
                </UButton>
              </div>

              <div class="activity-tools">
                <ActivityFilter :query="query" @update:query="setQuery" />

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
          </div>

          <ActivityFilterChips :query="query" @update:query="setQuery" />

          <p v-if="activityError" class="activity-error" role="alert">
            Could not load these results from GitHub. The list below is from your previous filter.
          </p>

          <div
            :id="`activity-panel-${activeTab}`"
            :aria-busy="activityStatus === 'pending'"
            :aria-labelledby="`activity-tab-${activeTab}`"
            :class="{ 'is-loading': activityStatus === 'pending' }"
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
            <div v-if="orderedItems.length === 0" class="empty-state">
              <p>
                No {{ activeTab === 'prs' ? 'pull requests' : 'issues' }} {{ isFiltered ? 'match these filters' : 'found' }}.
              </p>
              <UButton
                v-if="isFiltered"
                color="neutral"
                label="Clear filters"
                size="sm"
                variant="subtle"
                @click="setQuery('')"
              />
            </div>
          </div>

          <div v-if="activePage.cursor || loadMoreError" class="load-more">
            <p class="load-more__progress">
              Showing {{ numberFormat.format(activePage.items.length) }} of {{ numberFormat.format(activePage.total) }}
            </p>
            <UButton
              v-if="activePage.cursor"
              :loading="loadingMore"
              color="neutral"
              label="Load more"
              size="sm"
              variant="subtle"
              @click="loadMore"
            />
            <p v-if="loadMoreError" class="load-more__error" role="alert">
              {{ loadMoreError }}
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
  font-variant-numeric: tabular-nums;
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

.contribution-list.is-loading {
  opacity: .6;
  transition: opacity 150ms ease-out;
}

.empty-state {
  align-items: center;
  color: var(--ui-text-muted);
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 3rem 1.25rem;
  text-align: center;
}

.activity-tools {
  display: flex;
  gap: .5rem;
}

.activity-error {
  color: var(--ui-color-error-500);
  font-size: .8125rem;
  margin-bottom: 1rem;
}

.load-more {
  align-items: center;
  display: flex;
  flex-direction: column;
  gap: .75rem;
  padding-top: 1.25rem;
}

.load-more__progress {
  color: var(--ui-text-muted);
  font-size: .8125rem;
  font-variant-numeric: tabular-nums;
}

.load-more__error {
  color: var(--ui-color-error-500);
  font-size: .8125rem;
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

  .activity-tabs > :deep(*),
  .activity-tools > :deep(*) {
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
