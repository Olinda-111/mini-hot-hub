/**
 * 本地 DailyHotApi 统一客户端
 *
 * 数据源：http://localhost:6688/{source}（source = weibo | zhihu | bilibili）
 * 成功返回 items 数组：[{ rank, title, heat, url, trend }]
 * 失败返回 { error: true, message }
 */

const DAILY_HOT_BASE = process.env.DAILY_HOT_BASE || "http://localhost:6688";
const TIMEOUT_MS = 8000;

/** 上一次排名缓存：source -> Map<title -> rank> */
const prevRankCache = new Map();

/** 开发环境故障模拟开关映射 */
const MOCK_FAIL_ENV = {
  weibo: "MOCK_FAIL_WEIBO",
  zhihu: "MOCK_FAIL_ZHIHU",
  bilibili: "MOCK_FAIL_BILIBILI",
};

/**
 * 获取指定平台热榜。
 * @param {"weibo"|"zhihu"|"bilibili"} source
 * @returns {Promise<Array | { error: true; message: string }>}
 */
async function fetchHot(source) {
  const mockEnv = MOCK_FAIL_ENV[source];
  if (mockEnv && process.env[mockEnv] === "1") {
    return { error: true, message: `${mockEnv} 模拟故障` };
  }

  const url = `${DAILY_HOT_BASE}/${source}`;
  try {
    const json = await httpRequest(url);
    const list = json?.data;
    if (!Array.isArray(list)) {
      return { error: true, message: `${source} 数据格式异常` };
    }
    const items = dedupeByTitle(parseItems(list));
    return attachTrend(source, items);
  } catch (e) {
    console.error(`DailyHotApi(${source}) 请求失败:`, e.message);
    return { error: true, message: `${source} 数据获取失败，请稍后重试` };
  }
}

/** 解析 DailyHotApi 返回的 data 数组为标准 items */
function parseItems(list) {
  return list.slice(0, 10).map((item, i) => ({
    rank: i + 1,
    title: String(item.title ?? "").trim(),
    heat: item.hot != null ? String(item.hot) : "",
    url: item.url ?? item.mobileUrl ?? "",
  }));
}

/** 计算 trend：上次排名 − 当前排名（正数=升，负数=降） */
function attachTrend(source, items) {
  const prev = prevRankCache.get(source);
  const current = new Map(items.map((it) => [it.title.toLowerCase(), it.rank]));
  const result = items.map((it) => {
    const key = it.title.toLowerCase();
    const trend = prev?.has(key) ? prev.get(key) - it.rank : undefined;
    return { ...it, trend };
  });
  prevRankCache.set(source, current);
  return result;
}

/** 按 title 去重（忽略大小写），保留首次出现 */
function dedupeByTitle(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = item.title.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function httpRequest(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);

  let res;
  try {
    res = await fetch(url, { signal: ctrl.signal });
  } catch (e) {
    throw new Error(`网络/超时：${e.message}`);
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  try {
    return await res.json();
  } catch {
    throw new Error("响应不是合法 JSON");
  }
}

module.exports = { fetchHot };