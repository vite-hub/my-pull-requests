import { combineSources, createSource, defineSource } from 'vite-hub/source'

function reader<const TKey extends string, TData>(key: TKey, data: TData) {
  return {
    async get(requested: TKey) {
      return { data, key: requested }
    },
    async items() {
      return [{ data, key }]
    },
  }
}

const keyedDefinition = defineSource(context => ({
  async get(month: '2026-07') {
    return { month, rootDir: context.rootDir }
  },
}))
const keyed = createSource(keyedDefinition, { rootDir: '/recaps' })
const collection = combineSources({
  sources: {
    count: reader('same', 1),
    keyed,
    title: reader('same', 'Title'),
  },
})

const count = await collection.get(['count', 'same'])
const countData: number | undefined = count.data
void countData

const recap = await collection.get(['keyed', '2026-07'])
const recapMonth: '2026-07' = recap.month
void recapMonth

const items = await collection.items()
const itemAlias: 'count' | 'title' = items[0]!.source
void itemAlias

// @ts-expect-error Collection aliases are inferred.
await collection.get(['missing', 'same'])
// @ts-expect-error Source keys are inferred per alias.
await collection.get(['count', 'different'])
