const MEMORY_CACHE = {}

function storageKey(key) {
  return `pesach_cache:${key}`
}

export function readPageCache(key) {
  if (MEMORY_CACHE[key]) return MEMORY_CACHE[key]
  try {
    const raw = sessionStorage.getItem(storageKey(key))
    if (!raw) return null
    const parsed = JSON.parse(raw)
    MEMORY_CACHE[key] = parsed
    return parsed
  } catch {
    return null
  }
}

export function writePageCache(key, value) {
  MEMORY_CACHE[key] = value
  try {
    sessionStorage.setItem(storageKey(key), JSON.stringify(value))
  } catch {}
}
