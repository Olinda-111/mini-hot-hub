import type { HotPlatform } from "./types/hot";

// 你的 Railway 后端（微博、B站）
const RAILWAY_BASE = import.meta.env.VITE_API_BASE || '';

// DailyHotApi（知乎专用）
const ZHIHU_API_BASE = 'https://dailyhotapi-production-5c5e.up.railway.app';

/** 请求单个平台热搜 */
export async function fetchHotPlatform(source: string): Promise<HotPlatform> {
  let url: string;
  
  if (source === 'zhihu') {
    // 知乎 → DailyHotApi
    url = `${ZHIHU_API_BASE}/zhihu`;
  } else {
    // 微博、B站 → 你的 Railway 后端
    url = `${RAILWAY_BASE}/api/hot/${source}`;
  }

  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();

  // ★ 知乎使用 DailyHotApi 格式
  if (source === 'zhihu') {
    // 兼容数字 200 和字符串 "200"
    if (Number(json.code) !== 200) {
      throw new Error(json.message || "知乎数据获取失败");
    }
    return {
      source: 'zhihu',
      list: json.data || [],
      updatedAt: Date.now()
    } as HotPlatform;
  }

  // ★ 微博、B站使用原来的格式
  if (!json.ok) throw new Error(json.message || "请求失败");
  return json.data as HotPlatform;
}

/** 请求全平台热搜（并行获取三个平台） */
export async function fetchAllHot(): Promise<HotPlatform[]> {
  // 并行请求三个单平台接口
  const [weibo, bilibili, zhihu] = await Promise.all([
    fetchHotPlatform('weibo'),
    fetchHotPlatform('bilibili'),
    fetchHotPlatform('zhihu')
  ]);
  return [weibo, bilibili, zhihu];
}