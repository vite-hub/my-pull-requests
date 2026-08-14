<script setup lang="ts">
defineProps<{
  bars: number[]
  busiestDay: string
  busiestDayCount: number
  busiestHour: string
  busiestHourCount: number
  busiestIndex: number
  closedIssues: number
  endDay?: string
  label: string
  mergedPullRequests: number
  name: string
  openedIssues: number
  openedPullRequests: number
  startDay?: string
  topRepository?: string
  topRepositoryCount?: number
  totalCompleted: number
}>()
</script>

<template>
  <div
    :style="{
      background: '#f4f4f1',
      boxSizing: 'border-box',
      color: '#18181b',
      display: 'flex',
      fontFamily: 'Inter',
      height: '100%',
      padding: '24px',
      width: '100%',
    }"
  >
    <div
      :style="{
        background: '#fff',
        border: '1px solid #deded9',
        borderRadius: '22px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        justifyContent: 'space-between',
        padding: '28px 36px',
        width: '100%',
      }"
    >
      <div :style="{ display: 'flex', flexDirection: 'column' }">
        <div :style="{ alignItems: 'center', display: 'flex' }">
          <span :style="{ color: '#6b6b65', fontSize: '16px', fontWeight: '700', letterSpacing: '0.12em', textTransform: 'uppercase' }">
            GitHub monthly recap · {{ label }}
          </span>
        </div>
        <span :style="{ fontSize: '52px', fontWeight: '700', letterSpacing: '-0.06em', lineHeight: '0.9', marginTop: '12px' }">
          {{ name }} shipped.
        </span>
        <span :style="{ color: '#6b6b65', fontSize: '18px', marginTop: '8px' }">
          {{ totalCompleted }} issues and pull requests crossed the finish line.
        </span>
      </div>

      <div :style="{ border: '1px solid #deded9', borderRadius: '12px', display: 'flex', overflow: 'hidden' }">
        <div
          v-for="(metric, index) in [
            ['Pull requests opened', openedPullRequests],
            ['Pull requests merged', mergedPullRequests],
            ['Issues opened', openedIssues],
            ['Issues closed', closedIssues],
          ]"
          :key="metric[0]"
          :style="{
            borderRight: index === 3 ? '0' : '1px solid #deded9',
            display: 'flex',
            flex: '1',
            flexDirection: 'column',
            padding: '12px 16px',
          }"
        >
          <span :style="{ fontSize: '34px', fontWeight: '700', letterSpacing: '-0.05em', lineHeight: '1' }">{{ metric[1] }}</span>
          <span :style="{ color: '#6b6b65', fontSize: '13px', marginTop: '5px' }">{{ metric[0] }}</span>
        </div>
      </div>

      <div :style="{ borderTop: '1px solid #deded9', display: 'flex', flexDirection: 'column', paddingTop: '12px' }">
        <span :style="{ color: '#6b6b65', fontSize: '14px', fontWeight: '700', letterSpacing: '0.12em', textTransform: 'uppercase' }">
          Daily activity
        </span>
        <div :style="{ alignItems: 'flex-end', display: 'flex', gap: '5px', height: '132px', marginTop: '10px', width: '100%' }">
          <div
            v-for="(bar, index) in bars"
            :key="index"
            :style="{
              background: index === busiestIndex ? '#238636' : '#c8c8c2',
              borderRadius: '1px 1px 0 0',
              display: 'flex',
              flex: '1',
              height: bar ? `${bar}%` : '2px',
            }"
          />
        </div>
        <div :style="{ borderTop: '1px solid #deded9', color: '#6b6b65', display: 'flex', fontSize: '12px', justifyContent: 'space-between', paddingTop: '5px' }">
          <span>{{ startDay }}</span>
          <span>{{ endDay }}</span>
        </div>
      </div>

      <div :style="{ display: 'flex', justifyContent: 'space-between' }">
        <div :style="{ display: 'flex', flex: '1', flexDirection: 'column' }">
          <span :style="{ color: '#6b6b65', fontSize: '12px' }">Busiest day</span>
          <span :style="{ fontSize: '19px', fontWeight: '700', marginTop: '2px' }">{{ busiestDay }}</span>
          <span :style="{ color: '#6b6b65', fontSize: '12px', marginTop: '2px' }">{{ busiestDayCount }} actions</span>
        </div>
        <div :style="{ display: 'flex', flex: '1', flexDirection: 'column' }">
          <span :style="{ color: '#6b6b65', fontSize: '12px' }">Busiest hour</span>
          <span :style="{ fontSize: '19px', fontWeight: '700', marginTop: '2px' }">{{ busiestHour }}</span>
          <span :style="{ color: '#6b6b65', fontSize: '12px', marginTop: '2px' }">{{ busiestHourCount }} actions</span>
        </div>
        <div v-if="topRepository" :style="{ display: 'flex', flex: '1', flexDirection: 'column' }">
          <span :style="{ color: '#6b6b65', fontSize: '12px' }">Top repository</span>
          <span :style="{ fontSize: '19px', fontWeight: '700', marginTop: '2px' }">{{ topRepository }}</span>
          <span :style="{ color: '#6b6b65', fontSize: '12px', marginTop: '2px' }">{{ topRepositoryCount }} actions</span>
        </div>
      </div>
    </div>
  </div>
</template>
