# AI 热点雷达

AI 热点雷达是一个自动抓取、筛选并中文化展示 AI 新闻的静态网站练习项目。

线上地址：

```text
https://jasonliao003.github.io/Liaoainews/
```

## 项目特点

- 按日期组织 AI 新闻，每天展示重点动态。
- 首页每个日期只显示前 3 条标题，保持信息密度适中。
- 点击日期后进入详情页，只显示当天新闻。
- 详情页展示中文标题、原英文标题、中文正文、标签、来源、发布时间和热度分数。
- 新闻数据来自公开 RSS 与原文页面。
- 使用免费翻译接口尝试生成中文标题和正文。
- 数据保存为 `data/news.json`，前端作为静态网站读取。
- GitHub Actions 每天自动运行抓取脚本并更新数据。

## 本地开发

推荐使用自动重启模式：

```bash
cd /Users/a1/Documents/Codex/2026-05-14/ai-html-css
node dev.js
```

打开：

```text
http://127.0.0.1:4173/
```

修改代码后，服务会自动重启；浏览器刷新即可看到最新效果。

## 手动更新新闻

本地开发时可以点击页面上的“立即更新”，也可以运行：

```bash
node scripts/fetch-news.js
```

更新结果会写入：

```text
data/news.json
```

## 部署方式

当前项目使用 GitHub Pages 部署：

- Pages Source: `Deploy from a branch`
- Branch: `main`
- Folder: `/root`

自动更新工作流：

```text
.github/workflows/update-news.yml
```

可以在 GitHub 的 `Actions` 页面手动运行 `Update AI News`，也会按计划每天自动执行。

## 说明

- “每天 5 条”是上限；如果较早日期只抓到 1-2 条，页面会显示实际条数。
- 免费翻译接口不保证长期稳定，失败时会使用缓存或中文兜底内容。
- 很多 RSS 源不提供全文，脚本会尽量从 RSS 全文字段或原网页段落提取内容。
- 本项目不使用数据库，所有数据都保存在 `data/` 目录。
