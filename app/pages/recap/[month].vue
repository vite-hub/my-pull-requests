<script setup lang="ts">
const toast = useToast()
const month = String(useRoute().params.month)
const shareUrl = useRequestURL().href
const { data: recap, error } = await useFetch<MonthlyRecap>(`/api/recaps/${month}`, {
  key: `monthly-recap-${month}`,
})

if (error.value) {
  throw createError({
    statusCode: error.value.statusCode ?? 500,
    message: (error.value.data && typeof error.value.data === 'object' && 'message' in error.value.data
      ? String(error.value.data.message)
      : undefined) ?? error.value.message,
  })
}
if (!recap.value) throw createError({ statusCode: 404, message: 'Monthly recap not found' })

const data = recap.value
const totalCompleted = data.metrics.mergedPullRequests + data.metrics.closedIssues
const bars = data.days.map(day => ((day.opened + day.completed) / Math.max(1, ...data.days.map(day => day.opened + day.completed))) * 100)
const busiestIndex = data.days.findIndex(day => day.date === data.busiestDay.date)
const { isSupported: canShare, share: shareNative } = useShare({
  text: `${data.user.name}'s ${data.label} GitHub recap`,
  title: `${data.user.name}'s GitHub monthly recap`,
  url: shareUrl,
})
const { copy: copyShareUrl } = useClipboard({ source: shareUrl, legacy: true })

useSeoMeta({
  title: `${data.user.name}'s ${data.label} GitHub recap`,
  description: `${data.user.name} opened ${data.metrics.openedPullRequests} pull requests and merged ${data.metrics.mergedPullRequests} in ${data.label}.`,
  ogTitle: `${data.user.name}'s ${data.label} GitHub recap`,
  ogDescription: `${totalCompleted} issues and pull requests completed in ${data.label}.`,
  twitterCard: 'summary_large_image',
})

defineOgImage('MonthlyRecap', {
  bars,
  busiestDay: data.busiestDay.label,
  busiestHour: data.busiestHour.label,
  busiestIndex,
  closedIssues: data.metrics.closedIssues,
  endDay: data.days.at(-1)?.date.slice(-2),
  label: data.label,
  mergedPullRequests: data.metrics.mergedPullRequests,
  name: data.user.name,
  openedIssues: data.metrics.openedIssues,
  openedPullRequests: data.metrics.openedPullRequests,
  startDay: data.days[0]?.date.slice(-2),
  topRepository: data.topRepository?.name,
}, {
  cacheKey: `monthly-recap-${data.month}-v7`,
})
</script>

<template>
  <main class="recap">
    <section class="recap-card">
      <header class="recap-header">
        <div class="recap-intro">
          <UAvatar
            :src="data.user.avatar"
            :alt="data.user.name"
            size="2xl"
          />
          <h1>{{ data.user.name }} shipped.</h1>
        </div>
        <div class="recap-actions">
          <time :datetime="data.month" class="recap-date">{{ data.label }}</time>
          <UButton
            icon="i-lucide-share-2"
            label="Share"
            color="neutral"
            variant="subtle"
            @click="(canShare ? shareNative() : copyShareUrl().then(() => toast.add({ title: 'Recap link copied' }))).catch((shareError) => {
              if (shareError instanceof Error && shareError.name === 'AbortError') return
              toast.add({ title: 'Could not share the recap', color: 'error' })
            })"
          />
          <NuxtLink to="/" class="recap-home">Recent activity</NuxtLink>
        </div>
      </header>

      <dl class="recap-metric-grid" aria-label="Monthly output">
        <div><dt>Pull requests opened</dt><dd>{{ data.metrics.openedPullRequests }}</dd></div>
        <div><dt>Pull requests merged</dt><dd>{{ data.metrics.mergedPullRequests }}</dd></div>
        <div><dt>Issues opened</dt><dd>{{ data.metrics.openedIssues }}</dd></div>
        <div><dt>Issues closed</dt><dd>{{ data.metrics.closedIssues }}</dd></div>
      </dl>

      <section class="recap-activity" aria-labelledby="recap-activity">
        <h2 id="recap-activity" class="recap-kicker">
          Daily activity
        </h2>
        <div class="recap-chart" aria-hidden="true">
          <span
            v-for="(bar, index) in bars"
            :key="data.days[index]!.date"
            class="recap-chart-bar"
            :class="{ 'recap-chart-bar--busiest': index === busiestIndex }"
            :style="{ height: bar ? `${bar}%` : '2px' }"
          />
        </div>
        <p class="sr-only">
          Daily activity chart. The busiest day was {{ data.busiestDay.label }} with {{ data.busiestDay.count }} actions.
        </p>
        <div class="recap-chart-key">
          <span>{{ data.days[0]?.date.slice(-2) }}</span>
          <span>{{ data.days.at(-1)?.date.slice(-2) }}</span>
        </div>
        <dl class="recap-highlight-grid">
          <div>
            <dt>Busiest day</dt>
            <dd>{{ data.busiestDay.label }}</dd>
          </div>
          <div>
            <dt>Busiest hour</dt>
            <dd>{{ data.busiestHour.label }}</dd>
          </div>
          <div v-if="data.topRepository">
            <dt>Top repository</dt>
            <dd>{{ data.topRepository.name }}</dd>
          </div>
        </dl>
      </section>
    </section>
  </main>
</template>

<style scoped>
.recap {
  --recap-accent: #2b2a27;
  --recap-bar: #c9c7c1;
  --recap-border: #dddcd6;
  --recap-muted: #6e6b65;
  --recap-pattern: #dfddd7;
  --recap-surface: #fffefa;
  --recap-surface-subtle: #f5f3ef;
  background: #f1f0ed;
  color: #1d1c1a;
  min-height: 100svh;
  padding: clamp(.75rem, 2vw, 2rem);
}

.recap-card {
  background: var(--recap-surface);
  border: 1px solid var(--recap-border);
  border-radius: 1.25rem;
  display: grid;
  gap: clamp(1rem, 2vh, 1.5rem);
  margin: 0 auto;
  max-width: 80rem;
  min-height: calc(100svh - clamp(1.5rem, 4vw, 4rem));
  padding: clamp(1.25rem, 2.5vw, 2.25rem);
}

.recap-header {
  align-items: center;
  background: radial-gradient(circle at 1px 1px, var(--recap-pattern) 1px, transparent 0) 0 0 / 18px 18px, var(--recap-surface-subtle);
  border-radius: .875rem;
  display: flex;
  gap: 2rem;
  justify-content: space-between;
  padding: clamp(1rem, 2vw, 1.5rem);
}

.recap-intro > :first-child {
  margin-bottom: .875rem;
}

.recap h1 {
  font-size: clamp(2.75rem, 6vw, 5rem);
  font-weight: 650;
  letter-spacing: -.07em;
  line-height: .9;
}

.recap-kicker {
  color: var(--recap-muted);
  font-size: .75rem;
  font-weight: 700;
  letter-spacing: .12em;
  text-transform: uppercase;
}

.recap-actions {
  align-items: flex-end;
  display: flex;
  flex-direction: column;
  gap: .75rem;
  white-space: nowrap;
}

.recap-date {
  font-size: .875rem;
  font-weight: 600;
}

.recap-metric-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.recap-metric-grid div {
  display: flex;
  flex-direction: column-reverse;
  min-width: 0;
  padding: clamp(.75rem, 1.5vw, 1.25rem);
}

.recap-metric-grid dt {
  color: var(--recap-muted);
  font-size: .8125rem;
}

.recap-metric-grid dd {
  font-size: clamp(2.25rem, 4vw, 3.75rem);
  font-weight: 650;
  letter-spacing: -.07em;
  line-height: .9;
  margin-bottom: .5rem;
}

.recap-activity {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.recap-highlight-grid {
  display: grid;
  gap: clamp(1rem, 3vw, 3rem);
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin-top: .75rem;
}

.recap-highlight-grid div {
  display: flex;
  flex-direction: column;
  gap: .125rem;
}

.recap-highlight-grid dt {
  color: var(--recap-muted);
  font-size: .8125rem;
}

.recap-highlight-grid dd {
  font-size: clamp(1.125rem, 2vw, 1.5rem);
  font-weight: 600;
  letter-spacing: -.03em;
  overflow-wrap: anywhere;
}

.recap-chart {
  align-items: flex-end;
  display: flex;
  flex: 1;
  gap: clamp(2px, .4vw, 6px);
  margin-top: .75rem;
  min-height: 6rem;
  overflow: hidden;
  width: 100%;
}

.recap-chart-bar {
  background: var(--recap-bar);
  border-radius: 1px 1px 0 0;
  flex: 1;
  min-width: 0;
}

.recap-chart-bar--busiest {
  background: var(--recap-accent);
}

.recap-chart-key {
  border-top: 1px solid var(--recap-border);
  color: var(--recap-muted);
  display: flex;
  font-size: .75rem;
  justify-content: space-between;
  padding-top: .5rem;
}

.recap-home {
  border-bottom: 1px solid currentColor;
  color: var(--recap-muted);
  font-size: .8125rem;
}

@media (max-width: 639px) {
  .recap-header,
  .recap-actions {
    align-items: flex-start;
    flex-direction: column;
  }

  .recap-actions {
    flex-direction: row;
  }

  .recap-metric-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .recap-metric-grid div:nth-child(-n + 2) {
    border-bottom: 1px solid var(--recap-border);
  }

  .recap-highlight-grid {
    grid-template-columns: 1fr;
  }

  .recap-chart {
    height: 12rem;
    flex: none;
  }
}

@media (min-width: 640px) {
  .recap {
    height: 100svh;
    overflow: hidden;
  }

  .recap-card {
    grid-template-rows: auto auto minmax(0, 1fr);
    height: calc(100svh - clamp(1.5rem, 4vw, 4rem));
    min-height: 0;
    overflow: hidden;
  }

  .recap-activity {
    min-height: 0;
  }
}
</style>
