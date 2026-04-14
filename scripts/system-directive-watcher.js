#!/usr/bin/env node
// @bun
/**
 * system-directive-watcher.js
 * 
 * Background watcher that monitors OpenCode session messages for
 * [SYSTEM DIRECTIVE: OH-MY-OPENCODE - ...] patterns and automatically
 * creates follow-up todos when detected.
 * 
 * Usage:
 *   bun run system-directive-watcher.js
 *   bun run system-directive-watcher.js --daemon
 *   bun run system-directive-watcher.js --log=/tmp/oh-my-opencode.log
 *   bun run system-directive-watcher.js --interval=5000
 */

import { readFileSync, writeFileSync, renameSync, existsSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { homedir, tmpdir } from "os";
import { spawn } from "child_process";

const DIRECTIVE_ACTIONS = {
  "TODO CONTINUATION": [
    { content: "Global Brain aktualisieren (.pcpm/ sync)", priority: "high" },
    { content: "Local Brain aktualisieren (project context)", priority: "high" },
    { content: "Todo-Liste pruefen und aktualisieren", priority: "medium" },
  ],
  "BRAIN SYNC ENFORCER": [
    { content: "Brain Sync durchfuehren: Global Brain (.pcpm/) + Local Brain (AGENTS.md)", priority: "high" },
  ],
  "CODE CHECK": [
    { content: "Code-Check: Repositories updated + pushed + merged", priority: "high" },
    { content: "Issues/Priorities aktualisiert", priority: "medium" },
  ],
  "DOCUMENTATION CHECK": [
    { content: "Dokumentation reviewen: README, ADRs, Changelog", priority: "high" },
    { content: "Fehlende Docs erstellen", priority: "medium" },
  ],
  "ORGANIZATION CHECK": [
    { content: "GitHub-Hygiene: Issues labeln, PRs verlinken", priority: "high" },
    { content: "Traceability: Commit-Messages mit Issue-ID", priority: "high" },
    { content: "Backlog/Technical Debt als Issues erfassen", priority: "medium" },
    { content: "Stakeholder-Kommentare/@mentions pruefen", priority: "medium" },
  ],
  "RALPH LOOP": [
    { content: "Ralph Loop Status pruefen", priority: "medium" },
    { content: "Global Brain aktualisieren", priority: "high" },
  ],
  "BOULDER CONTINUATION": [
    { content: "Global Brain aktualisieren", priority: "high" },
    { content: "Local Brain aktualisieren", priority: "high" },
  ],
  "DELEGATION REQUIRED": [
    { content: "Aufgabe an passenden Agent delegieren", priority: "high" },
    { content: "Global Brain aktualisieren", priority: "high" },
  ],
  "COMPACTION CONTEXT": [
    { content: "Global Brain nach Compaction aktualisieren", priority: "high" },
    { content: "Context-Zusammenfassung pruefen", priority: "medium" },
  ],
  "CONTEXT WINDOW MONITOR": [
    { content: "Wichtigste Infos sichern (Context wird knapp)", priority: "high" },
  ],
};

const SYSTEM_DIRECTIVE_RE = /\[SYSTEM DIRECTIVE: OH-MY-OPENCODE - ([^\]]+)\]/g;
const STATE_FILE = join(tmpdir(), "opensin-directive-watcher-state.json");
const processedDirectives = new Set();

function loadState() {
  if (!existsSync(STATE_FILE)) return;
  try {
    const data = JSON.parse(readFileSync(STATE_FILE, "utf-8"));
    const entries = Array.from(data.processed || []);
    for (const entry of entries.slice(-100)) {
      processedDirectives.add(entry);
    }
  } catch (e) {
    console.error("[watcher] State load error:", e.message);
  }
}

function saveState() {
  try {
    const data = {
      processed: Array.from(processedDirectives),
      lastUpdated: new Date().toISOString(),
    };
    const tmpFile = STATE_FILE + ".tmp";
    writeFileSync(tmpFile, JSON.stringify(data, null, 2), "utf-8");
    renameSync(tmpFile, STATE_FILE);
  } catch (e) {
    console.error("[watcher] State save error:", e.message);
  }
}

function extractDirectives(content) {
  const results = [];
  let match;
  const regex = /\[SYSTEM DIRECTIVE: OH-MY-OPENCODE - ([^\]]+)\]/g;
  while (true) {
    match = regex.exec(content);
    if (match === null) break;
    results.push({
      type: match[1].trim(),
      fullMatch: match[0],
    });
  }
  return results;
}

async function injectTodos(sessionId, todos) {
  const todoList = todos
    .map((t) => `  - [${t.priority || "medium"}] ${t.content}`)
    .join("\n");

  const prompt = `[SYSTEM DIRECTIVE: OH-MY-OPENCODE - AUTO-TODO INJECTOR]

Erstelle JETZT folgende Todos (verwende todowrite Tool):

${todoList}

WICHTIG: Erstelle die Todos OHNE weitere Erklaerung. Einfach todowrite ausfuehren.`;

  const commandFile = join(tmpdir(), `opensin-directive-${sessionId}-${Date.now()}.json`);
  writeFileSync(
    commandFile,
    JSON.stringify({
      type: "directive-response",
      sessionId,
      prompt,
      todos,
      createdAt: new Date().toISOString(),
    }),
    "utf-8"
  );
  console.log(`[watcher] Command file: ${commandFile}`);
}

function findSessionDirs() {
  const candidates = [
    join(homedir(), ".local/share/opencode/messages"),
    join(homedir(), ".config/opencode/sessions"),
    join(process.cwd(), ".opencode/sessions"),
  ];
  const dirs = [];
  for (const candidate of candidates) {
    if (!existsSync(candidate)) continue;
    try {
      for (const entry of readdirSync(candidate)) {
        const fullPath = join(candidate, entry);
        if (statSync(fullPath).isDirectory()) {
          dirs.push(fullPath);
        }
      }
    } catch (e) {}
  }
  return dirs;
}

async function scanSession(dir, sessionId, sinceMs) {
  try {
    for (const file of readdirSync(dir)) {
      if (!file.endsWith(".json") && !file.endsWith(".jsonl")) continue;
      const filePath = join(dir, file);
      const stat = statSync(filePath);
      if (stat.mtimeMs < sinceMs) continue;

      const content = readFileSync(filePath, "utf-8");
      const directives = extractDirectives(content);

      for (const d of directives) {
        const key = `${sessionId}:${d.fullMatch}`;
        if (processedDirectives.has(key)) continue;

        processedDirectives.add(key);
        console.log(`[watcher] DETECTED: "${d.type}" in session ${sessionId}`);

        const actions = DIRECTIVE_ACTIONS[d.type];
        if (actions?.length) {
          console.log(`[watcher]   -> Creating ${actions.length} auto-todos`);
          await injectTodos(sessionId, actions);
        }
      }
    }
  } catch (e) {}
}

function tailLogFile(logFile) {
  const tail = spawn("tail", ["-F", "-n", "0", logFile]);
  tail.stdout.on("data", (data) => {
    for (const line of data.toString().split("\n")) {
      if (!line.trim()) continue;
      const directives = extractDirectives(line);
      for (const d of directives) {
        const key = `log:${d.fullMatch}`;
        if (processedDirectives.has(key)) continue;
        processedDirectives.add(key);
        console.log(`[watcher] DETECTED (log): "${d.type}"`);
      }
    }
  });
}

async function pollLoop(intervalMs) {
  let lastCheck = Date.now();
  while (true) {
    try {
      for (const dir of findSessionDirs()) {
        await scanSession(dir, dir.split("/").pop(), lastCheck);
      }
      lastCheck = Date.now();
      saveState();
    } catch (e) {
      console.error("[watcher] Poll error:", e.message);
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}

async function runDaemon() {
  const pidFile = join(tmpdir(), "opensin-directive-watcher.pid");
  if (existsSync(pidFile)) {
    try {
      process.kill(parseInt(readFileSync(pidFile, "utf-8").trim()), 0);
      console.log(`[watcher] Already running (PID ${readFileSync(pidFile, "utf-8").trim()})`);
      process.exit(0);
    } catch (e) {}
  }
  writeFileSync(pidFile, process.pid.toString(), "utf-8");
  process.on("exit", () => {
    try { require("fs").unlinkSync(pidFile); } catch (e) {}
  });
  process.on("SIGINT", () => process.exit(0));
  process.on("SIGTERM", () => process.exit(0));
  await pollLoop(3000);
}

const args = process.argv.slice(2);
loadState();

if (args.includes("--daemon")) {
  runDaemon().catch((e) => { console.error("[watcher] Fatal:", e); process.exit(1); });
} else {
  const logFile = args.find((a) => a.startsWith("--log="))?.split("=")[1];
  const interval = parseInt(args.find((a) => a.startsWith("--interval="))?.split("=")[1] || "3000");

  console.log("[watcher] Starting...");
  console.log(`[watcher] Directives: ${Object.keys(DIRECTIVE_ACTIONS).join(", ")}`);
  console.log(`[watcher] State entries: ${processedDirectives.size}`);
  console.log("");

  if (logFile && existsSync(logFile)) {
    tailLogFile(logFile);
  } else {
    await pollLoop(interval);
  }
}
