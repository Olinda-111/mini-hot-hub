import type { HotPlatform } from "./types/hot";

// 你的 Railway 后端地址（微博、B站用这个）
const RAILWAY_BASE = import.meta.env.VITE_API_BASE || '';

// 博主的 Vercel 后端地址（知乎专用，记得换成他实际的域名）
const ZHIHU_API_BASE = 'https://dailyhotapi-production-5c5e.up.railway.app'; // ⚠️ 替换成博主的真实地址

/** 请求单个平台热搜 */
export async function fetchHotPlatform(source: string): Promise<HotPlatform> {
  let url: string;
  
  // 判断：如果是知乎，用博主的地址；否则用你的 Railway 地址
  if (source === 'zhihu') {
    url = `${ZHIHU_API_BASE}/zhihu`;
    // 注意：如果博主的接口路径不一样（比如是 /zhihu 而不是 /api/hot/zhihu），这里的路径要改成和他一致的
  } else {
    url = `${RAILWAY_BASE}/api/hot/${source}`;
  }

  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  
  // 这里假设博主返回的数据格式和你的一致（包含 ok 和 data 字段）
  // 如果他的格式不一样（比如直接返回数组），你需要在这里做数据转换
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