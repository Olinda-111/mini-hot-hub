import type { HotPlatform } from "./types/hot";

// 建议将两个地址都放在环境变量里，或者统一管理
// 这里的地址是你截图里能访问到的那个 Railway 地址
const DAILY_HOT_API_BASE = 'https://dailyhotapi-production-5c5e.up.railway.app'; 
const RAILWAY_BASE = import.meta.env.VITE_API_BASE || '';

/** 请求单个平台热搜 */
export async function fetchHotPlatform(source: string): Promise<HotPlatform> {
  let url: string;
  
  // 根据来源决定请求哪个后端
  if (source === 'zhihu') {
    url = `${DAILY_HOT_API_BASE}/${source}`; // 注意：DailyHotApi 通常直接用 /zhihu
  } else {
    // 微博、B站走你的主后端
    url = `${RAILWAY_BASE}/api/hot/${source}`;
  }

  try {
    const res = await fetch(url);
    
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    const json = await res.json();

    // --- 针对知乎 (DailyHotApi) 的特殊处理 ---
    if (source === 'zhihu') {
      // 1. 兼容 code 是字符串 "200" 还是数字 200
      if (json.code != 200) { 
        console.error("知乎 API 返回错误码:", json);
        throw new Error(json.message || "知乎数据获取失败");
      }

      // 2. 数据清洗：确保 list 存在，且格式符合前端要求
      const rawList = json.data || [];
      
      // 关键点：防止 UI 崩溃，确保 hot 值是字符串，并处理可能的字段名差异
      const cleanList = rawList.map((item: any) => ({
        ...item,
        // DailyHotApi 通常用 'hot' 字段，但也可能是 'heat'，这里做个兜底
        hot: String(item.hot || item.heat || '0'), 
        // 确保 title 存在，防止空指针
        title: item.title || "未知标题" 
      }));

      return {
        source: 'zhihu',
        list: cleanList,
        updatedAt: Date.now()
      } as HotPlatform;
    }

    // --- 针对其他平台 (原有逻辑) ---
    if (!json.ok) throw new Error(json.message || "请求失败");
    
    // 同样建议在这里也做一次数据清洗，防止微博/B站接口变动导致崩溃
    return json.data as HotPlatform;

  } catch (error) {
    console.error(`Fetch ${source} failed:`, error);
    throw error; // 继续抛出，让前端组件显示“重试”按钮
  }
}

/** 请求全平台热搜 */
export async function fetchAllHot(): Promise<HotPlatform[]> {
  // 建议：不要依赖后端的聚合接口，前端并发请求更稳
  const platforms = ['weibo', 'bilibili', 'zhihu']; 
  
  // 使用 Promise.allSettled 防止一个挂了导致全都没数据
  const results = await Promise.allSettled(
    platforms.map(p => fetchHotPlatform(p))
  );

  return results
    .filter((result): result is PromiseFulfilledResult<HotPlatform> => result.status === 'fulfilled')
    .map(result => result.value);
}