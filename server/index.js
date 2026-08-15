const express = require("express");
const cors = require("cors");
const { getCache, setCache } = require("./utils/cache");
const { fetchWeibo } = require("./services/weibo");
const { fetchZhihu } = require("./services/zhihu");
const { fetchBilibili } = require("./services/bilibili");

const app = express();

app.use(
  cors({
    origin: "http://localhost:5174",
  })
);

// 请求日志
app.use((req, _res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

/* ========== 平台 handler（统一包装） ========== */

function makeHandler(source, sourceName, listName, fetchFn) {
  return async () => {
    const base = {
      source,
      sourceName,
      listName,
      updatedAt: new Date().toISOString(),
    };
    try {
      const result = await fetchFn();
      if (result && result.error) {
        return {
          ...base,
          items: [],
          error: true,
          message: result.message || "数据获取失败，请稍后重试",
        };
      }
      return { ...base, items: result };
    } catch (e) {
      console.error(`${source} 错误:`, e.message);
      return {
        ...base,
        items: [],
        error: true,
        message: "数据获取失败，请稍后重试",
      };
    }
  };
}

const weibo = makeHandler("weibo", "微博热搜", "热搜榜", fetchWeibo);
const zhihu = makeHandler("zhihu", "知乎热榜", "热榜", fetchZhihu);
const bilibili = makeHandler("bilibili", "B站热搜", "热搜榜", fetchBilibili);

/* ========== 单平台路由（带缓存） ========== */

const handlers = { weibo, zhihu, bilibili };

app.get("/api/hot/:source", async (req, res) => {
  const { source } = req.params;
  const { refresh } = req.query;
  const fn = handlers[source];

  if (!fn) {
    return res.status(404).json({ ok: false, message: `未知平台: ${source}` });
  }

  const cacheKey = `hot:${source}`;

  // ?refresh=1 强制跳过缓存
  if (refresh === "1") {
    console.log(`[refresh] ${cacheKey}`);
    const data = await fn();
    if (!data.error) setCache(cacheKey, data);
    return res.json({ ok: true, data });
  }

  // 先查缓存
  const cached = getCache(cacheKey);
  if (cached) {
    console.log(`[cache hit] ${cacheKey}`);
    return res.json({ ok: true, data: cached });
  }

  // 缓存未命中 → 生成 → 写入 → 返回
  const data = await fn();
  if (!data.error) setCache(cacheKey, data);
  res.json({ ok: true, data });
});

/* ========== 聚合路由 ========== */

app.get("/api/hot", async (_req, res) => {
  const CACHE_KEY = "hot:aggregate";

  const cached = getCache(CACHE_KEY);
  if (cached) {
    console.log(`[cache hit] ${CACHE_KEY}`);
    return res.json({ platforms: cached });
  }

  const results = await Promise.allSettled([
    weibo(),
    zhihu(),
    bilibili(),
  ]);

  const platforms = results.map((r) => {
    if (r.status === "fulfilled") return r.value;
    return {
      source: "unknown",
      sourceName: "未知",
      listName: "",
      updatedAt: new Date().toISOString(),
      items: [],
      error: true,
      message: "数据获取失败，请稍后重试",
    };
  });

  setCache(CACHE_KEY, platforms);
  res.json({ platforms });
});

/* ========== 生产静态托管（Railway 部署时 client/dist 已构建） ========== */

const path = require("path");
const clientDist = path.join(__dirname, "..", "client", "dist");
app.use(express.static(clientDist));

// SPA 回退：非 /api 请求都返回 index.html
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api")) return next();
  res.sendFile(path.join(clientDist, "index.html"));
});

/* ========== 启动 ========== */

// Railway 通过 PORT 环境变量注入端口，本地默认 3001
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`server running on http://localhost:${PORT}`);
});