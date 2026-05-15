# AI 热点日报

一个练习用的 AI 新闻日报原型：后端抓取 RSS，生成本地 JSON；前端按日期展示新闻。

## 功能

- 首页按日期展示，每天只显示前 3 条标题。
- 点击某一天后，只显示当天完整 5 条新闻详情。
- 详情页展示中文标题、原英文标题、中文正文、标签、来源、时间和热度。
- 后端每天检查一次数据是否需要更新。
- 使用免费翻译接口尝试翻译标题和正文。
- 翻译结果会缓存到 `data/translation-cache.json` 和 `data/content-cache.json`，减少重复请求。
- 如果抓取或翻译失败，会显示缓存数据、备用数据或中文兜底内容，避免页面空白。

## 推荐运行方式

开发时使用自动重启模式：

```bash
cd /Users/a1/Documents/Codex/2026-05-14/ai-html-css
node dev.js
```

打开：

```text
http://127.0.0.1:4173/
```

之后我修改代码时，服务会自动重启。你只需要刷新浏览器，必要时用 `Command + Shift + R` 强制刷新。

## 手动更新新闻

本地开发时，可以在网页点击“立即更新”。

也可以在终端运行：

```bash
node scripts/fetch-news.js
```

更新后的数据会写入：

```text
data/news.json
```

## 普通启动

如果不需要自动重启：

```bash
node server.js
```

如果安装了 `npm`，也可以用：

```bash
npm run fetch
npm start
```

## GitHub Pages 部署

这个项目可以作为静态网站部署到 GitHub Pages。线上页面不需要长期运行 `server.js`，数据由 GitHub Actions 每天更新。

1. 把项目推送到 GitHub 仓库。
2. 在仓库设置里打开 `Settings` -> `Pages`。
3. `Build and deployment` 选择：
   - Source: `Deploy from a branch`
   - Branch: `main`
   - Folder: `/root`
4. 保存后等待 Pages 生成地址。
5. 到 `Actions` 页面，手动运行一次 `Update AI News`，确认 `data/news.json` 会被更新并提交。

已包含的自动任务：

```text
.github/workflows/update-news.yml
```

它会每天 UTC 23:00 自动运行一次，也可以在 GitHub 的 `Actions` 页面手动触发。

注意：GitHub Pages 是静态部署，网页上的“立即更新”不会直接运行后端；真正的线上更新来自 GitHub Actions。

## Vercel 部署

Vercel 也可以直接部署这个项目：

1. 把项目推送到 GitHub。
2. 在 Vercel 新建项目，导入这个仓库。
3. Framework Preset 选择 `Other`。
4. Build Command 留空或填：

```bash
node scripts/fetch-news.js
```

5. Output Directory 保持项目根目录。
6. 部署后，前端会读取 `data/news.json`。

如果你希望 Vercel 每天自动更新数据，仍然建议使用 GitHub Actions 负责更新并提交 `data/news.json`，Vercel 监听仓库变化后自动重新部署。

## 当前限制

- 免费翻译接口适合练习，不保证长期稳定。
- 很多 RSS 源不会提供全文；脚本会尽量从 RSS 全文字段或原网页段落提取内容，拿不到时会回退到中文兜底内容。
- 这个版本不使用数据库，所有数据都保存在 `data/` 目录下。
- 静态部署后没有本地 `/api/refresh`，线上更新依赖 GitHub Actions。
