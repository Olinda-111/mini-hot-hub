const TTL_DEFAULT = Number(process.env.CACHE_TTL) || 600;

/** @type {Map<string, { data: unknown; ts: number }>} */
const store = new Map();

/**
 * 读取缓存。过期自动删除并返回 null。
 * @param {string} key
 * @returns {unknown | null}
 */
function getCache(key) {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > TTL_DEFAULT * 1000) {
    store.delete(key);
    return null;
  }
  return entry.data;
}

/**
 * 写入缓存。
 * @param {string} key
 * @param {unknown} data
 * @param {number} [ttlSec] - 单位秒，不传则用 CACHE_TTL 默认值
 */
function setCache(key, data, ttlSec) {
  store.set(key, { data, ts: Date.now() });
}

module.exports = { getCache, setCache };