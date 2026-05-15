const DATA_URL = "./data/news.json";
const TRANSLATION_CACHE_URL = "./data/translation-cache.json";
const SOURCE_COUNT = 8;
const CACHE_KEY = "ai-news-radar-cache-v2";
const ONE_DAY = 24 * 60 * 60 * 1000;

const HOT_KEYWORDS = [
  ["GPT", 18, "大模型"],
  ["Claude", 18, "大模型"],
  ["Gemini", 17, "大模型"],
  ["OpenAI", 16, "公司动态"],
  ["Anthropic", 16, "公司动态"],
  ["DeepMind", 15, "研究"],
  ["agent", 13, "智能体"],
  ["AI agent", 14, "智能体"],
  ["reasoning", 13, "推理"],
  ["multimodal", 12, "多模态"],
  ["video", 11, "视频生成"],
  ["robot", 11, "机器人"],
  ["chip", 10, "算力芯片"],
  ["Nvidia", 11, "算力芯片"],
  ["regulation", 10, "监管"],
  ["safety", 10, "安全"],
  ["benchmark", 8, "评测"],
  ["open source", 9, "开源"],
  ["funding", 9, "投融资"],
  ["launch", 8, "产品发布"],
  ["release", 8, "产品发布"],
  ["paper", 7, "论文"],
  ["model", 8, "模型"],
];

const PHRASES = [
  ["artificial intelligence", "人工智能"],
  ["large language model", "大语言模型"],
  ["language model", "语言模型"],
  ["AI agent", "AI 智能体"],
  ["open source", "开源"],
  ["machine learning", "机器学习"],
  ["deep learning", "深度学习"],
  ["reasoning", "推理"],
  ["multimodal", "多模态"],
  ["safety", "安全"],
  ["benchmark", "评测基准"],
  ["robotics", "机器人"],
  ["research", "研究"],
  ["funding", "融资"],
  ["launches", "发布"],
  ["launch", "发布"],
  ["release", "发布"],
  ["announces", "宣布"],
  ["announced", "宣布"],
  ["partners with", "与...合作"],
  ["chip", "芯片"],
  ["data center", "数据中心"],
  ["video generation", "视频生成"],
  ["image generation", "图像生成"],
];

const FALLBACK_NEWS = [
  {
    title: "OpenAI 发布新的多模态模型能力，强化语音、图像与推理体验",
    originalTitle: "OpenAI announces new multimodal model capabilities",
    source: "OpenAI",
    link: "https://openai.com/news/",
    date: new Date().toISOString(),
    summary: "OpenAI 更新多模态能力，重点提升模型在语音、图像理解与复杂推理任务中的表现，适合放在今日产品发布类重点关注。",
    tags: ["大模型", "多模态", "产品发布"],
    score: 92,
  },
  {
    title: "Anthropic 更新 Claude 系列，继续强调企业应用与安全评估",
    originalTitle: "Anthropic updates Claude with enterprise and safety improvements",
    source: "Anthropic",
    link: "https://www.anthropic.com/news",
    date: new Date().toISOString(),
    summary: "Claude 系列围绕企业工作流、安全能力和可靠性继续迭代，反映头部模型厂商对商业落地和安全边界的投入。",
    tags: ["大模型", "公司动态", "安全"],
    score: 89,
  },
  {
    title: "Google DeepMind 发表 AI 研究进展，聚焦推理、科学发现与智能体",
    originalTitle: "Google DeepMind shares AI research progress",
    source: "Google DeepMind",
    link: "https://deepmind.google/discover/blog/",
    date: new Date().toISOString(),
    summary: "DeepMind 的研究进展通常影响后续产品路线，尤其值得观察推理、科学计算和智能体方向是否出现可迁移的新方法。",
    tags: ["研究", "推理", "智能体"],
    score: 86,
  },
  {
    title: "开源社区继续推动模型工具链，Hugging Face 生态保持高活跃",
    originalTitle: "Open source AI tooling keeps growing across Hugging Face",
    source: "Hugging Face",
    link: "https://huggingface.co/blog",
    date: new Date().toISOString(),
    summary: "开源模型、数据集和部署工具仍在快速演进，适合关注对开发者门槛、企业私有化部署和模型评测的影响。",
    tags: ["开源", "模型", "工具链"],
    score: 82,
  },
  {
    title: "AI 监管和算力竞争持续升温，产业侧进入更密集调整期",
    originalTitle: "AI regulation and compute competition intensify",
    source: "Industry Watch",
    link: "https://www.technologyreview.com/topic/artificial-intelligence/",
    date: new Date().toISOString(),
    summary: "监管政策、算力供应和模型商业化正在共同改变 AI 公司的节奏，相关报道通常会影响产品发布、融资和市场预期。",
    tags: ["监管", "算力芯片", "产业"],
    score: 78,
  },
];

const state = {
  articles: [],
  isLoading: false,
  selectedDay: "",
  dataNotice: "",
};

const els = {
  appTitle: document.querySelector("#appTitle"),
  statusPanel: document.querySelector("#statusPanel"),
  controls: document.querySelector("#controls"),
  timeline: document.querySelector("#timeline"),
  refreshButton: document.querySelector("#refreshButton"),
  statusDot: document.querySelector("#statusDot"),
  statusTitle: document.querySelector("#statusTitle"),
  statusText: document.querySelector("#statusText"),
  sourceCount: document.querySelector("#sourceCount"),
  lastUpdated: document.querySelector("#lastUpdated"),
  searchInput: document.querySelector("#searchInput"),
  tagFilter: document.querySelector("#tagFilter"),
  detailView: document.querySelector("#detailView"),
  backButton: document.querySelector("#backButton"),
  detailTitle: document.querySelector("#detailTitle"),
  detailList: document.querySelector("#detailList"),
  footerUpdated: document.querySelector("#footerUpdated"),
  dayTemplate: document.querySelector("#dayTemplate"),
  newsTemplate: document.querySelector("#newsTemplate"),
};

init();

function init() {
  els.sourceCount.textContent = `${SOURCE_COUNT} 个来源`;
  els.refreshButton.textContent = hasLocalBackend() ? "立即更新" : "重新加载";
  els.refreshButton.addEventListener("click", () => loadNews(true));
  els.searchInput.addEventListener("input", render);
  els.tagFilter.addEventListener("change", render);
  els.backButton.addEventListener("click", closeDetail);
  window.addEventListener("hashchange", () => {
    syncSelectedDayFromHash();
    render();
  });
  syncSelectedDayFromHash();

  const cached = readCache();
  if (cached?.articles?.length) {
    state.articles = cached.articles;
    updateStatus("ready", "已载入上次结果", `上次更新：${formatDateTime(cached.updatedAt)}`);
    updateFooter(cached.updatedAt);
    render();
  }

  loadNews(false);
}

async function loadNews(isManual) {
  if (state.isLoading) return;
  state.isLoading = true;
  els.refreshButton.disabled = true;
  els.refreshButton.textContent = isManual && hasLocalBackend() ? "更新中..." : "加载中...";
  updateStatus("loading", getLoadingTitle(isManual), getLoadingText(isManual));

  try {
    if (isManual) {
      await requestBackendRefresh();
    }

    const [data, translationCache] = await Promise.all([fetchJsonData(), fetchTranslationCache()]);
    const articles = applyTranslationCache(data.articles?.length ? data.articles : FALLBACK_NEWS, translationCache);
    const normalized = buildDailyBrief(articles);
    state.articles = normalized;
    state.dataNotice = getDataNotice(data);
    writeCache(normalized, data.updatedAt ? new Date(data.updatedAt).getTime() : Date.now());
    updateFooter(data.updatedAt || Date.now());
    updateStatus(
      "ready",
      isManual && !hasLocalBackend() ? "静态数据已重新加载" : "日报数据已更新",
      state.dataNotice || getReadyText(isManual)
    );
  } catch (error) {
    const cached = readCache();
    state.articles = cached?.articles?.length ? cached.articles : buildDailyBrief(FALLBACK_NEWS);
    state.dataNotice = "数据加载失败，已显示本地缓存或示例数据。请确认正在通过 http://127.0.0.1:4173 访问。";
    updateStatus(
      "error",
      cached?.articles?.length ? "已载入缓存数据" : "已使用示例数据",
      state.dataNotice
    );
  } finally {
    els.refreshButton.disabled = false;
    els.refreshButton.textContent = hasLocalBackend() ? "立即更新" : "重新加载";
    state.isLoading = false;
    render();
  }

  if (isManual) {
    els.lastUpdated.textContent = `刚刚更新`;
    updateFooter(Date.now());
  }
}

function getLoadingTitle(isManual) {
  if (!isManual) return "正在加载日报数据";
  return hasLocalBackend() ? "正在请求后端更新" : "正在重新加载静态数据";
}

function getLoadingText(isManual) {
  if (!isManual) return "前端正在读取后端生成的新闻数据。";
  if (hasLocalBackend()) return "正在抓取 RSS、翻译标题和整理正文，免费接口可能需要一点时间。";
  return "静态部署无法直接运行后端，线上数据由 GitHub Actions 定时更新。";
}

function getReadyText(isManual) {
  if (isManual && !hasLocalBackend()) {
    return "已重新读取 data/news.json；如需生成新新闻，请等待或手动运行 GitHub Actions。";
  }
  return "已读取本地 JSON，内容由后端脚本完成抓取、筛选、中文整理和评分。";
}

async function requestBackendRefresh() {
  if (!hasLocalBackend()) return;
  const response = await fetch("/api/refresh", { method: "POST" });
  if (!response.ok) throw new Error("Backend refresh failed");
}

function hasLocalBackend() {
  return ["localhost", "127.0.0.1"].includes(location.hostname);
}

async function fetchJsonData() {
  const response = await fetch(`${DATA_URL}?t=${Date.now()}`, { cache: "no-store" });
  if (!response.ok) throw new Error("Cannot load news data");
  return response.json();
}

async function fetchTranslationCache() {
  try {
    const response = await fetch(`${TRANSLATION_CACHE_URL}?t=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) return {};
    return response.json();
  } catch {
    return {};
  }
}

function applyTranslationCache(articles, cache) {
  return articles.map((article) => {
    const originalTitle = article.originalTitle || article.title;
    const cachedTitle = cache[normalizeCacheKey(originalTitle)];
    const title = cachedTitle && looksChinese(cachedTitle) ? cachedTitle : getDisplayTitle(article);
    return {
      ...article,
      title,
      fullContent: getFullChineseContent({ ...article, title }),
    };
  });
}

function getDataNotice(data) {
  const failedCount = data.failedSources?.length || 0;
  if (data.mode === "fallback") {
    return "RSS 抓取暂不可用，当前显示备用数据。";
  }
  if (failedCount) {
    return `已更新日报；${failedCount} 个来源暂时抓取失败，其余来源已正常展示。`;
  }
  return "";
}

function buildDailyBrief(articles) {
  const unique = dedupe(articles.map((article) => enrichArticle(article)));
  const byDay = groupBy(unique, (article) => toDayKey(article.date));

  return Object.entries(byDay)
    .sort(([a], [b]) => b.localeCompare(a))
    .flatMap(([, dayArticles]) =>
      dayArticles
        .sort((a, b) => b.score - a.score || new Date(b.date) - new Date(a.date))
        .slice(0, 5)
    );
}

function enrichArticle(article) {
  const title = article.title || article.originalTitle || "未命名新闻";
  const rawSummary = stripHtml(article.rawSummary || article.summary || "");
  const tags = article.tags?.length ? article.tags : inferTags(`${title} ${rawSummary}`);
  const translatedTitle = looksChinese(title) ? title : makeFallbackChineseTitle(article, tags);
  const date = validDate(article.date);
  const score = article.score || scoreArticle(title, rawSummary, article.sourceWeight || 10, date);

  return {
    ...article,
    title: translatedTitle,
    originalTitle: article.originalTitle || title,
    summary: makeSummary(translatedTitle, rawSummary, tags),
    tags,
    score,
    date,
  };
}

function makeSummary(title, rawSummary, tags) {
  if (looksChinese(rawSummary) && rawSummary.length > 28) {
    return truncate(rawSummary, 118);
  }

  const localized = rawSummary ? localizeText(rawSummary) : "";
  if (looksChinese(localized) && localized.length > 28) {
    return truncate(localized, 118);
  }

  const tagText = tags.slice(0, 2).join("、") || "AI 行业";
  return `这条新闻与${tagText}相关，值得关注其对产品路线、开发者生态或产业竞争格局的影响。原题：${truncate(title, 54)}`;
}

function inferTags(text) {
  const lower = text.toLowerCase();
  const tags = HOT_KEYWORDS.filter(([keyword]) => lower.includes(keyword.toLowerCase())).map(
    ([, , tag]) => tag
  );
  const unique = [...new Set(tags)];
  return unique.length ? unique.slice(0, 3) : ["AI 热点"];
}

function scoreArticle(title, summary, sourceWeight, publishedAt) {
  const text = `${title} ${summary}`.toLowerCase();
  const keywordScore = HOT_KEYWORDS.reduce((total, [keyword, score]) => {
    return text.includes(keyword.toLowerCase()) ? total + score : total;
  }, 0);
  const ageInDays = Math.max(0, Math.floor((Date.now() - new Date(publishedAt).getTime()) / ONE_DAY));
  const recency = Math.max(0, 14 - ageInDays);
  return Math.max(55, Math.min(99, Math.round(45 + sourceWeight + keywordScore * 0.72 + recency)));
}

function localizeText(text) {
  let output = stripHtml(text);
  PHRASES.forEach(([en, zh]) => {
    output = output.replace(new RegExp(en, "gi"), zh);
  });

  return output
    .replace(/\s+/g, " ")
    .replace(/^\s+|\s+$/g, "")
    .replace(/^(.{1,110})$/, "$1");
}

function render() {
  syncSelectedDayFromHash();
  const query = els.searchInput.value.trim().toLowerCase();
  const selectedTag = els.tagFilter.value;
  const filtered = state.articles.filter((article) => {
    const searchPool = `${article.title} ${article.originalTitle} ${article.summary} ${article.source} ${article.tags.join(" ")}`.toLowerCase();
    const matchesQuery = !query || searchPool.includes(query);
    const matchesTag = selectedTag === "all" || article.tags.includes(selectedTag);
    return matchesQuery && matchesTag;
  });

  renderTags(state.articles);
  renderViewMode();

  if (state.selectedDay) {
    renderDetail();
  } else {
    els.detailView.hidden = true;
    els.detailList.innerHTML = "";
    renderTimeline(filtered);
  }

  const cache = readCache();
  if (cache?.updatedAt) {
    els.lastUpdated.textContent = `更新于 ${formatDateTime(cache.updatedAt)}`;
    updateFooter(cache.updatedAt);
  }
}

function updateFooter(value) {
  if (!els.footerUpdated || !value) return;
  els.footerUpdated.textContent = `数据更新于 ${formatDateTime(value)}`;
}

function renderTags(articles) {
  const current = els.tagFilter.value;
  const tags = [...new Set(articles.flatMap((article) => article.tags))].sort((a, b) =>
    a.localeCompare(b, "zh-CN")
  );
  els.tagFilter.innerHTML = `<option value="all">全部标签</option>`;
  tags.forEach((tag) => {
    const option = document.createElement("option");
    option.value = tag;
    option.textContent = tag;
    els.tagFilter.append(option);
  });
  els.tagFilter.value = tags.includes(current) ? current : "all";
}

function renderTimeline(articles) {
  els.timeline.innerHTML = "";
  els.timeline.hidden = false;
  if (!articles.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "没有匹配的新闻。换个关键词试试看。";
    els.timeline.append(empty);
    return;
  }

  const byDay = groupBy(articles, (article) => toDayKey(article.date));
  Object.entries(byDay)
    .sort(([a], [b]) => b.localeCompare(a))
    .forEach(([day, dayArticles]) => {
      els.timeline.append(renderDayCard(day, dayArticles));
    });
}

function renderDayCard(day, articles) {
  const node = els.dayTemplate.content.cloneNode(true);
  const card = node.querySelector(".day-card");
  const sorted = [...articles].sort((a, b) => b.score - a.score);
  const headlineList = card.querySelector(".headline-list");

  card.dataset.day = day;
  card.querySelector("h2").textContent = formatDay(day);
  card.querySelector(".day-count").textContent = `${sorted.length} 条重点`;
  card.querySelector(".day-action span").textContent = `最高热度 ${sorted[0]?.score || "--"}`;
  card.querySelector(".day-action strong").textContent = `查看完整 ${sorted.length} 条`;

  sorted.slice(0, 3).forEach((article) => {
    const item = document.createElement("li");
    item.textContent = article.title;
    headlineList.append(item);
  });

  card.addEventListener("click", () => openDetail(day));
  card.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openDetail(day);
    }
  });

  return node;
}

function renderDetail() {
  els.timeline.hidden = true;
  els.detailList.innerHTML = "";
  if (!state.selectedDay) {
    els.detailView.hidden = true;
    return;
  }

  const detailArticles = state.articles
    .filter((article) => toDayKey(article.date) === state.selectedDay)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  if (!detailArticles.length) {
    closeDetail(false);
    renderTimeline(state.articles);
    return;
  }

  els.detailView.hidden = false;
  const title = `${formatDay(state.selectedDay)} AI 热点`;
  els.detailTitle.textContent = title;
  els.appTitle.textContent = "日报详情";
  detailArticles.forEach((article) => els.detailList.append(renderCard(article)));
}

function renderViewMode() {
  const isDetail = Boolean(state.selectedDay);
  document.body.classList.toggle("detail-mode", isDetail);
  els.statusPanel.hidden = isDetail;
  els.controls.hidden = isDetail;
  els.refreshButton.hidden = isDetail;
  els.appTitle.textContent = isDetail ? "日报详情" : "AI 热点日报";
}

function openDetail(day) {
  state.selectedDay = day;
  window.location.hash = `day-${day}`;
  render();
  window.scrollTo({ top: 0, behavior: "auto" });
}

function closeDetail(shouldRender = true) {
  state.selectedDay = "";
  if (window.location.hash.startsWith("#day-")) {
    history.pushState("", document.title, window.location.pathname + window.location.search);
  }
  renderViewMode();
  if (shouldRender) render();
}

function syncSelectedDayFromHash() {
  const match = window.location.hash.match(/^#day-(\d{4}-\d{2}-\d{2})$/);
  state.selectedDay = match ? match[1] : "";
}

function renderCard(article) {
  const node = els.newsTemplate.content.cloneNode(true);
  const card = node.querySelector(".news-card");
  card.href = article.link;
  card.querySelector(".source").textContent = article.source;
  card.querySelector(".published").textContent = formatDateTime(article.date);
  card.querySelector("h3").textContent = article.title;
  card.querySelector(".original-title").textContent = getOriginalTitle(article);
  card.querySelector(".full-content").textContent = getFullChineseContent(article);
  card.querySelector(".score-value").textContent = article.score;

  const tags = card.querySelector(".tags");
  article.tags.forEach((tag) => {
    const tagNode = document.createElement("span");
    tagNode.className = "tag";
    tagNode.textContent = tag;
    tags.append(tagNode);
  });

  return node;
}

function getOriginalTitle(article) {
  if (!article.originalTitle || article.originalTitle === article.title) return "";
  return `原题：${article.originalTitle}`;
}

function getFullChineseContent(article) {
  if (article.fullContent && looksMostlyChinese(article.fullContent) && article.fullContent.length > 42) {
    return article.fullContent;
  }

  const tags = article.tags?.slice(0, 3).join("、") || "AI 行业";
  const source = article.source || "公开来源";
  const score = article.score || "--";
  const title = article.title || "这条新闻";

  return `这条消息来自 ${source}，主题是“${title}”。它主要涉及${tags}方向，热度评分为 ${score}。从内容上看，这类新闻通常反映了 AI 模型能力、产品应用、研究进展或产业竞争的新变化，适合作为当天重点动态快速了解。`;
}

function looksMostlyChinese(value) {
  const text = value || "";
  const chineseCount = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  const letterCount = (text.match(/[A-Za-z]/g) || []).length;
  return chineseCount > 20 && chineseCount >= letterCount;
}

function getDisplayTitle(article) {
  const title = article.title || "";
  if (looksChinese(title)) return title;
  return makeFallbackChineseTitle(article, article.tags || inferTags(`${article.originalTitle || title} ${article.summary || ""}`));
}

function makeFallbackChineseTitle(article, tags = []) {
  const source = article.source || "公开来源";
  const tagText = tags.slice(0, 2).join("、") || "AI";
  const originalTitle = article.originalTitle || article.title || "AI 新闻";
  return `${source}：${tagText}相关动态`;
}

function updateStatus(type, title, text) {
  els.statusDot.classList.toggle("ready", type === "ready");
  els.statusDot.classList.toggle("error", type === "error");
  els.statusTitle.textContent = title;
  els.statusText.textContent = text;
}

function textFrom(node, selector) {
  return node.querySelector(selector)?.textContent?.trim() || "";
}

function stripHtml(value) {
  const el = document.createElement("div");
  el.innerHTML = value || "";
  return el.textContent.replace(/\s+/g, " ").trim();
}

function dedupe(articles) {
  const seen = new Set();
  return articles.filter((article) => {
    const key = article.link || `${article.source}-${article.originalTitle}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function groupBy(items, getKey) {
  return items.reduce((groups, item) => {
    const key = getKey(item);
    groups[key] ||= [];
    groups[key].push(item);
    return groups;
  }, {});
}

function toDayKey(date) {
  return new Date(validDate(date)).toISOString().slice(0, 10);
}

function formatDay(day) {
  const date = new Date(`${day}T12:00:00`);
  return new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(date);
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function validDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function looksChinese(value) {
  return /[\u4e00-\u9fff]/.test(value || "");
}

function normalizeCacheKey(value) {
  return (value || "").replace(/\s+/g, " ").trim().toLowerCase();
}

function truncate(value, length) {
  return value.length > length ? `${value.slice(0, length - 1)}...` : value;
}

function readCache() {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY));
  } catch {
    return null;
  }
}

function writeCache(articles, updatedAt = Date.now()) {
  localStorage.setItem(
    CACHE_KEY,
    JSON.stringify({
      updatedAt,
      articles,
    })
  );
}
