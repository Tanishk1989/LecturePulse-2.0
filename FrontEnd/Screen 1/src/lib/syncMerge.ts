const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)

/** Preserve independent edits. Concurrent edits to the same field use the submitting device's value. */
export function mergeSyncedData(base: any, local: any, remote: any): any {
  if (same(local, base)) return remote
  if (same(remote, base) || same(local, remote)) return local
  if (Array.isArray(local) && Array.isArray(remote)) {
    const before = Array.isArray(base) ? base : []
    if ([...local, ...remote, ...before].every(item => object(item) && typeof item.id === 'string')) {
      const b = new Map(before.map(item => [item.id, item]))
      const l = new Map(local.map(item => [item.id, item]))
      const r = new Map(remote.map(item => [item.id, item]))
      const ids = new Set([...remote, ...local].map(item => item.id))
      return [...ids].filter(id => !(b.has(id) && (!l.has(id) || !r.has(id))))
        .map(id => mergeSyncedData(b.get(id), l.get(id), r.get(id))).filter(Boolean)
    }
    return [...new Set([...local, ...remote])].slice(0, 5)
  }
  if (object(local) && object(remote)) {
    const result: Record<string, unknown> = {}
    const before = object(base) ? base : {}
    for (const key of new Set([...Object.keys(before), ...Object.keys(local), ...Object.keys(remote)])) {
      if (['__proto__', 'constructor', 'prototype'].includes(key)) continue
      const value = mergeSyncedData(before[key], local[key], remote[key])
      if (value !== undefined) result[key] = value
    }
    return result
  }
  return local === undefined && base === undefined ? remote : local
}
