/**
 * 知乎热榜获取服务
 *
 * 数据源：本地 DailyHotApi（http://localhost:6688/zhihu）
 */

const { fetchHot } = require("./dailyHot");

function fetchZhihu() {
  return fetchHot("zhihu");
}

module.exports = { fetchZhihu };