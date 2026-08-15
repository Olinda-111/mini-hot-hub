# 今日热搜 · 开发指令

> 本文档是给 AI 编程代理（Cursor Agent / Claude / 任何 LLM）的开发规范文件。
> 任何 AI 在此项目中生成或修改代码时，必须遵守以下规则。

---

## 项目概述

使用 React + TypeScript + Vite + CSS 开发前端；
使用 Node.js + Express 开发后端，聚合微博 / 知乎 / B 站等热榜。

平台定义集中在 `server/registry.ts`（平台注册表），前端通过 `GET /api/platforms` 获取可用平台列表，用户可自定义启用的平台，偏好持久化至 `localStorage`。

---

## 开发规范

### 语言与类型

- 使用 TypeScript，前后端类型定义与 `docs/TECH_DESIGN.md` 第 3 节「数据模型」保持一致
- 核心类型：`PlatformDescriptor`、`PlatformMeta`、`Platform`、`HotItem`
- 禁止使用 `any`——至少标注 `Record<string, unknown>` 或 `unknown`

### 组件规范

- 使用函数式组件 + Hooks，禁止 Class 组件
- 组件目录 `client/src/components/`，按职责拆分：
  - `Layout` — 页面整体布局（Header + 主体 + Footer）
  - `HotCard` — 单张平台卡片（头部 + 列表 + 底部时间戳）
  - `HotList` — 卡片内的热搜列表，接收 `items: HotItem[]`
  - `PlatformSelector` — 平台选择器面板（勾选框列表）
- 组件为纯展示，不含副作用（不发请求、不写存储）
- 数据获取与状态管理集中在 `client/src/hooks/usePlatforms.ts`

### 样式规范

- 使用 CSS / CSS Modules，保持简洁
- 颜色使用 CSS 自定义属性 `var(--accent)`，由卡片组件按平台品牌色注入
- 禁止引入 CSS 框架（Tailwind、Bootstrap 等）
- 桌面 3 列卡片，平板 2 列，移动端 1 列（`@media` 断点：1000px / 640px）
- 卡片最小宽度 320px，间距 20px

### 模块边界

| 规则                                       | 说明                                               |
| ------------------------------------------ | -------------------------------------------------- |
| 前端禁止直接 fetch 微博 / 知乎 / B 站原始域名 | 所有数据经 `/api/hot/:source` 代理                  |
| 后端禁止输出 HTML                           | 仅返回 JSON，不使用模板引擎                          |
| `server/registry.ts` 是平台定义的唯一真相源   | 新增平台只能在此文件中注册                            |
| `server/cache.ts` 是缓存逻辑的唯一入口       | 禁止在路由中直接操作 `Map`                           |

---

## 代码风格

### 命名

| 类型       | 规则           | 示例                          |
| ---------- | -------------- | ----------------------------- |
| React 组件 | PascalCase     | `HotCard`、`HotList`、`Layout` |
| 函数/变量  | camelCase      | `fetchData`、`selectedIds`    |
| 常量       | UPPER_SNAKE    | `CACHE_TTL`、`STORAGE_KEY`    |
| CSS class  | kebab-case     | `hot-item`、`card-header`     |
| 文件       | kebab-case 或与组件同名 | `hot-card.tsx`、`registry.ts` |

### 接口路径

- `GET /api/hot/:source` — 按来源获取单平台数据（`source` = `weibo` | `zhihu` | `bilibili`）
- `GET /api/platforms` — 获取平台注册表元数据（供前端渲染选择器）
- 前端通过 Promise.all 并发请求多个 `/api/hot/:source`，每个卡片独立加载

### 组件写法

```typescript
// ✅ 正确：函数式组件 + 类型标注
interface HotCardProps {
  platform: Platform;
}

export default function HotCard({ platform }: HotCardProps) {
  return <div className="card">{/* ... */}</div>;
}

// ❌ 禁止：Class 组件、无类型标注
class HotCard extends React.Component { /* ... */ }
```

### 工具函数

```typescript
// ✅ 正确：提取为纯函数，放在 utils/ 中
export const fmtHeat = (v: number | string | null): string => { /* ... */ };

// ❌ 禁止：JSX 中内联复杂匿名函数
<span>{((v) => { /* 10 行逻辑 */ })(item.heat)}</span>
```

### 注释风格

- 解释 **WHY**（为什么这样做），而非 WHAT（代码本身已说明做了什么）
- 禁止废话注释：`// 定义变量`、`// 遍历数组`
- 好的示例：

```typescript
// 知乎 url 可能为相对路径 /question/xxx，需补全 https://www.zhihu.com 前缀
const fullUrl = rawUrl.startsWith("http") ? rawUrl : `https://www.zhihu.com${rawUrl}`;
```

---

## 设计要求

### 信息层级

- 参考今日热榜的信息密度，清爽易读
- 每张卡片：平台图标 + 名称（头部）、热搜列表（主体）、"更新于 × 分钟前"（底部）
- 每条热搜：排名徽章 + 可点击标题 + 热度值

### 布局

- 桌面 3 列卡片，平板 2 列，移动端 1 列
- 断点：`> 1000px` 三列 / `640–1000px` 两列 / `< 640px` 单列
- 卡片最小宽度 320px

### 视觉强调

- 排名 1～3 使用特殊徽章颜色（金 / 银 / 铜），第 4 名起使用灰色
- 平台品牌色作为卡片顶部边框色，通过 `var(--accent)` 注入：
  - 微博 `#e6162d` / 知乎 `#0066ff` / B 站 `#fb7299`
- hover 时条目背景微调，标题加下划线

### 异常处理

- 单卡失败显示错误文案（如"数据获取失败，请稍后重试"），不拖垮整页
- 全部卡片失败时展示全局错误状态 + 「重试」按钮
- 后端每个 fetch 设置 8 秒超时（`AbortController`）

---

## 注意事项

### 数据获取

- 上游请求加合理 `User-Agent`（模拟 Chrome 131）、`Referer`（按各平台文档）
- 使用 `Promise.allSettled` 而非 `Promise.all`，单平台失败不影响其他
- 所有字段访问使用可选链和空值合并（`?.`、`??`），防御平台 API 字段变更
- 禁止使用 Mock 数据——API 失败时返回空数组 + error 字段

### 缓存

- 缓存 TTL 默认 600 秒（10 分钟），可通过环境变量 `CACHE_TTL` 覆盖
- 缓存键按平台组合生成：`"hot:{sorted_ids}"`，确保不同组合互不干扰
- 缓存操作统一通过 `cacheGet` / `cacheSet`，禁止直接读写 `Map`

### 平台注册表

- `server/registry.ts` 为 `Map<string, PlatformDescriptor>` 结构
- 新增平台三步：实现 `fetchers/{id}.ts` → 注册到 `registry.ts` → 同步更新本文档
- `enabled` 字段控制平台是否默认启用，新平台设 `false`
- 所有 fetch 函数输出统一为 `{ rank: number; title: string; url: string; heat?: number | string }`

### 偏好持久化

- 用户平台选择存储在 `localStorage`，键名 `"hot-site-platforms"`
- 格式：逗号分隔 ID，如 `"weibo,zhihu,bilibili"`
- 空值时回退默认平台（`enabled: true` 的平台）
- 至少保留 1 个平台，最后一个不可取消勾选

### 安全

- 不要把敏感信息（密钥、Token）提交到公开 GitHub
- 所有外链使用 `target="_blank" rel="noopener noreferrer"`
- 不伪造 User-Agent 为虚假值（保持 Chrome 131 即可）
- 不绕过平台认证机制（仅使用公开 JSON API，不伪造登录态）

### 依赖管理

新增依赖前按优先级评估：Node.js 内置 API → 浏览器原生 API → 已有依赖 → 新 npm 包。
以下类型禁止引入：CSS 框架、状态管理库、数据库驱动、SSR 框架、Puppeteer。

### 页脚

- 页脚注明：学习项目、数据来源、非商用声明

---

## 测试要求

### MVP 阶段

MVP 阶段不要求编写自动化测试。每完成一个功能模块，按以下清单手动验证。

### 验证清单

| 序号 | 验证项                                     | 通过标准                                     |
| ---- | ------------------------------------------ | -------------------------------------------- |
| 1    | 每完成一个平台，手动验证至少 10 条数据       | 排名连续、标题非空、链接可点击跳转、热度值格式正确 |
| 2    | 单平台挂掉时其他平台仍正常展示               | 模拟断网或修改 API 路径，仅目标卡片显示错误     |
| 3    | 10 分钟内重复刷新不会疯狂打上游              | 打开浏览器 Network 面板，确认 `/api/hot/` 请求返回 `cached: true` |
| 4    | 平台选择器：取消/勾选平台                    | 卡片即时增删，选择结果持久化至 localStorage    |
| 5    | 关闭标签页重新打开                          | 上次选的平台组合已恢复                        |
| 6    | 清空 localStorage 后刷新                    | 恢复默认 3 个平台                             |
| 7    | 点击热搜标题                                | 新标签页打开，跳转到对应源平台                 |
| 8    | 桌面端 / 平板端 / 手机端视口下检查布局        | 列数正确（3/2/1），无横向滚动条               |

---

*最后更新：2026-07-30*