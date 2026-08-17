import type { HotPlatform } from "./types/hot";

// 你的 Railway 后端地址（微博、B站用这个）
const RAILWAY_BASE = import.meta.env.VITE_API_BASE || '';

// 博主的 Vercel 后端地址（知乎专用，记得换成他实际的域名）
const ZHIHU_API_BASE = 'https://dailyhotapi-production-5c5e.up.railway.app'; // ⚠️ 替换成博主的真实地址

/** 请求单个平台热搜 */
export async function fetchHotPlatform(source: string): Promise<HotPlatform> {
  let url: string;
  
  if (source === 'zhihu') {
    // 使用 DailyHotApi
    url = `${ZHIHU_API_BASE}/zhihu`;
  } else {
    // 微博、B站走你的 Railway 后端
    url = `${RAILWAY_BASE}/api/hot/${source}`;
  }

  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();

  // ★★★ 知乎使用 DailyHotApi 的数据格式 ★★★
  if (source === 'zhihu') {
    // DailyHotApi 返回：{ code: "200", data: [...], total: 30, ... }
    if (json.code !== "200") {
      throw new Error(json.message || "知乎数据获取失败");
    }
    // 直接取 data 数组作为列表
    return {
      source: 'zhihu',
      list: json.data || [],
      updatedAt: Date.now()
    } as HotPlatform;
  }

  // ★★★ 微博、B站使用原来的格式 ★★★
  if (!json.ok) throw new Error(json.message || "请求失败");
  return json.data as HotPlatform;
}

/** 请求全平台热搜（如果你用这个函数，也需要做类似判断，但一般博主只提供单平台接口） */
export async function fetchAllHot(): Promise<HotPlatform[]> {
  // 如果你之前用这个接口一次性拿所有数据，建议改为分别调用 fetchHotPlatform('weibo')、fetchHotPlatform('bilibili')、fetchHotPlatform('zhihu')
  // 这样更灵活，也方便处理不同后端
  const res = await fetch(`${RAILWAY_BASE}/api/hot`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return json.platforms as HotPlatform[];
}