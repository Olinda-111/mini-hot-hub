/**
 * 时间格式化：ISO 8601 → 「X 秒前 / X 分钟前 / X 小时前 / X 天前」
 */
export function formatRelativeTime(iso: string): string {
  if (!iso) return "未知";
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 0) return "刚刚";
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec} 秒前`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} 分钟前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} 小时前`;
  return `${Math.floor(hr / 24)} 天前`;
}

/**
 * 热度格式化：>=1亿 → X.X亿，>=1万 → X万，其余千分位。
 * 非数字字符串（如 "1000 万热度"）原样返回。
 */
export function formatHeat(v: number | string | null): string {
  if (v == null) return "";
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  if (n >= 1_0000_0000) return `${(n / 1_0000_0000).toFixed(1)}亿`;
  if (n >= 1_0000) return `${(n / 1_0000).toFixed(0)}万`;
  return n.toLocaleString();
}