<script setup lang="ts">
defineProps<{
  bars: number[]
  busiestDay: string
  busiestDayCount: number
  busiestHour: string
  busiestHourCount: number
  busiestIndex: number
  closedIssues: number
  endDay?: number | string
  label: string
  mergedPullRequests: number
  name: string
  openedIssues: number
  openedPullRequests: number
  startDay?: number | string
  topRepository?: string
  topRepositoryCount?: number
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
      padding: '18px',
      width: '100%',
    }"
  >
    <div
      :style="{
        background: '#fff',
        border: '1px solid #deded9',
        borderRadius: '18px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        justifyContent: 'space-between',
        padding: '22px 30px',
        width: '100%',
      }"
    >
      <div
        :style="{
          alignItems: 'center',
          backgroundColor: '#f8f8f5',
          backgroundImage: 'radial-gradient(circle at 1px 1px, #dfdfda 1px, transparent 1px)',
          backgroundSize: '18px 18px',
          borderRadius: '12px',
          display: 'flex',
          justifyContent: 'space-between',
          padding: '14px 18px',
        }"
      >
        <span :style="{ fontSize: '48px', fontWeight: '700', letterSpacing: '-0.06em', lineHeight: '0.9' }">
          {{ name }} shipped.
        </span>
        <span :style="{ fontSize: '15px', fontWeight: '600' }">
          {{ label }}
        </span>
      </div>

      <div :style="{ display: 'flex' }">
        <div
          v-for="metric in [
            ['Pull requests opened', openedPullRequests],
            ['Pull requests merged', mergedPullRequests],
            ['Issues opened', openedIssues],
            ['Issues closed', closedIssues],
          ]"
          :key="metric[0]"
          :style="{
            display: 'flex',
            flex: '1',
            flexDirection: 'column',
            padding: '9px 14px',
          }"
        >
          <span :style="{ fontSize: '30px', fontWeight: '700', letterSpacing: '-0.05em', lineHeight: '1' }">{{ metric[1] }}</span>
          <span :style="{ color: '#6b6b65', fontSize: '12px', marginTop: '4px' }">{{ metric[0] }}</span>
        </div>
      </div>

      <div :style="{ display: 'flex', flexDirection: 'column' }">
        <span :style="{ color: '#6b6b65', fontSize: '14px', fontWeight: '700', letterSpacing: '0.12em', textTransform: 'uppercase' }">
          Daily activity
        </span>
        <div :style="{ alignItems: 'flex-end', display: 'flex', flex: 'none', gap: '5px', height: '120px', marginTop: '8px', width: '100%' }">
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
          <span :style="{ fontSize: '18px', fontWeight: '700', marginTop: '2px' }">{{ busiestDay }}</span>
          <span :style="{ color: '#6b6b65', fontSize: '12px', marginTop: '2px' }">{{ busiestDayCount }} actions</span>
        </div>
        <div :style="{ display: 'flex', flex: '1', flexDirection: 'column' }">
          <span :style="{ color: '#6b6b65', fontSize: '12px' }">Busiest hour</span>
          <span :style="{ fontSize: '18px', fontWeight: '700', marginTop: '2px' }">{{ busiestHour }}</span>
          <span :style="{ color: '#6b6b65', fontSize: '12px', marginTop: '2px' }">{{ busiestHourCount }} actions</span>
        </div>
        <div v-if="topRepository" :style="{ display: 'flex', flex: '1', flexDirection: 'column' }">
          <span :style="{ color: '#6b6b65', fontSize: '12px' }">Top repository</span>
          <span :style="{ fontSize: '18px', fontWeight: '700', marginTop: '2px' }">{{ topRepository }}</span>
          <span :style="{ color: '#6b6b65', fontSize: '12px', marginTop: '2px' }">{{ topRepositoryCount }} actions</span>
        </div>
      </div>
    </div>
  </div>
</template>
