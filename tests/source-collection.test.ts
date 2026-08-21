import assert from 'node:assert/strict'
import test from 'node:test'

import { combineSources, createSource, defineSource } from 'vite-hub/source'

function enumerable<const TKey extends string, TData>(key: TKey, data: TData) {
  return {
    async get(requested: TKey) {
      return { data, key: requested }
    },
    async items() {
      return [{ data, key }]
    },
  }
}

test('keeps equal Source keys distinct by alias', async () => {
  const collection = combineSources({
    sources: {
      first: enumerable('same', 1),
      second: enumerable('same', 2),
    },
  })

  assert.deepEqual(await collection.items(), [
    { data: 1, identity: ['first', 'same'], key: 'same', source: 'first' },
    { data: 2, identity: ['second', 'same'], key: 'same', source: 'second' },
  ])
  assert.deepEqual(await collection.get(['second', 'same']), { data: 2, key: 'same' })
})

test('gets keyed Sources without requiring enumeration', async () => {
  const definition = defineSource(context => ({
    async get(key: string) {
      return `${context.rootDir}:${key.toUpperCase()}`
    },
  }))
  const keyed = createSource(definition, { rootDir: '/recaps' })
  const collection = combineSources({ sources: { keyed } })

  assert.equal(await collection.get(['keyed', 'july']), '/recaps:JULY')
  await assert.rejects(collection.items(), /Combined Source alias "keyed" is not enumerable/)
  await assert.rejects(collection.get(['missing' as 'keyed', 'july']), /Combined Source alias "missing" is not defined/)
  await assert.rejects(collection.get('keyed:july' as never), /Combined Source identity must be a \[source, key\] string tuple/)
})
