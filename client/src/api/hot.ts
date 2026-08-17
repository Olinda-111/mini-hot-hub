import type { HotPlatform } from "../types/hot";

// 从环境变量读取后端地址，如果没设置则回退到相对路径（本地开发时用）
const API_BASE = import.meta.env.VITE_API_BASE || '';

/** 请求单个平台热搜（GET /api/hot/:source） */
export async function fetchHotPlatform(source: string): Promise<HotPlatform> {
  const res = await fetch(`${API_BASE}/api/hot/${source}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (!json.ok) throw new Error(json.message || "请求失败");
  return json.data as HotPlatform;
}

/** 请求全平台热搜（GET /api/hot → { platforms: HotPlatform[] }） */
export async function fetchAllHot(): Promise<HotPlatform[]> {
  const res = await fetch(`${API_BASE}/api/hot`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return json.platforms as HotPlatform[];
}