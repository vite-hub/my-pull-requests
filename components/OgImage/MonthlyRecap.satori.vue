<script setup lang="ts">
defineProps<{
  bars: number[]
  closedIssues: number
  label: string
  mergedPullRequests: number
  name: string
  openedIssues: number
  openedPullRequests: number
}>()
</script>

<template>
  <div
    :style="{
      background: '#f4f0e8',
      color: '#18181b',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'Inter',
      height: '100%',
      justifyContent: 'space-between',
      padding: '64px 72px',
      width: '100%',
    }"
  >
    <div :style="{ display: 'flex', justifyContent: 'space-between' }">
      <div :style="{ display: 'flex', flexDirection: 'column' }">
        <span :style="{ color: '#6b7280', fontSize: '24px', letterSpacing: '0.12em', textTransform: 'uppercase' }">
          GitHub monthly recap · {{ label }}
        </span>
        <span :style="{ fontSize: '62px', fontWeight: '700', letterSpacing: '-0.05em', marginTop: '16px' }">
          {{ name }} shipped.
        </span>
      </div>
      <div :style="{ alignItems: 'center', display: 'flex', fontSize: '26px', gap: '12px' }">
        <span :style="{ color: '#16a34a', fontSize: '36px' }">●</span>
        GitHub activity
      </div>
    </div>

    <div :style="{ alignItems: 'flex-end', display: 'flex', gap: '7px', height: '180px', width: '100%' }">
      <div
        v-for="(bar, index) in bars"
        :key="index"
        :style="{
          background: index % 2 ? '#2563eb' : '#18181b',
          borderRadius: '5px 5px 0 0',
          display: 'flex',
          flex: '1',
          height: `${Math.max(8, bar)}%`,
        }"
      />
    </div>

    <div :style="{ borderTop: '2px solid #d6d3d1', display: 'flex', justifyContent: 'space-between', paddingTop: '28px' }">
      <div
        v-for="metric in [
          ['Opened PRs', openedPullRequests],
          ['Merged PRs', mergedPullRequests],
          ['Opened issues', openedIssues],
          ['Closed issues', closedIssues],
        ]"
        :key="metric[0]"
        :style="{ display: 'flex', flexDirection: 'column' }"
      >
        <span :style="{ fontSize: '42px', fontWeight: '700' }">{{ metric[1] }}</span>
        <span :style="{ color: '#6b7280', fontSize: '20px', marginTop: '4px' }">{{ metric[0] }}</span>
      </div>
    </div>
  </div>
</template>
