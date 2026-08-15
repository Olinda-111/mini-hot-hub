import { useHotList } from "../hooks/useHotList";
import HotCard from "./HotCard";
import styles from "./Home.module.css";

export default function Home() {
  const { platforms, loading, error, retry, retryPlatform } = useHotList();

  return (
    <div className={styles["home"]}>
      <Header onRefresh={retry} />
      {loading ? (
        <div className={styles["home-loading"]}>
          <div className={styles["spinner"]} />
          <p>加载中...</p>
        </div>
      ) : error && platforms.length === 0 ? (
        <div className={styles["home-error"]}>
          <p>{error}</p>
          <button onClick={retry}>重试</button>
        </div>
      ) : (
        <main className={styles["home-grid"]}>
          {platforms.map((p) => (
            <HotCard
              key={p.source}
              platform={p}
              loading={loading}
              error={p.error ? p.message : undefined}
              onRetry={() => retryPlatform(p.source)}
            />
          ))}
        </main>
      )}
      <Footer />
    </div>
  );
}

function Header({ onRefresh }: { onRefresh: () => void }) {
  return (
    <header className={styles["home-header"]}>
      <h1>迷你今日热榜</h1>
      <p>多平台热搜聚合 — 一站式浏览，无需逐个打开 App</p>
      <button className={styles["refresh-btn"]} onClick={onRefresh}>
        ⟳ 刷新
      </button>
    </header>
  );
}

function Footer() {
  return (
    <footer className={styles["home-footer"]}>
      <p>本站为个人学习项目，数据来源于各平台公开信息，非官方。</p>
      <p>更新频率约 10 分钟，所有热搜标题均为外部链接，点击后跳转至源平台。</p>
      <p>如有侵权或违规请联系邮箱 <a href="mailto:axj1020@侵权.com">axj1020@侵权.com</a>。</p>
    </footer>
  );
}