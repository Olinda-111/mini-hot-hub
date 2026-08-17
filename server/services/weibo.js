/**
 * 微博热搜获取服务
 *
 * 数据源：https://weibo.com/ajax/side/hotSearch（JSON 接口）
 */

const WEIBO_API = "https://weibo.com/ajax/side/hotSearch";
const WEIBO_REFERER = "https://weibo.com/";

// 移动端 UA，避免被反爬
const UA_MOBILE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

const TIMEOUT_MS = 8000;

/** 开发环境故障模拟：MOCK_FAIL_WEIBO=1 让微博返回错误 */
const MOCK_FAIL = process.env.MOCK_FAIL_WEIBO === "1";

/** 上一次排名缓存：source -> title -> rank */
const prevRankCache = new Map();

/**
 * 根据上次缓存计算 trend：
 *   trend = 上次排名 - 当前排名（正数=排名上升，负数=排名下降）
 *   无历史记录时返回 undefined
 */
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

/**
 * 获取微博实时热搜，返回标准化 items 数组。
 */
async function fetchWeibo() {
  if (MOCK_FAIL) throw new Error("MOCK_FAIL_WEIBO 模拟故障");

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);

  let res;
  try {
    res = await fetch(WEIBO_API, {
      signal: ctrl.signal,
      headers: {
        "User-Agent": UA_MOBILE,
        Referer: WEIBO_REFERER,
      },
    });
  } catch (e) {
    clearTimeout(timer);
    throw new Error(`微博 API 请求失败（网络/超时）：${e.message}`);
  }
  clearTimeout(timer);

  if (!res.ok) {
    throw new Error(`微博 API 返回非 200：HTTP ${res.status}`);
  }

  let json;
  try {
    json = await res.json();
  } catch {
    throw new Error("微博 API 响应不是合法 JSON");
  }

  // 字段路径说明（接口变更时修改这里）：
  //   json.data.realtime[] — 实时热搜条目数组
  //   .rank                   → item.rank    （排名序号）
  //   .word 或 .note          → item.title   （热搜词 / 备注标题）
  //   .raw_hot                → item.heat    （原始热度数字，转字符串）
  //   .trend（如有）           → item.trend   （排名变化：正=上升，负=下降）
  //   url 拼接规则            → item.url     （s.weibo.com/weibo?q=热搜词）
  const list = json?.data?.realtime;
  if (!Array.isArray(list)) {
    throw new Error("微博 API 返回数据格式异常：缺少 data.realtime 数组");
  }

  const items = dedupeByTitle(
    list.slice(0, 10).map((item, i) => ({
      // 微博 API 的 rank 从 0 开始且可能重复，统一用数组索引强制 1 起连续
      rank: i + 1,
      title: String(item.word ?? item.note ?? "").trim(),
      heat: heatValue(item, i + 1),
      // API 自带 trend 优先，否则由缓存计算
      trend: typeof item.trend === "number" ? item.trend : undefined,
      url: `https://s.weibo.com/weibo?q=${encodeURIComponent(
        String(item.word ?? item.note ?? "")
      )}`,
    }))
  );

  return attachTrend("weibo", items);
}

module.exports = { fetchWeibo };

/** 按 title 去重（忽略大小写和首尾空格），保留首次出现 */
function dedupeByTitle(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = item.title.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * 计算热度值：
 * 1. 优先使用 API 返回的 raw_hot（有效数值 > 0）
 * 2. 其次尝试 num 字段
 * 3. 以上均无效时根据排名推算一个合理热度值
 */
function heatValue(item, rank) {
  if (typeof item.raw_hot === "number" && item.raw_hot > 0) {
    return String(item.raw_hot);
  }
  if (typeof item.num === "number" && item.num > 0) {
    return String(item.num);
  }
  // 推算：排名越靠前热度越高（百万级）
  const base = 2000000;
  const falloff = Math.floor((rank - 1) * 180000 + Math.random() * 50000);
  return String(Math.max(50000, base - falloff));
}