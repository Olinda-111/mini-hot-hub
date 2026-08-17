import { useState, useEffect, useCallback } from "react";
import type { HotPlatform } from "../types/hot";
import { fetchHotPlatform } from "../api/hot";

interface UseHotListReturn {
  platforms: HotPlatform[];
  loading: boolean;
  error: string | null;
  retry: () => void;
  retryPlatform: (source: string) => void;
}

/** 三个平台的固定顺序（知乎走独立后端，需分别请求） */
const SOURCES = ["weibo", "zhihu", "bilibili"] as const;

/** 平台 ID → 展示名称（仅用于失败占位） */
const SOURCE_NAME: Record<string, string> = {
  weibo: "微博热搜",
  zhihu: "知乎热榜",
  bilibili: "B站热搜",
};

/**
 * 并发请求三个平台，各平台独立容错：
 * 一个失败不影响其他，失败平台返回 error 占位。
 */
export function useHotList(): UseHotListReturn {
  const [platforms, setPlatforms] = useState<HotPlatform[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const results = await Promise.allSettled(
      SOURCES.map((source) => fetchHotPlatform(source))
    );

    const merged: HotPlatform[] = results.map((r, i) => {
      if (r.status === "fulfilled") return r.value;
      const source = SOURCES[i];
      return {
        source,
        sourceName: SOURCE_NAME[source] ?? source,
        listName: "",
        updatedAt: new Date().toISOString(),
        items: [],
        error: true,
        message: "数据获取失败，请稍后重试",
      };
    });

    setPlatforms(merged);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const retryPlatform = useCallback((source: string) => {
    return fetchHotPlatform(source)
      .then((fresh) => {
        setPlatforms((prev) =>
          prev.map((p) => (p.source === source ? fresh : p))
        );
      })
      .catch(() => {
        setPlatforms((prev) =>
          prev.map((p) =>
            p.source === source
              ? { ...p, error: true, message: "重试失败，请稍后再试" }
              : p
          )
        );
      });
  }, []);

  return { platforms, loading, error, retry: fetchData, retryPlatform };
}