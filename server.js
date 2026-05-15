const fs = require("node:fs/promises");
const http = require("node:http");
const path = require("node:path");
const { run, DATA_FILE } = require("./scripts/fetch-news");

const ROOT_DIR = __dirname;
const PORT = Number(process.env.PORT || 4173);
const ONE_DAY = 24 * 60 * 60 * 1000;
const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
};

let refreshPromise = null;

const server = http.createServer(async (request, response) => {
  try {
    if (request.method === "POST" && request.url === "/api/refresh") {
      const payload = await refreshNews();
      sendJson(response, 200, { ok: true, updatedAt: payload.updatedAt });
      return;
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      sendJson(response, 405, { error: "Method not allowed" });
      return;
    }

    const filePath = resolveStaticPath(request.url);
    if (!filePath) {
      sendJson(response, 403, { error: "Forbidden" });
      return;
    }

    const body = await fs.readFile(filePath);
    response.writeHead(200, {
      "content-type": MIME_TYPES[path.extname(filePath)] || "application/octet-stream",
      "cache-control": "no-store",
    });
    if (request.method !== "HEAD") response.end(body);
  } catch (error) {
    if (error.code === "ENOENT") {
      sendJson(response, 404, { error: "Not found" });
      return;
    }
    console.error(error);
    sendJson(response, 500, { error: "Internal server error" });
  }
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${PORT} is already in use. Try PORT=4174 node server.js`);
    process.exit(1);
  }
  if (error.code === "EPERM") {
    console.error(`This environment does not allow opening local port ${PORT}. Run this on your machine terminal.`);
    process.exit(1);
  }
  throw error;
});

server.listen(PORT, "127.0.0.1", async () => {
  console.log(`AI News Radar running at http://127.0.0.1:${PORT}`);
  await refreshIfStale();
  setInterval(refreshIfStale, ONE_DAY);
});

async function refreshNews() {
  if (!refreshPromise) {
    refreshPromise = run({ silent: true }).finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

async function refreshIfStale() {
  const existing = await readExistingData();
  if (!existing || Date.now() - new Date(existing.updatedAt).getTime() >= ONE_DAY) {
    await refreshNews();
  }
}

async function readExistingData() {
  try {
    return JSON.parse(await fs.readFile(DATA_FILE, "utf8"));
  } catch {
    return null;
  }
}

function resolveStaticPath(url) {
  const pathname = decodeURIComponent(new URL(url, "http://localhost").pathname);
  const normalized = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.join(ROOT_DIR, normalized);
  return filePath.startsWith(ROOT_DIR) ? filePath : "";
}

function sendJson(response, status, payload) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  response.end(JSON.stringify(payload));
}
