const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");

const ROOT_DIR = __dirname;
const WATCH_TARGETS = ["server.js", "scripts/fetch-news.js", "app.js", "styles.css", "index.html"];

let child = null;
let restartTimer = null;

startServer();

for (const file of WATCH_TARGETS) {
  fs.watch(path.join(ROOT_DIR, file), { persistent: true }, () => {
    clearTimeout(restartTimer);
    restartTimer = setTimeout(() => restartServer(file), 180);
  });
}

process.on("SIGINT", () => {
  stopServer();
  process.exit(0);
});

function startServer() {
  child = spawn(process.execPath, ["server.js"], {
    cwd: ROOT_DIR,
    stdio: "inherit",
  });
}

function restartServer(file) {
  console.log(`\nChanged ${file}. Restarting local server...\n`);
  stopServer();
  startServer();
}

function stopServer() {
  if (child && !child.killed) {
    child.kill("SIGTERM");
  }
  child = null;
}
