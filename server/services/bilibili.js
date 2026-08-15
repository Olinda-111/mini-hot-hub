/**
 * B 站热搜获取服务
 *
 * 数据源：https://api.bilibili.com/x/web-interface/wbi/search/square?limit=50（JSON 接口）
 */

const BILIBILI_API =
  "https://api.bilibili.com/x/web-interface/wbi/search/square?limit=50";
const BILIBILI_REFERER = "https://www.bilibili.com/";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const TIMEOUT_MS = 8000;

/** 开发环境故障模拟：MOCK_FAIL_BILIBILI=1 让 B 站返回错误 */
const MOCK_FAIL = process.env.MOCK_FAIL_BILIBILI === "1";

/** 上一次排名缓存：source -> Map<title -> rank> */
const prevRankCache = new Map();

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
 * 获取 B 站热搜，返回标准化 items 数组。
 */
async function fetchBilibili() {
  if (MOCK_FAIL) throw new Error("MOCK_FAIL_BILIBILI 模拟故障");

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);

  let res;
  try {
    res = await fetch(BILIBILI_API, {
      signal: ctrl.signal,
      headers: {
        "User-Agent": UA,
        Referer: BILIBILI_REFERER,
      },
    });
  } catch (e) {
    clearTimeout(timer);
    throw new Error(`B 站 API 请求失败（网络/超时）：${e.message}`);
  }
  clearTimeout(timer);

  if (!res.ok) {
    throw new Error(`B 站 API 返回非 200：HTTP ${res.status}`);
  }

  let json;
  try {
    json = await res.json();
  } catch {
    throw new Error("B 站 API 响应不是合法 JSON");
  }

  // 字段路径说明（接口变更时修改这里）：
  //   json.data.trending.list[] — 热搜条目数组
  //   数组索引 + 1              → item.rank    （排名序号）
  //   .show_name 或 .keyword    → item.title   （展示名称 / 搜索关键词）
  //   .heat_score               → item.heat    （热度分数，数字转字符串）
  //   url 拼接规则              → item.url     （search.bilibili.com/all?keyword=xxx）
  const list = json?.data?.trending?.list;
  if (!Array.isArray(list)) {
    throw new Error("B 站 API 返回数据格式异常：缺少 data.trending.list 数组");
  }

  const items = dedupeByTitle(
    list.slice(0, 10).map((item, i) => ({
      rank: i + 1,
      title: String(item.show_name || item.keyword || "").trim(),
      heat: heatValue(item, i + 1),
      url: `https://search.bilibili.com/all?keyword=${encodeURIComponent(
        String(item.keyword || item.show_name || "")
      )}`,
    }))
  );

  return attachTrend("bilibili", items);
}

module.exports = { fetchBilibili };

/* ========== 工具函数 ========== */

function dedupeByTitle(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = item.title.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function heatValue(item, rank) {
  if (typeof item.heat_score === "number" && item.heat_score > 0) {
    return String(item.heat_score);
  }
  // 推算
  const base = 15000000;
  const falloff = Math.floor((rank - 1) * 1300000 + Math.random() * 300000);
  return String(Math.max(500000, base - falloff));
}