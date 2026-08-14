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
const bars = data.days.map(day => Math.round(((day.opened + day.completed) / Math.max(1, ...data.days.map(day => day.opened + day.completed))) * 100))
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
  closedIssues: data.metrics.closedIssues,
  label: data.label,
  mergedPullRequests: data.metrics.mergedPullRequests,
  name: data.user.name,
  openedIssues: data.metrics.openedIssues,
  openedPullRequests: data.metrics.openedPullRequests,
}, {
  cacheKey: `monthly-recap-${data.month}-v1`,
})
</script>

<template>
  <main class="recap">
    <section class="recap-card">
      <header class="recap-header">
        <div class="recap-intro">
          <div class="recap-identity">
            <UAvatar
              :src="data.user.avatar"
              :alt="data.user.name"
              size="2xl"
            />
            <p class="recap-kicker">
              GitHub monthly recap · {{ data.label }}
            </p>
          </div>
          <h1>{{ data.user.name }} shipped.</h1>
          <p class="recap-summary">
            {{ totalCompleted }} issues and pull requests crossed the finish line.
          </p>
        </div>
        <div class="recap-actions">
          <UButton
            icon="i-lucide-share-2"
            label="Share recap"
            color="neutral"
            @click="(canShare ? shareNative() : copyShareUrl().then(() => toast.add({ title: 'Recap link copied' }))).catch((error) => {
              if (error instanceof Error && error.name === 'AbortError') return
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

      <div class="recap-detail-grid">
        <section class="recap-chart-panel" aria-labelledby="recap-chart">
          <div class="recap-section-heading">
            <p class="recap-kicker">
              Daily activity
            </p>
            <h2 id="recap-chart">
              {{ data.label }}, day by day.
            </h2>
          </div>
          <div class="recap-chart" aria-hidden="true">
            <div
              v-for="(day, index) in data.days"
              :key="day.date"
              class="recap-bar"
              :class="{ 'recap-bar-busiest': day.date === data.busiestDay.date }"
              :style="{ height: `${Math.max(2, bars[index] ?? 0)}%` }"
              :title="`${day.date}: ${day.opened} opened, ${day.completed} completed`"
            />
          </div>
          <p class="sr-only">
            Daily activity chart. The busiest day was {{ data.busiestDay.label }} with {{ data.busiestDay.count }} actions.
          </p>
          <div class="recap-chart-key">
            <span>{{ data.days[0]?.date.slice(-2) }} {{ data.label.split(' ')[0] }}</span>
            <span>{{ data.days.at(-1)?.date.slice(-2) }} {{ data.label.split(' ')[0] }}</span>
          </div>
        </section>

        <section class="recap-highlights" aria-labelledby="recap-rhythm">
          <div class="recap-section-heading">
            <p class="recap-kicker">
              Your rhythm
            </p>
            <h2 id="recap-rhythm">
              When the work moved.
            </h2>
          </div>
          <dl class="recap-highlight-grid">
            <div>
              <dt>Busiest day</dt>
              <dd>{{ data.busiestDay.label }}</dd>
              <p>{{ data.busiestDay.count }} actions</p>
            </div>
            <div>
              <dt>Busiest hour</dt>
              <dd>{{ data.busiestHour.label }}</dd>
              <p>{{ data.busiestHour.count }} actions</p>
            </div>
            <div v-if="data.topRepository">
              <dt>Top repository</dt>
              <dd>{{ data.topRepository.name }}</dd>
              <p>{{ data.topRepository.count }} actions</p>
            </div>
          </dl>
        </section>
      </div>
    </section>
  </main>
</template>

<style scoped>
.recap {
  background: #f4f4f1;
  color: #18181b;
  min-height: 100svh;
  padding: clamp(.75rem, 2vw, 2rem);
}

.recap-card {
  background: #fff;
  border: 1px solid #deded9;
  border-radius: 1.25rem;
  display: grid;
  gap: clamp(1.25rem, 2.5vh, 2rem);
  margin: 0 auto;
  max-width: 80rem;
  min-height: calc(100svh - clamp(1.5rem, 4vw, 4rem));
  padding: clamp(1.25rem, 3vw, 3rem);
}

.recap-header {
  align-items: end;
  display: flex;
  gap: 2rem;
  justify-content: space-between;
}

.recap-identity {
  align-items: center;
  display: flex;
  gap: .875rem;
  margin-bottom: 1rem;
}

.recap h1 {
  font-size: clamp(3rem, 7vw, 6rem);
  font-weight: 650;
  letter-spacing: -.07em;
  line-height: .9;
}

.recap h2 {
  font-size: clamp(1.25rem, 2vw, 1.75rem);
  font-weight: 650;
  letter-spacing: -.04em;
  line-height: 1;
}

.recap-kicker {
  color: #6b6b65;
  font-size: .75rem;
  font-weight: 700;
  letter-spacing: .12em;
  text-transform: uppercase;
}

.recap-summary {
  color: #6b6b65;
  font-size: clamp(1rem, 1.5vw, 1.25rem);
  margin-top: .75rem;
}

.recap-actions {
  align-items: flex-end;
  display: flex;
  flex-direction: column;
  gap: .75rem;
  white-space: nowrap;
}

.recap-metric-grid {
  border: 1px solid #deded9;
  border-radius: .875rem;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  overflow: hidden;
}

.recap-metric-grid div {
  border-right: 1px solid #deded9;
  display: flex;
  flex-direction: column-reverse;
  min-width: 0;
  padding: clamp(1rem, 2vw, 1.75rem);
}

.recap-metric-grid div:last-child {
  border-right: 0;
}

.recap-metric-grid dt {
  color: #6b6b65;
  font-size: .8125rem;
}

.recap-metric-grid dd {
  font-size: clamp(2.5rem, 5vw, 4.5rem);
  font-weight: 650;
  letter-spacing: -.07em;
  line-height: .9;
  margin-bottom: .5rem;
}

.recap-detail-grid {
  display: grid;
  gap: clamp(1.25rem, 3vw, 3rem);
  grid-template-columns: minmax(0, 1.7fr) minmax(18rem, 1fr);
  min-height: 0;
}

.recap-chart-panel,
.recap-highlights {
  border-top: 1px solid #deded9;
  padding-top: 1rem;
}

.recap-section-heading {
  display: flex;
  gap: 1rem;
  justify-content: space-between;
}

.recap-highlight-grid {
  display: grid;
  gap: .875rem;
  margin-top: 1.25rem;
}

.recap-highlight-grid div {
  display: grid;
  gap: .125rem 1rem;
  grid-template-columns: minmax(0, 1fr) auto;
}

.recap-highlight-grid dt,
.recap-highlight-grid p {
  color: #6b6b65;
  font-size: .8125rem;
}

.recap-highlight-grid p {
  grid-column: 2;
  text-align: right;
}

.recap-highlight-grid dd {
  font-size: clamp(1.125rem, 2vw, 1.5rem);
  font-weight: 600;
  grid-column: 2;
  grid-row: 1;
  letter-spacing: -.03em;
  overflow-wrap: anywhere;
  text-align: right;
}

.recap-chart-panel {
  display: flex;
  flex-direction: column;
}

.recap-chart {
  align-items: end;
  display: flex;
  flex: 1;
  gap: clamp(2px, .35vw, 5px);
  min-height: 8rem;
  margin-top: 1.25rem;
}

.recap-bar {
  background: #c8c8c2;
  border-radius: 3px 3px 0 0;
  flex: 1;
  min-height: 2px;
}

.recap-bar-busiest {
  background: #238636;
}

.recap-chart-key {
  border-top: 1px solid #deded9;
  color: #6b6b65;
  display: flex;
  font-size: .75rem;
  justify-content: space-between;
  padding-top: .5rem;
}

.recap-home {
  border-bottom: 1px solid currentColor;
  color: #6b6b65;
  font-size: .8125rem;
}

@media (max-width: 767px) {
  .recap-header,
  .recap-section-heading {
    align-items: flex-start;
    flex-direction: column;
  }

  .recap-actions {
    align-items: flex-start;
    flex-direction: row;
  }

  .recap-metric-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .recap-metric-grid div:nth-child(2) {
    border-right: 0;
  }

  .recap-metric-grid div:nth-child(-n + 2) {
    border-bottom: 1px solid #deded9;
  }

  .recap-detail-grid {
    grid-template-columns: 1fr;
  }

  .recap-chart {
    height: 12rem;
    flex: none;
  }
}
</style>
