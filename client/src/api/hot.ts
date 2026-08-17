import type { HotPlatform, HotItem } from "../types/hot";

/**
 * 双后端架构：
 * - 微博、B站 → mini-hot-hub 后端（当前项目，/api/hot/:source）
 * - 知乎 → 独立 DailyHotApi 后端（/zhihu）
 *
 * 两个地址均可用环境变量覆盖，默认值为 Railway 生产地址。
 */
const MAIN_API_BASE =
  import.meta.env.VITE_API_BASE ||
  "https://mini-hot-hub-production-e09f.up.railway.app";

const ZHIHU_API_BASE =
  import.meta.env.VITE_ZHIHU_API_BASE ||
  "https://dailyhotapi-production-5c5e.up.railway.app";

/** DailyHotApi 返回的单条数据（字段名与 imsyy/DailyHotApi 对齐） */
interface DailyHotItem {
  title?: unknown;
  hot?: unknown;
  url?: unknown;
  mobileUrl?: unknown;
}

/** 请求单个平台热搜 */
export async function fetchHotPlatform(source: string): Promise<HotPlatform> {
  if (source === "zhihu") {
    return fetchZhihu();
  }

  // 微博、B站走 mini-hot-hub 后端
  const res = await fetch(`${MAIN_API_BASE}/api/hot/${source}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (!json.ok) throw new Error(json.message || "请求失败");
  return json.data as HotPlatform;
}

/**
 * 请求全平台热搜（仅微博、B站聚合，知乎需走独立后端）。
 * 如需三个平台一起拿，改用 fetchHotPlatform 分别调用。
 */
export async function fetchAllHot(): Promise<HotPlatform[]> {
  const res = await fetch(`${MAIN_API_BASE}/api/hot`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return json.platforms as HotPlatform[];
}

/**
 * 知乎走 DailyHotApi，需把 { code, data: [{ title, hot, url }] } 转成标准 HotPlatform。
 */
async function fetchZhihu(): Promise<HotPlatform> {
  // 加 limit=10 从源头只请求前十条，避免下载 30 条完整数据（desc 字段极长）
  const res = await fetch(`${ZHIHU_API_BASE}/zhihu?limit=10`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();

  const list = json?.data;
  if (!Array.isArray(list)) {
    throw new Error("知乎数据格式异常");
  }

  const items: HotItem[] = (list as DailyHotItem[])
    .slice(0, 10)
    .map((item, i) => ({
      rank: i + 1,
      title: String(item.title ?? "").trim(),
      heat: item.hot != null ? String(item.hot) : "",
      url: String(item.url ?? item.mobileUrl ?? ""),
    }));

  return {
    source: "zhihu",
    sourceName: "知乎热榜",
    listName: "热榜",
    // 用后端返回的 updateTime，保证「更新于」反映真实抓取时间
    updatedAt: (json.updateTime as string) ?? new Date().toISOString(),
    items,
  };
}