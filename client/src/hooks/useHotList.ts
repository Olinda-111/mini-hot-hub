import { useState, useEffect, useCallback } from "react";
import type { HotPlatform } from "../types/hot";
import { fetchAllHot, fetchHotPlatform } from "../api/hot";

interface UseHotListReturn {
  platforms: HotPlatform[];
  loading: boolean;
  error: string | null;
  retry: () => void;
  retryPlatform: (source: string) => void;
}

/** 一次 fetchAllHot() 获取全部平台数据 */
export function useHotList(): UseHotListReturn {
  const [platforms, setPlatforms] = useState<HotPlatform[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAllHot();
      setPlatforms(data);
    } catch {
      setError("数据加载失败，请稍后重试");
    } finally {
      setLoading(false);
    }
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