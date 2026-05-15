const fs = require("node:fs/promises");
const path = require("node:path");

const ROOT_DIR = path.resolve(__dirname, "..");
const DATA_FILE = path.join(ROOT_DIR, "data", "news.json");
const TRANSLATION_CACHE_FILE = path.join(ROOT_DIR, "data", "translation-cache.json");
const CONTENT_CACHE_FILE = path.join(ROOT_DIR, "data", "content-cache.json");
const ONE_DAY = 24 * 60 * 60 * 1000;

const RSS_SOURCES = [
  { name: "OpenAI", url: "https://openai.com/news/rss.xml", weight: 24 },
  { name: "Anthropic", url: "https://www.anthropic.com/news/rss.xml", weight: 23 },
  { name: "Google DeepMind", url: "https://deepmind.google/discover/blog/rss.xml", weight: 22 },
  { name: "Hugging Face", url: "https://huggingface.co/blog/feed.xml", weight: 18 },
  { name: "TechCrunch AI", url: "https://techcrunch.com/category/artificial-intelligence/feed/", weight: 17 },
  { name: "The Verge AI", url: "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml", weight: 16 },
  {
    name: "MIT Technology Review",
    url: "https://www.technologyreview.com/topic/artificial-intelligence/feed",
    weight: 16,
  },
  { name: "arXiv AI", url: "https://export.arxiv.org/rss/cs.AI", weight: 12 },
];

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
  ["agents", "智能体"],
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
  ["partnership", "合作"],
  ["chip", "芯片"],
  ["data center", "数据中心"],
  ["video generation", "视频生成"],
  ["image generation", "图像生成"],
  ["startup", "创业公司"],
  ["enterprise", "企业"],
  ["privacy", "隐私"],
  ["copyright", "版权"],
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
    source: "MIT Technology Review",
    link: "https://www.technologyreview.com/topic/artificial-intelligence/",
    date: new Date().toISOString(),
    summary: "监管政策、算力供应和模型商业化正在共同改变 AI 公司的节奏，相关报道通常会影响产品发布、融资和市场预期。",
    tags: ["监管", "算力芯片", "产业"],
    score: 78,
  },
];

async function run(options = {}) {
  const startedAt = new Date();
  const results = await Promise.allSettled(RSS_SOURCES.map(fetchSource));
  const fetchedArticles = results
    .filter((result) => result.status === "fulfilled")
    .flatMap((result) => result.value);
  const failedSources = results
    .map((result, index) => ({ result, source: RSS_SOURCES[index].name }))
    .filter(({ result }) => result.status === "rejected")
    .map(({ source, result }) => ({ source, reason: result.reason.message }));

  const articles = await translateDailyBrief(buildDailyBrief(fetchedArticles.length ? fetchedArticles : FALLBACK_NEWS));
  const payload = {
    updatedAt: startedAt.toISOString(),
    sourceCount: RSS_SOURCES.length,
    generatedBy: "scripts/fetch-news.js",
    mode: fetchedArticles.length ? "rss" : "fallback",
    failedSources,
    warnings: buildWarnings(fetchedArticles, failedSources),
    articles,
  };

  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(DATA_FILE, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

  if (!options.silent) {
    console.log(`Wrote ${articles.length} articles to ${path.relative(ROOT_DIR, DATA_FILE)}`);
    if (failedSources.length) {
      console.log(`Failed sources: ${failedSources.map((item) => item.source).join(", ")}`);
    }
  }

  return payload;
}

function buildWarnings(fetchedArticles, failedSources) {
  const warnings = [];
  if (!fetchedArticles.length) {
    warnings.push("所有 RSS 来源暂时抓取失败，已使用备用数据。");
  }
  if (failedSources.length) {
    warnings.push(`${failedSources.length} 个 RSS 来源抓取失败。`);
  }
  warnings.push("免费翻译接口不保证稳定；失败时会使用缓存或中文兜底内容。");
  return warnings;
}

async function translateDailyBrief(articles) {
  const cache = await readTranslationCache();
  const contentCache = await readJsonFile(CONTENT_CACHE_FILE, {});
  const translated = [];

  for (const article of articles) {
    const withTitle = await translateArticleTitle(article, cache);
    translated.push(await translateArticleContent(withTitle, contentCache));
  }

  await writeTranslationCache(cache);
  await writeJsonFile(CONTENT_CACHE_FILE, contentCache);
  return translated;
}

async function translateArticleTitle(article, cache) {
  const originalTitle = article.originalTitle || article.title;
  if (looksChinese(originalTitle)) {
    return article;
  }

  const cacheKey = normalizeCacheKey(originalTitle);
  const cachedTitle = cache[cacheKey];
  if (cachedTitle) {
    return { ...article, title: cachedTitle };
  }

  try {
    const translatedTitle = await translateWithMyMemory(originalTitle);
    const title = isUsableChineseTitle(translatedTitle)
      ? translatedTitle
      : makeFallbackChineseTitle(article, article.tags || []);
    if (looksChinese(title)) {
      cache[cacheKey] = title;
    }
    return { ...article, title };
  } catch {
    return article;
  }
}

async function translateWithMyMemory(text) {
  const url = new URL("https://api.mymemory.translated.net/get");
  url.searchParams.set("q", text);
  url.searchParams.set("langpair", "en|zh-CN");

  const response = await fetchWithTimeout(url, 8000);
  if (!response.ok) throw new Error(`Translation HTTP ${response.status}`);

  const data = await response.json();
  const translatedText = data?.responseData?.translatedText || "";
  return stripHtml(decodeEntities(translatedText)).trim();
}

async function translateArticleContent(article, cache) {
  const sourceText = await getBestAvailableArticleText(article);
  const cacheKey = normalizeCacheKey(`${article.originalTitle || article.title}::${sourceText.slice(0, 260)}`);

  if (cache[cacheKey] && looksMostlyChinese(cache[cacheKey])) {
    return { ...article, fullContent: cache[cacheKey] };
  }

  if (looksMostlyChinese(sourceText)) {
    const content = normalizeContent(sourceText);
    cache[cacheKey] = content;
    return { ...article, fullContent: content };
  }

  if (sourceText && sourceText.length > 40) {
    try {
      const translated = await translateLongText(sourceText);
      if (looksMostlyChinese(translated)) {
        const content = normalizeContent(translated);
        cache[cacheKey] = content;
        return { ...article, fullContent: content };
      }
    } catch {
      // Keep the rule-based Chinese summary below when the free translator is unavailable.
    }
  }

  const content = makeFullContent(article.title, article.source, article.tags, article.score);
  cache[cacheKey] = content;
  return { ...article, fullContent: content };
}

async function getBestAvailableArticleText(article) {
  const feedText = article.rawFullText || article.originalSummary || article.rawSummary || article.summary || "";
  if (isLongEnoughContent(feedText)) return feedText;

  const pageText = await fetchArticleText(article.link);
  if (isLongEnoughContent(pageText)) return pageText;

  return feedText;
}

async function fetchArticleText(url) {
  if (!url || !/^https?:\/\//i.test(url)) return "";

  try {
    const response = await fetchWithTimeout(url, 10000, "text/html,application/xhtml+xml,text/plain,*/*");
    if (!response.ok) return "";
    const html = await response.text();
    return extractReadableText(html);
  } catch {
    return "";
  }
}

async function translateLongText(text) {
  const chunks = chunkText(stripHtml(text), 470).slice(0, 8);
  const translated = [];

  for (const chunk of chunks) {
    const piece = await translateWithMyMemory(chunk);
    if (piece) translated.push(piece);
  }

  return translated.join("\n\n");
}

function extractReadableText(html) {
  const cleaned = decodeEntities(html)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ");

  const paragraphs = [...cleaned.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((match) => stripHtml(match[1]))
    .map((text) => text.replace(/\s+/g, " ").trim())
    .filter((text) => text.length > 60)
    .filter((text) => !/cookie|subscribe|newsletter|sign up|advertisement/i.test(text));

  return paragraphs.slice(0, 12).join("\n\n");
}

function chunkText(text, maxLength) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [];

  const sentences = normalized.match(/[^.!?。！？]+[.!?。！？]?/g) || [normalized];
  const chunks = [];
  let current = "";

  for (const sentence of sentences) {
    if ((current + sentence).length > maxLength && current) {
      chunks.push(current.trim());
      current = "";
    }

    if (sentence.length > maxLength) {
      chunks.push(sentence.slice(0, maxLength));
    } else {
      current += `${sentence} `;
    }
  }

  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

function isLongEnoughContent(value) {
  return stripHtml(value || "").length > 180;
}

async function fetchWithTimeout(url, timeoutMs, accept = "application/json, text/plain, */*") {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: {
        "user-agent": "AI News Radar prototype/1.0",
        accept,
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

async function readTranslationCache() {
  return readJsonFile(TRANSLATION_CACHE_FILE, {});
}

async function writeTranslationCache(cache) {
  await writeJsonFile(TRANSLATION_CACHE_FILE, cache);
}

async function readJsonFile(filePath, fallback) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

async function writeJsonFile(filePath, payload) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

async function fetchSource(source) {
  const response = await fetch(source.url, {
    headers: {
      "user-agent": "AI News Radar prototype/1.0",
      accept: "application/rss+xml, application/xml, text/xml",
    },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const xmlText = await response.text();
  return parseFeed(xmlText, source).slice(0, 12).map((article) => enrichArticle(article));
}

function parseFeed(xmlText, source) {
  const itemBlocks = matchBlocks(xmlText, "item");
  const entryBlocks = matchBlocks(xmlText, "entry");
  const blocks = itemBlocks.length ? itemBlocks : entryBlocks;

  return blocks.map((block) => {
    const title = cleanXml(readTag(block, "title")) || "Untitled";
    const link = readLink(block) || source.url;
    const date =
      readTag(block, "pubDate") ||
      readTag(block, "published") ||
      readTag(block, "updated") ||
      new Date().toISOString();
    const rawFullText =
      cleanXml(readTag(block, "content:encoded")) ||
      cleanXml(readTag(block, "content")) ||
      "";
    const rawSummary =
      cleanXml(readTag(block, "description")) ||
      cleanXml(readTag(block, "summary")) ||
      rawFullText ||
      "";

    return {
      title,
      originalTitle: title,
      source: source.name,
      link,
      date: validDate(date),
      rawSummary,
      rawFullText,
      originalSummary: rawSummary,
      sourceWeight: source.weight,
    };
  });
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
  const rawFullText = stripHtml(article.rawFullText || "");
  const date = validDate(article.date);
  const tags = article.tags?.length ? article.tags : inferTags(`${title} ${rawSummary}`);
  const translatedTitle = looksChinese(title) ? title : makeFallbackChineseTitle(article, tags);
  const score = article.score || scoreArticle(title, rawSummary, article.sourceWeight || 10, date);

  return {
    title: translatedTitle,
    originalTitle: article.originalTitle || title,
    source: article.source,
    link: article.link,
    date,
    summary: makeSummary(translatedTitle, rawSummary, tags),
    fullContent: article.fullContent || makeFullContent(translatedTitle, article.source, tags, score),
    originalSummary: article.originalSummary || rawSummary,
    rawFullText,
    tags,
    score,
  };
}

function makeSummary(title, rawSummary, tags) {
  const tagText = tags.slice(0, 2).join("、") || "AI 行业";
  return `这条新闻与${tagText}相关，值得关注其对产品路线、开发者生态或产业竞争格局的影响。原题：${truncate(title, 54)}`;
}

function makeFullContent(title, source, tags, score) {
  const tagText = tags.slice(0, 3).join("、") || "AI 行业";
  return `这条消息来自 ${source || "公开来源"}，主题是“${title}”。它主要涉及${tagText}方向，热度评分为 ${score}。从内容上看，这类新闻通常反映了 AI 模型能力、产品应用、研究进展或产业竞争的新变化，适合作为当天重点动态快速了解。`;
}

function makeFallbackChineseTitle(article, tags = []) {
  const source = article.source || "公开来源";
  const tagText = tags.slice(0, 2).join("、") || "AI";
  return `${source}：${tagText}相关动态`;
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
    output = output.replace(new RegExp(escapeRegExp(en), "gi"), zh);
  });
  return output.replace(/\s+/g, " ").trim();
}

function matchBlocks(xmlText, tagName) {
  const regex = new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "gi");
  return [...xmlText.matchAll(regex)].map((match) => match[1]);
}

function readTag(block, tagName) {
  const regex = new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i");
  return block.match(regex)?.[1]?.trim() || "";
}

function readLink(block) {
  const linkText = cleanXml(readTag(block, "link"));
  if (linkText) return linkText;

  const href = block.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*>/i)?.[1];
  return href ? decodeEntities(href) : "";
}

function cleanXml(value) {
  return decodeEntities(stripHtml(value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1"))).trim();
}

function stripHtml(value) {
  return (value || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function decodeEntities(value) {
  return (value || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
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

function validDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function looksChinese(value) {
  return /[\u4e00-\u9fff]/.test(value || "");
}

function looksMostlyChinese(value) {
  const text = value || "";
  const chineseCount = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  const letterCount = (text.match(/[A-Za-z]/g) || []).length;
  return chineseCount > 20 && chineseCount >= letterCount;
}

function normalizeContent(value) {
  return truncate(stripHtml(value).replace(/\s+/g, " ").trim(), 1200);
}

function isUsableChineseTitle(value) {
  const title = (value || "").trim();
  if (!looksChinese(title)) return false;
  if (title.length < 4 || title.length > 120) return false;
  if (/MYMEMORY|INVALID|QUERY LENGTH/i.test(title)) return false;
  return true;
}

function normalizeCacheKey(value) {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function truncate(value, length) {
  return value.length > length ? `${value.slice(0, length - 1)}...` : value;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

if (require.main === module) {
  run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = { run, DATA_FILE, RSS_SOURCES };
