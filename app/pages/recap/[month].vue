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
const maxDay = Math.max(1, ...data.days.map(day => day.opened + day.completed))
const bars = data.days.map(day => Math.round(((day.opened + day.completed) / maxDay) * 100))
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
    <section class="recap-panel recap-cover">
      <div class="recap-kicker">
        GitHub monthly recap · {{ data.label }}
      </div>
      <UAvatar
        :src="data.user.avatar"
        :alt="data.user.name"
        size="3xl"
        class="ring-4 ring-white/80 dark:ring-neutral-900/80"
      />
      <h1>{{ data.user.name }} shipped.</h1>
      <p>
        {{ totalCompleted }} issues and pull requests crossed the finish line.
      </p>
      <span class="recap-scroll">Scroll through the month ↓</span>
    </section>

    <section class="recap-panel recap-numbers" aria-labelledby="recap-output">
      <div>
        <p class="recap-kicker">
          Output
        </p>
        <h2 id="recap-output">
          The month in four numbers.
        </h2>
      </div>
      <dl class="recap-metric-grid">
        <div><dt>Pull requests opened</dt><dd>{{ data.metrics.openedPullRequests }}</dd></div>
        <div><dt>Pull requests merged</dt><dd>{{ data.metrics.mergedPullRequests }}</dd></div>
        <div><dt>Issues opened</dt><dd>{{ data.metrics.openedIssues }}</dd></div>
        <div><dt>Issues closed</dt><dd>{{ data.metrics.closedIssues }}</dd></div>
      </dl>
    </section>

    <section class="recap-panel recap-rhythm" aria-labelledby="recap-rhythm">
      <div>
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
          <p>{{ data.busiestDay.count }} recorded actions</p>
        </div>
        <div>
          <dt>Busiest hour</dt>
          <dd>{{ data.busiestHour.label }}</dd>
          <p>{{ data.busiestHour.count }} recorded actions</p>
        </div>
        <div v-if="data.topRepository">
          <dt>Top repository</dt>
          <dd>{{ data.topRepository.name }}</dd>
          <p>{{ data.topRepository.count }} recorded actions</p>
        </div>
      </dl>
    </section>

    <section class="recap-panel recap-chart-panel" aria-labelledby="recap-chart">
      <div>
        <p class="recap-kicker">
          Every day counts
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
          :class="{ 'recap-bar-secondary': index % 2 }"
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

    <section class="recap-panel recap-share">
      <div class="recap-kicker">
        That was {{ data.label }}
      </div>
      <h2>Keep building.</h2>
      <p>Share the graph, or keep this one for yourself.</p>
      <UButton
        icon="i-lucide-share-2"
        label="Share my recap"
        size="xl"
        color="neutral"
        @click="(canShare ? shareNative() : copyShareUrl().then(() => toast.add({ title: 'Recap link copied' }))).catch((error) => {
          if (error instanceof Error && error.name === 'AbortError') return
          toast.add({ title: 'Could not share the recap', color: 'error' })
        })"
      />
      <NuxtLink to="/" class="recap-home">Back to recent activity</NuxtLink>
    </section>
  </main>
</template>

<style scoped>
.recap {
  background: #f4f0e8;
  color: #18181b;
  scroll-snap-type: y proximity;
}

.recap-panel {
  min-height: 90svh;
  padding: clamp(2rem, 7vw, 7rem);
  scroll-snap-align: start;
}

.recap-panel h1,
.recap-panel h2 {
  font-size: clamp(3rem, 10vw, 8rem);
  font-weight: 650;
  letter-spacing: -.07em;
  line-height: .9;
  max-width: 12ch;
}

.recap-kicker {
  font-size: .75rem;
  font-weight: 700;
  letter-spacing: .16em;
  text-transform: uppercase;
}

.recap-cover,
.recap-share {
  align-items: flex-start;
  display: flex;
  flex-direction: column;
  gap: clamp(1.5rem, 4vw, 3rem);
  justify-content: center;
}

.recap-cover > p,
.recap-share > p {
  font-size: clamp(1.25rem, 2.5vw, 2rem);
  max-width: 32ch;
}

.recap-scroll {
  color: #71717a;
  font-size: .875rem;
}

.recap-numbers {
  background: #18181b;
  color: #fafafa;
  display: grid;
  gap: 4rem;
}

.recap-metric-grid {
  display: grid;
  gap: 1px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.recap-metric-grid div {
  background: #27272a;
  display: flex;
  flex-direction: column-reverse;
  min-height: 12rem;
  padding: clamp(1.25rem, 4vw, 3rem);
}

.recap-metric-grid dt {
  color: #a1a1aa;
}

.recap-metric-grid dd {
  font-size: clamp(4rem, 10vw, 8rem);
  font-weight: 650;
  letter-spacing: -.07em;
  line-height: 1;
}

.recap-rhythm {
  background: #2954d1;
  color: #fff;
}

.recap-highlight-grid {
  display: grid;
  gap: clamp(2rem, 5vw, 5rem);
  margin-top: clamp(4rem, 10vw, 9rem);
}

.recap-highlight-grid div {
  border-top: 1px solid rgb(255 255 255 / .4);
  padding-top: 1.25rem;
}

.recap-highlight-grid dt,
.recap-highlight-grid p {
  color: rgb(255 255 255 / .7);
}

.recap-highlight-grid dd {
  font-size: clamp(2rem, 5vw, 4.5rem);
  font-weight: 600;
  letter-spacing: -.05em;
  overflow-wrap: anywhere;
}

.recap-chart-panel {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.recap-chart {
  align-items: end;
  display: flex;
  gap: clamp(2px, .5vw, 8px);
  height: min(36vh, 22rem);
  margin-top: 4rem;
}

.recap-bar {
  background: #18181b;
  border-radius: 4px 4px 0 0;
  flex: 1;
  min-height: 2px;
}

.recap-bar-secondary {
  background: #2954d1;
}

.recap-chart-key {
  border-top: 1px solid #a8a29e;
  display: flex;
  justify-content: space-between;
  padding-top: .75rem;
}

.recap-share {
  background: #d9ff5b;
}

.recap-home {
  border-bottom: 1px solid currentColor;
}

@media (min-width: 768px) {
  .recap-numbers,
  .recap-rhythm {
    grid-template-columns: minmax(0, 1fr) minmax(28rem, 1fr);
  }

  .recap-highlight-grid {
    margin-top: 0;
  }
}
</style>
