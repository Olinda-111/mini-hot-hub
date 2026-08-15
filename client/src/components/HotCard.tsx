import type { HotPlatform, HotItem } from "../types/hot";
import { useState } from "react";
import { formatRelativeTime, formatHeat } from "../utils/format";
import styles from "./HotCard.module.css";

interface HotCardProps {
  platform: HotPlatform;
  /** 加载中 — 显示骨架屏 */
  loading?: boolean;
  /** 错误信息 — 显示重试按钮 */
  error?: string;
  /** 点击重试回调 */
  onRetry?: () => void;
}

export default function HotCard({
  platform,
  loading = false,
  error,
  onRetry,
}: HotCardProps) {
  const [retrying, setRetrying] = useState(false);

  const handleRetry = async () => {
    if (!onRetry) return;
    setRetrying(true);
    try {
      await onRetry();
    } finally {
      setRetrying(false);
    }
  };

  const headerJsx = (
    <div className={styles["card-header"]}>
      <span className={styles["card-icon"]}>
        {platformIcon(platform.source)}
      </span>
      <h2>{platform.sourceName}</h2>
      {platform.listName && (
        <span className={styles["card-list-name"]}>{platform.listName}</span>
      )}
    </div>
  );

  const accentStyle = {
    "--accent": platformColor(platform.source),
  } as React.CSSProperties;

  // ---- loading ----
  if (loading) {
    return (
      <div className={styles["card"]} style={accentStyle}>
        {headerJsx}
        <div className={styles["card-body"]}>
          {Array.from({ length: 6 }, (_, i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
        <div className={styles["card-footer"]}>
          <span className={styles["skeleton-text-short"]} />
        </div>
      </div>
    );
  }

  // ---- error ----
  if (error) {
    return (
      <div className={styles["card"]} style={accentStyle}>
        {headerJsx}
        <div className={styles["card-error"]}>
          <p>{retrying ? "重试中..." : error}</p>
          {onRetry && (
            <button
              className={styles["retry-btn"]}
              onClick={handleRetry}
              disabled={retrying}
            >
              {retrying ? "重试中..." : "点击重试"}
            </button>
          )}
        </div>
      </div>
    );
  }

  // ---- success ----
  return (
    <div className={styles["card"]} style={accentStyle}>
      {headerJsx}
      {platform.items.length === 0 ? (
        <div className={styles["card-empty"]}>暂无数据</div>
      ) : (
        <ol className={styles["hot-list"]}>
          {platform.items.map((item, i) => (
            <HotItemRow key={item.rank ?? i} item={{ ...item, rank: i + 1 }} />
          ))}
        </ol>
      )}
      <div className={styles["card-footer"]}>
        更新于 {formatRelativeTime(platform.updatedAt)}
      </div>
    </div>
  );
}

/** 骨架屏行 — 模拟热搜条目高度 */
function SkeletonRow() {
  return (
    <div className={styles["skeleton-row"]}>
      <span className={styles["skeleton-block"] + " " + styles["skeleton-rank"]} />
      <span className={styles["skeleton-block"] + " " + styles["skeleton-title"]} />
      <span className={styles["skeleton-block"] + " " + styles["skeleton-heat"]} />
    </div>
  );
}

/** 单条热搜行 */
function HotItemRow({ item }: { item: HotItem }) {
  return (
    <li
      className={styles["hot-item"]}
      data-rank={item.rank <= 3 ? item.rank : undefined}
    >
      <span className={styles["rank"]}>
        {item.rank}
        {item.trend != null && item.trend !== 0 && (
          <span
            className={
              item.trend > 0 ? styles["trend-up"] : styles["trend-down"]
            }
          >
            {item.trend > 0 ? "▲" : "▼"}
          </span>
        )}
      </span>
      <a
        className={styles["title"]}
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
      >
        {item.title}
      </a>
      <span className={styles["heat"]}>{formatHeat(item.heat ?? null)}</span>
    </li>
  );
}

/* ---------- 平台映射 ---------- */

function platformColor(source: string): string {
  const map: Record<string, string> = {
    weibo: "#e6162d",
    zhihu: "#0066ff",
    bilibili: "#fb7299",
  };
  return map[source] || "#333";
}

function platformIcon(source: string): string {
  const map: Record<string, string> = {
    weibo: "🔥",
    zhihu: "💡",
    bilibili: "📺",
  };
  return map[source] || "📌";
}