/** 单条热搜条目 */
export interface HotItem {
  rank: number; // 排名序号（从 1 开始）
  title: string; // 热搜标题
  heat?: string; // 热度值字符串
  url: string; // 源站链接
  trend?: number; // 热度趋势：正数=上升，负数=下降，0 或 undefined=无变化
}

/** 单平台热搜数据（GET /api/hot 响应体中 data 数组的元素） */
export interface HotPlatform {
  source: string; // 平台标识，如 "weibo" | "zhihu" | "bilibili"
  sourceName: string; // 展示名称，如 "微博热搜"
  listName: string; // 榜单名称，如 "热搜榜"
  updatedAt: string; // 更新时间，ISO 8601 格式
  items: HotItem[];
  error?: boolean; // 该平台是否获取失败
  message?: string; // 错误信息
}

/** GET /api/hot?platforms=... 的完整响应体 */
export interface HotResponse {
  ok: boolean;
  cached: boolean;
  data: HotPlatform[];
}

/** 平台注册表元数据（GET /api/platforms 响应体中 data 数组的元素） */
export interface PlatformMeta {
  id: string; // 平台唯一标识
  name: string; // 展示名称
  icon: string; // 平台图标（emoji）
  color: string; // 品牌主题色（hex）
  description: string; // 平台简介
  enabled: boolean; // 是否默认启用
}

/** GET /api/platforms 的完整响应体 */
export interface PlatformsResponse {
  ok: boolean;
  data: PlatformMeta[];
}