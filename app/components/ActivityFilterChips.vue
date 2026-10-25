<script setup lang="ts">
const props = defineProps<{
  query: string
}>()

const emit = defineEmits<{
  'update:query': [query: string]
}>()

const filter = computed(() => parseActivityQuery(props.query))

const dateFormat = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' })

function formatCreated(created: string) {
  const [from, to] = created.replace(/^[<>]=?/, '').split('..') as [string, string?]
  const date = (value: string) => dateFormat.format(new Date(`${value}T00:00:00Z`))
  if (to) return `${date(from)} – ${date(to)}`
  if (created.startsWith('>')) return `Since ${date(from)}`
  if (created.startsWith('<')) return `Before ${date(from)}`
  return `On ${date(from)}`
}

function ownerAvatar(owner: string) {
  return { alt: '', src: `https://github.com/${owner}.png?size=40` }
}

const chips = computed(() => {
  const { created, owners, repos, states, terms } = filter.value
  const without = (patch: Partial<ActivityFilter>) => formatActivityQuery({ ...filter.value, ...patch })
  return [
    ...terms.map(term => ({ avatar: undefined, key: `term:${term}`, label: `“${term}”`, query: without({ terms: terms.filter(item => item !== term) }) })),
    ...states.map(state => ({ avatar: undefined, key: `is:${state}`, label: state[0]!.toUpperCase() + state.slice(1), query: without({ states: states.filter(item => item !== state) }) })),
    ...owners.map(owner => ({ avatar: ownerAvatar(owner), key: `org:${owner}`, label: owner, query: without({ owners: owners.filter(item => item !== owner) }) })),
    ...repos.map(repo => ({ avatar: ownerAvatar(repo.split('/')[0]!), key: `repo:${repo}`, label: repo, query: without({ repos: repos.filter(item => item !== repo) }) })),
    ...created ? [{ avatar: undefined, key: 'created', label: formatCreated(created), query: without({ created: null }) }] : [],
  ]
})
</script>

<template>
  <ul v-if="chips.length" class="activity-filter-chips" aria-label="Active filters">
    <li v-for="chip in chips" :key="chip.key">
      <UButton
        :aria-label="`Remove filter ${chip.label}`"
        :avatar="chip.avatar"
        :label="chip.label"
        color="neutral"
        size="xs"
        trailing-icon="i-lucide-x"
        variant="subtle"
        @click="emit('update:query', chip.query)"
      />
    </li>
    <li>
      <UButton
        color="neutral"
        label="Clear all"
        size="xs"
        variant="link"
        @click="emit('update:query', '')"
      />
    </li>
  </ul>
</template>

<style scoped>
.activity-filter-chips {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: .375rem;
  margin-bottom: 1rem;
}
</style>
