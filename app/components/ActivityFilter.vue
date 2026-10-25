<script setup lang="ts">
const props = defineProps<{
  query: string
}>()

const emit = defineEmits<{
  'update:query': [query: string]
}>()

const open = shallowRef(false)
const draft = shallowRef(props.query)
const filter = computed(() => parseActivityQuery(props.query))
const activeCount = computed(() => {
  const { created, owners, repos, states, terms } = filter.value
  return terms.length + states.length + owners.length + repos.length + (created ? 1 : 0)
})

watch(() => props.query, (query) => {
  draft.value = query
})

const { data: repositories, execute, status } = useFetch('/api/repositories', {
  default: () => [],
  immediate: false,
  server: false,
})

watch(open, (isOpen) => {
  if (isOpen && status.value === 'idle') execute()
})

function update(patch: Partial<ActivityFilter>) {
  emit('update:query', formatActivityQuery({ ...filter.value, ...patch }))
}

function applyDraft() {
  emit('update:query', formatActivityQuery(parseActivityQuery(draft.value)))
}

const stateOptions: Array<{ icon: string, label: string, value: ActivityState }> = [
  { icon: 'i-lucide-git-pull-request-arrow', label: 'Open', value: 'open' },
  { icon: 'i-lucide-git-pull-request-draft', label: 'Draft', value: 'draft' },
  { icon: 'i-lucide-git-merge', label: 'Merged', value: 'merged' },
  { icon: 'i-lucide-circle-check', label: 'Closed', value: 'closed' },
]

function toggleState(state: ActivityState) {
  const states = filter.value.states
  update({ states: states.includes(state) ? states.filter(item => item !== state) : [...states, state] })
}

function ownerAvatar(owner: string) {
  return { alt: '', src: `https://github.com/${owner}.png?size=40` }
}

const ownerItems = computed(() => {
  const owners = new Map<string, number>()
  for (const repository of repositories.value) {
    const owner = repository.name.split('/')[0]!
    owners.set(owner, (owners.get(owner) ?? 0) + 1)
  }
  for (const owner of filter.value.owners) {
    if (!owners.has(owner)) owners.set(owner, 0)
  }
  return [...owners]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([owner, count]) => ({
      avatar: ownerAvatar(owner),
      description: count ? `${count} ${count === 1 ? 'repository' : 'repositories'}` : undefined,
      label: owner,
      value: owner,
    }))
})

const repoItems = computed(() => {
  const items = repositories.value.map(repository => ({
    avatar: ownerAvatar(repository.name.split('/')[0]!),
    description: `${formatStars(repository.stars)} stars`,
    label: repository.name,
    value: repository.name,
  }))
  for (const repo of filter.value.repos) {
    if (!items.some(item => item.value.toLowerCase() === repo.toLowerCase())) {
      items.unshift({ avatar: ownerAvatar(repo.split('/')[0]!), description: '', label: repo, value: repo })
    }
  }
  return items
})

function createOwner(owner: string) {
  const [parsed] = parseActivityQuery(`org:${owner.trim()}`).owners
  if (parsed) update({ owners: [...filter.value.owners, parsed] })
}

function createRepo(repo: string) {
  const [parsed] = parseActivityQuery(`repo:${repo.trim()}`).repos
  if (parsed) update({ repos: [...filter.value.repos, parsed] })
}

function daysAgo(days: number) {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() - days)
  return date.toISOString().slice(0, 10)
}

const createdPresets = [
  { days: 30, label: '30 days' },
  { days: 182, label: '6 months' },
  { days: 365, label: '1 year' },
]

const createdSince = computed({
  get: () => filter.value.created?.match(/^>=(\d{4}-\d{2}-\d{2})$/)?.[1] ?? '',
  set: (date: string) => update({ created: date && isActivityDate(date) ? `>=${date}` : null }),
})

const { copied, copy } = useClipboard({ copiedDuring: 2000 })

function copyLink() {
  copy(window.location.href)
}
</script>

<template>
  <UPopover
    v-model:open="open"
    :content="{ align: 'end', side: 'bottom', sideOffset: 8 }"
  >
    <UButton
      class="activity-filter-trigger"
      icon="i-lucide-list-filter"
      label="Filter"
      color="neutral"
      variant="ghost"
      size="sm"
      :aria-label="activeCount ? `Filter, ${activeCount} active` : 'Filter'"
    >
      <template v-if="activeCount" #trailing>
        <span class="activity-filter-count" aria-hidden="true">{{ activeCount }}</span>
      </template>
    </UButton>

    <template #content>
      <div class="activity-filter">
        <form role="search" class="activity-filter__query" @submit.prevent="applyDraft">
          <UInput
            v-model="draft"
            aria-label="Filter query"
            autofocus
            class="w-full"
            icon="i-lucide-search"
            :maxlength="ACTIVITY_QUERY_MAX_LENGTH"
            placeholder="perf org:nuxt is:merged"
          >
            <template #trailing>
              <UKbd value="enter" />
            </template>
          </UInput>
          <p class="activity-filter__hint">
            Words match titles. Also <code>is:</code>, <code>org:</code>, <code>repo:</code> and <code>created:</code>.
          </p>
        </form>

        <div class="activity-filter__section" role="group" aria-labelledby="activity-filter-state">
          <p id="activity-filter-state" class="activity-filter__label">
            State
          </p>
          <div class="activity-filter__toggles">
            <UButton
              v-for="option in stateOptions"
              :key="option.value"
              :aria-pressed="filter.states.includes(option.value)"
              :icon="option.icon"
              :label="option.label"
              :variant="filter.states.includes(option.value) ? 'solid' : 'ghost'"
              color="neutral"
              size="xs"
              @click="toggleState(option.value)"
            />
          </div>
        </div>

        <UFormField label="Organizations" :ui="{ label: 'activity-filter__label' }">
          <UInputMenu
            :model-value="filter.owners"
            :items="ownerItems"
            :loading="status === 'pending'"
            class="w-full"
            create-item
            multiple
            placeholder="Any organization"
            value-key="value"
            @create="createOwner"
            @update:model-value="owners => update({ owners })"
          />
        </UFormField>

        <UFormField label="Repositories" :ui="{ label: 'activity-filter__label' }">
          <UInputMenu
            :model-value="filter.repos"
            :items="repoItems"
            :loading="status === 'pending'"
            class="w-full"
            create-item
            multiple
            placeholder="Any repository"
            value-key="value"
            @create="createRepo"
            @update:model-value="repos => update({ repos })"
          />
        </UFormField>

        <div class="activity-filter__section" role="group" aria-labelledby="activity-filter-created">
          <p id="activity-filter-created" class="activity-filter__label">
            Created
          </p>
          <div class="activity-filter__toggles">
            <UButton
              :aria-pressed="!filter.created"
              :variant="filter.created ? 'ghost' : 'solid'"
              color="neutral"
              label="Any time"
              size="xs"
              @click="update({ created: null })"
            />
            <UButton
              v-for="preset in createdPresets"
              :key="preset.days"
              :aria-pressed="filter.created === `>=${daysAgo(preset.days)}`"
              :label="preset.label"
              :variant="filter.created === `>=${daysAgo(preset.days)}` ? 'solid' : 'ghost'"
              color="neutral"
              size="xs"
              @click="update({ created: `>=${daysAgo(preset.days)}` })"
            />
          </div>
          <label class="activity-filter__since">
            <span>Since</span>
            <UInput
              v-model.lazy="createdSince"
              class="flex-1"
              size="sm"
              type="date"
            />
          </label>
        </div>

        <footer class="activity-filter__footer">
          <UButton
            :disabled="!activeCount"
            color="neutral"
            label="Clear"
            size="sm"
            variant="ghost"
            @click="emit('update:query', '')"
          />
          <UButton
            :icon="copied ? 'i-lucide-check' : 'i-lucide-link'"
            :label="copied ? 'Copied' : 'Copy link'"
            color="neutral"
            size="sm"
            variant="subtle"
            @click="copyLink"
          />
        </footer>
      </div>
    </template>
  </UPopover>
</template>

<style scoped>
.activity-filter-trigger {
  background: var(--ui-bg-muted);
  border: 1px solid var(--ui-border-muted);
  border-radius: .75rem;
}

.activity-filter-trigger:hover {
  background: var(--ui-bg-accented);
}

.activity-filter-count {
  align-items: center;
  background: var(--ui-bg-inverted);
  border-radius: .25rem;
  color: var(--ui-text-inverted);
  display: inline-flex;
  font-size: .6875rem;
  font-variant-numeric: tabular-nums;
  height: 1.25rem;
  justify-content: center;
  min-width: 1.25rem;
  padding: 0 .25rem;
}

.activity-filter {
  display: grid;
  gap: 1rem;
  padding: 1rem;
  width: min(24rem, calc(100vw - 2rem));
}

.activity-filter__query {
  display: grid;
  gap: .375rem;
}

.activity-filter__hint {
  color: var(--ui-text-muted);
  font-size: .75rem;
  text-wrap: pretty;
}

.activity-filter__hint code {
  color: var(--ui-text-toned);
  font-size: .6875rem;
}

.activity-filter__section {
  display: grid;
  gap: .5rem;
}

.activity-filter :deep(.activity-filter__label) {
  color: var(--ui-text-muted);
  font-size: .6875rem;
  font-weight: 700;
  letter-spacing: .1em;
  text-transform: uppercase;
}

.activity-filter__toggles {
  display: flex;
  flex-wrap: wrap;
  gap: .25rem;
}

.activity-filter__since {
  align-items: center;
  color: var(--ui-text-muted);
  display: flex;
  font-size: .8125rem;
  gap: .75rem;
}

.activity-filter__footer {
  align-items: center;
  border-top: 1px solid var(--ui-border-muted);
  display: flex;
  justify-content: space-between;
  margin: 0 -1rem -1rem;
  padding: .75rem 1rem;
}
</style>
